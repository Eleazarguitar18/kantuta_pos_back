import { Test, TestingModule } from '@nestjs/testing';
import { CajasService } from './cajas.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Caja } from './entities/caja.entity';
import { SesionCaja } from './entities/sesion-caja.entity';
import { MovimientoCaja } from './entities/movimiento-caja.entity';
import { PrestamoCaja } from './entities/prestamo-caja.entity';
import { CajaDesgloseCortes } from './entities/caja-desglose-cortes.entity';
import { DescuadreCajaInventario } from './entities/descuadre-caja-inventario.entity';
import { DescuadreInventarioCaja } from './entities/descuadre-inventario-caja.entity';
import { Producto } from '../inventario/entities/producto.entity';
import { Venta } from '../ventas/entities/venta.entity';
import { AppGateway } from '../gateway/app.gateway';

describe('CajasService', () => {
  let service: CajasService;

  const mockCajaRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
  };

  const mockSesionCajaRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
  };

  const mockMovimientoCajaRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  const mockGenericRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
  };

  const mockDataSource = {
    createQueryRunner: jest.fn(),
  };

  const mockAppGateway = {
    notifyDataChange: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CajasService,
        {
          provide: getRepositoryToken(Caja),
          useValue: mockCajaRepository,
        },
        {
          provide: getRepositoryToken(SesionCaja),
          useValue: mockSesionCajaRepository,
        },
        {
          provide: getRepositoryToken(MovimientoCaja),
          useValue: mockMovimientoCajaRepository,
        },
        {
          provide: getRepositoryToken(PrestamoCaja),
          useValue: mockGenericRepo,
        },
        {
          provide: getRepositoryToken(CajaDesgloseCortes),
          useValue: mockGenericRepo,
        },
        {
          provide: getRepositoryToken(DescuadreCajaInventario),
          useValue: mockGenericRepo,
        },
        {
          provide: getRepositoryToken(DescuadreInventarioCaja),
          useValue: mockGenericRepo,
        },
        {
          provide: getRepositoryToken(Producto),
          useValue: mockGenericRepo,
        },
        {
          provide: getRepositoryToken(Venta),
          useValue: mockGenericRepo,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: AppGateway,
          useValue: mockAppGateway,
        },
      ],
    }).compile();

    service = module.get<CajasService>(CajasService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
