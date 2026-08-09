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
          allowTableDowngrade: true,
          waitlistTimeoutMinutes: 15,
          closedDates: '[]',
        },
      });
    }

    let closedDates: string[] = [];
    try {
      closedDates = JSON.parse(config.closedDates);
    } catch (e) {
      closedDates = [];
    }

    return res.status(200).json({
      id: config.id,
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
    const { allowTableDowngrade, waitlistTimeoutMinutes, closedDates } = req.body;

    const dataToUpdate: any = {};

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
        allowTableDowngrade: allowTableDowngrade ?? true,
        waitlistTimeoutMinutes: waitlistTimeoutMinutes ?? 15,
        closedDates: JSON.stringify(closedDates || []),
      },
    });

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
