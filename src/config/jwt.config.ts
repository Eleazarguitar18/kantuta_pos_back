import { JwtModuleAsyncOptions } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

export const JwtConfig: JwtModuleAsyncOptions = {
  // Eliminamos 'global: true' de aquí porque se define en el AppModule o se hereda
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => {
    const secret = config.get<string>('JWT_SECRET');
    const expiresIn = config.get<string>('JWT_EXPIRES_IN') || '8h';

    if (!secret) {
      throw new Error('JWT_SECRET no está definido en las variables de entorno');
    }

    return {
      secret: secret,
      signOptions: { 
        // Forzamos el tipo a 'any' o al tipo específico para que TS no se queje
        expiresIn: expiresIn as any 
      },
    };
  },
};