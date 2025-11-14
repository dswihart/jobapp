const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function addInterviewColumns() {
  try {
    console.log('Adding interview columns to Application table...')

    // Check if columns already exist
    const tableInfo = await prisma.$queryRaw`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'Application'
      AND column_name IN ('interviewDate', 'interviewTime', 'interviewType', 'interviewRound', 'interviewNotes')
    `

    console.log('Existing interview columns:', tableInfo)

    const existingColumns = new Set(tableInfo.map(row => row.column_name))

    // Add columns if they don't exist
    if (!existingColumns.has('interviewDate')) {
      console.log('Adding interviewDate column...')
      await prisma.$executeRaw`ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "interviewDate" TIMESTAMP(3)`
    }

    if (!existingColumns.has('interviewTime')) {
      console.log('Adding interviewTime column...')
      await prisma.$executeRaw`ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "interviewTime" TEXT`
    }

    if (!existingColumns.has('interviewType')) {
      console.log('Adding interviewType column...')
      await prisma.$executeRaw`ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "interviewType" TEXT`
    }

    if (!existingColumns.has('interviewRound')) {
      console.log('Adding interviewRound column...')
      await prisma.$executeRaw`ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "interviewRound" INTEGER DEFAULT 1`
    }

    if (!existingColumns.has('interviewNotes')) {
      console.log('Adding interviewNotes column...')
      await prisma.$executeRaw`ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "interviewNotes" TEXT`
    }

    console.log('✓ Interview columns added successfully!')

    // Verify the columns were added
    const updatedTableInfo = await prisma.$queryRaw`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'Application'
      AND column_name IN ('interviewDate', 'interviewTime', 'interviewType', 'interviewRound', 'interviewNotes')
    `

    console.log('Interview columns now present:', updatedTableInfo)

  } catch (error) {
    console.error('Error adding interview columns:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

addInterviewColumns()
  .then(() => {
    console.log('✓ Migration complete')
    process.exit(0)
  })
  .catch((error) => {
    console.error('✗ Migration failed:', error)
    process.exit(1)
  })
