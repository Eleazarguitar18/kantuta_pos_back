import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Role } from 'src/auth/entities/role.entity';
import { Persona } from 'src/persona/entities/persona.entity';
import { Usuario } from 'src/usuario/entities/usuario.entity';
import { Categoria } from 'src/inventario/entities/categoria.entity';
import { Producto } from 'src/inventario/entities/producto.entity';
import { OperadoraSaldo } from 'src/recargas/entities/operadora-saldo.entity';
import { RecargaCliente } from 'src/recargas/entities/recarga-cliente.entity';
import { InyeccionOperadora } from 'src/recargas/entities/inyeccion-operadora.entity';
import { Caja } from 'src/cajas/entities/caja.entity';
import { SesionCaja } from 'src/cajas/entities/sesion-caja.entity';
import { MovimientoCaja } from 'src/cajas/entities/movimiento-caja.entity';
import { Agente } from 'src/agentes/entities/agente.entity';
import { Venta } from 'src/ventas/entities/venta.entity';
import { DetalleVenta } from 'src/ventas/entities/detalle-venta.entity';
import { Compra } from 'src/compras/entities/compra.entity';
import { DetalleCompra } from 'src/compras/entities/detalle-compra.entity';
import { SeedersService } from './seeders.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Role,
      Persona,
      Usuario,
      Categoria,
      Producto,
      OperadoraSaldo,
      RecargaCliente,
      InyeccionOperadora,
      Caja,
      SesionCaja,
      MovimientoCaja,
      Agente,
      Venta,
      DetalleVenta,
      Compra,
      DetalleCompra,
    ]),
  ],
  providers: [SeedersService],
})
export class SeedersModule {}
