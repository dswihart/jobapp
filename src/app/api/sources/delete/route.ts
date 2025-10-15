import { NextResponse } from 'next/server'
import { unlink, readdir, readFile } from 'fs/promises'
import path from 'path'
import { reloadSources } from '@/lib/sources'

export async function POST(request: Request) {
  try {
    const { sourceName } = await request.json()

    if (!sourceName) {
      return NextResponse.json({ error: 'Source name is required' }, { status: 400 })
    }

    const sourcesDir = path.join(process.cwd(), 'src', 'lib', 'sources')
    
    // Find the actual file by searching for the source name
    const files = await readdir(sourcesDir)
    const sourceFiles = files.filter(f => f.endsWith('-source.ts') || f.endsWith('-source.js'))
    
    let foundFile: string | null = null
    
    for (const file of sourceFiles) {
      const filepath = path.join(sourcesDir, file)
      const content = await readFile(filepath, 'utf-8')
      
      // Look for name: 'SourceName' in the file
      const nameMatch = content.match(/name:\s*['\"]([^'\"]+)['\"]/i)
      if (nameMatch && nameMatch[1] === sourceName) {
        foundFile = file
        break
      }
    }

    if (!foundFile) {
      return NextResponse.json({
        error: `Could not find source file for "${sourceName}". Available sources: ${sourceFiles.join(', ')}`
      }, { status: 404 })
    }

    const filepath = path.join(sourcesDir, foundFile)
    
    console.log('[Delete Source] Found file:', foundFile, 'for source:', sourceName)

    try {
      await unlink(filepath)
      console.log('[Delete Source] File deleted successfully')
      
      // Reload sources
      await reloadSources()

      return NextResponse.json({
        success: true,
        message: `Source ${sourceName} deleted successfully`,
        filename: foundFile
      })
    } catch (unlinkError) {
      console.error('[Delete Source] Failed to delete file:', unlinkError)
      return NextResponse.json({
        error: `Failed to delete source file: ${unlinkError instanceof Error ? unlinkError.message : 'Unknown error'}`,
        filepath
      }, { status: 500 })
    }

  } catch (error) {
    console.error('[Delete Source] Error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to delete source'
    }, { status: 500 })
  }
}
