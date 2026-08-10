import { Request, Response } from 'express';
import { prisma } from '../config/db';

export const getConfig = async (req: Request, res: Response) => {
  try {
    let config = await prisma.restaurantConfig.findUnique({
      where: { id: 'default' },
    });

    if (!config) {
      config = await prisma.restaurantConfig.create({
        data: {
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
    }

    let openDays: string[] = ['MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
    try {
      openDays = JSON.parse(config.openDays);
    } catch (e) {
      openDays = ['MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
    }

    let closedDates: string[] = [];
    try {
      closedDates = JSON.parse(config.closedDates);
    } catch (e) {
      closedDates = [];
    }

    return res.status(200).json({
      id: config.id,
      openDays,
      lunchShiftStart: config.lunchShiftStart,
      lunchShiftEnd: config.lunchShiftEnd,
      dinnerShiftStart: config.dinnerShiftStart,
      dinnerShiftEnd: config.dinnerShiftEnd,
      reservationDurationMinutes: config.reservationDurationMinutes,
      minGuestsFor4pTable: config.minGuestsFor4pTable,
      minGuestsFor8pTable: config.minGuestsFor8pTable,
      allowTableDowngrade: config.allowTableDowngrade,
      waitlistTimeoutMinutes: config.waitlistTimeoutMinutes,
      closedDates,
    });
  } catch (error) {
    console.error('Error en getConfig:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const updateConfig = async (req: Request, res: Response) => {
  try {
    const {
      openDays,
      lunchShiftStart,
      lunchShiftEnd,
      dinnerShiftStart,
      dinnerShiftEnd,
      reservationDurationMinutes,
      minGuestsFor4pTable,
      minGuestsFor8pTable,
      allowTableDowngrade,
      waitlistTimeoutMinutes,
      closedDates,
    } = req.body;

    const dataToUpdate: any = {};

    if (Array.isArray(openDays)) {
      dataToUpdate.openDays = JSON.stringify(openDays);
    }
    if (typeof lunchShiftStart === 'string') {
      dataToUpdate.lunchShiftStart = lunchShiftStart;
    }
    if (typeof lunchShiftEnd === 'string') {
      dataToUpdate.lunchShiftEnd = lunchShiftEnd;
    }
    if (typeof dinnerShiftStart === 'string') {
      dataToUpdate.dinnerShiftStart = dinnerShiftStart;
    }
    if (typeof dinnerShiftEnd === 'string') {
      dataToUpdate.dinnerShiftEnd = dinnerShiftEnd;
    }
    if (typeof reservationDurationMinutes === 'number') {
      dataToUpdate.reservationDurationMinutes = reservationDurationMinutes;
    }
    if (typeof minGuestsFor4pTable === 'number') {
      dataToUpdate.minGuestsFor4pTable = minGuestsFor4pTable;
    }
    if (typeof minGuestsFor8pTable === 'number') {
      dataToUpdate.minGuestsFor8pTable = minGuestsFor8pTable;
    }
    if (typeof allowTableDowngrade === 'boolean') {
      dataToUpdate.allowTableDowngrade = allowTableDowngrade;
    }
    if (typeof waitlistTimeoutMinutes === 'number') {
      dataToUpdate.waitlistTimeoutMinutes = waitlistTimeoutMinutes;
    }
    if (Array.isArray(closedDates)) {
      dataToUpdate.closedDates = JSON.stringify(closedDates);
    }

    const updatedConfig = await prisma.restaurantConfig.upsert({
      where: { id: 'default' },
      update: dataToUpdate,
      create: {
        id: 'default',
        openDays: JSON.stringify(openDays || ['MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM']),
        lunchShiftStart: lunchShiftStart || '12:00',
        lunchShiftEnd: lunchShiftEnd || '16:00',
        dinnerShiftStart: dinnerShiftStart || '19:00',
        dinnerShiftEnd: dinnerShiftEnd || '23:00',
        reservationDurationMinutes: reservationDurationMinutes ?? 90,
        minGuestsFor4pTable: minGuestsFor4pTable ?? 2,
        minGuestsFor8pTable: minGuestsFor8pTable ?? 5,
        allowTableDowngrade: allowTableDowngrade ?? true,
        waitlistTimeoutMinutes: waitlistTimeoutMinutes ?? 15,
        closedDates: JSON.stringify(closedDates || []),
      },
    });

    let parsedOpenDays: string[] = ['MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
    try {
      parsedOpenDays = JSON.parse(updatedConfig.openDays);
    } catch (e) {
      parsedOpenDays = ['MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
    }

    let parsedClosedDates: string[] = [];
    try {
      parsedClosedDates = JSON.parse(updatedConfig.closedDates);
    } catch (e) {
      parsedClosedDates = [];
    }

    return res.status(200).json({
      message: 'Configuración del restaurante actualizada exitosamente',
      config: {
        id: updatedConfig.id,
        openDays: parsedOpenDays,
        lunchShiftStart: updatedConfig.lunchShiftStart,
        lunchShiftEnd: updatedConfig.lunchShiftEnd,
        dinnerShiftStart: updatedConfig.dinnerShiftStart,
        dinnerShiftEnd: updatedConfig.dinnerShiftEnd,
        reservationDurationMinutes: updatedConfig.reservationDurationMinutes,
        minGuestsFor4pTable: updatedConfig.minGuestsFor4pTable,
        minGuestsFor8pTable: updatedConfig.minGuestsFor8pTable,
        allowTableDowngrade: updatedConfig.allowTableDowngrade,
        waitlistTimeoutMinutes: updatedConfig.waitlistTimeoutMinutes,
        closedDates: parsedClosedDates,
      },
    });
  } catch (error) {
    console.error('Error en updateConfig:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};
