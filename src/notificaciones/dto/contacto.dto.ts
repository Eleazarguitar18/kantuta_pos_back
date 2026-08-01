import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';

export class CreateContactoDto {
  @ApiProperty({ example: 'Ruddy Medrano' })
  @IsNotEmpty()
  @IsString()
  nombre: string;

  @ApiProperty({ example: '591', default: '591', required: false })
  @IsOptional()
  @IsString()
  @Length(1, 5)
  codigo_pais?: string;

  @ApiProperty({ example: '79678667' })
  @IsNotEmpty()
  @IsString()
  @Length(6, 15)
  telefono: string;

  @ApiProperty({ example: true, required: false, default: true })
  @IsOptional()
  @IsBoolean()
  recibe_stock_bajo?: boolean;

  @ApiProperty({ example: false, required: false, default: false })
  @IsOptional()
  @IsBoolean()
  recibe_cierre_caja?: boolean;

  @ApiProperty({ example: true, required: false, default: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class UpdateContactoDto extends PartialType(CreateContactoDto) {}
