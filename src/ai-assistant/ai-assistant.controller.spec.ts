import { Test, TestingModule } from '@nestjs/testing';
import { AiAssistantController } from './ai-assistant.controller';
import { AiAssistantService } from './ai-assistant.service';

describe('AiAssistantController', () => {
  let controller: AiAssistantController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiAssistantController],
      providers: [AiAssistantService],
    }).compile();

    controller = module.get<AiAssistantController>(AiAssistantController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
