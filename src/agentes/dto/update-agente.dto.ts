import { PartialType } from '@nestjs/swagger';
import { CrearTransaccionAgenteDto } from './crear-transaccion-agente.dto';

export class UpdateAgenteDto extends PartialType(CrearTransaccionAgenteDto) { }
