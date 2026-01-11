import path from "path"

export function sanitizeFilename(filename: string): string {
  const basename = path.basename(filename)
  let sanitized = basename.split("..").join("")
  sanitized = sanitized.split("/").join("")
  sanitized = sanitized.replace(/\\/g, "")
  sanitized = sanitized.replace(/\0/g, "")
  if (!sanitized || sanitized === "." || sanitized === "..") {
    throw new Error("Invalid filename")
  }
  return sanitized
}

function sanitizePathSegment(segment: string): string {
  let sanitized = segment.split("..").join("")
  sanitized = sanitized.replace(/\0/g, "")
  if (!sanitized || sanitized === "." || sanitized === "..") {
    throw new Error("Invalid path segment")
  }
  return sanitized
}

export function safePathJoin(baseDir: string, ...segments: string[]): string {
  const processedSegments: string[] = []
  
  for (const segment of segments) {
    if (segment.includes("/") || segment.includes("\\")) {
      const parts = segment.split(/[/\\]/).filter(p => p && p !== ".")
      for (const part of parts) {
        processedSegments.push(sanitizePathSegment(part))
      }
    } else {
      processedSegments.push(sanitizeFilename(segment))
    }
  }
  
  const fullPath = path.join(baseDir, ...processedSegments)
  const resolvedBase = path.resolve(baseDir)
  const resolvedFull = path.resolve(fullPath)
  
  if (!resolvedFull.startsWith(resolvedBase + path.sep) && resolvedFull !== resolvedBase) {
    throw new Error("Path traversal attempt detected")
  }
  
  return resolvedFull
}

export function validateUrlPath(urlPath: string): string {
  let normalized = urlPath
  while (normalized.startsWith("/")) {
    normalized = normalized.slice(1)
  }
  
  if (normalized.includes("..") || normalized.includes("\0")) {
    throw new Error("Invalid path")
  }
  
  const components = normalized.split("/").filter(c => c && c !== "." && c !== "..")
  return components.join("/")
}
