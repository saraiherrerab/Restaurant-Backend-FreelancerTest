import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';
import { emitReservationUpdated } from '../socket/socketGateway';
import { checkAndPromoteWaitlist } from '../services/waitlistService';
import { validatePasswordStrength, validatePhoneNumber } from '../utils/validators';
import { sendReservationStatusUpdateEmail } from '../services/emailService';


const VALID_STATUSES = ['PENDING_APPROVAL', 'CONFIRMED', 'SEATED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];

export const getDailyBoard = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res
        .status(400)
        .json({ error: 'El parámetro date (YYYY-MM-DD) es requerido' });
    }

    const targetDate = new Date(`${date}T00:00:00.000Z`);

    const [tables, reservations, waitlists, blockedUsers] = await Promise.all([
      prisma.table.findMany({ orderBy: { number: 'asc' } }),
      prisma.reservation.findMany({
        where: { date: targetDate },
        include: { user: true, table: true },
        orderBy: { startTime: 'asc' },
      }),
      prisma.waitlist.findMany({
        where: { date: targetDate },
        include: { user: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.user.findMany({
        where: { isBlocked: true },
        select: { id: true, fullName: true, email: true, noShowCount: true, isBlocked: true },
      }),
    ]);

    const metrics = {
      totalBooked: reservations.filter((r) => r.status !== 'CANCELLED').length,
      seated: reservations.filter((r) => r.status === 'SEATED').length,
      completed: reservations.filter((r) => r.status === 'COMPLETED').length,
      pendingApproval: reservations.filter((r) => r.status === 'PENDING_APPROVAL').length,
      noShows: reservations.filter((r) => r.status === 'NO_SHOW').length,
      cancelled: reservations.filter((r) => r.status === 'CANCELLED').length,
      inWaitlist: waitlists.filter((w) => w.status === 'WAITING' || w.status === 'NOTIFIED').length,
    };

    return res.status(200).json({
      date,
      metrics,
      tables,
      reservations,
      waitlists,
      blockedUsers,
    });
  } catch (error) {
    console.error('Error en getDailyBoard:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const updateReservationStatus = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Estado de reserva inválido' });
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: { table: true, user: true },
    });

    if (!reservation) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }

    const previousStatus = reservation.status;

    if (status === 'NO_SHOW' && previousStatus !== 'NO_SHOW') {
      const updatedUser = await prisma.user.update({
        where: { id: reservation.userId },
        data: {
          noShowCount: { increment: 1 },
        },
      });

      if (updatedUser.noShowCount >= 3) {
        await prisma.user.update({
          where: { id: reservation.userId },
          data: { isBlocked: true },
        });
      }
    }

    const updatedReservation = await prisma.reservation.update({
      where: { id },
      data: { status },
      include: { user: true, table: true },
    });

    emitReservationUpdated(updatedReservation);

    if (updatedReservation.user?.email) {
      sendReservationStatusUpdateEmail({
        to: updatedReservation.user.email,
        guestName: updatedReservation.user.fullName,
        date: updatedReservation.date.toISOString().split('T')[0],
        startTime: updatedReservation.startTime,
        guestCount: updatedReservation.guestCount,
        newStatus: status,
        tableNumber: updatedReservation.table?.number,
      }).catch((err) => console.error('Failed to send status email:', err));
    }

    if (status === 'CANCELLED' || status === 'NO_SHOW') {
      const shift = parseInt(reservation.startTime.split(':')[0], 10) < 17 ? 'LUNCH' : 'DINNER';
      const capacity = reservation.table?.capacity || reservation.guestCount;
      await checkAndPromoteWaitlist(reservation.date, shift, capacity);
    }

    return res.status(200).json({
      message: `Estado de la reserva actualizado a ${status}`,
      reservation: updatedReservation,
    });
  } catch (error) {
    console.error('Error en updateReservationStatus:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const approveLargeGroupReservation = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { id } = req.params;
    const { tableId } = req.body;

    if (!tableId) {
      return res
        .status(400)
        .json({ error: 'Se debe proporcionar un tableId para asignar la mesa' });
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id },
    });

    if (!reservation) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }

    const updatedReservation = await prisma.reservation.update({
      where: { id },
      data: {
        status: 'CONFIRMED',
        tableId,
      },
      include: { user: true, table: true },
    });

    emitReservationUpdated(updatedReservation);

    if (updatedReservation.user?.email) {
      sendReservationStatusUpdateEmail({
        to: updatedReservation.user.email,
        guestName: updatedReservation.user.fullName,
        date: updatedReservation.date.toISOString().split('T')[0],
        startTime: updatedReservation.startTime,
        guestCount: updatedReservation.guestCount,
        newStatus: 'CONFIRMED',
        tableNumber: updatedReservation.table?.number,
      }).catch((err) => console.error('Failed to send approval email:', err));
    }

    return res.status(200).json({
      message: 'Reserva de grupo grande aprobada y mesa asignada exitosamente',
      reservation: updatedReservation,
    });
  } catch (error) {
    console.error('Error en approveLargeGroupReservation:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const unblockUser = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        isBlocked: false,
        noShowCount: 0,
      },
      select: { id: true, fullName: true, email: true, noShowCount: true, isBlocked: true },
    });

    return res.status(200).json({
      message: `Usuario ${user.fullName} desbloqueado exitosamente.`,
      user,
    });
  } catch (error) {
    console.error('Error en unblockUser:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const getStaffMembers = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { search } = req.query;
    let whereClause: any = { role: 'STAFF' };

    if (search && typeof search === 'string' && search.trim() !== '') {
      const query = search.trim();
      whereClause.OR = [
        { fullName: { contains: query } },
        { email: { contains: query } },
        { phone: { contains: query } },
      ];
    }

    const members = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({ members });
  } catch (error) {
    console.error('Error in getStaffMembers:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const createStaffMember = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { fullName, email, password, phone } = req.body;

    if (!fullName || !email || !password) {
      return res
        .status(400)
        .json({ error: 'Nombre, email y contraseña son requeridos' });
    }

    const pwdCheck = validatePasswordStrength(password);
    if (!pwdCheck.isValid) {
      return res.status(400).json({ error: pwdCheck.message });
    }

    const phoneCheck = validatePhoneNumber(phone);
    if (!phoneCheck.isValid) {
      return res.status(400).json({ error: phoneCheck.message });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res
        .status(400)
        .json({ error: 'El correo electrónico ya está registrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const member = await prisma.user.create({
      data: {
        fullName,
        email,
        password: hashedPassword,
        phone: phone || null,
        role: 'STAFF',
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    return res
      .status(201)
      .json({ message: 'Miembro del staff registrado exitosamente', member });
  } catch (error) {
    console.error('Error en createStaffMember:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const updateStaffMember = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { id } = req.params;
    const { fullName, email, phone } = req.body;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Miembro no encontrado' });
    }

    if (phone !== undefined && phone !== null) {
      const phoneCheck = validatePhoneNumber(phone);
      if (!phoneCheck.isValid) {
        return res.status(400).json({ error: phoneCheck.message });
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        fullName: fullName || existing.fullName,
        email: email || existing.email,
        phone: phone !== undefined ? phone : existing.phone,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    return res
      .status(200)
      .json({ message: 'Miembro actualizado exitosamente', member: updated });
  } catch (error) {
    console.error('Error en updateStaffMember:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const deleteStaffMember = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { id } = req.params;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Miembro no encontrado' });
    }

    await prisma.user.delete({ where: { id } });

    return res.status(200).json({ message: 'Miembro eliminado exitosamente' });
  } catch (error) {
    console.error('Error en deleteStaffMember:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

