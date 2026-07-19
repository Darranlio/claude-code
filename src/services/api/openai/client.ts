import OpenAI from 'openai'
import { openaiAdapter } from 'src/services/providerUsage/adapters/openai.js'
import { updateProviderBuckets } from 'src/services/providerUsage/store.js'
import { getProxyFetchOptions } from 'src/utils/proxy.js'

/**
 * Environment variables:
 *
 * OPENAI_API_KEY: Required. API key for the OpenAI-compatible endpoint.
 * OPENAI_BASE_URL: Recommended. Base URL for the endpoint (e.g. http://localhost:11434/v1).
 * OPENAI_ORG_ID: Optional. Organization ID.
 * OPENAI_PROJECT_ID: Optional. Project ID.
 */

let cachedClient: OpenAI | null = null
const clientCache = new Map<string, OpenAI>()

/**
 * Wrap a fetch so that every response's rate-limit headers are fed into the
 * provider usage store. Errors in parsing must never break the request.
 *
 * The cast to `typeof fetch` is safe: OpenAI SDK only calls the function form,
 * not the static `preconnect` method that Bun/Node's `fetch` type defines.
 */
function wrapFetchForUsage(base: typeof fetch): typeof fetch {
  const wrapped = async (
    ...args: Parameters<typeof fetch>
  ): Promise<Response> => {
    const res = await base(...args)
    try {
      updateProviderBuckets('openai', openaiAdapter.parseHeaders(res.headers))
    } catch {
      // Ignore — usage tracking must not affect the request path.
    }
    return res
  }
  return wrapped as unknown as typeof fetch
}

function createOpenAIClient(
  apiKey: string,
  baseURL: string | undefined,
  options?: {
    maxRetries?: number
    fetchOverride?: typeof fetch
  },
): OpenAI {
  const baseFetch = options?.fetchOverride ?? (globalThis.fetch as typeof fetch)
  const wrappedFetch = wrapFetchForUsage(baseFetch)

  return new OpenAI({
    apiKey,
    ...(baseURL && { baseURL }),
    maxRetries: options?.maxRetries ?? 0,
    timeout: parseInt(process.env.API_TIMEOUT_MS || String(600 * 1000), 10),
    dangerouslyAllowBrowser: true,
    ...(process.env.OPENAI_ORG_ID && {
      organization: process.env.OPENAI_ORG_ID,
    }),
    ...(process.env.OPENAI_PROJECT_ID && {
      project: process.env.OPENAI_PROJECT_ID,
    }),
    fetchOptions: getProxyFetchOptions({ forAnthropicAPI: false }),
    fetch: wrappedFetch,
  })
}

export function getOpenAIClient(options?: {
  maxRetries?: number
  fetchOverride?: typeof fetch
  source?: string
  /** Per-provider API key (multi-provider support). Falls back to env.OPENAI_API_KEY. */
  apiKey?: string
  /** Per-provider base URL (multi-provider support). Falls back to env.OPENAI_BASE_URL. */
  baseUrl?: string
}): OpenAI {
  const apiKey = options?.apiKey ?? (process.env.OPENAI_API_KEY || '')
  const baseURL = options?.baseUrl ?? process.env.OPENAI_BASE_URL

  // Backward compat: no explicit credentials → singleton cache
  if (!options?.apiKey && !options?.baseUrl) {
    if (cachedClient) return cachedClient
    const client = createOpenAIClient(apiKey, baseURL, options)
    if (!options?.fetchOverride) {
      cachedClient = client
    }
    return client
  }

  // Multi-provider: Map cache keyed by baseUrl + apiKey prefix
  const cacheKey = `${baseURL || 'default'}::${apiKey.slice(0, 8)}`
  if (!clientCache.has(cacheKey)) {
    clientCache.set(cacheKey, createOpenAIClient(apiKey, baseURL, options))
  }
  return clientCache.get(cacheKey)!
}

/** Clear the cached client(s) (useful when env vars change). */
export function clearOpenAIClientCache(): void {
  cachedClient = null
  clientCache.clear()
}
