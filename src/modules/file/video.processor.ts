import { OnQueueError, OnQueueFailed, Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';

import { FileService } from './file.service';
import {
  COMPLETED,
  JOB_GENERATE_VIDEO,
  MESSAGE_EXPORTING,
} from 'src/constants';
import { writeFile } from 'fs/promises';
import {
  buildMetadataForAss,
  convertSrt2Ass,
  downloadBlobAsStream,
  getAzureBlob,
  getVideoBaseKey,
  getVideoOutKey,
  parseASSAndRebuild,
  removeFile,
  runFfmpeg,
  upload2Azure,
} from 'src/utils';
import { createWriteStream } from 'fs';
import { SocketGateway } from '../socket/socket.gateway';

@Processor('video')
export class VideoProcessor {
  private readonly logger = new Logger(VideoProcessor.name);

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

  @Process(JOB_GENERATE_VIDEO)
  async generateVideo(job: Job) {
    const { file, visitorId } = job.data;

    const userId = file?.userId;

    this.socket.updateProgress(10, userId, visitorId, MESSAGE_EXPORTING);

    // write vtt to the local file
    const srtVttPath = `/tmp/${file.key}-sub.srt`;
    const srtAssPath = `/tmp/${file.key}-sub.ass`;
    await writeFile(srtVttPath, file.vtt);
    await convertSrt2Ass(file.key);
    const metadata = buildMetadataForAss(file);
    parseASSAndRebuild(srtAssPath, metadata);

    this.socket.updateProgress(15, userId, visitorId, MESSAGE_EXPORTING);

    // generate a video using FFMpeg
    const videoKey = getVideoBaseKey(file.key, file.ext);
    const inputFile = `/tmp/${file.key}.${file.ext}`;
    const writableStream = createWriteStream(inputFile);
    await downloadBlobAsStream(videoKey, writableStream);

    this.socket.updateProgress(20, userId, visitorId, MESSAGE_EXPORTING);

    const output = await runFfmpeg(
      inputFile,
      file.key,
      file.duration,
      metadata,
      (progress: number) =>
        this.socket.updateProgress(
          20 + progress * 60,
          userId,
          visitorId,
          MESSAGE_EXPORTING,
        ),
    );

    // upload it to S3 bucket
    const videoOutKey = getVideoOutKey(file.key, file.ext);
    await upload2Azure(output, videoOutKey, (progress: number) =>
      this.socket.updateProgress(
        80 + progress * 19,
        userId,
        visitorId,
        MESSAGE_EXPORTING,
      ),
    );

    file.output = await getAzureBlob(videoOutKey);
    this.socket.updateProgress(100, userId, visitorId, MESSAGE_EXPORTING);
    file.status = COMPLETED;

    // remove files
    await removeFile(inputFile);
    await removeFile(output); // output video file
    await removeFile(srtVttPath); // vtt file
    await removeFile(srtAssPath); // ass file

    await this.fileService.updateFile(file.id, {
      status: COMPLETED,
    });

    file.status = COMPLETED;

    this.socket.completeJob(JOB_GENERATE_VIDEO, userId, visitorId, file);

    return file;
  }
}
