const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addColumns() {
  try {
    console.log('Adding settings columns to users table...');
    
    await prisma.$executeRawUnsafe('ALTER TABLE users ADD COLUMN IF NOT EXISTS "minFitScore" INTEGER DEFAULT 40;');
    console.log('✅ Added minFitScore column');
    
    await prisma.$executeRawUnsafe('ALTER TABLE users ADD COLUMN IF NOT EXISTS "maxJobAgeDays" INTEGER DEFAULT 7;');
    console.log('✅ Added maxJobAgeDays column');
    
    await prisma.$executeRawUnsafe('ALTER TABLE users ADD COLUMN IF NOT EXISTS "autoScan" BOOLEAN DEFAULT false;');
    console.log('✅ Added autoScan column');
    
    await prisma.$executeRawUnsafe('ALTER TABLE users ADD COLUMN IF NOT EXISTS "scanFrequency" TEXT DEFAULT \'daily\';');
    console.log('✅ Added scanFrequency column');
    
    console.log('\n✅ All columns added successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

addColumns();
