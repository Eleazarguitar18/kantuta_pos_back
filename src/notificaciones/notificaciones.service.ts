import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificacionContacto } from './entities/notificacion-contacto.entity';
import { CreateContactoDto, UpdateContactoDto } from './dto/contacto.dto';

@Injectable()
export class NotificacionesService implements OnModuleInit {
  private readonly logger = new Logger(NotificacionesService.name);

  constructor(
    @InjectRepository(NotificacionContacto)
    private readonly contactoRepository: Repository<NotificacionContacto>,
  ) {}

  /**
   * Seeder automático: inserta los contactos iniciales de la empresa
   * solo si aún no existe ningún contacto en la base de datos.
   */
  async onModuleInit() {
    await this.ejecutarSeeder();
  }

  private async ejecutarSeeder() {
    const count = await this.contactoRepository.count();
    if (count > 0) {
      this.logger.log(
        `✅ Seeder omitido: ya existen ${count} contacto(s) en la BD.`,
      );
      return;
    }

    const contactosIniciales: CreateContactoDto[] = [
      {
        nombre: 'Ruddy Medrano',
        codigo_pais: '591',
        telefono: '79678667',
        recibe_stock_bajo: true,
        recibe_cierre_caja: false,
        activo: true,
      },
      {
        nombre: 'Mariela',
        codigo_pais: '591',
        telefono: '69906080',
        recibe_stock_bajo: true,
        recibe_cierre_caja: false,
        activo: true,
      },
      {
        nombre: 'Mariela 2',
        codigo_pais: '591',
        telefono: '70590596',
        recibe_stock_bajo: true,
        recibe_cierre_caja: false,
        activo: true,
      },
    ];

    await this.contactoRepository.save(
      this.contactoRepository.create(contactosIniciales),
    );
    this.logger.log(
      `🌱 Seeder ejecutado: ${contactosIniciales.length} contacto(s) iniciales insertados.`,
    );
  }

  // ---------------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------------

  async create(dto: CreateContactoDto): Promise<NotificacionContacto> {
    const nuevo = this.contactoRepository.create({
      codigo_pais: '591',
      recibe_stock_bajo: true,
      recibe_cierre_caja: false,
      activo: true,
      ...dto,
    });
    return await this.contactoRepository.save(nuevo);
  }

  async findAll(): Promise<NotificacionContacto[]> {
    return await this.contactoRepository.find({
      order: { created_at: 'ASC' },
    });
  }

  /**
   * Devuelve solo los contactos activos que deben recibir alertas de stock bajo.
   * Usado internamente por StockAlertService.
   */
  async findActivosStock(): Promise<NotificacionContacto[]> {
    return await this.contactoRepository.find({
      where: { activo: true, recibe_stock_bajo: true },
    });
  }

  async findOne(id: string): Promise<NotificacionContacto> {
    const contacto = await this.contactoRepository.findOne({ where: { id } });
    if (!contacto) {
      throw new NotFoundException(`Contacto con id "${id}" no encontrado.`);
    }
    return contacto;
  }

  async update(
    id: string,
    dto: UpdateContactoDto,
  ): Promise<NotificacionContacto> {
    const contacto = await this.findOne(id);
    Object.assign(contacto, dto);
    return await this.contactoRepository.save(contacto);
  }

  async remove(id: string): Promise<{ message: string }> {
    const contacto = await this.findOne(id);
    await this.contactoRepository.remove(contacto);
    return { message: `Contacto "${contacto.nombre}" eliminado correctamente.` };
  }

  /**
   * Endpoint de utilidad: fuerza la re-ejecución del seeder manualmente.
   * Solo inserta si la tabla está vacía.
   */
  async ejecutarSeederManual(): Promise<{ message: string }> {
    const count = await this.contactoRepository.count();
    if (count > 0) {
      return {
        message: `Seeder omitido: ya existen ${count} contacto(s).`,
      };
    }
    await this.ejecutarSeeder();
    return { message: 'Seeder ejecutado correctamente.' };
  }
}
