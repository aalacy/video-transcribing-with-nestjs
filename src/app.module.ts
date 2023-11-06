import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { FileModule } from './modules/file/file.module';
import { SocketModule } from './modules/socket/socket.module';
import { FaqModule } from './modules/faq/faq.module';
import { PrismaModule } from './modules/prisma/prisma.module';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: () => ({
        redis: {
          host: 'localhost',
          port: 6379,
        },
      }),
      inject: [ConfigService],
    }),
    ConfigModule.forRoot({ cache: true }),
    UsersModule,
    AuthModule,
    FileModule,
    SocketModule,
    FaqModule,
    PrismaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
