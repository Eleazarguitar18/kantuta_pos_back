import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AgentesService } from './agentes.service';
import { CreateAgenteDto } from './dto/crear-transaccion-agente.dto';
import { UpdateAgenteDto } from './dto/update-agente.dto';

@Controller('agentes')
export class AgentesController {
  constructor(private readonly agentesService: AgentesService) { }

  @Post()
  create(@Body() createAgenteDto: CreateAgenteDto) {
    return this.agentesService.create(createAgenteDto);
  }

  @Get()
  findAll() {
    return this.agentesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.agentesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAgenteDto: UpdateAgenteDto) {
    return this.agentesService.update(+id, updateAgenteDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.agentesService.remove(+id);
  }
}
