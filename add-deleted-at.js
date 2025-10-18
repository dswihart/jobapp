const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // Add the deletedAt column using raw SQL
    await prisma.$executeRawUnsafe(`
      ALTER TABLE job_opportunities 
      ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP
    `);
    console.log('Successfully added deletedAt column');
  } catch (error) {
    console.error('Error adding column:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
