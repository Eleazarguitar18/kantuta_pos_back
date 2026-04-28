import { Test, TestingModule } from '@nestjs/testing';
import { CajasService } from './cajas.service';

describe('CajasService', () => {
  let service: CajasService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CajasService],
    }).compile();

    service = module.get<CajasService>(CajasService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
