import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrearProductoDto } from './dto/crear-producto.dto';
import { ActualizarProductoDto } from './dto/actualizar-producto.dto';
import { CrearCategoriaDto } from './dto/crear-categoria.dto';
import { ActualizarCategoriaDto } from './dto/actualizar-categoria.dto';
import { Producto } from './entities/producto.entity';
import { Categoria } from './entities/categoria.entity';

@Injectable()
export class InventarioService {
  constructor(
    @InjectRepository(Producto)
    private readonly productoRepository: Repository<Producto>,
    @InjectRepository(Categoria)
    private readonly categoriaRepository: Repository<Categoria>,
  ) { }

  async create(crearProductoDto: CrearProductoDto): Promise<Producto> {
    const { id_categoria, ...productoData } = crearProductoDto;

    const categoria = await this.categoriaRepository.findOne({
      where: { id: id_categoria, estado: true },
    });
    if (!categoria) {
      throw new NotFoundException(
        `Categoría con id ${id_categoria} no encontrada o inactiva`,
      );
    }

    const producto = this.productoRepository.create({
      ...productoData,
      categoria,
    });

    return await this.productoRepository.save(producto);
  }

  async findAll(): Promise<Producto[]> {
    return await this.productoRepository.find({
      where: { estado: true },
      relations: ['categoria'],
      order: {
        id: 'DESC',
      },
    });
  }

  async findOne(id: number): Promise<Producto> {
    const producto = await this.productoRepository.findOne({
      where: { id, estado: true },
      relations: ['categoria'],
    });

    if (!producto) {
      throw new NotFoundException(
        `Producto con id ${id} no encontrado o inactivo`,
      );
    }

    return producto;
  }

  async update(
    id: number,
    actualizarProductoDto: ActualizarProductoDto,
  ): Promise<Producto> {
    const { id_categoria, ...updateData } = actualizarProductoDto;

    const producto = await this.productoRepository.preload({
      id,
      ...updateData,
    });

    if (!producto || !producto.estado) {
      throw new NotFoundException(
        `Producto con id ${id} no encontrado o inactivo`,
      );
    }

    if (id_categoria) {
      const categoria = await this.categoriaRepository.findOne({
        where: { id: id_categoria, estado: true },
      });
      if (!categoria) {
        throw new NotFoundException(
          `Categoría con id ${id_categoria} no encontrada o inactiva`,
        );
      }
      producto.categoria = categoria;
    }

    return await this.productoRepository.save(producto);
  }

  async remove(id: number, id_user_update?: number): Promise<void> {
    const producto = await this.findOne(id);
    producto.estado = false;
    producto.id_user_update = id_user_update;
    await this.productoRepository.save(producto);
  }

  // --- MÉTODOS PARA CATEGORÍAS ---

  async createCategoria(
    crearCategoriaDto: CrearCategoriaDto,
  ): Promise<Categoria> {
    const nuevaCategoria = this.categoriaRepository.create(crearCategoriaDto);
    return await this.categoriaRepository.save(nuevaCategoria);
  }

  async findAllCategorias(): Promise<Categoria[]> {
    return await this.categoriaRepository.find({
      where: { estado: true },
      order: {
        id: 'DESC',
      },
    });
  }

  async findOneCategoria(id: number): Promise<Categoria> {
    const categoria = await this.categoriaRepository.findOne({
      where: { id, estado: true },
    });
    if (!categoria) {
      throw new NotFoundException(
        `Categoría con id ${id} no encontrada o inactiva`,
      );
    }
    return categoria;
  }

  async updateCategoria(
    id: number,
    actualizarCategoriaDto: ActualizarCategoriaDto,
  ): Promise<Categoria> {
    const categoria = await this.categoriaRepository.preload({
      id,
      ...actualizarCategoriaDto,
    });

    if (!categoria) {
      throw new NotFoundException(
        `Categoría con id ${id} no encontrada o inactiva`,
      );
    }

    return await this.categoriaRepository.save(categoria);
  }

  async removeCategoria(id: number, id_user_update?: number): Promise<void> {
    const categoria = await this.findOneCategoria(id);
    categoria.estado = false;
    categoria.id_user_update = id_user_update;
    await this.categoriaRepository.save(categoria);
  }
}
