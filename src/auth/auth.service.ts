import {
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { PersonaService } from 'src/persona/persona.service';
import { Repository } from 'typeorm';
import { Usuario } from 'src/usuario/entities/usuario.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { SignInDto } from './dto/SingInDto';
import crypto from 'crypto';
import { MailService } from 'src/mail/mail.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Role } from './entities/role.entity';
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario)
    private userRepository: Repository<Usuario>,
    private readonly personaService: PersonaService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    private jwtService: JwtService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}
  async create(createAuthDto: CreateAuthDto) {
    const emailUnique = await this.userRepository.findOne({
      where: { email: createAuthDto.email },
    });
    if (emailUnique) {
      throw new UnauthorizedException('El email ya se encuentra registrado');
    }

    // const ciUnique = await this.personaRepository.findOne({
    //   where: { ci: createAuthDto.ci },
    // });
    // if (ciUnique) {
    //   throw new UnauthorizedException('El ci ya se encuentra registrado');
    // }
    const persona = await this.personaService.create(createAuthDto);

    // generaciond de contraseña
    const password_hash = await this.encriptar_password(createAuthDto.password);
    const userDto = {
      name:
        createAuthDto.nombres +
        ' ' +
        createAuthDto.p_apellido +
        ' ' +
        createAuthDto.s_apellido,
      email: createAuthDto.email,
      password: password_hash,
      estado: createAuthDto.estado,
      persona: persona,
    };

    const user = this.userRepository.create(userDto);
    const data = await this.userRepository.save(user);
    return data;
  }

  async encriptar_password(password: string): Promise<string> {
    const saltRounds = parseInt(
      this.configService.get<string>('SALT_ROUNDS') ?? '10',
      10,
    );
    const hash = await bcrypt.hash(password, saltRounds);
    return hash;
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
  async login(email: string, password: string): Promise<SignInDto | null> {
    const user = await this.userRepository.findOne({
      where: { email },
      relations: ['persona', 'role'],
    });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    const isPasswordValid = await this.comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Contraseña incorrecta');
    }
    const payload = {
      sub: user.id,
      username: user.name,
      roleName: user.role?.nombre || 'user',
      roleId: user.role?.id || 2,
    };
    const access_token = await this.jwtService.signAsync(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: this.configService.get('JWT_EXPIRES_IN') || '15m',
    });
    const refreshToken = await this.jwtService.signAsync(
      { sub: user.id },
      {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN') || '7d',
      },
    );
    return {
      access_token: access_token,
      refresh_token: refreshToken,
      user: user,
    };
  }

  async refresh_token(
    refresh_token: string,
  ): Promise<{ access_token: string }> {
    try {
      const payload = await this.jwtService.verifyAsync(refresh_token, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const newAccessToken = await this.jwtService.signAsync(
        { sub: user.id, username: user.name },
        {
          secret: this.configService.get('JWT_SECRET'),
          expiresIn: this.configService.get('JWT_EXPIRES_IN') || '15m',
        },
      );

      return { access_token: newAccessToken };
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async changePassword(email: string, newPassword: string) {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    const passwordHash = await this.encriptar_password(newPassword);
    user.password = passwordHash;

    this.mailService.enviarCorreo({
      email: user.email,
      subject: 'Cambio de contraseña exitoso',
      message: `Hola ${user.name}, tu contraseña ha sido cambiada exitosamente. 
      Si no realizaste este cambio, por favor contacta con soporte inmediatamente.`,
      name: user.name,
    });
    return this.userRepository.save(user);
  }
  async requestPasswordChange(email: string): Promise<{ message: string }> {
    // 1. Validar que el usuario existe (Opcional por seguridad, tú decides)
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // 2. Generar el código (puedes seguir usando crypto o un random simple)
    const code = crypto.randomBytes(3).toString('hex').toUpperCase(); // Ejemplo: A1B2C3

    // 3. Guardar en Redis
    // Clave: "reset_password:user@mail.com" | Valor: "CODE" | TTL: 900000ms (15 min)
    const redisKey = `reset_password:${email}`;
    await this.cacheManager.set(redisKey, code, 900000);
    const savedCode = await this.cacheManager.get<string>(redisKey);
    console.log(
      `Código de verificación para ${email}: ${code},redis: ${savedCode}`,
    ); // Para desarrollo, en producción no mostraría esto
    // 4. Enviar Email
    const { name } = user;
    await this.mailService.sendCode(email, name, code);

    return { message: 'Código de verificación enviado al correo' };
  }

  async confirmCode(email: string, code: string): Promise<{ message: string }> {
    const redisKey = `reset_password:${email}`;

    // 1. Intentar obtener el código de Redis
    const savedCode = await this.cacheManager.get<string>(redisKey);

    // 2. Si no hay código, es que expiró o no se solicitó
    if (!savedCode) {
      throw new UnauthorizedException('El código ha expirado o no existe');
    }

    // 3. Validar si el código coincide
    if (savedCode !== code) {
      throw new UnauthorizedException('Código de verificación inválido');
    }
    // 6. Ahora sí borramos el código de Redis
    await this.cacheManager.del(redisKey);
    // Nota: No borramos el código aquí para permitir que confirmPasswordChange lo valide también.
    return { message: 'Código de verificación correcto' };
  }

  async confirmPasswordChange(
    email: string,
    // code: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    // 4. Buscar al usuario para actualizar password
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // 5. Encriptar y Guardar en Postgres
    const hash = await this.encriptar_password(newPassword);
    user.password = hash;
    await this.userRepository.save(user);

    const { name } = user;
    this.mailService.sendEmailChangePassword(email, name);
    return { message: 'Contraseña actualizada correctamente' };
  }
  findAll() {
    return `This action returns all auth`;
  }
  //  @Roles('admin')
  // @UseGuards(RolesGuard)
  findOne(id: number) {
    return `This action returns a #${id} auth`;
  }

  update(id: number, updateAuthDto: UpdateAuthDto) {
    return `This action updates a #${id} auth`;
  }

  remove(id: number) {
    return `This action removes a #${id} auth`;
  }

  async onModuleInit() {
    await this.seedRoles();
  }

  private async seedRoles() {
    const rolesExistentes = await this.roleRepository.count();

    if (rolesExistentes === 0) {
      console.log('🌱 Sembrando roles en la base de datos...');
      await this.roleRepository.save([
        { nombre: 'admin', descripcion: 'Administrador con acceso total' },
        // {
        //   nombre: 'lider',
        //   descripcion: 'Líder de grupo con permisos de puntuación',
        // },
        { nombre: 'user', descripcion: 'Usuario de grupo, solo lectura' },
      ]);
      console.log('✅ Roles creados con éxito');
    }
  }
  findAllroles() {
    return this.roleRepository.find();
  }
}
