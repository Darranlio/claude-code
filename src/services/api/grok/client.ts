import OpenAI from 'openai'
import { getProxyFetchOptions } from 'src/utils/proxy.js'

/**
 * Environment variables:
 *
 * GROK_API_KEY (or XAI_API_KEY): Required. API key for the xAI Grok endpoint.
 * GROK_BASE_URL: Optional. Defaults to https://api.x.ai/v1.
 */

const DEFAULT_BASE_URL = 'https://api.x.ai/v1'

let cachedClient: OpenAI | null = null
const clientCache = new Map<string, OpenAI>()

function createGrokClient(
  apiKey: string,
  baseURL: string,
  options?: {
    maxRetries?: number
    fetchOverride?: typeof fetch
  },
): OpenAI {
  return new OpenAI({
    apiKey,
    baseURL,
    maxRetries: options?.maxRetries ?? 0,
    timeout: parseInt(process.env.API_TIMEOUT_MS || String(600 * 1000), 10),
    dangerouslyAllowBrowser: true,
    fetchOptions: getProxyFetchOptions({ forAnthropicAPI: false }),
    ...(options?.fetchOverride && { fetch: options.fetchOverride }),
  })
}

export function getGrokClient(options?: {
  maxRetries?: number
  fetchOverride?: typeof fetch
  source?: string
  /** Per-provider API key (multi-provider support). Falls back to env. */
  apiKey?: string
  /** Per-provider base URL (multi-provider support). Falls back to env. */
  baseUrl?: string
}): OpenAI {
  const apiKey =
    options?.apiKey ??
    (process.env.GROK_API_KEY || process.env.XAI_API_KEY || '')
  const baseURL =
    options?.baseUrl ?? (process.env.GROK_BASE_URL || DEFAULT_BASE_URL)

  // Backward compat: no explicit credentials → singleton cache
  if (!options?.apiKey && !options?.baseUrl) {
    if (cachedClient) return cachedClient
    const client = createGrokClient(apiKey, baseURL, options)
    if (!options?.fetchOverride) {
      cachedClient = client
    }
    return client
  }

  // Multi-provider: Map cache keyed by baseUrl + apiKey prefix
  const cacheKey = `${baseURL}::${apiKey.slice(0, 8)}`
  if (!clientCache.has(cacheKey)) {
    clientCache.set(cacheKey, createGrokClient(apiKey, baseURL, options))
  }
  return clientCache.get(cacheKey)!
}

export function clearGrokClientCache(): void {
  cachedClient = null
  clientCache.clear()
}
