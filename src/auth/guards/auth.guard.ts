import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { jwtConstants } from '../config/constants';
import { Request } from 'express';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/auth_public.decorator';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { Usuario } from '../../usuario/entities/usuario.entity';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      // 💡 See this condition
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException();
    }
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'), // ✅ secreto desde .env
      });
      // Verificamos que el payload tenga lo que necesitamos
      if (!payload || !payload.roleName) {
        throw new UnauthorizedException('Token no contiene información de rol');
      }
      // Un usuario desactivado no puede seguir operando aunque tenga un token
      // vigente: se valida el estado en cada petición.
      const usuario = await this.dataSource.getRepository(Usuario).findOne({
        where: { id: payload.sub },
      });
      if (!usuario || usuario.estado === false) {
        throw new UnauthorizedException(
          'Usuario desactivado. Contacte con el administrador.',
        );
      }

      // 💡 We're assigning the payload to the request object here
      // so that we can access it in our route handlers
      request['user'] = payload;
    } catch {
      throw new UnauthorizedException();
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
