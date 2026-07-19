/**
 * Smart task auto-routing engine.
 *
 * Routes simple queries to free models, complex refactoring to paid models.
 * User-specified model always takes priority over auto-routing.
 *
 * Design constraints:
 * - Never intervene when user explicitly chose a model (/model or @sonnet etc.)
 * - Always announce auto-route results: [Auto-route: model (free) — /model <name> to pin]
 * - /auto-route off disables entirely; /auto-route <model> pins to a specific model
 */

import type { Message } from '../../types/message.js'
import type { ModelSetting } from '../model/model.js'
import {
  getInitialSettings,
  updateSettingsForSource,
} from '../settings/settings.js'
import { getAllConfiguredModels } from '../model/providers.js'
import type { ProviderModel } from '../chinaLlmProviders.js'
import { getInitialMainLoopModel } from '../../bootstrap/state.js'

/** Result of task complexity scoring. */
export type TaskScore = {
  estimatedComplexity: 'trivial' | 'simple' | 'moderate' | 'complex'
  shouldUseTools: boolean
  estimatedChars: number
}

/** Result of routing a task. */
export type ResolvedRoute = {
  model: ModelSetting
  autoRouted: boolean
  reason?: string
}

/** Auto-route persited settings key. */
const AUTO_ROUTE_SETTING = 'autoRoute'

export type AutoRouteConfig = {
  enabled: boolean
  /** When set, all requests use this model regardless of task complexity. */
  pinnedModel?: string
}

/** Read current auto-route config from settings. */
export function getAutoRouteConfig(): AutoRouteConfig {
  const settings = getInitialSettings()
  const raw = (settings as Record<string, unknown>)[AUTO_ROUTE_SETTING] as
    | AutoRouteConfig
    | undefined
  return raw ?? { enabled: false }
}

/** Persist auto-route config to settings. */
export function setAutoRouteConfig(config: AutoRouteConfig): void {
  updateSettingsForSource('userSettings', {
    [AUTO_ROUTE_SETTING]:
      config.enabled || config.pinnedModel ? config : undefined,
  } as unknown as Parameters<typeof updateSettingsForSource>[1])
}

/** Extract text content from a message for heuristic scoring. */
function extractMessageText(msg: Message): string {
  const content = (msg as Record<string, unknown>).content
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .filter(
        (b: unknown): b is { text: string } =>
          typeof b === 'object' &&
          b !== null &&
          (b as Record<string, unknown>).type === 'text',
      )
      .map(b => b.text)
      .join('\n')
  }
  return ''
}

/**
 * Score task complexity based on the latest user message.
 * Simple heuristic — no API calls, no NLP, just pattern matching.
 */
