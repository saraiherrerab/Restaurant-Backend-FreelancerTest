import { prisma } from '../config/db';
import { emitWaitlistPromoted } from '../socket/socketGateway';

export const checkAndPromoteWaitlist = async (
  date: Date,
  shift: string,
  liberatedCapacity: number
) => {
  try {
    // 1. Find first WAITING entry in FIFO order matching date, shift, and guestCount <= liberatedCapacity
    const candidate = await prisma.waitlist.findFirst({
      where: {
        date,
        shift: shift.toUpperCase(),
        status: 'WAITING',
        guestCount: { lte: liberatedCapacity },
      },
      orderBy: { createdAt: 'asc' }, // FIFO
    });

    if (!candidate) {
      return null;
    }

    // 2. Read timeout setting from RestaurantConfig
    const config = await prisma.restaurantConfig.findUnique({
      where: { id: 'default' },
    });
    const timeoutMins = config?.waitlistTimeoutMinutes || 15;

    const notifiedUntil = new Date(Date.now() + timeoutMins * 60 * 1000);

    // 3. Promote candidate to NOTIFIED
    const updatedCandidate = await prisma.waitlist.update({
      where: { id: candidate.id },
      data: {
        status: 'NOTIFIED',
        notifiedUntil,
      },
    });

    // 4. Emit real-time notification
    emitWaitlistPromoted(candidate.userId, updatedCandidate);

    console.log(
      `🔔 Waitlist entry ${candidate.id} promoted to NOTIFIED until ${notifiedUntil.toISOString()}`
    );

    return updatedCandidate;
  } catch (error) {
    console.error('Error en checkAndPromoteWaitlist:', error);
    return null;
  }
};
