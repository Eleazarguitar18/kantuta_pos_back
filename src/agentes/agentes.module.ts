import { Module } from '@nestjs/common';
import { AgentesService } from './agentes.service';
import { AgentesController } from './agentes.controller';

@Module({
  controllers: [AgentesController],
  providers: [AgentesService],
})
export class AgentesModule {}
