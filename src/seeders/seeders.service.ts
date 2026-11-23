import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { Role } from 'src/auth/entities/role.entity';
import { Persona } from 'src/persona/entities/persona.entity';
import { Usuario } from 'src/usuario/entities/usuario.entity';
import { Categoria } from 'src/inventario/entities/categoria.entity';
import { Producto } from 'src/inventario/entities/producto.entity';
import {
  OperadoraNombre,
  OperadoraSaldo,
} from 'src/recargas/entities/operadora-saldo.entity';
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

const CATEGORIAS_BASE = [
  'Chips',
  'Tarjetas',
  'Cargadores',
  'Audífonos',
  'Accesorios',
  'Librería',
  'Recargas',
];

const PRODUCTOS_BASE: Array<{
  nombre: string;
  categoria: string;
  precio_venta: number;
  costo_compra: number;
  stock_actual: number;
  stock_minimo?: number;
}> = [
  { nombre: 'CHIP TIGO', categoria: 'Chips', precio_venta: 10, costo_compra: 6, stock_actual: 40 },
  { nombre: 'CHIP ENTEL', categoria: 'Chips', precio_venta: 10, costo_compra: 6, stock_actual: 40 },
  { nombre: 'CHIP VIVA', categoria: 'Chips', precio_venta: 10, costo_compra: 6, stock_actual: 30 },
  { nombre: 'TARJETA TIGO 20', categoria: 'Tarjetas', precio_venta: 20, costo_compra: 17, stock_actual: 25 },
  { nombre: 'TARJETA ENTEL 15', categoria: 'Tarjetas', precio_venta: 15, costo_compra: 13, stock_actual: 25 },
  { nombre: 'TARJETA VIVA 10', categoria: 'Tarjetas', precio_venta: 10, costo_compra: 8.5, stock_actual: 25 },
  { nombre: 'CARGADOR 20W', categoria: 'Cargadores', precio_venta: 35, costo_compra: 20, stock_actual: 15 },
  { nombre: 'AUDIFONOS BLUETOOTH', categoria: 'Audífonos', precio_venta: 80, costo_compra: 50, stock_actual: 10 },
  { nombre: 'CABLE USB-C', categoria: 'Accesorios', precio_venta: 15, costo_compra: 8, stock_actual: 20 },
  { nombre: 'CUADERNO 100 HOJAS', categoria: 'Librería', precio_venta: 12, costo_compra: 8, stock_actual: 50 },
  { nombre: 'HOJAS BON FOTOCOPIA', categoria: 'Librería', precio_venta: 1, costo_compra: 0.5, stock_actual: 500 },
  { nombre: 'TINTA IMPRESORA', categoria: 'Librería', precio_venta: 45, costo_compra: 30, stock_actual: 12 },
  { nombre: 'RECARGA TIGO', categoria: 'Recargas', precio_venta: 0, costo_compra: 0, stock_actual: 0 },
  { nombre: 'RECARGA ENTEL', categoria: 'Recargas', precio_venta: 0, costo_compra: 0, stock_actual: 0 },
  { nombre: 'RECARGA VIVA', categoria: 'Recargas', precio_venta: 0, costo_compra: 0, stock_actual: 0 },
  { nombre: 'VIVA BOX', categoria: 'Recargas', precio_venta: 0, costo_compra: 0, stock_actual: 0 },
  { nombre: 'KIOSCO VIVA', categoria: 'Recargas', precio_venta: 0, costo_compra: 0, stock_actual: 0 },
  { nombre: 'KIOSCO ENTEL', categoria: 'Recargas', precio_venta: 0, costo_compra: 0, stock_actual: 0 },
];

@Injectable()
export class SeedersService implements OnModuleInit {
  private readonly logger = new Logger(SeedersService.name);

