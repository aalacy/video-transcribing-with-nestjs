import { Injectable, RawBodyRequest } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Request } from 'express';

import { UploadDto } from 'src/dtos';
import { IFile } from 'src/types';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import {
  JOB_FILE_UPLOAD,
  JOB_GENERATE_VIDEO,
  JOB_MONSTER_TRANSCRIPTION,
  JOB_PROGRESS,
  MESSAGE_UPLOADING,
  PENDING_GENERATE,
  TRANSCRIPTED,
} from 'src/constants';
import { buildName, random, saveBuffer2File } from 'src/utils';
import { SocketGateway } from '../socket/socket.gateway';
import { File as FileModel } from '@prisma/client';

@Injectable()
export class FileService {
  constructor(
    @InjectQueue('file') private readonly fileQueue: Queue,
    @InjectQueue('monster') private readonly monsterQueue: Queue,
    @InjectQueue('video') private readonly videoQueue: Queue,
    private prisma: PrismaService,
    private socket: SocketGateway,
  ) {}

  async getFileFromReq(fileId: number, visitorId: string) {
    let file;
    if (fileId) {
      file = await this.prisma.file.findFirstOrThrow({
        where: { id: fileId },
      });
    } else if (visitorId) {
      file = await this.prisma.file.findFirstOrThrow({
        where: { visitorId },
        orderBy: { createdAt: 'desc' },
      });
    }
    return file;
  }

  createFile(data: any): Promise<FileModel> {
    return this.prisma.file.create({
      data,
    });
  }

  async updateFile(id: number, data): Promise<void> {
    await this.prisma.file.update({
      where: {
        id: Number(id),
      },
      data,
    });
  }

  async updateFileWithMonster(processId: string, vttContent: string) {
    const file = await this.prisma.file.findFirstOrThrow({
      where: { processId },
    });
    await this.prisma.file.update({
      where: { id: file.id },
      data: {
        vtt: vttContent,
        status: TRANSCRIPTED,
      },
    });

    file.vtt = vttContent;
    file.status = TRANSCRIPTED;

    this.socket.completeJob(
      JOB_MONSTER_TRANSCRIPTION,
      file.userId,
      file.visitorId,
      file,
      'Successfully transcribed',
    );

    return file;
  }

  async generateVideo(fileId: number, visitorId: string) {
    const file = await this.getFileFromReq(fileId, visitorId);

    this.videoQueue.add(JOB_GENERATE_VIDEO, {
      file,
      visitorId,
      job: JOB_GENERATE_VIDEO,
    });

    if (fileId) {
      return this.prisma.file.update({
        where: { id: fileId },
        data: {
          status: PENDING_GENERATE,
        },
      });
    } else if (visitorId) {
      const file = await this.prisma.file.findFirstOrThrow({
        where: {
          visitorId,
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });

      return this.prisma.file.update({
        where: { id: file.id },
        data: {
          status: PENDING_GENERATE,
        },
      });
    }
  }

  async uploadFile(
    file: IFile,
    metadata: UploadDto,
  ): Promise<{ message: string }> {
    this.socket.send2Client({
      name: JOB_FILE_UPLOAD,
      percent: 7,
      message: MESSAGE_UPLOADING,
      userId: '',
      visitorId: metadata.visitorId,
      status: JOB_PROGRESS,
    });
    const userId = null;
    const filepath = buildName();
    const info = {
      ...metadata,
      filepath,
      userId,
      mimetype: file.mimetype,
      filename: file.originalname,
      key: random(),
    };
    await saveBuffer2File(filepath, file.buffer);
    this.socket.send2Client({
      name: JOB_FILE_UPLOAD,
      percent: 9,
      message: MESSAGE_UPLOADING,
      userId: '',
      visitorId: metadata.visitorId,
      status: JOB_PROGRESS,
    });
    await this.fileQueue.add(JOB_FILE_UPLOAD, info);
    return {
      message: 'Successfully done',
    };
  }

  handleMonsterCallback(req: RawBodyRequest<Request>) {
    const monster: any = JSON.parse(req.rawBody.toString());
    console.log('[Callback from Monster API] ~~~~~~~~~~~~~ ', monster.status);
    if (monster?.model_name === 'whisper' && monster.status === 'COMPLETED') {
      this.monsterQueue.add(JOB_MONSTER_TRANSCRIPTION, { monster });
    }
  }
}
