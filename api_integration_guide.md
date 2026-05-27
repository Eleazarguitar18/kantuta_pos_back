# Guía de Integración API - Kantuta POS Backend (R-Tienda)

Esta guía detalla cómo el frontend (React + TypeScript) debe interactuar con el backend (NestJS). Contiene las rutas, métodos HTTP, especificaciones de autenticación, payloads (datos a enviar), respuestas (datos a recibir) e interfaces TypeScript listas para usar.

---

## 🚀 Configuración General de la API

*   **URL Base:** `http://localhost:3000` (o la URL de producción configurada).
*   **Content-Type:** `application/json` para todas las peticiones con cuerpo de mensaje.
*   **Autenticación:**
    *   La mayoría de las rutas están protegidas y requieren un **Bearer Token JWT** en las cabeceras.
    *   Las excepciones de acceso público están marcadas como `[PÚBLICA]`.
    *   **Cabecera de Autenticación:**
        ```http
        Authorization: Bearer <tu_access_token>
        ```

---

## 📦 Modelos de Datos Globales (TypeScript)

Puedes copiar estas interfaces directamente en tu carpeta de tipos (ej. `src/types/api.d.ts`) en tu aplicación React con TypeScript:

```typescript
export interface BaseEntityAudit {
  estado: boolean;
  id_user_create: number | null;
  id_user_update?: number | null;
  created_at: string; // ISO Date String
  updated_at: string; // ISO Date String
}

export interface Role {
  id: number;
  nombre: 'admin' | 'user' | string;
  descripcion?: string;
}

export interface Persona extends BaseEntityAudit {
  id: number;
  nombres: string;
  p_apellido: string;
  s_apellido?: string;
  fecha_nacimiento: string; // Formato YYYY-MM-DD
  genero: string; // Ej: 'M', 'F'
}

export interface Usuario extends BaseEntityAudit {
  id: number;
  name: string;
  email: string;
  persona: Persona;
  role: Role;
}

export interface Categoria extends BaseEntityAudit {
  id: number;
  nombre: string;
  productos?: Producto[];
}

export interface Producto extends BaseEntityAudit {
  id: number;
  nombre: string;
  codigo_barras: string | null;
  precio_venta: number;
  costo_compra: number;
  stock_actual: number;
  stock_minimo: number;
  categoria: Categoria;
}

export interface Caja extends BaseEntityAudit {
  id: number;
  nombre: string;
  especialidad: 'SOLO_VENTAS' | 'SOLO_AGENTES' | 'MIXTA';
  sesiones?: SesionCaja[];
}

export interface SesionCaja extends BaseEntityAudit {
  id: number;
  monto_inicial: number;
  monto_final_teorico: number | null;
  monto_final_real: number | null;
  diferencia: number | null;
  estado_sesion: 'ABIERTA' | 'CERRADA';
  fecha_apertura: string;
  fecha_cierre: string | null;
  id_caja: number;
  caja?: Caja;
  id_usuario: number;
}

export interface MovimientoCaja extends BaseEntityAudit {
  id: number;
  tipo: 'INGRESO' | 'EGRESO';
  monto: number;
  motivo: string;
  fecha: string;
  id_sesion_caja: number;
}

export interface DetalleVenta extends BaseEntityAudit {
  id: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  id_venta: number;
  id_producto: number;
  producto?: Producto;
}

export interface Venta extends BaseEntityAudit {
  id: number;
  total: number;
  metodo_pago: 'EFECTIVO' | 'QR' | 'TRANSFERENCIA';
  fecha: string;
  id_sesion_caja: number;
  estado_venta: 'COMPLETADA' | 'ANULADA' | 'EDITADA';
  motivo_edicion: string | null;
  fecha_modificacion: string;
  detalles: DetalleVenta[];
}

export interface DetalleCompra extends BaseEntityAudit {
  id: number;
  cantidad: number;
  costo_unitario: number;
  subtotal: number;
  id_producto: number;
  producto?: Producto;
}

export interface Compra extends BaseEntityAudit {
  id: number;
  total: number;
  proveedor: string | null;
  pagado_con_caja: boolean;
  id_sesion_caja: number | null;
  fecha: string;
  detalles: DetalleCompra[];
}

export interface TransaccionAgente extends BaseEntityAudit {
  id: number;
  banco: string;
  tipo_operacion: 'DEPOSITO' | 'RETIRO' | 'TRANSFERENCIA_QR';
  monto: number;
  comision_cliente: number;
  comision_banco: number;
  nro_referencia: string;
  url_comprobante: string | null;
  fecha: string;
  id_sesion_caja: number;
}
```

