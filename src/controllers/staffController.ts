import { Response } from 'express';
import { prisma } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';
import { emitReservationUpdated } from '../socket/socketGateway';
import { checkAndPromoteWaitlist } from '../services/waitlistService';

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
