import { BullModule } from '@nestjs/bull';
import { Global, Module } from '@nestjs/common';

import { FileController } from './file.controller';
import { FileService } from './file.service';
import { FileProcessor } from './file.processor';
import { MonsterProcessor } from './monster.processor';
import { VideoProcessor } from './video.processor';

@Global()
@Module({
  imports: [
    BullModule.registerQueue({
      name: 'file',
    }),
    BullModule.registerQueue({
      name: 'monster',
    }),
    BullModule.registerQueue({
      name: 'video',
    }),
  ],
  controllers: [FileController],
  providers: [FileProcessor, MonsterProcessor, VideoProcessor, FileService],
  exports: [FileService],
})
export class FileModule {}