---

## 🔑 Módulo 1: Autenticación (`/auth`)

### 1. Iniciar Sesión `[PÚBLICA]`
*   **Método:** `POST`
*   **Ruta:** `/auth/login`
*   **Cuerpo (Payload):**
    ```typescript
    interface LoginRequest {
      email: string;      // Debe ser correo válido
      password: string;   // Contraseña
    }
    ```
*   **Respuesta (Response):**
    ```typescript
    interface LoginResponse {
      access_token: string;
      refresh_token: string;
      user: Usuario;
    }
    ```

### 2. Refrescar Token `[PÚBLICA]`
*   **Método:** `POST`
*   **Ruta:** `/auth/refresh_token`
*   **Cabeceras:** `Authorization: Bearer <refresh_token>`
*   **Respuesta:**
    ```typescript
    interface RefreshTokenResponse {
      access_token: string;
    }
    ```

### 3. Solicitar Código de Recuperación de Contraseña `[PÚBLICA]`
Envía un correo con un código de recuperación temporal de 6 caracteres (duración: 15 min).
*   **Método:** `POST`
*   **Ruta:** `/auth/reset/code`
*   **Cuerpo:**
    ```typescript
    interface RequestCodeRequest {
      email: string;
    }
    ```
*   **Respuesta:**
    ```typescript
    interface GeneralMessageResponse {
      message: string; // "Código de verificación enviado al correo"
    }
    ```

### 4. Verificar Código de Recuperación `[PÚBLICA]`
*   **Método:** `POST`
*   **Ruta:** `/auth/confirm-code`
*   **Cuerpo:**
    ```typescript
    interface ConfirmCodeRequest {
      email: string;
      code: string; // Ej: "A1B2C3"
    }
    ```
*   **Respuesta:**
    ```typescript
    interface GeneralMessageResponse {
      message: string; // "Código de verificación correcto"
    }
    ```

### 5. Confirmar Cambio de Contraseña `[PÚBLICA]`
*   **Método:** `POST`
*   **Ruta:** `/auth/reset-confirm`
*   **Cuerpo:**
    ```typescript
    interface ResetConfirmRequest {
      email: string;
      newPassword: string;
    }
    ```
*   **Respuesta:**
    ```typescript
    interface GeneralMessageResponse {
      message: string; // "Contraseña actualizada correctamente"
    }
    ```

### 6. Obtener Usuarios de Autenticación
*   **Método:** `GET` / `GET :id` / `PATCH :id` / `DELETE :id`
*   **Ruta:** `/auth`
*   *Nota:* Mayormente utilizado para operaciones administrativas de cuentas.

---

## 🗂️ Módulo 2: Categorías (`/inventario/categorias`)

### 1. Crear Categoría
*   **Método:** `POST`
*   **Ruta:** `/inventario/categorias`
*   **Cuerpo:**
    ```typescript
    interface CrearCategoriaRequest {
      nombre: string;         // Máx 100 caracteres
      id_user_create: number; // ID del usuario creador
    }
    ```
*   **Respuesta:** `Categoria` (objeto creado).

### 2. Listar Categorías
*   **Método:** `GET`
*   **Ruta:** `/inventario/categorias`
*   **Respuesta:** `Categoria[]` (filtra categorías inactivas automáticamente).

### 3. Obtener Categoría por ID
*   **Método:** `GET`
*   **Ruta:** `/inventario/categorias/:id`
*   **Respuesta:** `Categoria`

### 4. Actualizar Categoría
*   **Método:** `PATCH`
*   **Ruta:** `/inventario/categorias/:id`
*   **Cuerpo:**
    ```typescript
    interface ActualizarCategoriaRequest {
      nombre?: string;
      id_user_update?: number;
    }
    ```
*   **Respuesta:** `Categoria` (objeto actualizado).

### 5. Eliminar Categoría (Soft Delete)
*   **Método:** `DELETE`
*   **Ruta:** `/inventario/categorias/:id`
*   **Respuesta:** `void` (HTTP 200/204, cambia `estado` a `false`).

---

## 🍎 Módulo 3: Inventario / Productos (`/inventario/producto`)

### 1. Crear Producto en Inventario
*   **Método:** `POST`
*   **Ruta:** `/inventario/producto`
*   **Cuerpo:**
    ```typescript
    interface CrearProductoRequest {
      nombre: string;
      codigo_barras?: string; // Opcional
      precio_venta: number;   // >= 0
      costo_compra: number;   // >= 0
      stock_actual: number;   // >= 0
      stock_minimo: number;   // >= 0
      id_categoria: number;   // ID de la categoría asociada
    }
    ```
