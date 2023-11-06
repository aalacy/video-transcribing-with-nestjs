import {
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsResponse,
} from '@nestjs/websockets';
import { File as FileModel } from '@prisma/client';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Socket, Server } from 'socket.io';

import { MESSAGE_UPLOADING } from 'src/constants';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class SocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('events')
  findAll(@MessageBody() data: any): Observable<WsResponse<number>> {
    return from([1, 2, 3]).pipe(
      map((item) => ({ event: 'events', data: item })),
    );
  }

  @SubscribeMessage('identity')
  async identity(@MessageBody() data: number): Promise<number> {
    return data;
  }

  send2Client(data) {
    this.server.emit('monster', data);
  }

  completeJob(
    jobName: string,
    userId: number,
    visitorId: string,
    file: FileModel,
    message: string = '',
  ) {
    this.send2Client({
      jobName,
      file,
      userId,
      visitorId,
      message,
      status: 'completed',
    });
  }

  updateProgress(
    percent: number,
    userId: number,
    visitorId: string,
    message: string = MESSAGE_UPLOADING,
    jobName: string = 'upload',
  ) {
    this.send2Client({
      jobName,
      message,
      percent,
      userId,
      visitorId,
      status: 'progress',
    });
  }

  afterInit(server: Server) {
    console.log(server);
  }

  handleDisconnect(client: Socket) {
    console.log(`Disconnected: ${client.id}`);
  }

  handleConnection(client: Socket) {
    console.log(`Connected ${client.id}`);
  }
}
