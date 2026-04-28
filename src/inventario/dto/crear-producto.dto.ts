import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Min, IsInt, IsNotEmpty } from 'class-validator';

export class CrearProductoDto {
  @ApiProperty({ example: 'Audífonos Bluetooth Sony', description: 'Nombre completo del producto' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ example: '10203040', required: false })
  @IsOptional()
  @IsString()
  codigo_barras?: string;

  @ApiProperty({ example: 120.00 })
  @IsNumber()
  @Min(0)
  precio_venta: number;

  @ApiProperty({ example: 70.00 })
  @IsNumber()
  @Min(0)
  costo_compra: number;

  @ApiProperty({ example: 15 })
  @IsInt()
  @Min(0)
  stock_actual: number;

  @ApiProperty({ example: 5 })
  @IsInt()
  @Min(0)
  stock_minimo: number;

  @ApiProperty({ example: 1, description: 'ID de la categoría a la que pertenece' })
  @IsInt()
  categoriaId: number;
}