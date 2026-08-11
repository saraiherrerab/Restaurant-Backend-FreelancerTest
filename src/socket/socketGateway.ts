import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyToken } from '../utils/jwt';

let io: SocketIOServer | null = null;

export const initSocketGateway = (httpServer: HttpServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT'],
    },
    transports: ['websocket', 'polling'],
  });

  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    if (!token) {
      return next();
    }
    try {
      const decoded = verifyToken(token);
      (socket as any).user = decoded;
      next();
    } catch (e) {
      next();
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user;

    if (user) {
      // User joins personal notification room
      socket.join(`user_${user.userId}`);

      // Staff/Admin joins staff room
      if (user.role === 'STAFF' || user.role === 'ADMIN') {
        socket.join('staff_room');
      }
    }

    socket.on('join_staff', () => {
      socket.join('staff_room');
    });

    socket.on('disconnect', () => {
      // Socket disconnected
    });
  });

  console.log('⚡ Socket.io Gateway initialized');
  return io;
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.io no ha sido inicializado aún.');
  }
  return io;
};

export const emitReservationCreated = (reservation: any) => {
  if (io) {
    io.to('staff_room').emit('reservation:created', reservation);
  }
};

export const emitReservationUpdated = (reservation: any) => {
  if (io) {
    io.to('staff_room').emit('reservation:updated', reservation);
    if (reservation.userId) {
      io.to(`user_${reservation.userId}`).emit('reservation:updated', reservation);
    }
  }
};

export const emitWaitlistPromoted = (userId: string, waitlistEntry: any) => {
  if (io) {
    io.to(`user_${userId}`).emit('waitlist:promoted', waitlistEntry);
    io.to('staff_room').emit('waitlist:promoted', waitlistEntry);
  }
};
