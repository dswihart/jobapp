#!/usr/bin/env node

/**
 * Automatic Job Archiving Script
 * Archives job applications older than 45 days
 * Runs daily via cron
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const ARCHIVE_AFTER_DAYS = 45;

async function archiveOldApplications() {
  try {
    console.log(`[${new Date().toISOString()}] Starting automatic archiving process...`);

    // Calculate the cutoff date (45 days ago)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - ARCHIVE_AFTER_DAYS);

    console.log(`Archiving applications older than: ${cutoffDate.toISOString()}`);

    // Find applications to archive
    // Archive based on appliedDate if available, otherwise use createdAt
    const result = await prisma.application.updateMany({
      where: {
        AND: [
          {
            status: {
              not: 'ARCHIVED'
            }
          },
          {
            OR: [
              {
                appliedDate: {
                  lte: cutoffDate
                }
              },
              {
                AND: [
                  {
                    appliedDate: null
                  },
                  {
                    createdAt: {
                      lte: cutoffDate
                    }
                  }
                ]
              }
            ]
          }
        ]
      },
      data: {
        status: 'ARCHIVED'
      }
    });

    console.log(`✅ Successfully archived ${result.count} application(s)`);

    // Log some statistics
    const totalApplications = await prisma.application.count();
    const archivedApplications = await prisma.application.count({
      where: { status: 'ARCHIVED' }
    });

    console.log(`📊 Statistics:`);
    console.log(`   Total applications: ${totalApplications}`);
    console.log(`   Archived applications: ${archivedApplications}`);
    console.log(`   Active applications: ${totalApplications - archivedApplications}`);

    return result.count;
  } catch (error) {
    console.error('❌ Error during archiving:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the archiving process
archiveOldApplications()
  .then((count) => {
    console.log(`[${new Date().toISOString()}] Archiving complete. ${count} jobs archived.`);
    process.exit(0);
  })
  .catch((error) => {
    console.error(`[${new Date().toISOString()}] Archiving failed:`, error);
    process.exit(1);
  });
