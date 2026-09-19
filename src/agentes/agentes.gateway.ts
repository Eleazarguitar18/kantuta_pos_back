import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class AgentesGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log('Cliente conectado a AgentesGateway:', client.id);
  }

  handleDisconnect(client: Socket) {
    console.log('Cliente desconectado de AgentesGateway:', client.id);
  }

  /**
   * Emite cuando se crea un nuevo banco/agente.
   */
  emitAgenteCreado(data: any) {
    console.log('Emitiendo agente:creado', data);
    this.server?.emit('agente:creado', data);
  }

  /**
   * Emite cuando se registra un movimiento o se actualiza un banco.
   */
  emitAgenteActualizado(data: any) {
    console.log('Emitiendo agente:actualizado', data);
    this.server?.emit('agente:actualizado', data);
  }
}
