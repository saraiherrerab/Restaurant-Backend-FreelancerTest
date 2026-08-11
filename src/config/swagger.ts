import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'GourmetReserve API Specification',
      version: '1.0.0',
      description:
        'Documentación interactiva de la API REST para la gestión de reservas de restaurante, lista de espera y panel en tiempo real de GourmetReserve.',
      contact: {
        name: 'Soporte GourmetReserve',
        email: 'hector@vracademy.lat',
      },
    },
    servers: [
      {
        url: 'https://restaurant-backend-freelancertest-production.up.railway.app',
        description: 'Servidor de Producción (Railway)',
      },
      {
        url: 'http://localhost:4000',
        description: 'Servidor Local de Desarrollo',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Ingresa el token JWT obtenido al iniciar sesión o registrarse',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            fullName: { type: 'string' },
            phone: { type: 'string', nullable: true },
            role: { type: 'string', enum: ['CLIENT', 'STAFF', 'ADMIN'] },
            noShowCount: { type: 'integer', default: 0 },
            isBlocked: { type: 'boolean', default: false },
          },
        },
        Reservation: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string' },
            tableId: { type: 'string', nullable: true },
            date: { type: 'string', format: 'date' },
            startTime: { type: 'string', example: '12:00' },
            endTime: { type: 'string', example: '13:30' },
            guestCount: { type: 'integer', example: 2 },
            status: {
              type: 'string',
              enum: ['PENDING_APPROVAL', 'CONFIRMED', 'SEATED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'],
            },
            notes: { type: 'string', nullable: true },
          },
        },
        Table: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            number: { type: 'integer', example: 1 },
            capacity: { type: 'integer', example: 2 },
            isActive: { type: 'boolean', default: true },
          },
        },
        Waitlist: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            date: { type: 'string', format: 'date' },
            shift: { type: 'string', enum: ['LUNCH', 'DINNER'] },
            guestCount: { type: 'integer' },
            status: { type: 'string', enum: ['WAITING', 'NOTIFIED', 'EXPIRED', 'CONVERTED'] },
            notifiedUntil: { type: 'string', format: 'date-time', nullable: true },
          },
        },
      },
    },
    paths: {
      '/api/auth/register': {
        post: {
          summary: 'Registrar nuevo usuario cliente',
          tags: ['Autenticación'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password', 'fullName'],
                  properties: {
                    email: { type: 'string', example: 'cliente@gourmet.com' },
                    password: { type: 'string', example: 'Password123!' },
                    fullName: { type: 'string', example: 'Juan Pérez' },
                    phone: { type: 'string', example: '+56912345678' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Usuario registrado exitosamente con token JWT' },
            400: { description: 'Email ya registrado o datos inválidos' },
          },
        },
      },
      '/api/auth/login': {
        post: {
          summary: 'Iniciar sesión',
          tags: ['Autenticación'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', example: 'client@gourmet.com' },
                    password: { type: 'string', example: 'Client123!' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Inicio de sesión exitoso' },
            401: { description: 'Credenciales inválidas' },
          },
        },
      },
      '/api/auth/forgot-password': {
        post: {
          summary: 'Solicitar código de recuperación de contraseña',
          tags: ['Autenticación'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email'],
                  properties: {
                    email: { type: 'string', example: 'client@gourmet.com' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Código OTP enviado al correo del usuario' },
            400: { description: 'Falta email' },
          },
        },
      },
      '/api/auth/reset-password': {
        post: {
          summary: 'Restablecer contraseña con código OTP de 6 dígitos',
          tags: ['Autenticación'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'code', 'newPassword'],
                  properties: {
                    email: { type: 'string', example: 'client@gourmet.com' },
                    code: { type: 'string', example: '123456' },
                    newPassword: { type: 'string', example: 'NewPassword123!' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Contraseña restablecida exitosamente' },
            400: { description: 'Código inválido o expirado' },
          },
        },
      },
      '/api/auth/me': {
        get: {
          summary: 'Obtener datos del usuario autenticado',
          tags: ['Autenticación'],
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Información del perfil' },
            401: { description: 'No autenticado' },
          },
        },
      },
      '/api/reservations/availability': {
        get: {
          summary: 'Consultar disponibilidad real de mesas',
          tags: ['Reservas'],
          parameters: [
            { name: 'date', in: 'query', required: true, schema: { type: 'string', example: '2026-08-15' } },
            { name: 'time', in: 'query', required: true, schema: { type: 'string', example: '19:00' } },
            { name: 'guests', in: 'query', required: true, schema: { type: 'integer', example: 2 } },
          ],
          responses: {
            200: { description: 'Estado de disponibilidad y preview de asignación de mesa' },
          },
        },
      },
      '/api/reservations': {
        post: {
          summary: 'Crear nueva reserva',
          tags: ['Reservas'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['date', 'startTime', 'guestCount'],
                  properties: {
                    date: { type: 'string', example: '2026-08-15' },
                    startTime: { type: 'string', example: '19:00' },
                    guestCount: { type: 'integer', example: 2 },
                    notes: { type: 'string', example: 'Mesa cerca de la ventana' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Reserva creada (Confirmada o Pendiente de Aprobación para >8p)' },
            403: { description: 'Usuario bloqueado por acumular 3 no-shows' },
          },
        },
      },
      '/api/reservations/my-bookings': {
        get: {
          summary: 'Obtener historial de reservas del cliente',
          tags: ['Reservas'],
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Listado de reservas activas y pasadas' },
          },
        },
      },
      '/api/staff/board': {
        get: {
          summary: 'Obtener Tablero de Control del Día (Staff / Admin)',
          tags: ['Staff & Administración'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'date', in: 'query', required: true, schema: { type: 'string', example: '2026-08-15' } },
          ],
          responses: {
            200: { description: 'Métricas diarias, lista de reservas, estado de mesas y usuarios bloqueados' },
            403: { description: 'Acceso denegado (Requiere rol STAFF o ADMIN)' },
          },
        },
      },
      '/api/staff/reservations/{id}/status': {
        patch: {
          summary: 'Actualizar estado de una reserva (SEATED, COMPLETED, CANCELLED, NO_SHOW)',
          tags: ['Staff & Administración'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['status'],
                  properties: {
                    status: { type: 'string', enum: ['SEATED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'] },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Estado actualizado y notificación Socket.io emitida' },
          },
        },
      },
      '/api/config': {
        get: {
          summary: 'Obtener configuración del restaurante',
          tags: ['Configuración'],
          responses: {
            200: { description: 'Ajustes de allowTableDowngrade y fechas cerradas' },
          },
        },
        put: {
          summary: 'Actualizar configuración del restaurante (Solo Admin)',
          tags: ['Configuración'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    allowTableDowngrade: { type: 'boolean' },
                    closedDates: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Configuración actualizada' },
          },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
