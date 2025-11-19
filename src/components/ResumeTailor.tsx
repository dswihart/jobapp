"use client"

import { useState, useEffect } from "react"
import { Loader2, Download, Save, Sparkles, CheckCircle, ArrowLeft } from "lucide-react"
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'
import { saveAs } from 'file-saver'
import Link from 'next/link'

interface JobOpportunity {
  id: string
  title: string
  company: string
  description: string
  requirements?: string[]
  responsibilities?: string[]
  fitScore?: number
  source?: 'opportunity' | 'application'
  status?: string
}

interface Resume {
  id: string
  fileName: string
  isPrimary: boolean
  name: string
  uploadedAt: string
}

// Helper function to parse resume content and create a structured DOCX
function parseResumeContentForDownload(content: string) {
  const lines = content.split('\n').filter(line => line.trim())
  const paragraphs: Paragraph[] = []

  for (const line of lines) {
    const trimmedLine = line.trim()

    // Check if it's a heading (all caps, or ends with :, or specific keywords)
    const isHeading = /^[A-Z\s]{3,}:?$/.test(trimmedLine) ||
                     /^(PROFESSIONAL SUMMARY|EXPERIENCE|EDUCATION|SKILLS|CERTIFICATIONS|PROJECTS|CONTACT|SUMMARY)/i.test(trimmedLine)

    if (isHeading) {
      paragraphs.push(
        new Paragraph({
          text: trimmedLine.replace(/:$/, ''),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 120 }
        })
      )
    } else if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-') || trimmedLine.startsWith('*')) {
      // Bullet points
      paragraphs.push(
        new Paragraph({
          text: trimmedLine.replace(/^[•\-*]\s*/, ''),
          bullet: { level: 0 },
          spacing: { before: 60, after: 60 }
        })
      )
    } else if (trimmedLine) {
      // Regular paragraph
      paragraphs.push(
        new Paragraph({
          children: [new TextRun(trimmedLine)],
          spacing: { before: 120, after: 120 }
        })
      )
    }
  }

  return paragraphs
}