*   **Respuesta:** `Producto` (con el objeto `categoria` integrado).

### 2. Listar Productos
*   **Método:** `GET`
*   **Ruta:** `/inventario/producto`
*   **Respuesta:** `Producto[]` (con la propiedad `categoria` precargada).

### 3. Obtener Producto por ID
*   **Método:** `GET`
*   **Ruta:** `/inventario/producto/:id`
*   **Respuesta:** `Producto`

### 4. Actualizar Producto
*   **Método:** `PATCH`
*   **Ruta:** `/inventario/producto/:id`
*   **Cuerpo:**
    ```typescript
    // Todos los campos de creación son opcionales para el update
    interface ActualizarProductoRequest {
      nombre?: string;
      codigo_barras?: string;
      precio_venta?: number;
      costo_compra?: number;
      stock_actual?: number;
      stock_minimo?: number;
      id_categoria?: number;
      id_user_update?: number;
    }
    ```
*   **Respuesta:** `Producto` (objeto actualizado).

### 5. Eliminar Producto (Soft Delete)
*   **Método:** `DELETE`
*   **Ruta:** `/inventario/producto/:id`
*   **Respuesta:** `void` (Cambia `estado` a `false`).

---

## 💵 Módulo 4: Cajas (`/cajas`)

### 1. Listar Cajas Físicas
*   **Método:** `GET`
*   **Ruta:** `/cajas`
*   **Respuesta:** `Caja[]`

### 2. Crear Caja Física
*   **Método:** `POST`
*   **Ruta:** `/cajas`
*   **Cuerpo:**
    ```typescript
    interface CrearCajaRequest {
      nombre: string; // Mínimo 3 caracteres
      especialidad: 'SOLO_VENTAS' | 'SOLO_AGENTES' | 'MIXTA';
      id_user_create?: number;
    }
    ```
*   **Respuesta:** `Caja`

### 3. Obtener Caja por ID
*   **Método:** `GET`
*   **Ruta:** `/cajas/:id`
*   **Respuesta:** `Caja` (incluye histórico de sesiones).

### 4. Actualizar Caja
*   **Método:** `PATCH`
*   **Ruta:** `/cajas/:id`
*   **Cuerpo:** `Partial<CrearCajaRequest>`

### 5. Eliminar Caja Física
*   **Método:** `DELETE`
*   **Ruta:** `/cajas/:id`
*   **Parámetros de Consulta (Query):**
    *   `id_user_update` (Requerido): ID del usuario que anula la caja.
    *   *Ejemplo de URL:* `/cajas/1?id_user_update=2`
*   **Respuesta:** `void`

### 6. Abrir Sesión de Caja (Inicio de Turno)
*   **Método:** `POST`
*   **Ruta:** `/cajas/abrir`
*   **Cuerpo:**
    ```typescript
    interface AbrirCajaRequest {
      id_caja: number;         // ID de la caja física elegida
      monto_inicial: number;   // Saldo con el que abre (efectivo para cambio)
      id_usuario: number;      // ID del cajero
      id_user_create: number;  // ID de auditoría
    }
    ```
*   **Respuesta:** `SesionCaja` (con `estado_sesion: "ABIERTA"`).

### 7. Cerrar Sesión de Caja (Arqueo/Cierre de Turno)
*   **Método:** `PATCH`
*   **Ruta:** `/cajas/sesion/:id/cerrar`
*   **Cuerpo:**
    ```typescript
    interface CerrarCajaRequest {
      monto_final_real: number;  // Dinero en efectivo real contado físicamente
      id_user_update: number;    // ID del usuario que cierra la caja
    }
    ```
*   **Respuesta:** `SesionCaja` (el backend calcula `monto_final_teorico` sumando la base inicial + ingresos - egresos de movimientos de caja y computa la `diferencia`).

### 8. Registrar Movimiento Interno (Ingreso/Egreso)
*   **Método:** `POST`
*   **Ruta:** `/cajas/movimiento`
*   **Cuerpo:**
    ```typescript
    interface CrearMovimientoRequest {
      tipo: 'INGRESO' | 'EGRESO';
      monto: number;              // Mínimo 0.10
      motivo: string;             // Justificación de la salida/entrada
      id_sesion_caja: number;     // ID de sesión activa
      id_user_create: number;
    }
    ```
*   **Respuesta:** `MovimientoCaja`

---

## 🛒 Módulo 5: Ventas (`/ventas`)

