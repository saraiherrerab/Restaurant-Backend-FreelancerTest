import { Response } from 'express';
import { prisma } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';
import {
  checkAvailability,
  getAvailableSlotsForDate,
} from '../services/availabilityService';
import { sendReservationConfirmationEmail } from '../services/emailService';

export const checkAvailabilityEndpoint = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { date, time, guests } = req.query;

    if (!date || !time || !guests) {
      return res
        .status(400)
        .json({ error: 'Parámetros requeridos: date (YYYY-MM-DD), time (HH:mm), guests (número)' });
    }

    const guestCount = parseInt(guests as string, 10);
    if (isNaN(guestCount) || guestCount <= 0) {
      return res
        .status(400)
        .json({ error: 'La cantidad de comensales debe ser un número mayor a cero' });
    }

    const availability = await checkAvailability({
      date: date as string,
      startTime: time as string,
      guestCount,
    });

    const timeSlots = await getAvailableSlotsForDate(date as string, guestCount);

    return res.status(200).json({
      ...availability,
      timeSlots,
    });
  } catch (error) {
    console.error('Error en checkAvailabilityEndpoint:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const createReservation = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const { date, startTime, guestCount, notes } = req.body;

    if (!date || !startTime || !guestCount) {
      return res
        .status(400)
        .json({ error: 'Campos obligatorios: date, startTime, guestCount' });
    }

    const guests = parseInt(guestCount, 10);

    // 1. Check if user is blocked (3 no-shows rule)
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (user.isBlocked || user.noShowCount >= 3) {
      return res.status(403).json({
        error:
          'Tu cuenta está bloqueada para reservas online debido a 3 ausencias (no-shows) acumuladas. Por favor contacta al restaurante para desbloquearla.',
      });
    }

    const targetDate = new Date(`${date}T00:00:00.000Z`);

    // 2. Large Group Rule (> 8 guests)
    if (guests > 8) {
      const pendingReservation = await prisma.reservation.create({
        data: {
          userId: user.id,
          date: targetDate,
          startTime,
          endTime: '23:00', // Default end time
          guestCount: guests,
          status: 'PENDING_APPROVAL',
          tableId: null,
          notes,
        },
      });

      // Async email notification for pending large group reservation
      sendReservationConfirmationEmail({
        to: user.email,
        guestName: user.fullName,
        date,
        startTime,
        guestCount: guests,
        status: 'PENDING_APPROVAL',
        notes,
      }).catch((err) => console.error('Failed to trigger email:', err));

      return res.status(201).json({
        message:
          'Tu reserva para más de 8 personas ha sido registrada y quedó Pendiente de Aprobación por el personal del restaurante.',
        reservation: pendingReservation,
      });
    }

    // 3. Normal Reservation (<= 8 guests) - Check Real Availability
    const availability = await checkAvailability({
      date,
      startTime,
      guestCount: guests,
    });

    if (!availability.available || !availability.assignedTable) {
      return res.status(400).json({
        error:
          availability.reason ||
          'No hay mesa disponible para este horario. Te invitamos a anotarte en la lista de espera.',
      });
    }

    const reservation = await prisma.reservation.create({
      data: {
        userId: user.id,
        tableId: availability.assignedTable.id,
        date: targetDate,
        startTime,
        endTime: availability.endTime!,
        guestCount: guests,
        status: 'CONFIRMED',
        notes,
      },
      include: {
        table: true,
      },
    });

    // Async email notification for confirmed reservation
    sendReservationConfirmationEmail({
      to: user.email,
      guestName: user.fullName,
      date,
      startTime,
      endTime: availability.endTime!,
      guestCount: guests,
      tableNumber: availability.assignedTable.number,
      status: 'CONFIRMED',
      notes,
    }).catch((err) => console.error('Failed to trigger email:', err));

    return res.status(201).json({
      message: 'Reserva confirmada exitosamente',
      reservation,
    });
  } catch (error) {
    console.error('Error en createReservation:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const getMyBookings = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const reservations = await prisma.reservation.findMany({
      where: { userId: req.user.userId },
      include: { table: true },
      orderBy: [{ date: 'desc' }, { startTime: 'desc' }],
    });

    const waitlists = await prisma.waitlist.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({
      reservations,
      waitlists,
    });
  } catch (error) {
    console.error('Error en getMyBookings:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const cancelReservation = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const { id } = req.params;

    const reservation = await prisma.reservation.findUnique({
      where: { id },
    });

    if (!reservation) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }

    // Verify ownership unless staff/admin
    if (
      reservation.userId !== req.user.userId &&
      req.user.role === 'CLIENT'
    ) {
      return res
        .status(403)
        .json({ error: 'No tienes permiso para cancelar esta reserva' });
    }

    const updatedReservation = await prisma.reservation.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: { table: true },
    });

    return res.status(200).json({
      message: 'Reserva cancelada exitosamente',
      reservation: updatedReservation,
    });
  } catch (error) {
    console.error('Error en cancelReservation:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};
