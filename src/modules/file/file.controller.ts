import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseInterceptors,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';

import { IFile } from '../../types';
import { UploadDto } from '../../dtos';
import { FileService } from './file.service';

@Controller('file')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Post('upload')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  async Upload(
    @Body() metadata: UploadDto,
    @UploadedFile() file?: IFile,
  ): Promise<{ message: string }> {
    return this.fileService.uploadFile(file, metadata);
  }

  @Post('download')
  @HttpCode(HttpStatus.OK)
  async download(
    @Body('fileId') fileId: number,
    @Body('visitorId') visitorId: string,
  ) {
    return this.fileService.generateVideo(fileId, visitorId);
  }

  @Post('callback/monster-transcription')
  @HttpCode(HttpStatus.OK)
  monsterCallback(@Req() req: RawBodyRequest<Request>) {
    this.fileService.handleMonsterCallback(req);
  }
}
