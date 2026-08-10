import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/db';

describe('System Config API', () => {
  beforeAll(async () => {
    // Ensure default config exists
    await prisma.restaurantConfig.upsert({
      where: { id: 'default' },
      update: {},
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

  it('GET /api/config should fetch default system config', async () => {
    const res = await request(app).get('/api/config');
    expect(res.status).toBe(200);
    expect(res.body.openDays).toContain('MAR');
    expect(res.body.reservationDurationMinutes).toBe(90);
    expect(res.body.minGuestsFor4pTable).toBe(2);
    expect(res.body.minGuestsFor8pTable).toBe(5);
  });

  it('PUT /api/config should update system configuration', async () => {
    // Authenticate admin user
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'admin@gourmet.com',
      password: 'Admin123!',
    });
    expect(loginRes.status).toBe(200);
    const authCookie = loginRes.headers['set-cookie'];

    const updateRes = await request(app)
      .put('/api/config')
      .set('Cookie', authCookie)
      .send({
        reservationDurationMinutes: 120,
        minGuestsFor4pTable: 3,
        minGuestsFor8pTable: 6,
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.config.reservationDurationMinutes).toBe(120);
    expect(updateRes.body.config.minGuestsFor4pTable).toBe(3);

    // Revert back to 90 for default
    await request(app)
      .put('/api/config')
      .set('Cookie', authCookie)
      .send({
        reservationDurationMinutes: 90,
        minGuestsFor4pTable: 2,
        minGuestsFor8pTable: 5,
      });
  });
});
