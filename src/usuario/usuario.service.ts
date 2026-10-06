import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { Repository } from 'typeorm';
import { Usuario } from './entities/usuario.entity';
import { PersonaService } from 'src/persona/persona.service';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateAuthDto } from 'src/auth/dto/create-auth.dto';
import { Persona } from 'src/persona/entities/persona.entity';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { MailService } from 'src/mail/mail.service';

@Injectable()
export class UsuarioService {
  constructor(
    @InjectRepository(Usuario)
    private userRepository: Repository<Usuario>,
    @InjectRepository(Persona)
    private personaRepository: Repository<Persona>,
    private readonly personaService: PersonaService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    private jwtService: JwtService,
  ) {}

  async create(createAuthDto: CreateAuthDto) {
    //  const emailUnique= await this.userRepository.findOne({
    //   where:{email:createAuthDto.email}
    // });
    // if(emailUnique){
    //   throw new UnauthorizedException('El email ya se encuentra registrado');
    // }

    // const ciUnique= await this.personaRepository.findOne({
    //   where:{ci:createAuthDto.ci}
    // });
    // if(ciUnique){
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
      estado: true,
      persona: persona,
      role: createAuthDto.id_role
        ? ({ id: createAuthDto.id_role } as any)
        : undefined,
    };

    const user = this.userRepository.create(userDto);
    const data = await this.userRepository.save(user);
    await this.mailService.sendWelcome(userDto.email, userDto.name);
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

  async findAll() {
    const data = await this.userRepository.find();
    if (data.length === 0) {
      throw new NotFoundException(`No existen datos de usuarios`);
    }
    return data;
  }

  findOne(id: number) {
    const data = this.userRepository.findOne({
      where: { id: id },
      relations: ['persona', 'role'],
    });
    if (!data) {
      throw new NotFoundException(`No existen datos de usuario`);
    }
    return data;
  }

  // updates
  async update(id: number, updateUsuarioDto: UpdateUsuarioDto) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['persona', 'role'],
    });

    if (!user) {
      throw new NotFoundException(`No existen datos de usuario con ID ${id}`);
    }

    const { id_role, password, ...rest } = updateUsuarioDto;

    // Si se proporciona una nueva contraseña no vacía, encriptarla con bcrypt
    if (password && password.trim() !== '') {
      user.password = await this.encriptar_password(password);
    }

    // Actualizar relación con el rol si corresponde
    if (id_role !== undefined) {
      user.role = id_role ? ({ id: id_role } as any) : null;
    }

    Object.assign(user, rest);

    return await this.userRepository.save(user);
  }

  async remove(id: number) {
    const data = await this.userRepository.findOneBy({ id: id });
    if (!data) {
      throw new NotFoundException(`No existen datos de usuario`);
    }
    data.estado = false;

    return await this.userRepository.save(data);
  }
}
