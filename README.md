# R-Tienda Backend

El backend oficial del proyecto **R-Tienda**, una solución integral diseñada para la gestión administrativa, control de inventarios y procesamiento de ventas para comercios. 

Este proyecto está construido con [NestJS](https://nestjs.com/), aprovechando su arquitectura modular, escalable y mantenible.

## 🚀 Características Principales

- **Gestión de Inventario**: Control robusto de productos, stock, categorías y seguimiento de movimientos.
- **Módulo de Ventas**: Procesamiento eficiente de transacciones comerciales y registro de ventas.
- **Control de Cajas**: Administración de puntos de venta, incluyendo aperturas, cierres y flujos de efectivo.
- **Fuerza de Ventas (Agentes)**: Gestión de agentes de venta y perfiles de personal.
- **Autenticación y Seguridad**: Sistema de seguridad basado en JWT (JSON Web Tokens) con encriptación de contraseñas mediante `bcrypt`.
- **Caché de Alto Rendimiento**: Integración con Redis para optimizar el acceso a datos frecuentes y mejorar la respuesta del sistema.
- **Notificaciones Automatizadas**: Servicio de mensajería electrónica integrado para alertas y reportes.
- **Documentación Dinámica**: API documentada y explorable en tiempo real mediante Swagger.

## 🛠️ Stack Tecnológico

- **Framework Principal**: [NestJS](https://nestjs.com/) v11
- **Lenguaje**: TypeScript
- **Base de Datos**: PostgreSQL
- **ORM**: TypeORM
- **Sistema de Caché**: Redis
- **Autenticación**: JWT / bcrypt
- **Mensajería**: Nodemailer / Resend

## 🗂️ Estructura de Módulos

El proyecto sigue una arquitectura orientada a dominios, organizada en los siguientes módulos clave:

- **`AuthModule`**: Gestión de seguridad, sesiones y permisos de acceso.
- **`InventarioModule`**: Lógica central para el control de existencias y catálogo de productos.
- **`VentasModule`**: Gestión del ciclo de vida de las transacciones comerciales.
- **`CajasModule`**: Administración operativa de las cajas y puntos de cobro.
- **`AgentesModule`**: Gestión de la fuerza de ventas y personal operativo.
- **`UsuarioModule` / `PersonaModule`**: Administración de perfiles de usuario y datos personales.
- **`MailModule`**: Servicio centralizado de notificaciones por correo electrónico.
- **`RedisManagerModule`**: Capa de abstracción para la gestión de caché y estados temporales.

## ⚙️ Requisitos Previos

- [Node.js](https://nodejs.org/) (v22.x o superior recomendado)
- [PostgreSQL](https://www.postgresql.org/)
- [Redis](https://redis.io/)
- Gestor de paquetes `npm`

## 📦 Instalación

1. Clona el repositorio e instala las dependencias:
   ```bash
   npm install
   ```

2. Configura las variables de entorno:
   Crea un archivo `.env` en la raíz del proyecto (puedes basarte en `.env.example` si está disponible) con las siguientes configuraciones:
   - Credenciales de PostgreSQL (`DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME`, `DATABASE_SSL`)
   - Configuración de Redis (`REDIS_URL`, o `REDIS_HOST`/`REDIS_PORT`)
   - Secreto para JWT (`JWT_SECRET`)
   - Configuración de correo (SMTP o API Keys)

## 🚀 Ejecución

```bash
# Desarrollo con recarga automática
npm run start:dev

# Desarrollo contra la BD de pruebas (carga .env.test)
npm run start:test

# Compilación para producción
npm run build

# Ejecución en producción
npm run start:prod
```

### Entorno de pruebas

Cuando `NODE_ENV=test`, `ConfigModule` carga `.env.test` en lugar de `.env`. Ese archivo no se versiona y se genera a partir de la URL de la BD de pruebas que ya está comentada al final de `.env`; mantiene el resto de variables (JWT, correo, IA) del archivo local.

## 📖 Documentación de la API (Swagger)

La documentación interactiva de todos los endpoints está disponible una vez que el servidor esté en ejecución en:

- **URL**: `http://localhost:3000/api`

## 🧪 Pruebas (Testing)

```bash
# Pruebas unitarias
npm run test

# Pruebas de integración (e2e)
npm run test:e2e

# Cobertura de pruebas
npm run test:cov
```

---
Propiedad intelectual de **Elecode**. Todos los derechos reservados.
