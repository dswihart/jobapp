import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const fallbackMessages = [
  "Keep up the momentum! Every application brings you closer to your dream job!",
  "Your persistence will pay off! Stay consistent and focused.",
  "Today is a new opportunity! Make it count!",
  "Success is the sum of small efforts repeated daily!",
  "You're building your future, one application at a time!",
  "Stay committed to your goals - great things take time!",
  "Your next opportunity is just around the corner!",
  "Keep pushing - your hard work will be rewarded!"
];

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY
    
    if (!apiKey) {
      // Return random fallback message if no API key
      const randomIndex = Math.floor(Math.random() * fallbackMessages.length)
      return NextResponse.json({ 
        message: fallbackMessages[randomIndex],
        source: 'fallback' 
      })
    }

    const anthropic = new Anthropic({ apiKey })

    const prompt = "Generate a single, unique, and highly motivational message for someone actively job hunting. The message should be encouraging, positive, and action-oriented. It should inspire them to keep applying to jobs and stay persistent. Keep it concise (1-2 sentences max) and vary the style and tone to avoid repetition. Do not use quotes or attribution."

    const completion = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 100,
      temperature: 0.9,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })

    const message = completion.content[0].type === 'text' 
      ? completion.content[0].text.trim()
      : fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)]

    return NextResponse.json({ 
      message,
      source: 'ai' 
    })
  } catch (error) {
    console.error('Error generating motivational message:', error)
    // Return random fallback message on error
    const randomIndex = Math.floor(Math.random() * fallbackMessages.length)
    return NextResponse.json({ 
      message: fallbackMessages[randomIndex],
      source: 'fallback' 
    })
  }
}
