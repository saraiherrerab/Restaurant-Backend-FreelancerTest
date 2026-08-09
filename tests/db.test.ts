import { prisma } from '../src/config/db';

describe('Database Connection & Seed Check', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should fetch the default 14 tables from database', async () => {
    const count = await prisma.table.count();
    expect(count).toBe(14);
  });

  it('should verify initial table capacities (6 of 2p, 6 of 4p, 2 of 8p)', async () => {
    const tablesFor2 = await prisma.table.count({ where: { capacity: 2 } });
    const tablesFor4 = await prisma.table.count({ where: { capacity: 4 } });
    const tablesFor8 = await prisma.table.count({ where: { capacity: 8 } });

    expect(tablesFor2).toBe(6);
    expect(tablesFor4).toBe(6);
    expect(tablesFor8).toBe(2);
  });
});
