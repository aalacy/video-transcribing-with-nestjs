import { OnQueueError, OnQueueFailed, Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';

import { JOB_MONSTER_TRANSCRIPTION } from 'src/constants';
import { parseAndGenerateVTT } from 'src/utils';
import { FileService } from './file.service';

@Processor('monster')
export class MonsterProcessor {
  private readonly logger = new Logger(MonsterProcessor.name);

  constructor(private fileService: FileService) {}

  @OnQueueError()
  handleError(error: Error) {
    this.logger.log(error);
  }

  @OnQueueFailed()
  handleFailed(job: Job, error: Error) {
    this.logger.log(job, error);
  }

  @Process(JOB_MONSTER_TRANSCRIPTION)
  async handleUpload(job: Job) {
    const { monster } = job.data;
    this.logger.log('[Monster callback]', monster);
    const processId = monster.process_id;
    const vttContent = parseAndGenerateVTT(monster.result.data);

    return this.fileService.updateFileWithMonster(processId, vttContent);
  }
}