export function scoreTask(messages: Message[]): TaskScore {
  const lastUserMsg = [...messages].reverse().find(m => m.type === 'user')
  const content = lastUserMsg ? extractMessageText(lastUserMsg) : ''
  const charCount = content.length

  // Tool use indicators in the message
  const hasToolIndicators =
    /\b(?:refactor|rewrite|create|generate|implement|fix|debug|test|build|migrate)\b/i.test(
      content,
    ) ||
    /\b(?:多文件|重构|创建|生成|实现|修复|调试|测试|构建|迁移)\b/.test(content)

  // Multi-step reasoning indicators
  const hasMultiStep =
    charCount > 2000 ||
    (content.match(/\b(?:first|then|next|finally|also|additionally)\b/gi)
      ?.length ?? 0) >= 2

  // File path references
  const fileRefCount =
    (content.match(/[`'"](?:\/[\w.-]+)+\.\w+[`'"]/g)?.length ?? 0) +
    (content.match(/\b\w+\.(?:ts|tsx|js|jsx|py|go|rs|java|rb)\b/g)?.length ?? 0)

  let estimatedComplexity: TaskScore['estimatedComplexity']
  if (charCount < 80 && !hasToolIndicators && fileRefCount === 0) {
    estimatedComplexity = 'trivial'
  } else if (charCount < 500 && fileRefCount <= 1 && !hasMultiStep) {
    estimatedComplexity = 'simple'
  } else if (hasMultiStep || fileRefCount >= 3) {
    estimatedComplexity = 'complex'
  } else {
    estimatedComplexity = 'moderate'
  }

  return {
    estimatedComplexity,
    shouldUseTools: hasToolIndicators || fileRefCount > 0 || charCount > 500,
    estimatedChars: charCount,
  }
}

/**
 * Find the best free model from configured providers.
 * Prefers models tagged for coding/agentic work over simple/fast models.
 */
function findBestFreeModel(
  configured: ReturnType<typeof getAllConfiguredModels>,
): ProviderModel | null {
  const freeModels: { model: ProviderModel; score: number }[] = []

  for (const provider of configured) {
    for (const model of provider.models) {
      const isFree =
        model.free ||
        (model.inputPricePerMTok === 0 && model.outputPricePerMTok === 0)
      if (!isFree) continue

      // Score: prefer coding-capable, reasoning models
      let score = 0
      const strengths = model.strengths ?? []
      if (strengths.includes('coding')) score += 3
      if (strengths.includes('reasoning')) score += 2
      if (strengths.includes('agentic')) score += 2
      if (strengths.includes('tool-use')) score += 2
      if (strengths.includes('long-context')) score += 1
      if (strengths.includes('fast')) score += 1
      // Penalize models with known weaknesses
      const weaknesses = model.weaknesses ?? []
      if (weaknesses.includes('complex-coding')) score -= 2
      if (weaknesses.includes('limited-reasoning')) score -= 2
      if (weaknesses.includes('tool-use-limited')) score -= 2

      freeModels.push({ model, score })
    }
  }

  freeModels.sort((a, b) => b.score - a.score)
  return freeModels[0]?.model ?? null
}

/**
 * Find the best paid model from configured providers.
 * Used for complex tasks when no free model suffices.
 */
function findBestPaidModel(
  configured: ReturnType<typeof getAllConfiguredModels>,
): ProviderModel | null {
  const paidModels: { model: ProviderModel; score: number }[] = []

  for (const provider of configured) {
    for (const model of provider.models) {
      const isFree =
        model.free ||
        (model.inputPricePerMTok === 0 && model.outputPricePerMTok === 0)
      if (isFree) continue

      let score = 0
      const strengths = model.strengths ?? []
      if (strengths.includes('coding')) score += 3
      if (strengths.includes('reasoning')) score += 2
      if (strengths.includes('agentic')) score += 2
      if (strengths.includes('long-context')) score += 1
      paidModels.push({ model, score })
    }
  }

  paidModels.sort((a, b) => b.score - a.score)
  return paidModels[0]?.model ?? null
}

/**
 * Route a task based on complexity and configured providers.
 *
 * Rules:
 * - trivial / simple → best available free model
 * - moderate → default (don't change what user expects)
 * - complex → best paid model (or free if no paid configured)
 */
export function routeTask(
  messages: Message[],
  userSpecifiedModel?: string,
): ResolvedRoute {
  // Rule 1: User manual selection always wins
  if (userSpecifiedModel) {
    return { model: userSpecifiedModel, autoRouted: false }
  }

  // Rule 2: Check if auto-route is enabled
  const config = getAutoRouteConfig()
  if (!config.enabled && !config.pinnedModel) {
    return { model: getInitialMainLoopModel(), autoRouted: false }
  }

  // Rule 3: Pinned model takes priority
  if (config.pinnedModel) {
    return {
      model: config.pinnedModel,
      autoRouted: true,
      reason: `pinned via /auto-route ${config.pinnedModel}`,
    }
  }

  // Rule 4: Score task and route
  const score = scoreTask(messages)
  const configured = getAllConfiguredModels()

  if (
    score.estimatedComplexity === 'trivial' ||
    score.estimatedComplexity === 'simple'
  ) {
    const freeModel = findBestFreeModel(configured)
    if (freeModel) {
      return {
        model: freeModel.id,
        autoRouted: true,
        reason: `${score.estimatedComplexity} query → ${freeModel.label} (free)`,
      }
    }
  }

  if (score.estimatedComplexity === 'complex') {
    const paidModel = findBestPaidModel(configured)
    if (paidModel) {
      return {
        model: paidModel.id,
        autoRouted: true,
        reason: `complex query → ${paidModel.label} (paid)`,
      }
    }
    // Fallback to best free even for complex
    const freeModel = findBestFreeModel(configured)
    if (freeModel) {
      return {
        model: freeModel.id,
        autoRouted: true,
        reason: `complex query → ${freeModel.label} (free — no paid model configured)`,
      }
    }
  }

  // Moderate: use default model
  return { model: getInitialMainLoopModel(), autoRouted: false }
}

/**
 * Format the auto-route notice for injection into the assistant response.
 * Returns empty string if not auto-routed.
 */
export function formatAutoRouteNotice(route: ResolvedRoute): string {
  if (!route.autoRouted || !route.reason) return ''
  return `[Auto-route: ${route.reason} — /model <name> to pin]\n\n`
}
