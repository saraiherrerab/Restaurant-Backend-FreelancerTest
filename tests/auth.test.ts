import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/db';

describe('Auth API Endpoints', () => {
  afterAll(async () => {
    // Cleanup created test user
    await prisma.user.deleteMany({
      where: { email: { in: ['testnewclient@gourmet.com', 'loginclient@gourmet.com'] } },
    });
    await prisma.$disconnect();
  });

  it('should register a new client user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'testnewclient@gourmet.com',
        password: 'Password123!',
        fullName: 'New Test Client',
        phone: '+123456789',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toHaveProperty('id');
    expect(res.body.user.role).toBe('CLIENT');
  });

  it('should reject registration if email is already taken', async () => {
    // Register first
    await request(app).post('/api/auth/register').send({
      email: 'loginclient@gourmet.com',
      password: 'Password123!',
      fullName: 'Login Client',
    });

    // Register second with same email
    const res = await request(app).post('/api/auth/register').send({
      email: 'loginclient@gourmet.com',
      password: 'Password123!',
      fullName: 'Duplicate Client',
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('ya está registrado');
  });

  it('should login seeded client user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'client@gourmet.com',
        password: 'Client123!',
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.role).toBe('CLIENT');
  });

  it('should reject login with wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'client@gourmet.com',
        password: 'WrongPassword!',
      });

    expect(res.status).toBe(401);
    expect(res.body.error).toContain('inválidas');
  });
});
