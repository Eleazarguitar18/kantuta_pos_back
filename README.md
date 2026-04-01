# Rutea Backend

El backend oficial del proyecto **Rutea**, una plataforma diseñada para la gestión, cálculo y optimización de rutas y líneas de transporte público mediante representación espacial y teoría de grafos.

Este proyecto está construido con [NestJS](https://nestjs.com/), aprovechando su arquitectura escalable y modular.

## 🚀 Características Principales

- **Gestión Geográfica (PostGIS)**: Almacenamiento y procesamiento de coordenadas y puntos de interés utilizando PostgreSQL y la extensión PostGIS.
- **Teoría de Grafos para Rutas**: Cálculo automatizado de las rutas más cortas y optimización de trayectos utilizando la librería `graphology` y el algoritmo de `graphology-shortest-path`.
- **Autenticación y Seguridad**: Sistema de autenticación JWT (JSON Web Tokens) con encriptación de contraseñas mediante `bcrypt`.
- **Caché Eficiente**: Integración nativa con Redis para optimizar tiempos de respuesta en endpoints de alta demanda o cálculos intensivos.
- **Notificaciones por Email**: Sistema de notificaciones integrado con `@nestjs-modules/mailer` soportado por clientes como `nodemailer` y `resend`.
- **Documentación Dinámica**: API documentada en tiempo real mediante Swagger UI.

## 🛠️ Stack Tecnológico

- **Framework Principal**: [NestJS](https://nestjs.com/) v11 (Node.js)
- **Lenguaje**: TypeScript
- **Base de Datos**: PostgreSQL + extensión PostGIS
- **ORM**: TypeORM
- **Sistema de Caché**: Redis
- **Autenticación**: JWT / bcrypt
- **Otras Librerías**: Graphology (para análisis y manejo de grafos espaciales de transporte).

## 🗂️ Estructura de Módulos

El proyecto mantiene una arquitectura de dominio, organizado principalmente en los siguientes módulos:
- `AuthModule`: Gestión integral de autenticación, autorización y generación de tokens de acceso.
- `UsuarioModule` y `PersonaModule`: Administración de perfiles, permisos y usuarios de la plataforma.
- `LineasModule`: Gestión de las diversas rutas o líneas de transporte registradas.
- `RutasModule`: Lógica principal para el trazado de trayectos, cálculo de sub-rutas basadas en grafos y navegación.
- `PuntosModule`: Registro y manipulación geoespacial de paradas, intersecciones y puntos de control en el mapa.
- `MailModule`: Servicio centralizado para mensajería electrónica (envío de credenciales, avisos, etc.).
- `RedisManagerModule`: Módulo dedicado a la administración de estados y capa de caché temporal usando Redis.

## ⚙️ Requisitos Previos

Antes de ejecutar o desplegar este proyecto, asegúrate de tener a tu disposición:
- [Node.js](https://nodejs.org/es/) (v22.x o superior recomendado).
- [PostgreSQL](https://www.postgresql.org/) con la extensión **PostGIS** habilitada.
- Instancia activa de [Redis](https://redis.io/) ejecutándose localmente o accesible vía red.
- Herramienta de manejo de paquetes `npm`.

## 📦 Instalación

1. Clona el repositorio e instala las dependencias:

```bash
npm install
```

2. Configura las variables de entorno para que los servicios conecten adecuadamente:
   Crea un archivo `.env` en la raíz del proyecto basándote en la configuración esperada (`src/config/`) especificando credenciales para:
   - Cadena de conexión a PostgreSQL
   - Interfaz y puerto de Redis
   - Secreto o Llave privada para JWT (`JWT_SECRET`)
   - Credenciales SMTP o Resend API Key

3. Asegúrate de que tu base de datos PostgreSQL pueda soportar objetos geográficos ejecutando:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

## 🚀 Ejecución y Despliegue

Inicia el entorno de desarrollo usando el CLI de Nest:

```bash
# Servidor de pruebas
npm run start

# Modo "watch" (recarga automática en desarrollo)
npm run start:dev

# Compilación y modo producción
npm run start:prod
```

## 📖 Explorador de API (Swagger)

Una vez que el servidor backend esté en rápida ejecución, la documentación íntegra y navegable de los endpoints estará expuesta en la interfaz de **Swagger**.

- **URL de Documentación**: `http://localhost:3000/api`

## 🧪 Pruebas (Testing)

El entorno emplea Jest para garantizar la estabilidad e integridad de los flujos de código:

```bash
# Pruebas unitarias
npm run test

# Pruebas de integración completa (e2e)
npm run test:e2e

# Informe general de cobertura
npm run test:cov
```

## 🔍 Colección de Endpoints (Bruno)

Para facilitar las pruebas de integración y manuales, puedes encontrar la colección oficial de endpoints configurada para [Bruno](https://www.usebruno.com/) en el siguiente repositorio:

👉 **[GitHub: Rutea_enpoints](https://github.com/Eleazarguitar18/Rutea_enpoints.git)**

## 📝 Licencia / Contexto Legal

`backend_rutea` se encuentra actualmente bajo la figura **UNLICENSED** y es propiedad intelectual de **Elecode** y su empresa de desarrollo **Vortex**. Todos los derechos reservados.
