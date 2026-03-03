/**
 * URL Validation Utility
 * Blocks private IPs, localhost, non-http protocols, and internal TLDs
 * to prevent SSRF attacks.
 */

interface UrlValidationResult {
  allowed: boolean
  reason?: string
}

const BLOCKED_HOSTNAMES = ["localhost", "0.0.0.0"]

const BLOCKED_TLDS = [".internal", ".local", ".localhost", ".intranet"]

export function isAllowedUrl(url: string): UrlValidationResult {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return { allowed: false, reason: "Invalid URL format" }
  }

  // Only allow http and https
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return {
      allowed: false,
      reason: `Protocol "${parsed.protocol}" not allowed — only http/https`,
    }
  }

  const hostname = parsed.hostname.toLowerCase()

  // Block known localhost names
  if (BLOCKED_HOSTNAMES.includes(hostname)) {
    return { allowed: false, reason: "localhost/loopback not allowed" }
  }

  // Block ::1 (IPv6 loopback)
  if (hostname === "[::1]" || hostname === "::1") {
    return { allowed: false, reason: "localhost/loopback not allowed" }
  }

  // Block internal TLDs
  for (const tld of BLOCKED_TLDS) {
    if (hostname.endsWith(tld) || hostname === tld.slice(1)) {
      return { allowed: false, reason: `Internal TLD "${tld}" not allowed` }
    }
  }

  // Check if hostname is an IP address
  if (isIPv4(hostname)) {
    if (isPrivateIPv4(hostname)) {
      return { allowed: false, reason: "Private/reserved IP address not allowed" }
    }
  }

  // Check IPv6 in brackets
  if (hostname.startsWith("[") && hostname.endsWith("]")) {
    const ipv6 = hostname.slice(1, -1)
    if (isPrivateIPv6(ipv6)) {
      return { allowed: false, reason: "Private/reserved IPv6 address not allowed" }
    }
  }

  return { allowed: true }
}

function isIPv4(hostname: string): boolean {
  return /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)
}

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number)
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return true // Malformed = block
  }

  const [a, b] = parts

  // 127.x.x.x — loopback
  if (a === 127) return true
  // 10.x.x.x — private
  if (a === 10) return true
  // 172.16.0.0 – 172.31.255.255 — private
  if (a === 172 && b >= 16 && b <= 31) return true
  // 192.168.x.x — private
  if (a === 192 && b === 168) return true
  // 169.254.x.x — link-local (cloud metadata)
  if (a === 169 && b === 254) return true
  // 0.0.0.0
  if (a === 0) return true
  // 100.64.0.0/10 — CGNAT / cloud internal (RFC 6598)
  if (a === 100 && b >= 64 && b <= 127) return true

  return false
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase()
  // ::1 loopback
  if (lower === "::1") return true
  // fe80:: link-local
  if (lower.startsWith("fe80:")) return true
  // fc00::/7 unique local
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true
  // :: unspecified address
  if (/^(0:){0,7}0?$/.test(lower) || lower === "::") return true

  // IPv4-mapped IPv6 (::ffff:x.x.x.x or ::ffff:XXYY:ZZWW)
  const v4 = extractIPv4FromMappedIPv6(lower)
  if (v4 && isPrivateIPv4(v4)) return true

  return false
}

function extractIPv4FromMappedIPv6(ipv6: string): string | null {
  // Dotted form: ::ffff:1.2.3.4 or 0:0:0:0:0:ffff:1.2.3.4
  const dottedMatch = ipv6.match(
    /^(?:0:)*:?:?ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i
  )
  if (dottedMatch) return dottedMatch[1]

  // Hex form: ::ffff:7f00:1 or 0:0:0:0:0:ffff:7f00:1
  const hexMatch = ipv6.match(
    /^(?:0:)*:?:?ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i
  )
  if (hexMatch) {
    const hi = parseInt(hexMatch[1], 16)
    const lo = parseInt(hexMatch[2], 16)
    return `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`
  }

  return null
}