export default function ResumeTailor() {
  const [jobs, setJobs] = useState<JobOpportunity[]>([])
  const [resumes, setResumes] = useState<Resume[]>([])
  const [selectedJob, setSelectedJob] = useState<string>("")
  const [selectedResume, setSelectedResume] = useState<string>("")
  const [originalContent, setOriginalContent] = useState<string>("")
  const [tailoredContent, setTailoredContent] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [instructions, setInstructions] = useState("")
  const [activeTab, setActiveTab] = useState("tailored")

  useEffect(() => {
    fetchJobs()
    fetchResumes()
  }, [])

  const fetchJobs = async () => {
    try {
      // Fetch opportunities
      const oppResponse = await fetch("/api/opportunities")
      const oppData = await oppResponse.json()
      const opportunities = (oppData.opportunities || []).map((job: JobOpportunity) => ({
        ...job,
        source: 'opportunity' as const
      }))

      // Fetch applications (job tracker) - ONLY DRAFT status
      const appResponse = await fetch("/api/applications")
      const appData = await appResponse.json()
      const applications = (Array.isArray(appData) ? appData : [])
        .filter((app: { status: string }) => app.status === 'DRAFT') // Filter for DRAFT only
        .map((app: { id: string; role: string; company: string; notes?: string; status: string }) => ({
          id: app.id,
          title: app.role,
          company: app.company,
          description: app.notes || "",
          source: 'application' as const,
          status: app.status
        }))

      // Combine both lists
      setJobs([...opportunities, ...applications])
    } catch (error) {
      console.error("Error fetching jobs:", error)
      setError("Failed to load job opportunities")
    }
  }

  const fetchResumes = async () => {
    try {
      const response = await fetch("/api/resumes")
      const data = await response.json()
      setResumes(data.resumes || [])
      const defaultResume = data.resumes?.find((r: Resume) => r.isPrimary)
      if (defaultResume) {
        setSelectedResume(defaultResume.id)
      }
    } catch (error) {
      console.error("Error fetching resumes:", error)
      setError("Failed to load resumes")
    }
  }

  const handleSave = async () => {
    if (!tailoredContent) return

    setIsSaving(true)
    setError("")

    try {
      const job = jobs.find(j => j.id === selectedJob)
      const response = await fetch("/api/resumes/save-tailored", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: tailoredContent,
          jobId: selectedJob,
          jobSource: job?.source, // Pass the source to know if it's an opportunity or application
          filename: `resume_tailored_for_${job?.company}_${job?.title.replace(/[^a-z0-9]/gi, "_")}`
        })
      })

      if (!response.ok) throw new Error("Failed to save resume")

      const result = await response.json()

      await fetchResumes()
      setSuccessMessage("Tailored resume saved successfully as DOCX and linked to job tracker!")
      setTimeout(() => setSuccessMessage(""), 3000)
    } catch (error) {
      console.error("Error saving resume:", error)
      setError("Failed to save resume")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDownload = async () => {
    if (!tailoredContent) return

    setIsDownloading(true)
    try {
      const job = jobs.find(j => j.id === selectedJob)
      const filename = `resume_tailored_for_${job?.company}_${job?.title.replace(/[^a-z0-9]/gi, "_")}.docx`

      // Parse the resume content and create a DOCX document
      const paragraphs = parseResumeContentForDownload(tailoredContent)

      const doc = new Document({
        sections: [{
          properties: {},
          children: paragraphs
        }]
      })

      // Generate the DOCX file as a buffer
      const blob = await Packer.toBlob(doc)

      // Use file-saver to download
      saveAs(blob, filename)

      setSuccessMessage("Resume downloaded as DOCX!")
      setTimeout(() => setSuccessMessage(""), 3000)
    } catch (error) {
      console.error("Error downloading resume:", error)
      setError("Failed to download resume")
    } finally {
      setIsDownloading(false)
    }
  }

  const handleTailorResume = async () => {
    if (!selectedJob || !selectedResume) {
      setError("Please select both a job and a resume")
      return
    }

    setIsLoading(true)
    setError("")
    setSuccessMessage("")
    setTailoredContent("")
    setOriginalContent("")

    try {
      const resumeResponse = await fetch(`/api/resumes/${selectedResume}/content`)
      if (!resumeResponse.ok) {
        const errorData = await resumeResponse.json()
        throw new Error(errorData.error || "Failed to fetch resume content")
      }
      const resumeData = await resumeResponse.json()
      setOriginalContent(resumeData.content)

      const job = jobs.find(j => j.id === selectedJob)
      if (!job) throw new Error("Job not found")

      const tailorResponse = await fetch("/api/ai/tailor-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeContent: resumeData.content,
          jobTitle: job.title,
          company: job.company,
          jobDescription: job.description,
          requirements: job.requirements,
          responsibilities: job.responsibilities,
          instructions: instructions || "Transform this resume to be a perfect match for this job. Analyze every requirement in the job posting and rewrite my experience to demonstrate expertise in those exact areas. Add impressive metrics and quantifiable results. Use the job description's exact keywords and phrases throughout. Expand my accomplishments to show I exceed all requirements. Make me appear as the ideal candidate who is perfectly qualified for this specific role."
        })
      })

      if (!tailorResponse.ok) {
        throw new Error("Failed to tailor resume")
      }

      const tailoredData = await tailorResponse.json()
      setTailoredContent(tailoredData.tailoredContent)
      setSuccessMessage("Resume successfully enhanced! Review the improvements below.")
      setActiveTab("tailored")
    } catch (error) {
      console.error("Error tailoring resume:", error)
      setError(error instanceof Error ? error.message : "Failed to tailor resume. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const selectedJobDetails = jobs.find(j => j.id === selectedJob)

  // Separate jobs by source
  const opportunityJobs = jobs.filter(j => j.source === 'opportunity')
  const applicationJobs = jobs.filter(j => j.source === 'application')

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4 mb-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            AI Resume Tailor - Enhance Your Resume
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Showing draft applications and new opportunities
          </p>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Select Job Opportunity</label>
              <select
                value={selectedJob}
                onChange={(e) => setSelectedJob(e.target.value)}
                className="w-full p-2 border rounded-lg dark:bg-gray-700"
              >
                <option value="">Choose a job to optimize for</option>
                {opportunityJobs.length > 0 && (
                  <optgroup label="Job Opportunities">
                    {opportunityJobs.map(job => (
                      <option key={job.id} value={job.id}>
                        {job.title} at {job.company} {job.fitScore ? ` (${job.fitScore}% fit)` : ""}
                      </option>
                    ))}
                  </optgroup>
                )}
                {applicationJobs.length > 0 && (
                  <optgroup label="Draft Applications">
                    {applicationJobs.map(job => (
                      <option key={job.id} value={job.id}>
                        {job.title} at {job.company}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Select Resume</label>
              <select
                value={selectedResume}
                onChange={(e) => setSelectedResume(e.target.value)}
                className="w-full p-2 border rounded-lg dark:bg-gray-700"
              >
                <option value="">Choose your resume to enhance</option>
                {resumes.map(resume => (
                  <option key={resume.id} value={resume.id}>
                    {resume.name || resume.fileName} {resume.isPrimary ? "(Primary)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedJobDetails && (
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-semibold">{selectedJobDetails.title}</h4>
                <span className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                  {selectedJobDetails.source === 'opportunity' ? 'Opportunity' : 'Draft Application'}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{selectedJobDetails.company}</p>
              <p className="text-sm line-clamp-3">{selectedJobDetails.description}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">
              Enhancement Instructions (Optional)
            </label>
            <textarea
              placeholder="E.g., Emphasize leadership experience, highlight cloud architecture expertise, focus on quantifiable achievements..."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
              className="w-full p-2 border rounded-lg dark:bg-gray-700"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              {successMessage}
            </div>
          )}

          <button
            onClick={handleTailorResume}
            disabled={!selectedJob || !selectedResume || isLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enhancing Your Resume...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Optimize Resume with AI
              </>
            )}
          </button>
        </div>
      </div>

      {(originalContent || tailoredContent) && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
            <h3 className="text-lg font-semibold">Resume Comparison</h3>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={isSaving || !tailoredContent}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-3 py-1 rounded flex items-center gap-2 text-sm"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save as DOCX
              </button>
              <button
                onClick={handleDownload}
                disabled={isDownloading || !tailoredContent}
                className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white px-3 py-1 rounded flex items-center gap-2 text-sm"
              >
                {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Download DOCX
              </button>
            </div>
          </div>
          <div className="p-6">
            <div className="flex gap-4 mb-4 border-b">
              <button
                onClick={() => setActiveTab("original")}
                className={`pb-2 px-4 ${activeTab === "original" ? "border-b-2 border-indigo-600 text-indigo-600" : "text-gray-600"}`}
              >
                Original Resume
              </button>
              <button
                onClick={() => setActiveTab("tailored")}
                className={`pb-2 px-4 ${activeTab === "tailored" ? "border-b-2 border-indigo-600 text-indigo-600" : "text-gray-600"}`}
              >
                Enhanced Resume
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {activeTab === "original" ? (
                <pre className="whitespace-pre-wrap text-sm font-mono bg-gray-50 dark:bg-gray-900 p-4 rounded">
                  {originalContent}
                </pre>
              ) : (
                <textarea
                  value={tailoredContent}
                  onChange={(e) => setTailoredContent(e.target.value)}
                  className="w-full min-h-[350px] p-4 border rounded-lg font-mono text-sm dark:bg-gray-700"
                  placeholder="Enhanced resume will appear here..."
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