### 1. Registrar una Venta
*   **Método:** `POST`
*   **Ruta:** `/ventas`
*   **Cuerpo:**
    ```typescript
    interface DetalleVentaInput {
      id_producto: number;
      cantidad: number;        // Mínimo 1
      precio_unitario: number; // Mínimo 0
    }

    interface CrearVentaRequest {
      metodo_pago: 'EFECTIVO' | 'QR' | 'TRANSFERENCIA';
      id_sesion_caja: number;  // Caja activa donde entra el dinero
      detalles: DetalleVentaInput[];
      id_user_create: number;
    }
    ```
*   **Respuesta:** `Venta` (calcula los subtotales, reduce stock de productos implicados y devuelve la venta guardada con su `total`).

### 2. Listar Ventas
*   **Método:** `GET`
*   **Ruta:** `/ventas`
*   **Respuesta:** `Venta[]` (con la relación `detalles` incluida).

### 3. Obtener Venta por ID
*   **Método:** `GET`
*   **Ruta:** `/ventas/:id`
*   **Respuesta:** `Venta` (con la relación `detalles` incluida).

### 4. Actualizar o Anular Venta
*   **Método:** `PATCH`
*   **Ruta:** `/ventas/:id`
*   **Cuerpo:**
    ```typescript
    interface ActualizarVentaRequest {
      metodo_pago?: 'EFECTIVO' | 'QR' | 'TRANSFERENCIA';
      id_sesion_caja?: number;
      estado_venta?: 'COMPLETADA' | 'ANULADA' | 'EDITADA';
      motivo_edicion?: string;
      id_user_update?: number;
    }
    ```
*   **Respuesta:** `Venta`

---

## 🏦 Módulo 6: Agentes Externos (`/agentes`)

### 1. Registrar Operación Financiera (Tigo Money, QR, Retiro)
Registra transacciones de agentes y se asocia a la caja actual.
*   **Método:** `POST`
*   **Ruta:** `/agentes`
*   **Cuerpo:**
    ```typescript
    interface CrearTransaccionAgenteRequest {
      banco: string; // Ej: "TIGO_MONEY", "BCP", "BANCO_UNION", "SOLI"
      tipo_operacion: 'DEPOSITO' | 'RETIRO' | 'TRANSFERENCIA_QR';
      monto: number;                // Mínimo 1
      comision_cliente?: number;    // Comisión cobrada al cliente (Opcional)
      nro_referencia: string;       // Código único de operación bancaria
      id_sesion_caja: number;       // Sesión de caja activa
      id_user_create: number;
    }
    ```
*   **Respuesta:** `TransaccionAgente`

### 2. Listar Transacciones de Agentes
*   **Método:** `GET`
*   **Ruta:** `/agentes`
*   **Respuesta:** `TransaccionAgente[]`

### 3. Obtener Transacción por ID
*   **Método:** `GET`
*   **Ruta:** `/agentes/:id`
*   **Respuesta:** `TransaccionAgente`

### 4. Anular/Eliminar Transacción de Agente
*   **Método:** `DELETE`
*   **Ruta:** `/agentes/:id`
*   **Respuesta:** `void` (Soft delete)

---

## 👥 Módulo 7: Personas (`/persona`)

### 1. Crear Persona
*   **Método:** `POST`
*   **Ruta:** `/persona`
*   **Cuerpo:**
    ```typescript
    interface CreatePersonaRequest {
      nombres: string;
      p_apellido: string;
      s_apellido: string;
      fecha_nacimiento: string; // Formato "YYYY-MM-DD"
      genero: string;           // Ej: "M" o "F"
    }
    ```
*   **Respuesta:**
    ```typescript
    interface CreatePersonaResponse {
      status: number; // 200
      message: string; // "Se creó la persona con éxito!"
      data: Persona;
    }
    ```

### 2. Listar Personas (Requiere Autenticación)
*   **Método:** `GET`
*   **Ruta:** `/persona`
*   **Respuesta:**
    ```typescript
    interface ListPersonasResponse {
      status: number;
      message: string;
      data: Persona[];
    }
    ```

### 3. Obtener Persona por ID
*   **Método:** `GET`
*   **Ruta:** `/persona/:id`
*   **Respuesta:** `Persona`

### 4. Actualizar Persona (ID en el cuerpo)
*   **Método:** `PUT` (Nótese que usa PUT y no PATCH para este caso)
*   **Ruta:** `/persona`
*   **Cuerpo:**
    ```typescript
    interface UpdatePersonaRequest {
      id: number;                  // ID de la persona a editar
      id_user_update: number;      // Cajero que edita
      nombres?: string;
      p_apellido?: string;
      s_apellido?: string;
      fecha_nacimiento?: string;
      genero?: string;
    }
    ```
