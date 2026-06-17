import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
// Importamos la llave que define el decorador
import { ROLES_KEY } from "../decorators/roles.decorator"; 

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Buscamos si el endpoint o el controlador tienen el decorador @Roles()
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    // Si no hay roles definidos en la ruta, se asume que es pública o solo requiere login
    if (!requiredRoles) return true;

    // Obtenemos el usuario que el JwtAuthGuard inyectó en el request
    const { user } = context.switchToHttp().getRequest();
    
    // v5.md: ID 1: Administrador (Acceso total absoluto, sin restricciones)
    if (user && (user.roleId === 1 || user.roleName === 'admin' || user.roleName === 'Administrador')) {
      return true;
    }

    // Si es Operador (ID 2 o roleName 'user'), verificamos si 'Operador' está en la lista
    if (user && (user.roleId === 2 || user.roleName === 'user' || user.roleName === 'Operador')) {
      return requiredRoles.includes('Operador');
    }

    return user && user.roleName && requiredRoles.includes(user.roleName); 
  }
}