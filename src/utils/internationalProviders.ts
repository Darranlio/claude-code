/**
 * International (non-China) LLM provider presets with free tiers.
 * Groq and Google Gemini offer genuinely free API access without credit card.
 *
 * All providers are OpenAI-compatible or use existing protocol adapters.
 */

import type { ProviderPreset } from './chinaLlmProviders.js'

export const INTERNATIONAL_PROVIDERS: ProviderPreset[] = [
  {
    id: 'groq',
    label: 'Groq',
    description: 'Free tier, ultra-fast LPU inference, 14.4K req/day',
    icon: '⚡',
    baseURL: 'https://api.groq.com/openai/v1',
    apiKeyPage: 'https://console.groq.com/keys',
    modelsPage: 'https://console.groq.com/docs/models',
    freeTier: '14,400 req/day · 30K TPM per model',
    keyFormat: 'gsk-...',
    models: [
      {
        id: 'llama-4-scout',
        label: 'Llama 4 Scout',
        inputPricePerMTok: 0,
        outputPricePerMTok: 0,
        contextWindow: '16K',
        free: true,
        tags: ['Free', 'Reasoning'],
        strengths: ['reasoning', 'general-knowledge'],
        weaknesses: ['short-context'],
        freeQuota: { requestsPerDay: 14400, tokensPerMinute: 30000 },
      },
      {
        id: 'qwen3-32b',
        label: 'Qwen3 32B',
        inputPricePerMTok: 0,
        outputPricePerMTok: 0,
        contextWindow: '32K',
        free: true,
        tags: ['Free', 'Coding', 'Chinese'],
        strengths: ['coding', 'reasoning', 'chinese'],
        weaknesses: ['tool-use-limited'],
        freeQuota: { requestsPerDay: 14400, tokensPerMinute: 30000 },
      },
      {
        id: 'gpt-oss-120b',
        label: 'GPT-OSS 120B',
        inputPricePerMTok: 0,
        outputPricePerMTok: 0,
        contextWindow: '128K',
        free: true,
        tags: ['Free', 'Coding', 'Tool-use'],
        strengths: ['coding', 'tool-use', 'reasoning'],
        weaknesses: [],
        freeQuota: { requestsPerDay: 14400, tokensPerMinute: 30000 },
      },
      {
        id: 'llama-3.1-8b-instant',
        label: 'Llama 3.1 8B',
        inputPricePerMTok: 0,
        outputPricePerMTok: 0,
        contextWindow: '8K',
        free: true,
        tags: ['Free', 'Fast', 'Simple'],
        strengths: ['fast', 'simple-tasks'],
        weaknesses: ['limited-reasoning', 'short-context'],
        freeQuota: { requestsPerDay: 14400, tokensPerMinute: 6000 },
      },
    ],
  },
  {
    id: 'gemini-free',
    label: 'Google Gemini (Free)',
    description: '1M context, 1,500 RPD Flash, no billing required',
    icon: '🌐',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta',
    apiKeyPage: 'https://aistudio.google.com/apikey',
    modelsPage: 'https://ai.google.dev/gemini-api/docs/models',
    freeTier:
      'Flash: 1,500 RPD · 10 RPM · Pro: 100 RPD · 5 RPM (AI Studio, no billing)',
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
