/**
 * International (non-China) LLM provider presets with free tiers.
 * Groq and Google Gemini offer genuinely free API access without credit card.
 *
 * All providers are OpenAI-compatible or use existing protocol adapters.
 * Model IDs are exact Groq API identifiers (verified 2026-07-19).
 */

import type { ProviderPreset } from './chinaLlmProviders.js'

export const INTERNATIONAL_PROVIDERS: ProviderPreset[] = [
  {
    id: 'groq',
    label: 'Groq',
    description: 'Free tier, ultra-fast LPU inference, 14.4K req/day',
    icon: '\u26A1',
    baseURL: 'https://api.groq.com/openai/v1',
    apiKeyPage: 'https://console.groq.com/keys',
    modelsPage: 'https://console.groq.com/docs/models',
    freeTier: '14,400 req/day \u00B7 30K TPM per model',
    keyFormat: 'gsk-...',
    models: [
      {
        id: 'openai/gpt-oss-120b',
        label: 'GPT-OSS 120B',
        inputPricePerMTok: 0,
        outputPricePerMTok: 0,
        contextWindow: '128K',
        free: true,
        tags: ['Free', 'Coding', 'Tool-use', 'Reasoning'],
        strengths: ['coding', 'tool-use', 'reasoning'],
        weaknesses: [],
        freeQuota: { requestsPerDay: 14400, tokensPerMinute: 30000 },
      },
      {
        id: 'qwen/qwen3.6-27b',
        label: 'Qwen3.6 27B',
        inputPricePerMTok: 0,
        outputPricePerMTok: 0,
        contextWindow: '128K',
        free: true,
        tags: ['Free', 'Coding', 'Chinese', 'Reasoning'],
        strengths: ['coding', 'reasoning', 'chinese'],
        weaknesses: [],
        freeQuota: { requestsPerDay: 14400, tokensPerMinute: 30000 },
      },
      {
        id: 'openai/gpt-oss-20b',
        label: 'GPT-OSS 20B',
        inputPricePerMTok: 0,
        outputPricePerMTok: 0,
        contextWindow: '128K',
        free: true,
        tags: ['Free', 'Coding', 'Reasoning'],
        strengths: ['coding', 'reasoning', 'tool-use'],
        weaknesses: ['smaller-model'],
        freeQuota: { requestsPerDay: 14400, tokensPerMinute: 30000 },
      },
      {
        id: 'llama-3.3-70b-versatile',
        label: 'Llama 3.3 70B',
        inputPricePerMTok: 0,
        outputPricePerMTok: 0,
        contextWindow: '128K',
        free: true,
        tags: ['Free', 'Fast', 'General'],
        strengths: ['general-knowledge', 'fast'],
        weaknesses: ['limited-reasoning'],
        freeQuota: { requestsPerDay: 14400, tokensPerMinute: 30000 },
      },
      {
        id: 'llama-3.1-8b-instant',
        label: 'Llama 3.1 8B',
        inputPricePerMTok: 0,
        outputPricePerMTok: 0,
        contextWindow: '128K',
        free: true,
        tags: ['Free', 'Fast', 'Simple'],
        strengths: ['fast', 'simple-tasks'],
        weaknesses: ['limited-reasoning', 'smaller-model'],
        freeQuota: { requestsPerDay: 14400, tokensPerMinute: 6000 },
      },
    ],
  },
  {
    id: 'gemini-free',
    label: 'Google Gemini (Free)',
    description: '1M context, 1,500 RPD Flash, no billing required',
    icon: '\uD83C\uDF10',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta',
    apiKeyPage: 'https://aistudio.google.com/apikey',
    modelsPage: 'https://ai.google.dev/gemini-api/docs/models',
    freeTier:
      'Flash: 1,500 RPD \u00B7 10 RPM \u00B7 Pro: 100 RPD \u00B7 5 RPM (AI Studio, no billing)',
    keyFormat: 'AIza...',
    models: [
      {
        id: 'gemini-2.5-flash',
        label: 'Gemini 2.5 Flash',
        inputPricePerMTok: 0,
        outputPricePerMTok: 0,
        contextWindow: '1M',
        free: true,
        tags: ['Free', 'Multimodal', '1M ctx'],
        strengths: ['multimodal', 'long-context', 'fast'],
        weaknesses: ['complex-coding'],
        freeQuota: { requestsPerDay: 1500, tokensPerMinute: 250000 },
      },
      {
        id: 'gemini-2.5-pro',
        label: 'Gemini 2.5 Pro',
        inputPricePerMTok: 0,
        outputPricePerMTok: 0,
        contextWindow: '1M',
        free: true,
        tags: ['Free', 'Reasoning', '1M ctx'],
        strengths: ['reasoning', 'complex-coding', 'long-context'],
        weaknesses: ['slow', 'low-rate-limit'],
        freeQuota: { requestsPerDay: 100, tokensPerMinute: 250000 },
      },
    ],
  },
]
