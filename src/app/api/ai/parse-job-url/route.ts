import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url } = body

    if (!url) {
      return NextResponse.json(
        { error: 'Job URL is required' },
        { status: 400 }
      )
    }

    // Validate URL
    try {
      new URL(url)
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      )
    }

    console.log('Fetching job page:', url)
    
    // Try multiple methods to fetch the page
    let html = ''
    let fetchError = null
    
    // Method 1: Try with enhanced headers
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Cache-Control': 'max-age=0'
        }
      })

      if (response.ok) {
        html = await response.text()
      } else {
        fetchError = `HTTP ${response.status}: ${response.statusText}`
      }
    } catch (error) {
      fetchError = error instanceof Error ? error.message : 'Fetch failed'
    }

    // If fetch failed, return error with helpful message
    if (!html && fetchError) {
      return NextResponse.json(
        { 
          error: 'Failed to fetch job page',
          details: `The job site blocked the request (${fetchError}). This often happens with job boards that have anti-bot protection. Try copying the job details manually or use a different URL.`
        },
        { status: 500 }
      )
    }

    // Use Claude to extract job information
    console.log('Parsing job data with AI...')
    const message = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `You are a job posting parser. Extract structured information from this HTML page.

HTML Content:
${html.substring(0, 50000)}

Extract and return ONLY a JSON object with these fields (no additional text):
{
  "company": "Company name",
  "role": "Job title/role",
  "location": "Job location (if specified)",
  "salary": "Salary range (if specified)",
  "description": "Brief job description (2-3 sentences)",
  "requirements": "Key requirements (bullet points as a string)",
  "benefits": "Benefits mentioned (if any)"
}

If information is not found, use null for that field. Be concise and accurate.`
      }]
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude')
    }

    // Parse the AI response
    let parsedData
    try {
      const text = content.text.trim()
      // Remove markdown code blocks if present
      const jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      parsedData = JSON.parse(jsonText)
    } catch (parseError) {
      console.error('Failed to parse AI response:', content.text)
      return NextResponse.json(
        { error: 'Failed to parse job data from AI response' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        company: parsedData.company || '',
        role: parsedData.role || '',
        jobUrl: url,
        notes: [
          parsedData.location ? `Location: ${parsedData.location}` : null,
          parsedData.salary ? `Salary: ${parsedData.salary}` : null,
          parsedData.description ? `Description: ${parsedData.description}` : null,
          parsedData.requirements ? `Requirements:\n${parsedData.requirements}` : null,
          parsedData.benefits ? `Benefits: ${parsedData.benefits}` : null,
        ].filter(Boolean).join('\n\n'),
        status: 'DRAFT'
      }
    })
  } catch (error) {
    console.error('Job URL parsing error:', error)
    return NextResponse.json(
      {
        error: 'Failed to parse job URL',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
