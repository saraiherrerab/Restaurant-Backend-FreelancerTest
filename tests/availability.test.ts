import { checkAvailability } from '../src/services/availabilityService';
import { prisma } from '../src/config/db';

describe('Availability Engine & Table Assignment', () => {
  beforeEach(async () => {
    await prisma.restaurantConfig.upsert({
      where: { id: 'default' },
      update: {
        openDays: JSON.stringify(['MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM']),
        allowTableDowngrade: true,
      },
      create: {
        id: 'default',
        openDays: JSON.stringify(['MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM']),
        lunchShiftStart: '12:00',
        lunchShiftEnd: '16:00',
        dinnerShiftStart: '19:00',
        dinnerShiftEnd: '23:00',
        reservationDurationMinutes: 90,
        minGuestsFor4pTable: 2,
        minGuestsFor8pTable: 5,
        allowTableDowngrade: true,
        waitlistTimeoutMinutes: 15,
        closedDates: '[]',
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should assign a 2p table for 2 guests when free', async () => {
    // 2026-08-11 is a Tuesday
    const result = await checkAvailability({
      date: '2026-08-11',
      startTime: '12:00',
      guestCount: 2,
    });

    expect(result.available).toBe(true);
    expect(result.assignedTable).not.toBeNull();
    expect(result.assignedTable?.capacity).toBe(2);
    expect(result.endTime).toBe('13:30');
  });

  it('should reject booking on Monday (Closed day)', async () => {
    // 2026-08-10 is a Monday
    const result = await checkAvailability({
      date: '2026-08-10',
      startTime: '12:00',
      guestCount: 2,
    });

    expect(result.available).toBe(false);
    expect(result.reason).toContain('Lunes');
  });

  it('should assign a 4p table for 2 guests when allowTableDowngrade is true and 2p tables are full', async () => {
    const testDate = new Date('2026-08-12T00:00:00.000Z'); // Wednesday
    const user = await prisma.user.findFirst();
    const tablesFor2 = await prisma.table.findMany({ where: { capacity: 2 } });

    // Occupy all 6 tables of 2p at 12:00
    const reservationsCreated = [];
    for (const table of tablesFor2) {
      const res = await prisma.reservation.create({
        data: {
          userId: user!.id,
          tableId: table.id,
          date: testDate,
          startTime: '12:00',
          endTime: '13:30',
          guestCount: 2,
          status: 'CONFIRMED',
        },
      });
      reservationsCreated.push(res.id);
    }

    // Now check availability for 2 guests at 12:00
    const result = await checkAvailability({
      date: '2026-08-12',
      startTime: '12:00',
      guestCount: 2,
    });

    expect(result.available).toBe(true);
    expect(result.assignedTable?.capacity).toBe(4); // Downgraded to 4p table

    // Clean up test reservations
    await prisma.reservation.deleteMany({
      where: { id: { in: reservationsCreated } },
    });
  });
});
