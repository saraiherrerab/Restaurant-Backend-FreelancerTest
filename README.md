# GourmetReserve — Backend API (`Restaurant-Backend-FreelancerTest`)

Backend REST API y servidor de WebSockets en tiempo real para la plataforma **GourmetReserve** (Prueba Técnica Fullstack Freelancer Developer).

---

## 🛠️ Tecnologías Utilizadas

* **Node.js** & **Express** con **TypeScript**.
* **Prisma ORM** con SQLite (por defecto para ejecución local inmediata) / PostgreSQL.
* **Socket.io** para emisión de eventos en tiempo real al panel del Staff y cliente.
* **Cookies HttpOnly** (con fallback a `Authorization: Bearer` en Swagger/Postman) + **JWT** & **bcryptjs** para autenticación segura y RBAC (Control de Acceso Basado en Roles).
* **Swagger UI / OpenAPI 3.0** para documentación interactiva de la API.
* **Jest** & **Supertest** para pruebas unitarias e integración.

---

## 🔑 Credenciales de Prueba Precargadas (Seed Data)

El script de inicialización (`prisma/seed.ts`) crea automáticamente los usuarios predeterminados para pruebas:

* **Administrador**:
  * Email: `admin@gourmet.com`
  * Contraseña: `Admin123!`
  * Rol: `ADMIN`
* **Personal del Restaurante (Staff)**:
  * Email: `staff@gourmet.com`
  * Contraseña: `Staff123!`
  * Rol: `STAFF`
* **Cliente de Prueba**:
  * Email: `client@gourmet.com`
  * Contraseña: `Client123!`
  * Rol: `CLIENT`

---

## 🌱 Información de Seeders (`prisma/seed.ts`)

El seeder del proyecto puebla la base de datos con:

1. **Configuración del Restaurante (`RestaurantConfig`)**:
   * Permiso de degradación de mesa (`allowTableDowngrade: true`).
   * Tiempo límite de reclamación en Lista de Espera: `15 minutos`.
2. **14 Mesas de Restaurante (`Table`)**:
   * **6 Mesas para 2 Personas** (Mesas #1 a #6).
   * **6 Mesas para 4 Personas** (Mesas #7 a #12).
   * **2 Mesas para 8 Personas** (Mesas #13 y #14).
3. **3 Usuarios por Defecto con Roles RBAC**:
   * Admin, Staff y Client (con contraseñas encriptadas mediante `bcryptjs`).

---

## ⚡ Instrucciones de Instalación y Ejecución

1. **Instalar dependencias**:
   ```bash
   npm install
   ```

2. **Configurar variables de entorno**:
   Copia el archivo de ejemplo `.env.example` a `.env`:
   ```bash
   cp .env.example .env
   ```
   *Contenido de `.env`:*
   ```env
   PORT=4000
   DATABASE_URL="file:./dev.db"
   JWT_SECRET="gourmet_reserve_super_secret_jwt_key_2026"
   CLIENT_URL="http://localhost:3000"
   ```

3. **Ejecutar migraciones y cargar Seeders**:
   ```bash
   npm run db:push
   npm run db:seed
   ```

4. **Iniciar el servidor en modo desarrollo**:
   ```bash
   npm run dev
   ```
   * API disponible en: `http://localhost:4000`
   * Documentación Swagger UI en: `http://localhost:4000/api-docs`

5. **Ejecutar Suite de Pruebas**:
   ```bash
   npm test
   ```

---

## 📌 Priorización de Requerimientos (MoSCoW)

* **Must Have (Innegociable - Core 100%)**:
  * Autenticación y Registro con JWT en Cookies HttpOnly y RBAC (`CLIENT`, `STAFF`, `ADMIN`).
  * Gestión de 14 mesas (6x2p, 6x4p, 2x8p).
  * Algoritmo de disponibilidad real sin solapamientos en turnos de 90 minutos por defecto (12:00-16:00 y 19:00-23:00).
  * Tablero del día para el staff con acciones en un clic (`SEATED`, `COMPLETED`, `CANCELLED`, `NO_SHOW`).
  * Marcado de días cerrados y fechas inoperativas por el dueño/admin.
* **Should Have (Valor Agregado / Completado)**:
  * **Notificación por Email de Confirmación de Reserva (Nodemailer + Ethereal Mail)** (*Bonus +10%*).
  * **WebSockets en Vivo (Socket.io)** para actualización instantánea del Tablero (*Bonus +10%*).
  * **Tests de Integración y Disponibilidad (Jest & Supertest)** (*Bonus +10%*).
  * **Panel Avanzado de Configuración del Sistema** (`ConfigTab.tsx` / `configController.ts` - Modificación dinámica de la duración por turno en pasos de 10 min, franjas horarias y reglas de asignación).
  * Control anti no-show: Bloqueo automático online al acumular 3 ausencias + desbloqueo manual por Admin.
  * Reservas de grupos grandes (>8 personas) pendientes de aprobación manual por el restaurante.
  * Lista de espera semiautomática (FIFO con ventana de 15 minutos para confirmar cupos liberados).
  * **Módulo de Gestión de Clientes** con búsqueda avanzada e histórico por usuario.
* **Could Have (Mejoras de Productividad)**:
  * **Exportación a CSV/Excel** de Listas de Reservas y Clientes en 1-clic.
  * **Flujo de Recuperación de Contraseña** por correo o token (*Bonus +10%*).
  * Documentación Swagger UI interactiva (`/api-docs`).
* **Won't Have (Fuera de Alcance)**:
  * Pasarela de pagos con tarjeta de crédito en línea.

---

## 📡 Resumen de Endpoints API

* `POST /api/auth/register`: Registro de clientes.
* `POST /api/auth/login`: Login (setea cookie HttpOnly `gourmet_token` y devuelve `user`).
* `POST /api/auth/logout`: Cerrar sesión (destruye cookie HttpOnly).
* `GET /api/auth/me`: Datos de usuario autenticado.
* `PUT /api/auth/profile`: Editar datos del perfil.
* `PUT /api/auth/change-password`: Cambiar contraseña.
* `GET /api/reservations/availability?date=YYYY-MM-DD&time=HH:mm&guests=N`: Consulta disponibilidad.
* `POST /api/reservations`: Crear reserva.
* `GET /api/reservations/my-bookings`: Listar reservas del cliente.
* `PATCH /api/reservations/:id/cancel`: Cancelar reserva.
* `POST /api/waitlist`: Inscribirse en lista de espera.
* `POST /api/waitlist/:id/claim`: Reclamar cupo liberado en lista de espera.
* `GET /api/staff/board?date=YYYY-MM-DD`: Tablero del día en tiempo real (Staff/Admin).
* `PATCH /api/staff/reservations/:id/status`: Cambiar estado de reserva.
* `POST /api/staff/reservations/:id/approve`: Aprobar reserva de grupo grande (>8p).
* `PATCH /api/staff/users/:userId/unblock`: Desbloquear usuario deshabilitado por no-shows.
* `GET /api/config` & `PUT /api/config`: Leer/Actualizar ajustes del restaurante.
