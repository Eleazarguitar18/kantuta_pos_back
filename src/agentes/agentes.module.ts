import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentesService } from './agentes.service';
import { AgentesController } from './agentes.controller';
import { Agente } from './entities/agente.entity';
import { TransaccionAgente } from './entities/transaccion-agente.entity';
import { OperadorDeuda } from './entities/operador-deuda.entity';
import { AgentesGateway } from './agentes.gateway';
import { Usuario } from '../usuario/entities/usuario.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Agente, TransaccionAgente, OperadorDeuda, Usuario]),
  ],
  controllers: [AgentesController],
  providers: [AgentesService, AgentesGateway],
  exports: [AgentesService, AgentesGateway],
})
export class AgentesModule {}
