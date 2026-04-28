import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CajasService } from './cajas.service';
import { CreateCajaDto } from './dto/create-caja.dto';
import { UpdateCajaDto } from './dto/update-caja.dto';

@Controller('cajas')
export class CajasController {
  constructor(private readonly cajasService: CajasService) {}

  @Post()
  create(@Body() createCajaDto: CreateCajaDto) {
    return this.cajasService.create(createCajaDto);
  }

  @Get()
  findAll() {
    return this.cajasService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.cajasService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCajaDto: UpdateCajaDto) {
    return this.cajasService.update(+id, updateCajaDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.cajasService.remove(+id);
  }
}
