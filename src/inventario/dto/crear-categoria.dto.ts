import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CrearCategoriaDto {
  @ApiProperty({ example: 'Accesorios', description: 'Nombre de la categoría' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre: string;

  @ApiProperty({ example: 1 })
  @IsNotEmpty()
  id_user_create: number;

  @ApiProperty({ example: 1 })
  @IsOptional()
  id_user_update?: number;
}
