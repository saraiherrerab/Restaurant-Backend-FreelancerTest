# GourmetReserve — Backend API (`Restaurant-Backend-FreelancerTest`)

Backend REST API y servidor de WebSockets en tiempo real para la plataforma **GourmetReserve** (Prueba Técnica Fullstack Freelancer Developer).

---

## 🛠️ Tecnologías Utilizadas

* **Node.js** & **Express** con **TypeScript**.
* **Prisma ORM** con SQLite (por defecto para ejecución local inmediata) / PostgreSQL.
* **Socket.io** para emisión de eventos en tiempo real al panel del Staff y cliente.
* **JWT (JSON Web Tokens)** & **bcryptjs** para autenticación segura y RBAC (Control de Acceso Basado en Roles).
* **Jest** & **Supertest** para pruebas unitarias e integración.

---

## 🔑 Credenciales de Prueba Precargadas (Seed Data)

El script de inicialización crea los usuarios predeterminados para pruebas:

* **Administrador**:
  * Email: `admin@gourmet.com`
  * Password: `Admin123!`
  * Rol: `ADMIN`
* **Personal del Restaurante (Staff)**:
  * Email: `staff@gourmet.com`
  * Password: `Staff123!`
  * Rol: `STAFF`
* **Cliente de Prueba**:
  * Email: `client@gourmet.com`
  * Password: `Client123!`
  * Rol: `CLIENT`

---

## ⚡ Instrucciones de Instalación y Ejecución

1. **Instalar dependencias**:
   ```bash
   npm install
   ```

2. **Configurar variables de entorno**:
   Asegúrate de contar con el archivo `.env` (puedes copiarlo desde `.env.example`):
   ```env
   PORT=4000
   DATABASE_URL="file:./dev.db"
   JWT_SECRET="gourmet_reserve_super_secret_jwt_key_2026"
   CLIENT_URL="http://localhost:3000"
   ```

3. **Ejecutar migraciones y datos semilla (Seed)**:
   ```bash
   npx prisma db push
   npx ts-node prisma/seed.ts
   ```

4. **Iniciar el servidor en modo desarrollo**:
   ```bash
   npm run dev
   ```
   El servidor estará disponible en: `http://localhost:4000`

5. **Ejecutar Suite de Pruebas**:
   ```bash
   npm test
   ```

---

## 📌 Priorización de Requerimientos (MoSCoW)

* **Must Have (100% Implementado)**:
  * Autenticación y Registro con JWT y RBAC (`CLIENT`, `STAFF`, `ADMIN`).
  * Gestión de 14 mesas (6x2p, 6x4p, 2x8p).
  * Algoritmo de disponibilidad real sin solapamientos en turnos de 90 minutos (12:00-16:00 y 19:00-23:00, Mar-Dom).
  * Tablero del día para el staff con acciones en un clic (`SEATED`, `COMPLETED`, `CANCELLED`, `NO_SHOW`).
* **Should Have (100% Implementado)**:
  * Control anti no-show: Bloqueo automático online al acumular 3 ausencias sin aviso + botón de desbloqueo para el staff.
  * Reservas de grupos grandes (>8 personas) pendientes de aprobación manual por el restaurante.
  * Lista de espera semiautomática (FIFO con ventana de 15 minutos para confirmar cupos liberados).
  * Configuración del restaurante (`allowTableDowngrade` conmutable).
* **Could Have (Bonus +10% Implementado)**:
  * Actualización en tiempo real vía **Socket.io** (sin recargar página).

---

## 📡 Resumen de Endpoints API

* `POST /api/auth/register`: Registro de clientes.
* `POST /api/auth/login`: Login y retorno de JWT.
* `GET /api/auth/me`: Datos de usuario autenticado.
* `GET /api/reservations/availability?date=YYYY-MM-DD&time=HH:mm&guests=N`: Consulta disponibilidad.
* `POST /api/reservations`: Crear reserva.
* `GET /api/reservations/my-bookings`: Listar reservas del cliente.
* `PATCH /api/reservations/:id/cancel`: Cancelar reserva.
* `POST /api/waitlist`: Inscribirse en lista de espera.
* `POST /api/waitlist/:id/claim`: Reclamar cupo liberado.
* `GET /api/staff/board?date=YYYY-MM-DD`: Tablero del día en tiempo real (Staff/Admin).
* `PATCH /api/staff/reservations/:id/status`: Cambiar estado de reserva.
* `POST /api/staff/reservations/:id/approve`: Aprobar reserva de grupo grande (>8p).
* `PATCH /api/staff/users/:userId/unblock`: Desbloquear usuario deshabilitado por no-shows.
* `GET /api/config` & `PUT /api/config`: Leer/Actualizar ajustes del restaurante.
