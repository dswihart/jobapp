import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ARCHIVE_AFTER_DAYS = 45;

export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now();
    console.log(`[${new Date().toISOString()}] Starting automatic archiving process...`);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - ARCHIVE_AFTER_DAYS);

    console.log(`Archiving applications older than: ${cutoffDate.toISOString()}`);

    const result = await prisma.application.updateMany({
      where: {
        AND: [
          { status: { not: "ARCHIVED" } },
          {
            OR: [
              { appliedDate: { lte: cutoffDate } },
              {
                AND: [
                  { appliedDate: null },
                  { createdAt: { lte: cutoffDate } }
                ]
              }
            ]
          }
        ]
      },
      data: { status: "ARCHIVED" }
    });

    const totalApplications = await prisma.application.count();
    const archivedApplications = await prisma.application.count({
      where: { status: "ARCHIVED" }
    });

    const duration = Date.now() - startTime;

    const response = {
      success: true,
      archivedCount: result.count,
      cutoffDate: cutoffDate.toISOString(),
      statistics: {
        total: totalApplications,
        archived: archivedApplications,
        active: totalApplications - archivedApplications
      },
      duration: `${duration}ms`
    };

    console.log(`✅ Successfully archived ${result.count} application(s) in ${duration}ms`);
    return NextResponse.json(response);
  } catch (error) {
    console.error("❌ Error during archiving:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
