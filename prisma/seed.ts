import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Seed Restaurant Config
  await prisma.restaurantConfig.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      allowTableDowngrade: true,
      waitlistTimeoutMinutes: 15,
      closedDates: '[]',
    },
  });
  console.log('✅ Restaurant config seeded.');

  // 2. Seed 14 Tables (6x2p, 6x4p, 2x8p)
  const tablesData = [
    // 6 tables for 2 people
    { number: 1, capacity: 2 },
    { number: 2, capacity: 2 },
    { number: 3, capacity: 2 },
    { number: 4, capacity: 2 },
    { number: 5, capacity: 2 },
    { number: 6, capacity: 2 },
    // 6 tables for 4 people
    { number: 7, capacity: 4 },
    { number: 8, capacity: 4 },
    { number: 9, capacity: 4 },
    { number: 10, capacity: 4 },
    { number: 11, capacity: 4 },
    { number: 12, capacity: 4 },
    // 2 tables for 8 people
    { number: 13, capacity: 8 },
    { number: 14, capacity: 8 },
  ];

  for (const table of tablesData) {
    await prisma.table.upsert({
      where: { number: table.number },
      update: { capacity: table.capacity },
      create: {
        number: table.number,
        capacity: table.capacity,
        isActive: true,
      },
    });
  }
  console.log('✅ 14 Tables seeded (6x2p, 6x4p, 2x8p).');

  // 3. Seed Default Users
  const adminPassword = await bcrypt.hash('Admin123!', 10);
  const staffPassword = await bcrypt.hash('Staff123!', 10);
  const clientPassword = await bcrypt.hash('Client123!', 10);

  await prisma.user.upsert({
    where: { email: 'admin@gourmet.com' },
    update: {},
    create: {
      email: 'admin@gourmet.com',
      password: adminPassword,
      fullName: 'Restaurante Admin',
      phone: '+18005550100',
      role: 'ADMIN',
    },
  });

  await prisma.user.upsert({
    where: { email: 'staff@gourmet.com' },
    update: {},
    create: {
      email: 'staff@gourmet.com',
      password: staffPassword,
      fullName: 'Capitán de Meseros',
      phone: '+18005550101',
      role: 'STAFF',
    },
  });

  await prisma.user.upsert({
    where: { email: 'client@gourmet.com' },
    update: {},
    create: {
      email: 'client@gourmet.com',
      password: clientPassword,
      fullName: 'Cliente de Prueba',
      phone: '+18005550102',
      role: 'CLIENT',
    },
  });

  console.log('✅ Default users seeded:');
  console.log('   - Admin: admin@gourmet.com / Admin123!');
  console.log('   - Staff: staff@gourmet.com / Staff123!');
  console.log('   - Client: client@gourmet.com / Client123!');

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
