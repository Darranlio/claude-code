/**
 * International (non-China) LLM provider presets with free tiers.
 *
 * All providers are OpenAI-compatible or use existing protocol adapters.
 */

import type { ProviderPreset } from './chinaLlmProviders.js'

// Groq removed: free tier TPM limits (6K-12K) are too low for Claude Code's
// minimum ~75K token system prompt. Even the highest Groq free limit (30K TPM)
// cannot accommodate a single request.
export const INTERNATIONAL_PROVIDERS: ProviderPreset[] = [
  {
    id: 'gemini-free',
    label: 'Google Gemini (Free)',
    description: '1M context, 1,500 RPD Flash, no billing required',
    icon: '\uD83C\uDF10',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta',
    apiKeyPage: 'https://aistudio.google.com/apikey',
    modelsPage: 'https://ai.google.dev/gemini-api/docs/models',
    freeTier:
      'Flash: 1,500 RPD \u00B7 10 RPM (AI Studio, no billing; Pro paid-only)',
    keyFormat: 'AIza...',
    models: [
      {
        id: 'gemini-3.7-flash',
        label: 'Gemini 3.7 Flash',
        inputPricePerMTok: 0,
        outputPricePerMTok: 0,
        contextWindow: '1M',
        free: true,
        tags: ['Free', 'Latest Flash', '1M ctx'],
        strengths: ['fast', 'coding', 'agentic', 'long-context'],
        weaknesses: ['complex-coding'],
        freeQuota: { requestsPerDay: 1500, tokensPerMinute: 250000 },
      },
      {
        id: 'gemini-3.5-flash-lite',
        label: 'Gemini 3.5 Flash-Lite',
        inputPricePerMTok: 0,
        outputPricePerMTok: 0,
        contextWindow: '1M',
        free: true,
        tags: ['Free', 'Budget', '1M ctx'],
        strengths: ['fast', 'cheap', 'long-context'],
        weaknesses: ['complex-coding', 'reasoning'],
        freeQuota: { requestsPerDay: 1500, tokensPerMinute: 250000 },
      },
    ],
  },
]