  constructor(
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(Persona)
    private readonly personaRepo: Repository<Persona>,
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
    @InjectRepository(Categoria)
    private readonly categoriaRepo: Repository<Categoria>,
    @InjectRepository(Producto)
    private readonly productoRepo: Repository<Producto>,
    @InjectRepository(OperadoraSaldo)
    private readonly operadoraRepo: Repository<OperadoraSaldo>,
    @InjectRepository(RecargaCliente)
    private readonly recargaRepo: Repository<RecargaCliente>,
    @InjectRepository(InyeccionOperadora)
    private readonly inyeccionRepo: Repository<InyeccionOperadora>,
    @InjectRepository(Caja)
    private readonly cajaRepo: Repository<Caja>,
    @InjectRepository(SesionCaja)
    private readonly sesionRepo: Repository<SesionCaja>,
    @InjectRepository(MovimientoCaja)
    private readonly movimientoRepo: Repository<MovimientoCaja>,
    @InjectRepository(Agente)
    private readonly agenteRepo: Repository<Agente>,
    @InjectRepository(Venta)
    private readonly ventaRepo: Repository<Venta>,
    @InjectRepository(Compra)
    private readonly compraRepo: Repository<Compra>,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('🌱 Verificando datos iniciales...');

    await this.ejecutar('roles', () => this.seedRoles());
    await this.ejecutar('usuarios', () => this.seedUsuarios());
    await this.ejecutar('categorías', () => this.seedCategorias());
    await this.ejecutar('productos', () => this.seedProductos());
    await this.ejecutar('operadoras', () => this.seedOperadoras());
    await this.ejecutar('cajas', () => this.seedCajas());
    await this.ejecutar('agentes', () => this.seedAgentes());
    await this.ejecutar('datos demo', () => this.seedDatosDemo());
  }

