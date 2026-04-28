import { Injectable } from '@nestjs/common';
import { CreateAgenteDto } from './dto/crear-transaccion-agente.dto';
import { UpdateAgenteDto } from './dto/update-agente.dto';

@Injectable()
export class AgentesService {
  create(createAgenteDto: CreateAgenteDto) {
    return 'This action adds a new agente';
  }

  findAll() {
    return `This action returns all agentes`;
  }

  findOne(id: number) {
    return `This action returns a #${id} agente`;
  }

  update(id: number, updateAgenteDto: UpdateAgenteDto) {
    return `This action updates a #${id} agente`;
  }

  remove(id: number) {
    return `This action removes a #${id} agente`;
  }
}
