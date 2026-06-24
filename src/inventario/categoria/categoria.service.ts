import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrearCategoriaDto } from '../dto/crear-categoria.dto';
import { ActualizarCategoriaDto } from '../dto/actualizar-categoria.dto';
import { Categoria } from '../entities/categoria.entity';
import { AppGateway } from 'src/gateway/app.gateway';

@Injectable()
export class CategoriaService {
    constructor(
        @InjectRepository(Categoria)
        private readonly categoriaRepository: Repository<Categoria>,
        private readonly appGateway: AppGateway
    ) { }
    // --- MÉTODOS PARA CATEGORÍAS ---

    async createCategoria(
        crearCategoriaDto: CrearCategoriaDto,
    ): Promise<Categoria> {
        const nuevaCategoria = this.categoriaRepository.create(crearCategoriaDto);
        const categoria = await this.categoriaRepository.save(nuevaCategoria);
        if (categoria) {
            console.log('Categoría creada:', categoria);
            this.appGateway.notifyDataChange('category', 'creado');
        }
        return categoria;
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

        const saved = await this.categoriaRepository.save(categoria);
        this.appGateway.notifyDataChange('category', 'actualizado');
        return saved;
    }

    async removeCategoria(id: number, id_user_update?: number): Promise<void> {
        const categoria = await this.findOneCategoria(id);
        categoria.estado = false;
        categoria.id_user_update = id_user_update;
        await this.categoriaRepository.save(categoria);
        this.appGateway.notifyDataChange('category', 'eliminado');
    }
}
