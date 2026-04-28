import { PartialType } from '@nestjs/swagger';
import { CreateAgenteDto } from './crear-transaccion-agente.dto';

export class UpdateAgenteDto extends PartialType(CreateAgenteDto) { }
