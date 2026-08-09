import { Response } from 'express';
import { prisma } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';

export const joinWaitlist = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const { date, shift, guestCount } = req.body;

    if (!date || !shift || !guestCount) {
      return res
        .status(400)
        .json({ error: 'Campos requeridos: date (YYYY-MM-DD), shift (LUNCH/DINNER), guestCount' });
    }

    const targetDate = new Date(`${date}T00:00:00.000Z`);

    const waitlistEntry = await prisma.waitlist.create({
      data: {
        userId: req.user.userId,
        date: targetDate,
        shift: shift.toUpperCase(),
        guestCount: parseInt(guestCount, 10),
        status: 'WAITING',
      },
    });

    return res.status(201).json({
      message: 'Te has anotado exitosamente en la lista de espera.',
      waitlist: waitlistEntry,
    });
  } catch (error) {
    console.error('Error en joinWaitlist:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const claimWaitlistOffer = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const { id } = req.params;
    const { startTime } = req.body;

    const waitlistEntry = await prisma.waitlist.findUnique({
      where: { id },
    });

    if (!waitlistEntry) {
      return res.status(404).json({ error: 'Registro en lista de espera no encontrado' });
    }

    if (waitlistEntry.userId !== req.user.userId) {
      return res.status(403).json({ error: 'No tienes permiso para reclamar esta oferta' });
    }

    if (waitlistEntry.status !== 'NOTIFIED') {
      return res
        .status(400)
        .json({ error: 'Esta solicitud en lista de espera no tiene una oferta activa' });
    }

    if (waitlistEntry.notifiedUntil && new Date() > new Date(waitlistEntry.notifiedUntil)) {
      await prisma.waitlist.update({
        where: { id },
        data: { status: 'EXPIRED' },
      });
      return res
        .status(400)
        .json({ error: 'El tiempo límite de 15 minutos para reclamar el cupo ha expirado' });
    }

    // Convert to Confirmed Reservation
    const defaultTime = startTime || (waitlistEntry.shift === 'LUNCH' ? '12:00' : '19:00');
    
    // Find free table
    const freeTable = await prisma.table.findFirst({
      where: {
        capacity: { gte: waitlistEntry.guestCount },
        isActive: true,
      },
      orderBy: { capacity: 'asc' },
    });

    if (!freeTable) {
      return res
        .status(400)
        .json({ error: 'En este momento no hay mesa libre para confirmar' });
    }

    const [reservation] = await prisma.$transaction([
      prisma.reservation.create({
        data: {
          userId: req.user.userId,
          tableId: freeTable.id,
          date: waitlistEntry.date,
          startTime: defaultTime,
          endTime: '20:30', // Default end time preview
          guestCount: waitlistEntry.guestCount,
          status: 'CONFIRMED',
          notes: 'Reserva confirmada desde Lista de Espera',
        },
        include: { table: true },
      }),
      prisma.waitlist.update({
        where: { id },
        data: { status: 'CONVERTED' },
      }),
    ]);

    return res.status(200).json({
      message: '¡Cupo reclamado con éxito! Tu reserva ha sido confirmada.',
      reservation,
    });
  } catch (error) {
    console.error('Error en claimWaitlistOffer:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};
