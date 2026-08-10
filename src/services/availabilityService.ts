import { prisma } from '../config/db';
import { Table } from '@prisma/client';

export interface AvailabilityRequest {
  date: string;       // YYYY-MM-DD
  startTime: string;  // HH:mm
  guestCount: number;
}

export interface AvailabilityResult {
  available: boolean;
  assignedTable: Table | null;
  endTime: string | null;
  reason?: string;
  availableTimeSlots?: string[];
}

export const timeToMinutes = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

export const minutesToTime = (minutes: number): string => {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

export const LUNCH_SLOTS = ['12:00', '12:30', '13:00', '13:30', '14:00', '14:30'];
export const DINNER_SLOTS = ['19:00', '19:30', '20:00', '20:30', '21:00', '21:30'];
export const ALL_SLOTS = [...LUNCH_SLOTS, ...DINNER_SLOTS];

export const checkAvailability = async (
  req: AvailabilityRequest
): Promise<AvailabilityResult> => {
  const { date, startTime, guestCount } = req;

  // 1. Validate Date & Config Parameters
  const targetDate = new Date(`${date}T00:00:00.000Z`);
  const dayOfWeek = targetDate.getUTCDay();
  const dayKeys = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
  const currentDayKey = dayKeys[dayOfWeek];

  const config = await prisma.restaurantConfig.findUnique({
    where: { id: 'default' },
  });

  let openDays: string[] = ['MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
  if (config?.openDays) {
    try {
      openDays = typeof config.openDays === 'string' ? JSON.parse(config.openDays) : config.openDays;
    } catch (e) {
      openDays = ['MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
    }
  }

  const dayNameMap: Record<string, string> = {
    DOM: 'Domingos',
    LUN: 'Lunes',
    MAR: 'Martes',
    MIÉ: 'Miércoles',
    JUE: 'Jueves',
    VIE: 'Viernes',
    SÁB: 'Sábados',
  };
  const currentDayName = dayNameMap[currentDayKey] || currentDayKey;

  if (openDays.length > 0 && !openDays.includes(currentDayKey)) {
    return {
      available: false,
      assignedTable: null,
      endTime: null,
      reason: `El restaurante permanece cerrado los días ${currentDayName}`,
    };
  }

  const allowDowngrade = config?.allowTableDowngrade ?? true;
  let closedDates: string[] = [];
  try {
    closedDates = JSON.parse(config?.closedDates || '[]');
  } catch (e) {
    closedDates = [];
  }

  if (closedDates.includes(date)) {
    return {
      available: false,
      assignedTable: null,
      endTime: null,
      reason: 'El restaurante se encuentra cerrado en la fecha seleccionada por feriado o mantenimiento',
    };
  }

  // 2. Validate Time Slot and Calculate End Time (+90 mins)
  if (!ALL_SLOTS.includes(startTime)) {
    return {
      available: false,
      assignedTable: null,
      endTime: null,
      reason: 'El horario seleccionado no corresponde a un turno válido (Almuerzo: 12:00-14:30, Cena: 19:00-21:30)',
    };
  }

  const startMinutes = timeToMinutes(startTime);
  const endMinutes = startMinutes + 90;
  const endTime = minutesToTime(endMinutes);

  // 3. Find Overlapping Active Reservations
  const activeReservations = await prisma.reservation.findMany({
    where: {
      date: targetDate,
      status: {
        in: ['CONFIRMED', 'SEATED', 'PENDING_APPROVAL'],
      },
    },
  });

  const occupiedTableIds = new Set<string>();

  for (const res of activeReservations) {
    const resStart = timeToMinutes(res.startTime);
    const resEnd = timeToMinutes(res.endTime);

    if (startMinutes < resEnd && endMinutes > resStart) {
      if (res.tableId) {
        occupiedTableIds.add(res.tableId);
      }
    }
  }

  // 4. Find Active Tables
  const allTables = await prisma.table.findMany({
    where: { isActive: true },
    orderBy: { capacity: 'asc' },
  });

  const freeTables = allTables.filter((t) => !occupiedTableIds.has(t.id));

  // 5. Select Optimal Table
  let chosenTable = freeTables.find((t) => t.capacity === guestCount);

  if (!chosenTable && allowDowngrade) {
    chosenTable = freeTables.find((t) => t.capacity >= guestCount);
  }

  if (!chosenTable) {
    return {
      available: false,
      assignedTable: null,
      endTime,
      reason: 'No hay mesa disponible para este horario y cantidad de personas',
    };
  }

  return {
    available: true,
    assignedTable: chosenTable,
    endTime,
  };
};

export const getAvailableSlotsForDate = async (
  date: string,
  guestCount: number
): Promise<{ slot: string; available: boolean }[]> => {
  const results: { slot: string; available: boolean }[] = [];

  for (const slot of ALL_SLOTS) {
    const check = await checkAvailability({ date, startTime: slot, guestCount });
    results.push({ slot, available: check.available });
  }

  return results;
};
