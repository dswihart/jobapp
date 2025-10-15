import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ 
    status: 'healthy',
    service: 'AI Job Fit Analysis',
    timestamp: new Date().toISOString()
  })
}
