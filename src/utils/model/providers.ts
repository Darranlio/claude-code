import type { AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from '../../services/analytics/index.js'
import { getInitialSettings } from '../settings/settings.js'
import type { SettingsJson } from '../settings/types.js'
import { isEnvTruthy } from '../envUtils.js'
import {
  CHINA_LLM_PROVIDERS,
  type ProviderModel,
} from '../chinaLlmProviders.js'
import { INTERNATIONAL_PROVIDERS } from '../internationalProviders.js'

export type APIProvider =
  | 'firstParty'
  | 'bedrock'
  | 'vertex'
  | 'foundry'
  | 'openai'
  | 'gemini'
  | 'grok'

export { isThirdPartyAPIProvider } from './providerClassification.js'

export function getAPIProvider(
  settings: Pick<SettingsJson, 'modelType'> = getInitialSettings(),
): APIProvider {
  const modelType = settings.modelType
  if (modelType === 'openai') return 'openai'
  if (modelType === 'gemini') return 'gemini'
  if (modelType === 'grok') return 'grok'

  if (isEnvTruthy(process.env.CLAUDE_CODE_USE_BEDROCK)) return 'bedrock'
  if (isEnvTruthy(process.env.CLAUDE_CODE_USE_VERTEX)) return 'vertex'
  if (isEnvTruthy(process.env.CLAUDE_CODE_USE_FOUNDRY)) return 'foundry'

  if (isEnvTruthy(process.env.CLAUDE_CODE_USE_OPENAI)) return 'openai'
  if (isEnvTruthy(process.env.CLAUDE_CODE_USE_GEMINI)) return 'gemini'
  if (isEnvTruthy(process.env.CLAUDE_CODE_USE_GROK)) return 'grok'

  return 'firstParty'
}

export function getAPIProviderForStatsig(): AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  return getAPIProvider() as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
}

/** Resolved provider with credentials for a specific model. */
export type ResolvedProvider = {
  providerId: string
  label: string
  protocol: APIProvider
  apiKey: string
  baseUrl?: string
}

/**
 * Resolve which provider handles a given model, with credentials.
 *
 * Resolution order:
 * 1. settings.providers — exact model ID match
 * 2. CHINA_LLM_PROVIDERS + INTERNATIONAL_PROVIDERS — known model match
 * 3. Known model patterns (gpt-*, gemini-*, grok-*)
 * 4. Fallback: getAPIProvider() (backward compat)
 */
export function resolveModelProvider(model: string): ResolvedProvider {
  const settings = getInitialSettings()

  // 1. Check settings.providers for exact model match
  const providers = settings.providers as
    | Record<
        string,
        {
          id: string
          label: string
          protocol: string
          apiKey: string
          baseUrl?: string
          models?: string[]
        }
      >
    | undefined
  if (providers) {
    for (const [, provider] of Object.entries(providers)) {
      if (provider.models?.includes(model)) {
        // Fallback baseUrl: settings → env.OPENAI_BASE_URL → known preset baseURL
        const presetBaseURL = [
          ...CHINA_LLM_PROVIDERS,
          ...INTERNATIONAL_PROVIDERS,
        ].find(p => p.id === provider.id)?.baseURL
        return {
          providerId: provider.id,
          label: provider.label,
          protocol: provider.protocol as APIProvider,
          apiKey: provider.apiKey,
          baseUrl:
            provider.baseUrl ?? process.env.OPENAI_BASE_URL ?? presetBaseURL,
        }
      }
    }
  }

  // 2. Check China LLM presets
  for (const provider of CHINA_LLM_PROVIDERS) {
    const matched = provider.models.find(m => m.id === model)
    if (matched) {
      // Look up credentials from settings.providers or env
      const configured = providers?.[provider.id]
      return {
        providerId: provider.id,
        label: provider.label,
        protocol: 'openai',
        apiKey: configured?.apiKey ?? process.env.OPENAI_API_KEY ?? '',
        baseUrl:
          configured?.baseUrl ??
          process.env.OPENAI_BASE_URL ??
          provider.baseURL,
      }
    }
  }

  // 3. Check International presets (Gemini)
  for (const provider of INTERNATIONAL_PROVIDERS) {
    const matched = provider.models.find(m => m.id === model)
    if (matched) {
      const configured = providers?.[provider.id]
      // Gemini uses its own protocol, Groq uses OpenAI-compatible
      const protocol: APIProvider =
        provider.id === 'gemini-free' ? 'gemini' : 'openai'
      return {
        providerId: provider.id,
        label: provider.label,
        protocol,
        apiKey: configured?.apiKey ?? '',
        baseUrl: configured?.baseUrl ?? provider.baseURL,
      }
    }
  }

  // 4. Known model patterns
  if (
    model.startsWith('gpt-') ||
    model.startsWith('o1') ||
    model.startsWith('o3')
  ) {
    return {
      providerId: 'openai',
      label: 'OpenAI',
      protocol: 'openai',
      apiKey: process.env.OPENAI_API_KEY ?? '',
      baseUrl: process.env.OPENAI_BASE_URL,
    }
  }
  if (model.startsWith('gemini-')) {
    return {
      providerId: 'gemini',
      label: 'Google Gemini',
      protocol: 'gemini',
      apiKey: process.env.GEMINI_API_KEY ?? '',
      baseUrl: process.env.GEMINI_BASE_URL,
    }
  }
  if (model.startsWith('grok-')) {
    return {
      providerId: 'grok',
      label: 'Grok',
      protocol: 'grok',
      apiKey: process.env.GROK_API_KEY ?? '',
      baseUrl: process.env.GROK_BASE_URL,
    }
  }

  // 5. Fallback: use global provider (backward compat)
  const globalProvider = getAPIProvider(settings)
  return {
    providerId: globalProvider,
    label: globalProvider,
    protocol: globalProvider,
    apiKey: '',
    baseUrl: undefined,
  }
}