  private async ejecutar(nombre: string, fn: () => Promise<void>): Promise<void> {
    try {
      await fn();
    } catch (error) {
      this.logger.error(
        `❌ No se pudo ejecutar el seeder de ${nombre}: ${error?.message || error}`,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Núcleo
  // ---------------------------------------------------------------------------

  private async seedRoles(): Promise<void> {
    const rolesBase = [
      { nombre: 'Administrador', descripcion: 'Administrador con acceso total' },
      { nombre: 'Operador', descripcion: 'Operador con permisos de puntuación' },
      { nombre: 'Usuario', descripcion: 'Usuario de grupo, solo lectura' },
    ];

    for (const rol of rolesBase) {
      const existe = await this.roleRepo.findOne({ where: { nombre: rol.nombre } });
      if (!existe) {
        await this.roleRepo.save(this.roleRepo.create(rol));
        this.logger.log(`✅ Rol creado: ${rol.nombre}`);
      }
    }
  }

  private async seedUsuarios(): Promise<void> {
    const adminRole = await this.roleRepo.findOne({ where: { nombre: 'Administrador' } });
    const operadorRole = await this.roleRepo.findOne({ where: { nombre: 'Operador' } });

    if (!adminRole || !operadorRole) {
      this.logger.warn('⚠️ No se encontraron los roles base; se omite el seeder de usuarios.');
      return;
    }

    const adminEmail = process.env.SEED_ADMIN_EMAIL || 'kanatuta@gmail.com';
    const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'kantuta123+';
    const operadorEmail1 = process.env.SEED_OPERATOR_EMAIL_1 || 'operador1@kantuta.local';
    const operadorEmail2 = process.env.SEED_OPERATOR_EMAIL_2 || 'operador2@kantuta.local';
    const operadorPassword = process.env.SEED_OPERATOR_PASSWORD || 'operador123+';

    // Admin: crear si no existe y reparar persona/rol si quedó incompleto.
    const admin = await this.usuarioRepo.findOne({
      where: { email: adminEmail },
      relations: ['persona', 'role'],
    });

    if (!admin) {
      const persona = await this.crearPersona('Sistema', 'Administrador', 'POS', 'M');
      await this.crearUsuario(
        'Sistema Admin',
        adminEmail,
        adminPassword,
        persona,
        adminRole,
      );
      this.logger.log(`✅ Usuario administrador creado: ${adminEmail}`);
    } else {
      let cambios = false;

      if (!admin.persona) {
        admin.persona = await this.crearPersona('Sistema', 'Administrador', 'POS', 'M');
        cambios = true;
      }
      if (!admin.role) {
        admin.role = adminRole;
        cambios = true;
      }
      if (cambios) {
        await this.usuarioRepo.save(admin);
        this.logger.log(`🔧 Usuario administrador reparado: ${adminEmail}`);
      }
    }

    const operadores = [
      {
        name: 'Operador Uno',
        email: operadorEmail1,
        nombres: 'Operador',
        p_apellido: 'Uno',
        genero: 'M',
      },
      {
        name: 'Operadora Dos',
        email: operadorEmail2,
        nombres: 'Operadora',
        p_apellido: 'Dos',
        genero: 'F',
      },
    ];

    for (const op of operadores) {
      const existe = await this.usuarioRepo.findOne({ where: { email: op.email } });
      if (existe) continue;

      const persona = await this.crearPersona(
        op.nombres,
        op.p_apellido,
        undefined,
        op.genero,
      );
      await this.crearUsuario(op.name, op.email, operadorPassword, persona, operadorRole);
      this.logger.log(`✅ Usuario operador creado: ${op.email}`);
    }
  }

  private async crearPersona(
    nombres: string,
    p_apellido: string,
    s_apellido: string | undefined,
    genero: string,
  ): Promise<Persona> {
    const persona = this.personaRepo.create({
      nombres,
      p_apellido,
      s_apellido,
      fecha_nacimiento: new Date('1990-01-01'),
      genero,
    });
    return await this.personaRepo.save(persona);
  }

  private async crearUsuario(
    name: string,
    email: string,
    password: string,
    persona: Persona,
    role: Role,
  ): Promise<Usuario> {
    const passwordHash = await bcrypt.hash(password, 10);
    const usuario = this.usuarioRepo.create({
      name,
      email,
      password: passwordHash,
      persona,
      role,
    });
    return await this.usuarioRepo.save(usuario);
  }

  private async seedCategorias(): Promise<void> {
    for (const nombre of CATEGORIAS_BASE) {
      const existe = await this.categoriaRepo.findOne({ where: { nombre } });
      if (!existe) {
        await this.categoriaRepo.save(this.categoriaRepo.create({ nombre }));
        this.logger.log(`✅ Categoría creada: ${nombre}`);
      }
    }
  }

  private async seedProductos(): Promise<void> {
    const categorias = await this.categoriaRepo.find();
    const mapaCategorias = new Map(categorias.map((c) => [c.nombre, c]));

    for (const base of PRODUCTOS_BASE) {
      const existe = await this.productoRepo.findOne({ where: { nombre: base.nombre } });
      if (existe) continue;

      const categoria = mapaCategorias.get(base.categoria);
      if (!categoria) {
        this.logger.warn(`⚠️ Sin categoría ${base.categoria} para ${base.nombre}`);
        continue;
      }

      await this.productoRepo.save(
        this.productoRepo.create({
          nombre: base.nombre,
          precio_venta: base.precio_venta,
          costo_compra: base.costo_compra,
          stock_actual: base.stock_actual,
          stock_minimo: base.stock_minimo ?? 3,
          categoria,
        }),
      );
      this.logger.log(`✅ Producto creado: ${base.nombre}`);
    }
  }

  private async seedOperadoras(): Promise<void> {
    for (const nombre of Object.values(OperadoraNombre)) {
      const existe = await this.operadoraRepo.findOne({
        where: { nombre_operadora: nombre },
      });
      if (!existe) {
        await this.operadoraRepo.save(
          this.operadoraRepo.create({ nombre_operadora: nombre, saldo_actual: 0 }),
        );
        this.logger.log(`✅ Operadora creada: ${nombre}`);
      }
    }
  }

  private async seedCajas(): Promise<void> {
    const cajasBase = [
      { nombre: 'Caja Principal', especialidad: 'MIXTA', saldo: 0 },
      { nombre: 'Caja Agentes', especialidad: 'SOLO_AGENTES', saldo: 0 },
    ];

    for (const caja of cajasBase) {
      const existe = await this.cajaRepo.findOne({ where: { nombre: caja.nombre } });
      if (!existe) {
        await this.cajaRepo.save(this.cajaRepo.create(caja));
        this.logger.log(`✅ Caja creada: ${caja.nombre}`);
      }
    }
  }

  private async seedAgentes(): Promise<void> {
    const existe = await this.agenteRepo.findOne({ where: { nombre_banco: 'AGENTE BCP' } });
    if (existe) return;

    await this.agenteRepo.save(
      this.agenteRepo.create({
        nombre_banco: 'AGENTE BCP',
        monto_total: 0,
        monto_efectivo: 0,
        monto_banco: 0,
        monto_cuentas_por_cobrar: 0,
        descripcion: 'Agente semilla para operaciones de banco',
      }),
    );
    this.logger.log('✅ Agente creado: AGENTE BCP');
  }

  // ---------------------------------------------------------------------------
  // Datos demo (solo si las tablas de movimiento están vacías)
  // ---------------------------------------------------------------------------

  private async seedDatosDemo(): Promise<void> {
    if ((process.env.SEED_DEMO_DATA || 'true').toLowerCase() === 'false') {
      this.logger.log('ℹ️ Datos demo desactivados por SEED_DEMO_DATA=false.');
      return;
    }

    const [ventas, compras, recargas] = await Promise.all([
      this.ventaRepo.count(),
      this.compraRepo.count(),
      this.recargaRepo.count(),
    ]);

    if (ventas > 0 || compras > 0 || recargas > 0) {
      this.logger.log('✅ Datos demo omitidos: ya existen movimientos en la BD.');
      return;
    }

    const operador = await this.usuarioRepo.findOne({
      where: { email: process.env.SEED_OPERATOR_EMAIL_1 || 'operador1@kantuta.local' },
      relations: ['role'],
    });
    const caja = await this.cajaRepo.findOne({ where: { nombre: 'Caja Principal' } });

    if (!operador || !caja) {
      this.logger.warn('⚠️ Faltan operador o caja para sembrar datos demo.');
      return;
    }

    const productos = await this.productoRepo.find();
    const prod = (nombre: string) => productos.find((p) => p.nombre === nombre);
    const chipTigo = prod('CHIP TIGO');
    const cargador = prod('CARGADOR 20W');
    const audifonos = prod('AUDIFONOS BLUETOOTH');
    const cuaderno = prod('CUADERNO 100 HOJAS');
    const tinta = prod('TINTA IMPRESORA');

    if (!chipTigo || !cargador || !audifonos || !cuaderno || !tinta) {
      this.logger.warn('⚠️ Faltan productos base para sembrar datos demo.');
      return;
    }

    const sesion = await this.sesionRepo.save(
      this.sesionRepo.create({
        monto_inicial: 500,
        monto_inicial_esperado: 500,
        monto_inicial_declarado: 500,
        monto_final_teorico: 559,
        monto_esperado: 559,
        monto_final_real: 559,
        monto_real_fisico: 559,
        diferencia: 0,
        monto_diferencia: 0,
        estado_arqueo: 'CUADRADO',
        estado_sesion: 'CERRADA',
        fecha_cierre: new Date(),
        id_caja: caja.id,
        id_usuario: operador.id,
      }),
    );

    // Ventas
    const ventasDemo = [
      {
        metodo_pago: 'EFECTIVO',
        estado_venta: 'COMPLETADA',
        detalles: [
          { producto: chipTigo, cantidad: 2 },
          { producto: cargador, cantidad: 1 },
        ],
      },
      {
        metodo_pago: 'QR',
        estado_venta: 'COMPLETADA',
        detalles: [{ producto: audifonos, cantidad: 1 }],
      },
      {
        metodo_pago: 'CUENTA_POR_COBRAR',
        estado_venta: 'COMPLETADA',
        detalles: [{ producto: cuaderno, cantidad: 1 }],
      },
      {
        metodo_pago: 'EFECTIVO',
        estado_venta: 'COMPLETADA',
        detalles: [{ producto: tinta, cantidad: 1 }],
      },
    ];

    for (const ventaDemo of ventasDemo) {
      const detalles = ventaDemo.detalles.map((d) => {
        const precio = Number(d.producto.precio_venta);
        return {
          id_producto: d.producto.id,
          cantidad: d.cantidad,
          precio_unitario: precio,
          subtotal: Math.round(precio * d.cantidad * 100) / 100,
        };
      });
      const total = detalles.reduce((acc, d) => acc + d.subtotal, 0);

      await this.ventaRepo.save(
        this.ventaRepo.create({
          total,
          metodo_pago: ventaDemo.metodo_pago,
          estado_venta: ventaDemo.estado_venta,
          id_sesion_caja: sesion.id,
          detalles: detalles as DetalleVenta[],
          id_user_create: operador.id,
        }),
      );
    }

    // Compras pagadas con caja
    const compra = await this.compraRepo.save(
      this.compraRepo.create({
        proveedor: 'Proveedor Central',
        total: 110,
        pagado_con_caja: true,
        id_sesion_caja: sesion.id,
        id_user_create: operador.id,
        detalles: [
          {
            id_producto: cuaderno.id,
            cantidad: 10,
            costo_unitario: 8,
            subtotal: 80,
          },
          {
            id_producto: chipTigo.id,
            cantidad: 5,
            costo_unitario: 6,
            subtotal: 30,
          },
        ] as DetalleCompra[],
      }),
    );

    // Recargas y fondeos (el ejemplo Tigo 200 - 186 = 14)
    await this.recargaRepo.save([
      this.recargaRepo.create({
        operadora: OperadoraNombre.TIGO,
        numero_cliente: '70000001',
        monto: 200,
        id_caja_sesion: sesion.id,
        id_user_create: operador.id,
      }),
      this.recargaRepo.create({
        operadora: OperadoraNombre.ENTEL,
        numero_cliente: '70000002',
        monto: 50,
        id_caja_sesion: sesion.id,
        id_user_create: operador.id,
      }),
      this.recargaRepo.create({
        operadora: OperadoraNombre.VIVA,
        numero_cliente: '70000003',
        monto: 30,
        id_caja_sesion: sesion.id,
        id_user_create: operador.id,
      }),
    ]);

    await this.inyeccionRepo.save([
      this.inyeccionRepo.create({
        operadora_destino: OperadoraNombre.TIGO,
        monto: 186,
        id_caja_origen: sesion.id,
        id_user_create: operador.id,
      }),
      this.inyeccionRepo.create({
        operadora_destino: OperadoraNombre.ENTEL,
        monto: 60,
        id_caja_origen: sesion.id,
        id_user_create: operador.id,
      }),
      this.inyeccionRepo.create({
        operadora_destino: OperadoraNombre.VIVA,
        monto: 20,
        id_caja_origen: sesion.id,
        id_user_create: operador.id,
      }),
    ]);

    // Movimientos de caja espejo de recargas, fondeos, compra y un gasto
    await this.movimientoRepo.save([
      this.movimientoRepo.create({
        tipo: 'INGRESO',
        monto: 200,
        motivo: 'Venta de recarga a cliente 70000001 (Tigo)',
        id_sesion_caja: sesion.id,
        id_user_create: operador.id,
      }),
      this.movimientoRepo.create({
        tipo: 'INGRESO',
        monto: 50,
        motivo: 'Venta de recarga a cliente 70000002 (Entel)',
        id_sesion_caja: sesion.id,
        id_user_create: operador.id,
      }),
      this.movimientoRepo.create({
        tipo: 'INGRESO',
        monto: 30,
        motivo: 'Venta de recarga a cliente 70000003 (Viva)',
        id_sesion_caja: sesion.id,
        id_user_create: operador.id,
      }),
      this.movimientoRepo.create({
        tipo: 'EGRESO',
        monto: 186,
        motivo: 'Fondeo de saldo a operadora Tigo',
        id_sesion_caja: sesion.id,
        id_user_create: operador.id,
      }),
      this.movimientoRepo.create({
        tipo: 'EGRESO',
        monto: 60,
        motivo: 'Fondeo de saldo a operadora Entel',
        id_sesion_caja: sesion.id,
        id_user_create: operador.id,
      }),
      this.movimientoRepo.create({
        tipo: 'EGRESO',
        monto: 20,
        motivo: 'Fondeo de saldo a operadora Viva',
        id_sesion_caja: sesion.id,
        id_user_create: operador.id,
      }),
      this.movimientoRepo.create({
        tipo: 'EGRESO',
        monto: compra.total,
        motivo: `Compra de mercancía - ID Compra: ${compra.id}`,
        id_sesion_caja: sesion.id,
        id_user_create: operador.id,
      }),
      this.movimientoRepo.create({
        tipo: 'EGRESO',
        monto: 25,
        motivo: 'Pago de refrigerio',
        id_sesion_caja: sesion.id,
        id_user_create: operador.id,
      }),
    ]);

    const saldoCaja = 559;
    caja.saldo = saldoCaja;
    await this.cajaRepo.save(caja);

    this.logger.log('✅ Datos demo creados (ventas, compras, recargas y movimientos).');
  }
}
