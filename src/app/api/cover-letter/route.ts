import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateCoverLetter } from "@/lib/cover-letter-service"
import { auth } from "@/lib/auth"
import * as cheerio from "cheerio"
import { readFile } from "fs/promises"
import path from "path"
import mammoth from "mammoth"

async function fetchJobDescription(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const html = await response.text()
    const $ = cheerio.load(html)
    
    $("script").remove()
    $("style").remove()
    
    const selectors = [
      ".job-description",
      "#job-description", 
      "[class*=\"description\"]",
      "[id*=\"description\"]",
      "article",
      "main",
      ".content",
      "body"
    ]
    
    let description = ""
    for (const selector of selectors) {
      const element = $(selector)
      if (element.length > 0) {
        description = element.text().trim()
        if (description.length > 100) {
          break
        }
      }
    }
    
    description = description
      .replace(/\s+/g, " ")
      .replace(/\n+/g, "\n")
      .trim()
      .substring(0, 5000)
    
    return description || "Job description not available"
  } catch (error) {
    console.error("Error fetching job description:", error)
    return "Job description could not be fetched"
  }
}

async function readResumeContent(fileUrl: string, fileType: string): Promise<string> {
  try {
    const sanitizedPath = fileUrl.startsWith("/") ? fileUrl.slice(1) : fileUrl
    const filepath = path.join(process.cwd(), "public", sanitizedPath)
    
    if (fileType === "text/plain") {
      return await readFile(filepath, "utf-8")
    } else if (
      fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      fileType === "application/msword"
    ) {
      const result = await mammoth.extractRawText({ path: filepath })
      return result.value
    } else {
      // Try reading as text
      return await readFile(filepath, "utf-8")
    }
  } catch (error) {
    console.error("Error reading resume content:", error)
    return ""
  }
}

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const coverLetters = await prisma.coverLetter.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        createdAt: true
      }
    })

    return NextResponse.json(coverLetters)
  } catch (error) {
    console.error("Error fetching cover letters:", error)
    return NextResponse.json(
      { error: "Failed to fetch cover letters" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { applicationId, company, role, jobUrl, notes } = await request.json()

    if (!applicationId || !company || !role) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: applicationId, company, role" },
        { status: 400 }
      )
    }

    // Verify the application belongs to this user AND include attached resume
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        resume: true
      }
    })

    if (!application || application.userId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: "Application not found" },
        { status: 404 }
      )
    }

    // Fetch user profile
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      )
    }

    // Get job description: use notes if available, otherwise fetch from URL
    let jobDescription = notes
    
    if (!jobDescription && jobUrl) {
      console.log(`Fetching job description from URL: ${jobUrl}`)
      jobDescription = await fetchJobDescription(jobUrl)
    }
    
    if (!jobDescription) {
      jobDescription = `Position: ${role} at ${company}`
    }

    // Get resume content - prefer application-specific resume, fallback to user profile
    let resumeContent = ""
    let workHistoryData = ""
    let skillsData: string[] = user.primarySkills || []

    if (application.resume) {
      console.log(`Reading resume attached to application: ${application.resume.fileName}`)
      resumeContent = await readResumeContent(application.resume.fileUrl, application.resume.fileType)
      if (resumeContent) {
        console.log(`Successfully read resume content, length: ${resumeContent.length}`)
        workHistoryData = resumeContent
      }
    }

    // Fallback to user profile if no resume content
    if (!workHistoryData && user.workHistory) {
      workHistoryData = typeof user.workHistory === "string" 
        ? user.workHistory 
        : JSON.stringify(user.workHistory)
    }

    // Generate cover letter with resume content
    const coverLetter = await generateCoverLetter({
      jobTitle: role,
      company: company,
      jobDescription: jobDescription,
      userProfile: {
        name: user.name || "Job Seeker",
        email: user.email || "",
        yearsOfExperience: user.yearsOfExperience || 0,
        primarySkills: skillsData,
        workHistory: workHistoryData
      }
    })

    return NextResponse.json({
      success: true,
      coverLetter
    })
  } catch (error) {
    console.error("Cover letter generation error:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to generate cover letter" 
      },
      { status: 500 }
    )
  }
}
