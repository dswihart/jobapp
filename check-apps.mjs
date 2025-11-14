import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const apps = await prisma.application.findMany({
    take: 15,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      company: true,
      role: true,
      status: true,
      appliedDate: true,
      createdAt: true,
      updatedAt: true,
    }
  })
  
  console.log('Recent applications:')
  console.log('='.repeat(100))
  apps.forEach(app => {
    console.log(`ID: ${app.id}`)
    console.log(`Company: ${app.company} | Role: ${app.role}`)
    console.log(`Status: ${app.status}`)
    console.log(`Applied Date: ${app.appliedDate ? app.appliedDate.toISOString().split('T')[0] : 'NULL'}`)
    console.log(`Created: ${app.createdAt.toISOString().split('T')[0]} | Updated: ${app.updatedAt.toISOString().split('T')[0]}`)
    console.log('-'.repeat(100))
  })
  
  // Count by status
  const statuses = await prisma.application.groupBy({
    by: ['status'],
    _count: { status: true }
  })
  console.log('\nApplications by status:')
  statuses.forEach(s => {
    console.log(`${s.status}: ${s._count.status}`)
  })
  
  // Count with vs without appliedDate
  const withAppliedDate = await prisma.application.count({
    where: { appliedDate: { not: null } }
  })
  const withoutAppliedDate = await prisma.application.count({
    where: { appliedDate: null }
  })
  console.log(`\nWith appliedDate: ${withAppliedDate}`)
  console.log(`Without appliedDate: ${withoutAppliedDate}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
