import { Injectable } from '@nestjs/common';
import { CreateCajaDto } from './dto/create-caja.dto';
import { UpdateCajaDto } from './dto/update-caja.dto';

@Injectable()
export class CajasService {
  create(createCajaDto: CreateCajaDto) {
    return 'This action adds a new caja';
  }

  findAll() {
    return `This action returns all cajas`;
  }

  findOne(id: number) {
    return `This action returns a #${id} caja`;
  }

  update(id: number, updateCajaDto: UpdateCajaDto) {
    return `This action updates a #${id} caja`;
  }

  remove(id: number) {
    return `This action removes a #${id} caja`;
  }
}
