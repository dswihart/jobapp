-- CreateTable
CREATE TABLE "user_job_sources" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sourceType" TEXT NOT NULL,
    "feedUrl" TEXT,
    "scrapeUrl" TEXT,
    "scrapeSelector" TEXT,
    "apiEndpoint" TEXT,
    "apiKey" TEXT,
    "apiHeaders" JSONB,
    "titleSelector" TEXT,
    "companySelector" TEXT,
    "locationSelector" TEXT,
    "linkSelector" TEXT,
    "descriptionSelector" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
    "rateLimitPerHour" INTEGER DEFAULT 100,
    "searchKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "excludeKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "user_job_sources_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "user_job_sources" ADD CONSTRAINT "user_job_sources_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