*   **Respuesta:** `Persona` (actualizada).

---

## 👤 Módulo 8: Registro de Usuarios (`/usuario`)

### 1. Registrar Nuevo Usuario y Persona a la vez `[PÚBLICA]`
*   **Método:** `POST`
*   **Ruta:** `/usuario/register`
*   **Cuerpo:**
    ```typescript
    interface RegisterUsuarioRequest {
      email: string;
      password: string;
      nombres: string;
      p_apellido: string;
      s_apellido: string;
      fecha_nacimiento: string; // "YYYY-MM-DD"
      genero: string;
      name?: string;            // Nombre de pantalla (opcional)
      estado?: boolean;         // Habilitado (default true)
    }
    ```
*   **Respuesta:** `Usuario` (objeto creado).

### 2. Listar Usuarios registrados
*   **Método:** `GET`
*   **Ruta:** `/usuario`
*   **Respuesta:**
    ```typescript
    interface ListUsuariosResponse {
      status: number;
      message: string;
      data: Usuario[];
    }
    ```

### 3. Actualizar Usuario
*   **Método:** `PATCH`
*   **Ruta:** `/usuario/:id`
*   **Cuerpo:**
    ```typescript
    interface UpdateUsuarioRequest {
      name?: string;
      email?: string;
      password?: string;
      estado?: boolean;
    }
    ```
*   **Respuesta:** `Usuario`

---

## 📈 Módulo 9: Compras / Proveedores (`/compras`)

### 1. Registrar Compra de Stock (Ingreso de Mercadería)
Aumenta el `stock_actual` de los productos seleccionados y actualiza su `costo_compra`. Si se marca `pagar_con_caja: true`, crea automáticamente un `EGRESO` en la sesión de caja indicada.
*   **Método:** `POST`
*   **Ruta:** `/compras`
*   **Cuerpo:**
    ```typescript
    interface DetalleCompraInput {
      id_producto: number;
      cantidad: number;       // Cantidad a ingresar (>= 1)
      costo_unitario: number; // Costo por unidad (>= 0)
    }

    interface CrearCompraRequest {
      proveedor?: string;       // Nombre del proveedor (opcional)
      pagar_con_caja: boolean;  // Indica si sale efectivo del POS
      id_sesion_caja?: number;  // Requerido si pagar_con_caja es true
      detalles: DetalleCompraInput[];
      id_user_create: number;
    }
    ```
*   **Respuesta:** `Compra` (con los datos guardados).

### 2. Obtener Historial de Compras
*   **Método:** `GET`
*   **Ruta:** `/compras`
*   **Respuesta:** `Compra[]` (con la relación `detalles` y el sub-objeto `producto` incluidos).

---

## 📧 Módulo 10: Envío de Correo (`/mail`)

### 1. Enviar Email General `[PÚBLICA]`
*   **Método:** `POST`
*   **Ruta:** `/mail`
*   **Cuerpo:**
    ```typescript
    interface SendMailRequest {
      email: string;   // Correo del destinatario
      subject: string; // Asunto
      message: string; // Cuerpo del correo (soporta texto plano)
      name: string;    // Nombre del destinatario
    }
    ```
*   **Respuesta:** Información del transporte SMTP.

---

## 🛠️ Ejemplos de Consumo en React + TypeScript (Axios)

Aquí tienes una plantilla para configurar tu cliente Axios e interceptar peticiones para añadir tokens dinámicamente:

```typescript
import axios from 'axios';

// 1. Crear instancia de Axios
const api = axios.create({
  baseURL: 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// 2. Interceptor para inyectar Access Token JWT en cada petición
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 3. Interceptor para refrescar el token si expira (Error 401)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        
        // Llamada directa sin la cabecera del interceptor para el refresh
        const res = await axios.post('http://localhost:3000/auth/refresh_token', {}, {
          headers: { Authorization: `Bearer ${refreshToken}` }
        });
        
        const newAccessToken = res.data.access_token;
        localStorage.setItem('access_token', newAccessToken);
        
        // Reintentar la petición original con el nuevo token
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Si el refresh token también expiró, cerrar sesión
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
```

### Ejemplo de uso (Crear Producto):

```typescript
import api from './api';
import { Producto, CrearProductoRequest } from './types';

export const crearProducto = async (data: CrearProductoRequest): Promise<Producto> => {
  const response = await api.post<Producto>('/inventario/producto', data);
  return response.data;
};
```
