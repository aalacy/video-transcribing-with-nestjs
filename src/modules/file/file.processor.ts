import { OnQueueError, OnQueueFailed, Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';

import {
  JOB_FILE_UPLOAD,
  MESSAGE_TRANSCRIBING,
  PENDING_TRANSCRIBING,
} from 'src/constants';
import {
  callMonsterAPI,
  extractAudioFromVideo,
  fileMetaInfo,
  generateThumbnail,
  getAudioKey,
  getMetadataOfVideo,
  getThumbnailKey,
  getVideoBaseKey,
  removeFile,
  getAzureBlob,
  upload2Azure,
} from 'src/utils';
import { FileService } from './file.service';
import { SocketGateway } from '../socket/socket.gateway';

@Processor('file')
export class FileProcessor {
  private readonly logger = new Logger(FileProcessor.name);

  constructor(
    private fileService: FileService,
    private socket: SocketGateway,
  ) {}

  @OnQueueError()
  handleError(error: Error) {
    this.logger.log(error);
  }

  @OnQueueFailed()
  handleFailed(job: Job, error: Error) {
    this.logger.log(job, error);
  }

  @Process(JOB_FILE_UPLOAD)
  async handleUpload(job: Job) {
    const {
      userId,
      visitorId,
      mimetype,
      filepath,
      key,
      filename,
      lang,
      width,
      height,
    } = job.data;

    this.logger.debug('Start uploading...');
    const ext = fileMetaInfo(mimetype);
    const audioKey = getAudioKey(key);
    const videoBaseKey = getVideoBaseKey(key, ext);
    const thumbnailKey = getThumbnailKey(key);
    this.socket.updateProgress(10, userId, visitorId);

    // upload audio file to bucket
    await upload2Azure(filepath, videoBaseKey, (progress) =>
      this.socket.updateProgress(10 + progress * 10, userId, visitorId),
    );

    const audioPath = await extractAudioFromVideo(key, filepath, (progress) =>
      this.socket.updateProgress(20 + progress * 20, userId, visitorId),
    );

    // upload audio file to bucket
    await upload2Azure(audioPath, audioKey, (progress) =>
      this.socket.updateProgress(40 + progress * 10, userId, visitorId),
    );
    const audio = await getAzureBlob(audioKey);
    this.socket.updateProgress(55, userId, visitorId);
    // get metainfo
    const info = await getMetadataOfVideo(filepath);

    let thumbnail;
    try {
      this.socket.updateProgress(60, userId, visitorId);
      const thumbnailPath = await generateThumbnail(key, filepath, (progress) =>
        this.socket.updateProgress(60 + progress * 10, userId, visitorId),
      );
      // upload audio file to bucket
      await upload2Azure(thumbnailPath, thumbnailKey, (progress) =>
        this.socket.updateProgress(70 + progress * 5, userId, visitorId),
      );
      await removeFile(thumbnailPath);
    } catch (error) {
      console.log('[No thumbnail]', error);
    }

    this.socket.updateProgress(80, userId, visitorId);

    // remove temporary files on local
    await removeFile(audioPath); // audio file
    await removeFile(filepath); // original video file

    this.socket.updateProgress(85, userId, visitorId);

    const data = {
      userId,
      visitorId,
      localPath: filepath,
      thumbnail,
      audio,
      key,
      fileName: filename,
      ext,
      width: Number(width),
      height: Number(height),
      duration: info.format.duration,
      processId: 'monsterData.process_id',
      lang,
      status: PENDING_TRANSCRIBING,
      metadata: {
        backgroundColor: '#ffbc02',
        fontColor: '#000101',
        font: 'Roboto',
        fontWeight: 'Light',
        fontSize: 17,
        position: 50,
      },
    };

    const newFile = await this.fileService.createFile(data);

    const monsterData = await callMonsterAPI(audio, lang);
    this.socket.updateProgress(95, userId, visitorId, MESSAGE_TRANSCRIBING);

    newFile.processId = monsterData.process_id;
    await this.fileService.updateFile(newFile.id, {
      processId: monsterData.process_id,
    });

    this.logger.debug('Uploading completed');
    return newFile;
  }
}
