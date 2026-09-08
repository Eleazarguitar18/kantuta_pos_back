# AGENTS.md (Backend - NestJS v11 + TypeORM)

## Core Stack & Rules
- NestJS v11, TypeORM (PostgreSQL), Redis. Swagger en `/api`.
- Usar DTOs estrictos (`whitelist: true`, `forbidNonWhitelisted: true`).
- Absolutos `src/...` y relativos se respetan según el archivo editado. No reescribir imports masivamente.
- Manejo de excepciones global `AllExceptionsFilter` mapea errores (409 en `QueryFailedError`).

## Comandos Útiles
- Dev: `npm run start:dev`
- Lint: `npm run lint`
- Test: `npx jest src/<modulo>/<archivo>.spec.ts`

## Reglas de Negocio Cruciales
- Módulo `cajas`: `POST /ventas` y `POST /compras` con `pagar_con_caja: true` requieren sesión de caja abierta.
- DB auto-sincronizada (`synchronize: true`), no usar ni crear migraciones.
- IA Assistant (KANTU): Usar precios siempre en `Bs.` o `Bs` (nunca `$`).