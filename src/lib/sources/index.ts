/**
 * Job Sources Registry - Dynamic Edition
 * Automatically loads all source files from the sources directory
 */

import { JobSource } from '../job-source-interface'
import { RemotiveSource } from './remotive-source'
import { MuseSource } from './themuse-source'
import { readdirSync } from 'fs'
import { join } from 'path'

// Built-in sources
const BUILTIN_SOURCES: JobSource[] = [
  new RemotiveSource(),
  new MuseSource(),
]

// Dynamically loaded sources
let DYNAMIC_SOURCES: JobSource[] = []

/**
 * Load all custom sources dynamically
 */
export async function loadDynamicSources(): Promise<void> {
  if (typeof window !== 'undefined') {
    // Client-side: sources already loaded
    return
  }

  try {
    const sourcesDir = join(process.cwd(), 'src', 'lib', 'sources')
    const files = readdirSync(sourcesDir)

    for (const file of files) {
      // Skip non-TypeScript files and built-in sources
      if (!file.endsWith('-source.ts') && !file.endsWith('-source.js')) continue
      if (file === 'remotive-source.ts' || file === 'themuse-source.ts') continue
      if (file === 'index.ts') continue

      try {
        const modulePath = `./${file.replace(/\.ts$/, '').replace(/\.js$/, '')}`
        const sourceModule = await import(modulePath)

        // Find the exported source class
        for (const key of Object.keys(sourceModule)) {
          const exported = sourceModule[key]
          if (exported && typeof exported === 'function') {
            try {
              const instance = new exported()
              if (instance.config && typeof instance.fetchJobs === 'function') {
                DYNAMIC_SOURCES.push(instance)
                console.log(`[Source Loader] Loaded: ${instance.config.name}`)
              }
            } catch {
              // Not a valid source class, skip
            }
          }
        }
      } catch (error) {
        console.error(`[Source Loader] Failed to load ${file}:`, error)
      }
    }

    console.log(`[Source Loader] Loaded ${DYNAMIC_SOURCES.length} custom sources`)
  } catch (error) {
    console.error('[Source Loader] Error loading dynamic sources:', error)
  }
}

/**
 * All available job sources (built-in + dynamic)
 */
export function getAllSources(): JobSource[] {
  return [...BUILTIN_SOURCES, ...DYNAMIC_SOURCES]
}

/**
 * Get all enabled sources
 */
export function getEnabledSources(): JobSource[] {
  return getAllSources().filter(source => source.config.enabled)
}

/**
 * Get a specific source by name
 */
export function getSourceByName(name: string): JobSource | undefined {
  return getAllSources().find(source => source.config.name === name)
}

/**
 * Enable/disable a source by name
 */
export function toggleSource(name: string, enabled: boolean): boolean {
  const source = getSourceByName(name)
  if (source) {
    source.config.enabled = enabled
    return true
  }
  return false
}

/**
 * Get source configurations (for UI display)
 */
export function getSourceConfigs() {
  return getAllSources().map(source => ({
    name: source.config.name,
    enabled: source.config.enabled,
    type: source.config.type,
    rateLimitPerHour: source.config.rateLimitPerHour
  }))
}

/**
 * Reload dynamic sources (call after adding new source)
 */
export async function reloadSources(): Promise<void> {
  DYNAMIC_SOURCES = []
  await loadDynamicSources()
}

// Auto-load on module import (server-side only)
if (typeof window === 'undefined') {
  loadDynamicSources().catch(console.error)
}
