const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  
  try {
    // Get all users with autoScan = false or null
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { autoScan: false },
          { autoScan: null }
        ]
      },
      select: {
        id: true,
        email: true,
        name: true,
        autoScan: true
      }
    });

    console.log(`Found ${users.length} users with autoScan disabled`);
    
    for (const user of users) {
      console.log(`  - ${user.email} (current: ${user.autoScan})`);
    }

    // Update all users to have autoScan enabled
    const result = await prisma.user.updateMany({
      where: {
        OR: [
          { autoScan: false },
          { autoScan: null }
        ]
      },
      data: {
        autoScan: true
      }
    });

    console.log(`\nUpdated ${result.count} users to enable autoScan`);
    
    // Verify the update
    const updatedUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        autoScan: true
      }
    });
    
    console.log(`\nVerification - All users autoScan status:`);
    for (const user of updatedUsers) {
      console.log(`  - ${user.email}: autoScan = ${user.autoScan}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
