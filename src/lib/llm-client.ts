import Anthropic from '@anthropic-ai/sdk'

/**
 * Drop-in replacement for `new Anthropic({ apiKey })`.
 *
 * Returns an object exposing the same `.messages.create(params)` surface the
 * rest of the codebase already uses, but routes the call through OpenRouter
 * FIRST (per user directive 2026-06-23) and falls back to the native Anthropic
 * SDK on ANY error (OpenRouter down, rate-limited, unsupported params, parse
 * failure). The fallback means behavior degrades gracefully to exactly what it
 * was before OpenRouter was introduced.
 *
 * Toggle: set OPENROUTER_PRIMARY=false to bypass OpenRouter entirely (Anthropic
 * direct), or unset OPENROUTER_API_KEY.
 */

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const OPENROUTER_TIMEOUT_MS = 60000

// Anthropic model id -> OpenRouter slug. Verified live 2026-06-23.
const MODEL_MAP: Record<string, string> = {
  'claude-sonnet-4-5': 'anthropic/claude-sonnet-4.5',
  'claude-sonnet-4-6': 'anthropic/claude-sonnet-4.6',
  'claude-haiku-4-5': 'anthropic/claude-haiku-4.5',
  'claude-haiku-4-5-20251001': 'anthropic/claude-haiku-4.5',
  'claude-sonnet-4-20250514': 'anthropic/claude-sonnet-4',
  'claude-3-sonnet-20240229': 'anthropic/claude-sonnet-4.5', // retired -> sensible upgrade
}
const DEFAULT_SLUG = 'anthropic/claude-sonnet-4.6'

function mapModel(model: string): string {
  return MODEL_MAP[model] || DEFAULT_SLUG
}

// Flatten Anthropic-style content (string | block[]) into an OpenAI content string.
// Throws on any non-text block (e.g. image/document) so the caller falls back to
// the native Anthropic SDK, which handles those natively.
function flattenContent(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map((block: any) => {
        if (block && block.type === 'text' && typeof block.text === 'string') return block.text
        throw new Error('llm-client: non-text content block — fall back to Anthropic')
      })
      .join('\n')
  }
  throw new Error('llm-client: unsupported content shape — fall back to Anthropic')
}

async function callOpenRouter(apiKey: string, params: any): Promise<any> {
  // Bail (→ Anthropic fallback) for anything the OpenAI-compatible shim can't carry.
  if (params.tools || params.tool_choice || params.output_config || params.thinking) {
    throw new Error('llm-client: advanced params present — fall back to Anthropic')
  }

  const messages: Array<{ role: string; content: string }> = []
  if (params.system) {
    messages.push({ role: 'system', content: flattenContent(params.system) })
  }
  for (const m of params.messages || []) {
    messages.push({ role: m.role, content: flattenContent(m.content) })
  }

  const body: Record<string, unknown> = {
    model: mapModel(params.model),
    messages,
    max_tokens: params.max_tokens ?? 1024,
  }
  if (typeof params.temperature === 'number') body.temperature = params.temperature

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://jobapp.aigrowise.com',
      'X-Title': 'Job Tracker',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(OPENROUTER_TIMEOUT_MS),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`OpenRouter HTTP ${res.status}: ${detail.slice(0, 200)}`)
  }

  const data: any = await res.json()
  if (data.error) {
    throw new Error(`OpenRouter error: ${data.error.message || JSON.stringify(data.error)}`)
  }
  const choice = data.choices && data.choices[0]
  const text = choice?.message?.content ?? ''
  const finish = choice?.finish_reason
  const stopReason = finish === 'stop' ? 'end_turn' : finish === 'length' ? 'max_tokens' : finish || 'end_turn'

  // Return the Anthropic Message shape the call sites already read.
  return {
    id: data.id || 'openrouter',
    type: 'message',
    role: 'assistant',
    model: data.model || params.model,
    stop_reason: stopReason,
    content: [{ type: 'text', text: typeof text === 'string' ? text : '' }],
    usage: {
      input_tokens: data.usage?.prompt_tokens ?? 0,
      output_tokens: data.usage?.completion_tokens ?? 0,
    },
  }
}

export function createLLMClient(opts: { apiKey?: string } = {}) {
  const anthropic = new Anthropic({ apiKey: opts.apiKey ?? process.env.ANTHROPIC_API_KEY })
  return {
    messages: {
      create: async (params: any): Promise<any> => {
        const orKey = process.env.OPENROUTER_API_KEY
        if (orKey && process.env.OPENROUTER_PRIMARY !== 'false') {
          try {
            return await callOpenRouter(orKey, params)
          } catch (err) {
            console.warn(
              '[llm-client] OpenRouter failed, falling back to Anthropic:',
              err instanceof Error ? err.message : err
            )
          }
        }
        return await anthropic.messages.create(params)
      },
    },
  }
}
