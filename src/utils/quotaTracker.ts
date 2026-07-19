/**
 * Local per-provider free tier quota tracking.
 *
 * Tracks:
 * - Per-model request/token counts against known free quotas
 * - Persists to settings.providers.<id>.quotaUsed for cross-session survival
 * - Resets counters when the reset date rolls over
 */

import { CHINA_LLM_PROVIDERS, type ProviderModel } from './chinaLlmProviders.js'
import { INTERNATIONAL_PROVIDERS } from './internationalProviders.js'
import {
  getSettings_DEPRECATED,
  updateSettingsForSource,
} from './settings/settings.js'

export type QuotaStatus = {
  providerId: string
  providerLabel: string
  modelId: string
  modelLabel: string
  quota: {
    requestsPerDay?: number
    tokensPerMinute?: number
    tokensPerDay?: number
  }
  used: { requests: number; tokens: number }
  resetDate: string
  /** 0-100, percentage of the lowest-bound quota consumed */
  percentUsed: number
}

/** In-memory tracking for the current session. Reset on restart via settings. */
const sessionUsage: Map<string, { requests: number; tokens: number }> =
  new Map()

function usageKey(providerId: string, modelId: string): string {
  return `${providerId}::${modelId}`
}

/** Collect all known models across all provider presets into a lookup. */
function buildModelQuotaMap(): Map<
  string,
  { providerId: string; modelId: string; model: ProviderModel }
> {
  const map = new Map<
    string,
    { providerId: string; modelId: string; model: ProviderModel }
  >()
  for (const provider of [...CHINA_LLM_PROVIDERS, ...INTERNATIONAL_PROVIDERS]) {
    for (const model of provider.models) {
      if (model.freeQuota) {
        map.set(`${provider.id}::${model.id}`, {
          providerId: provider.id,
          modelId: model.id,
          model,
        })
      }
    }
  }
  return map
}

/** Build today's reset date in ISO format (midnight UTC). */
function todayResetDate(): string {
  const now = new Date()
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  ).toISOString()
}

/**
 * Record usage of a model from a specific provider.
 * Automatically persists to settings for cross-session tracking.
 */
export function recordQuotaUsage(
  providerId: string,
  modelId: string,
  tokens: number,
): void {
  const key = usageKey(providerId, modelId)
  const existing = sessionUsage.get(key) ?? { requests: 0, tokens: 0 }
  existing.requests += 1
  existing.tokens += tokens
  sessionUsage.set(key, existing)

  // Persist to settings.providers (debounced by caller — we just write)
  const settings = getSettings_DEPRECATED() || {}
  const existingProviders =
    (settings.providers as Record<string, Record<string, unknown>>) || {}
  const provider = { ...(existingProviders[providerId] || {}) }
  const quotaData = provider.quotaUsed as
    | { requests: number; tokens: number; resetDate: string }
    | undefined

  const today = todayResetDate()
  const shouldReset = !quotaData || quotaData.resetDate !== today

  provider.quotaUsed = {
    requests: shouldReset ? 1 : (quotaData?.requests ?? 0) + 1,
    tokens: shouldReset ? tokens : (quotaData?.tokens ?? 0) + tokens,
    resetDate: today,
  }
  existingProviders[providerId] = provider
  updateSettingsForSource('userSettings', {
    providers: existingProviders,
  } as unknown as Parameters<typeof updateSettingsForSource>[1])
}

/**
 * Get quota status for all known models with free tier quotas.
 */
export function getQuotaStatus(): QuotaStatus[] {
  const modelQuotas = buildModelQuotaMap()
  const settings = getSettings_DEPRECATED() || {}
  const providers =
    (settings.providers as Record<string, Record<string, unknown>>) || {}
  const results: QuotaStatus[] = []

  for (const [, info] of modelQuotas) {
    const key = usageKey(info.providerId, info.modelId)
    const session = sessionUsage.get(key) ?? { requests: 0, tokens: 0 }
    const persisted = providers[info.providerId]?.quotaUsed as
      | { requests: number; tokens: number; resetDate: string }
      | undefined

    const today = todayResetDate()
    const storedRequests =
      persisted && persisted.resetDate === today ? persisted.requests : 0
    const storedTokens =
      persisted && persisted.resetDate === today ? persisted.tokens : 0

    const quota = info.model.freeQuota!
    let percentUsed = 0
    if (quota.requestsPerDay) {
      percentUsed = Math.max(
        percentUsed,
        (storedRequests / quota.requestsPerDay) * 100,
      )
    }
    if (quota.tokensPerDay) {
      percentUsed = Math.max(
        percentUsed,
        (storedTokens / quota.tokensPerDay) * 100,
      )
    }
    if (quota.tokensPerMinute) {
      // TPM is transient; show current session's recent rate
      const tpmPercent = (session.tokens / quota.tokensPerMinute) * 100
      percentUsed = Math.max(percentUsed, tpmPercent)
    }

    results.push({
      providerId: info.providerId,
      providerLabel:
        [...CHINA_LLM_PROVIDERS, ...INTERNATIONAL_PROVIDERS].find(
          p => p.id === info.providerId,
        )?.label ?? info.providerId,
      modelId: info.modelId,
      modelLabel: info.model.label,
      quota,
      used: { requests: storedRequests, tokens: storedTokens },
      resetDate: today,
      percentUsed: Math.min(percentUsed, 100),
    })
  }

  return results
}
