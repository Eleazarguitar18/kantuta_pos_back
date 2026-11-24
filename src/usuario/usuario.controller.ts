import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpException,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UsuarioService } from './usuario.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { Public } from 'src/auth/decorators/auth_public.decorator';
import { CreateAuthDto } from 'src/auth/dto/create-auth.dto';

@Controller('usuario')
export class UsuarioController {
  constructor(private readonly usuarioService: UsuarioService) {}

  @Public()
  @Post('register')
  async create(@Body() createAuthDto: CreateAuthDto) {
    return await this.usuarioService.create(createAuthDto);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('Administrador')
  @Get()
  async findAll() {
    const respuesta = await this.usuarioService.findAll();
    const data = {
      status: 200,
      message: 'Listado de usuarios registradas!',
      data: respuesta,
    };
    return data;
  }

  @Get('autorizadores')
  async findAutorizadores() {
    return this.usuarioService.findAutorizadores();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.usuarioService.findOne(+id);
    const respuesta = {
      status: 200,
      message: 'Usuario encontrado!',
      data: data,
    };
    return respuesta;
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('Administrador')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateUsuarioDto: UpdateUsuarioDto,
    @Req() req: any,
  ) {
    return await this.usuarioService.update(+id, updateUsuarioDto, req.user?.sub);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('Administrador')
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.usuarioService.remove(+id, req.user?.sub);
  }
}
