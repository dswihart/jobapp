import path from "path"

/**
 * Sanitizes a filename to prevent path traversal attacks.
 * Removes any directory components and dangerous characters.
 */
export function sanitizeFilename(filename: string): string {
  // Get only the base filename, removing any path components
  const basename = path.basename(filename)
  
  // Remove any remaining path traversal attempts, slashes, and null bytes
  let sanitized = basename.split("..").join("")
  sanitized = sanitized.split("/").join("")
  sanitized = sanitized.split("\\").join("")
  sanitized = sanitized.split("\0").join("")
  
  // Ensure the filename is not empty after sanitization
  if (!sanitized || sanitized === "." || sanitized === "..") {
    throw new Error("Invalid filename")
  }
  
  return sanitized
}

/**
 * Safely joins paths ensuring the result stays within the base directory.
 * Throws an error if path traversal is attempted.
 */
export function safePathJoin(baseDir: string, ...segments: string[]): string {
  // Sanitize each segment
  const sanitizedSegments = segments.map(segment => sanitizeFilename(segment))
  
  // Join the paths
  const fullPath = path.join(baseDir, ...sanitizedSegments)
  
  // Resolve to absolute path
  const resolvedBase = path.resolve(baseDir)
  const resolvedFull = path.resolve(fullPath)
  
  // Verify the result is within the base directory
  if (!resolvedFull.startsWith(resolvedBase + path.sep) && resolvedFull !== resolvedBase) {
    throw new Error("Path traversal attempt detected")
  }
  
  return resolvedFull
}

/**
 * Validates that a URL path does not contain path traversal attempts.
 * Returns the sanitized path or throws an error.
 */
export function validateUrlPath(urlPath: string): string {
  // Remove leading slashes and normalize
  let normalized = urlPath
  while (normalized.startsWith("/")) {
    normalized = normalized.slice(1)
  }
  
  // Check for path traversal attempts
  if (normalized.includes("..") || normalized.includes("\0")) {
    throw new Error("Invalid path")
  }
  
  // Split and sanitize each component
  const components = normalized.split("/").filter(c => c && c !== "." && c !== "..")
  
  return components.join("/")
}
