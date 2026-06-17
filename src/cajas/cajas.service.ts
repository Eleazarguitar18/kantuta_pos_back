import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Caja } from './entities/caja.entity';
import { SesionCaja } from './entities/sesion-caja.entity';
import { MovimientoCaja } from './entities/movimiento-caja.entity';
import { AbrirCajaDto } from './dto/abrir-caja.dto';
import { CerrarCajaDto } from './dto/cerrar-caja.dto';
import { CrearMovimientoDto } from './dto/crear-movimiento.dto';
import { CreateCajaDto } from './dto/create-caja.dto';
import { UpdateCajaDto } from './dto/update-caja.dto';

@Injectable()
export class CajasService {
  constructor(
    @InjectRepository(Caja)
    private readonly cajaRepository: Repository<Caja>,
    @InjectRepository(SesionCaja)
    private readonly sesionCajaRepository: Repository<SesionCaja>,
    @InjectRepository(MovimientoCaja)
    private readonly movimientoCajaRepository: Repository<MovimientoCaja>,
  ) {}

  async create(createCajaDto: CreateCajaDto): Promise<Caja> {
    const caja = this.cajaRepository.create(createCajaDto);
    return this.cajaRepository.save(caja);
  }

  async findAllCajas(): Promise<Caja[]> {
    return this.cajaRepository.find({ where: { estado: true } });
  }

  async findCaja(id: number): Promise<Caja> {
    const caja = await this.cajaRepository.findOne({
      where: { id, estado: true },
      relations: ['sesiones'],
    });
    if (!caja)
      throw new NotFoundException(`Caja con ID ${id} no encontrada o inactiva`);
    return caja;
  }

  async update(id: number, updateCajaDto: UpdateCajaDto): Promise<Caja> {
    const caja = await this.findCaja(id);
    const updatedCaja = Object.assign(caja, updateCajaDto);
    return this.cajaRepository.save(updatedCaja);
  }

  async abrirCaja(abrirCajaDto: AbrirCajaDto, userRole?: string): Promise<SesionCaja> {
    const { id_caja, id_usuario, id_user_create } = abrirCajaDto;
    let { monto_inicial } = abrirCajaDto;

    const caja = await this.cajaRepository.findOneBy({
      id: id_caja,
      estado: true,
    });
    if (!caja)
      throw new NotFoundException(
        `Caja con id ${id_caja} no encontrada o inactiva`,
      );

    const sesionAbierta = await this.sesionCajaRepository.findOne({
      where: { id_caja: id_caja, estado_sesion: 'ABIERTA', estado: true },
    });

    if (sesionAbierta) {
      throw new BadRequestException(`La caja ya tiene una sesión abierta`);
    }

    const lastSession = await this.sesionCajaRepository.findOne({
      where: { id_caja },
      order: { id: 'DESC' },
    });

    if (userRole === 'Operador') {
      monto_inicial = lastSession 
        ? (lastSession.monto_final_real ?? lastSession.monto_final_teorico ?? 0) 
        : (caja.monto_creacion ?? 0);
    } else {
      // Si el admin no mandó monto_inicial para corrección, se hereda normalmente
      if (monto_inicial === undefined || monto_inicial === null) {
        monto_inicial = lastSession 
          ? (lastSession.monto_final_real ?? lastSession.monto_final_teorico ?? 0) 
          : (caja.monto_creacion ?? 0);
      }
    }

    const sesion = this.sesionCajaRepository.create({
      id_caja,
      monto_inicial,
      id_usuario,
      estado_sesion: 'ABIERTA',
      id_user_create,
    });

    return this.sesionCajaRepository.save(sesion);
  }

  async cerrarCaja(
    idSesion: number,
    cerrarCajaDto: CerrarCajaDto,
  ): Promise<SesionCaja> {
    const { id_user_update } = cerrarCajaDto;
    const sesion = await this.sesionCajaRepository.findOneBy({
      id: idSesion,
      estado: true,
    });
    if (!sesion)
      throw new NotFoundException(
        `Sesión con ID ${idSesion} no encontrada o inactiva`,
      );
    if (sesion.estado_sesion === 'CERRADA')
      throw new BadRequestException(`La sesión ya está cerrada`);

    const movimientos = await this.movimientoCajaRepository.find({
      where: { id_sesion_caja: idSesion, estado: true },
    });

    let totalIngresos = 0;
    let totalEgresos = 0;

    for (const mov of movimientos) {
      if (mov.tipo === 'INGRESO') totalIngresos += Number(mov.monto);
      else if (mov.tipo === 'EGRESO') totalEgresos += Number(mov.monto);
    }

    const monto_final_teorico =
      Number(sesion.monto_inicial) + totalIngresos - totalEgresos;
    const { monto_final_real } = cerrarCajaDto;
    const diferencia = monto_final_real - monto_final_teorico;

    sesion.monto_final_teorico = monto_final_teorico;
    sesion.monto_final_real = monto_final_real;
    sesion.diferencia = diferencia;
    sesion.estado_sesion = 'CERRADA';
    sesion.fecha_cierre = new Date();
    sesion.id_user_update = id_user_update;

    return this.sesionCajaRepository.save(sesion);
  }

  async crearMovimiento(
    crearMovimientoDto: CrearMovimientoDto,
  ): Promise<MovimientoCaja> {
    const { id_sesion_caja, monto, tipo, motivo, id_user_create } =
      crearMovimientoDto;

    const sesion = await this.sesionCajaRepository.findOneBy({
      id: id_sesion_caja,
      estado: true,
    });
    if (!sesion)
      throw new NotFoundException(
        `Sesión de caja con ID ${id_sesion_caja} no encontrada o inactiva`,
      );
    if (sesion.estado_sesion !== 'ABIERTA')
      throw new BadRequestException(
        `No se pueden registrar movimientos en una sesión cerrada`,
      );

    const movimiento = this.movimientoCajaRepository.create({
      id_sesion_caja,
      monto,
      tipo,
      motivo,
      id_user_create,
    });

    return this.movimientoCajaRepository.save(movimiento);
  }

  async getSesionActivaUsuario(id_usuario: number): Promise<SesionCaja> {
    const sesion = await this.sesionCajaRepository.findOne({
      where: { id_usuario, estado_sesion: 'ABIERTA', estado: true },
    });
    if (!sesion) {
      throw new NotFoundException(`No hay sesión activa para el usuario ${id_usuario}`);
    }
    return sesion;
  }

  async getSesionBalance(idSesion: number): Promise<any> {
    const sesion = await this.sesionCajaRepository.findOneBy({
      id: idSesion,
      estado: true,
    });
    if (!sesion) {
      throw new NotFoundException(`Sesión con ID ${idSesion} no encontrada o inactiva`);
    }

    const movimientos = await this.movimientoCajaRepository.find({
      where: { id_sesion_caja: idSesion, estado: true },
    });

    let totalIngresos = 0;
    let totalEgresos = 0;

    for (const mov of movimientos) {
      if (mov.tipo === 'INGRESO') totalIngresos += Number(mov.monto);
      else if (mov.tipo === 'EGRESO') totalEgresos += Number(mov.monto);
    }

    const monto_final_teorico = Number(sesion.monto_inicial) + totalIngresos - totalEgresos;

    return {
      monto_inicial: Number(sesion.monto_inicial),
      ingresos: totalIngresos,
      egresos: totalEgresos,
      monto_final_teorico,
    };
  }

  async softDeleteCaja(id: number, id_user_update: number): Promise<void> {
    const caja = await this.findCaja(id);
    caja.estado = false;
    caja.id_user_update = id_user_update;
    await this.cajaRepository.save(caja);
  }
}