/**
 * Return all models from configured providers, grouped by provider.
 * Used by the /model picker to show per-provider model options.
 */
export function getAllConfiguredModels(): {
  providerId: string
  label: string
  models: ProviderModel[]
}[] {
  const result: {
    providerId: string
    label: string
    models: ProviderModel[]
  }[] = []
  const settings = getInitialSettings()
  const providers = settings.providers as
    | Record<
        string,
        {
          id: string
          label?: string
          apiKey?: string
          baseUrl?: string
          models?: string[]
        }
      >
    | undefined

  // Add configured China LLM providers
  for (const provider of CHINA_LLM_PROVIDERS) {
    const configured = providers?.[provider.id]
    if (configured) {
      result.push({
        providerId: provider.id,
        label: provider.label,
        models: provider.models,
      })
    }
  }

  // Add configured International providers
  for (const provider of INTERNATIONAL_PROVIDERS) {
    const configured = providers?.[provider.id]
    if (configured) {
      result.push({
        providerId: provider.id,
        label: provider.label,
        models: provider.models,
      })
    }
  }

  // Add custom providers (e.g. local Docker/Ollama) not in preset lists
  if (providers) {
    const knownIds = new Set([
      ...CHINA_LLM_PROVIDERS.map(p => p.id),
      ...INTERNATIONAL_PROVIDERS.map(p => p.id),
    ])
    for (const [id, provider] of Object.entries(providers)) {
      if (knownIds.has(id)) continue
      if (!provider.models || provider.models.length === 0) continue
      result.push({
        providerId: id,
        label: provider.label || id,
        models: provider.models.map(m => ({
          id: m,
          label: m,
          inputPricePerMTok: 0,
          outputPricePerMTok: 0,
          contextWindow: 'Unknown',
        })),
      })
    }
  }

  return result
}

/**
 * Look up a model's max completion tokens from provider presets.
 * Returns undefined for unknown models (Anthropic, OpenAI native, etc).
 */
export function getProviderModelMaxCompletionTokens(
  model: string,
): number | undefined {
  for (const provider of [...CHINA_LLM_PROVIDERS, ...INTERNATIONAL_PROVIDERS]) {
    const matched = provider.models.find(m => m.id === model)
    if (matched?.maxCompletionTokens) return matched.maxCompletionTokens
  }
  return undefined
}

/**
 * Check if ANTHROPIC_BASE_URL is a first-party Anthropic API URL.
 * Returns true if not set (default API) or points to api.anthropic.com
 * (or api-staging.anthropic.com for ant users).
 */
export function isFirstPartyAnthropicBaseUrl(): boolean {
  const baseUrl = process.env.ANTHROPIC_BASE_URL
  // TODO: 这里会有问题, 只配置了 openai 协议的用户, 按理说会为 true 导致问题
  if (!baseUrl) {
    return true
  }
  try {
    const host = new URL(baseUrl).host
    const allowedHosts = ['api.anthropic.com']
    if (process.env.USER_TYPE === 'ant') {
      allowedHosts.push('api-staging.anthropic.com')
    }
    return allowedHosts.includes(host)
  } catch {
    return false
  }
}
