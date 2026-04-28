import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsString, Min, IsNotEmpty, IsInt, IsOptional } from 'class-validator';

export enum TipoOperacionAgente {
    DEPOSITO = 'DEPOSITO',
    RETIRO = 'RETIRO',
    TRANSFERENCIA_QR = 'TRANSFERENCIA_QR'
}

export class CrearTransaccionAgenteDto {
    @ApiProperty({ example: 'TIGO_MONEY', description: 'Nombre del banco o servicio' })
    @IsString()
    @IsNotEmpty()
    banco: string;

    @ApiProperty({ example: 'DEPOSITO', enum: TipoOperacionAgente })
    @IsEnum(TipoOperacionAgente)
    tipo_operacion: TipoOperacionAgente;

    @ApiProperty({ example: 1000.00 })
    @IsNumber()
    @Min(1)
    monto: number;

    @ApiProperty({ example: 5.00, required: false })
    @IsNumber()
    @IsOptional()
    comision_cliente?: number;

    @ApiProperty({ example: '8827334', description: 'Número de referencia del banco' })
    @IsString()
    @IsNotEmpty()
    nro_referencia: string;

    @ApiProperty({ example: 101 })
    @IsInt()
    @IsNotEmpty()
    sesion_caja_id: number;
}