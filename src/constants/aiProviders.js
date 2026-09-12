export const FALLBACK_AI_PROVIDERS = [
  {
    id: 'openai',
    label: 'OpenAI',
    defaultModel: 'gpt-4o-mini',
    apiKeyEnv: 'OPENAI_API_KEY',
    supportsServerWebTools: false,
    envFallbackConfigured: false,
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    defaultModel: 'claude-sonnet-4-5',
    apiKeyEnv: 'ANTHROPIC_API_KEY',
    supportsServerWebTools: true,
    envFallbackConfigured: false,
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    defaultModel: 'deepseek-flash',
    apiKeyEnv: 'DEEPSEEK_API_KEY',
    supportsServerWebTools: false,
    envFallbackConfigured: false,
  },
]

const MODEL_SUGGESTIONS = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini', 'o3-mini'],
  anthropic: [
    'claude-sonnet-4-5',
    'claude-opus-4-1',
    'claude-3-5-sonnet-latest',
    'claude-3-5-haiku-latest',
  ],
  deepseek: ['deepseek-flash', 'deepseek-v4-pro'],
}

export function normalizeAIProviders(payload) {
  const raw = Array.isArray(payload) ? payload : payload?.providers
  if (!Array.isArray(raw) || raw.length === 0) return FALLBACK_AI_PROVIDERS

  const seen = new Set()
  const providers = raw.flatMap((value) => {
    const id = typeof value?.id === 'string' ? value.id.trim() : ''
    if (!id || seen.has(id)) return []
    seen.add(id)
    return [{
      id,
      label: typeof value.label === 'string' && value.label.trim() ? value.label.trim() : id,
      defaultModel: typeof value.defaultModel === 'string' ? value.defaultModel.trim() : '',
      apiKeyEnv: typeof value.apiKeyEnv === 'string' && value.apiKeyEnv.trim()
        ? value.apiKeyEnv.trim()
        : `${id.toUpperCase()}_API_KEY`,
      supportsServerWebTools: value.supportsServerWebTools === true,
      envFallbackConfigured: value.envFallbackConfigured === true,
    }]
  })

  return providers.length ? providers : FALLBACK_AI_PROVIDERS
}

export function providerOption(providers, id) {
  return providers.find((provider) => provider.id === id)
    || FALLBACK_AI_PROVIDERS.find((provider) => provider.id === id)
    || { id, label: id, defaultModel: '', apiKeyEnv: '', supportsServerWebTools: false, envFallbackConfigured: false }
}

export function providerLabel(providers, id) {
  return providerOption(providers, id).label || id
}

export function defaultProviderId(providers) {
  return providers.some((provider) => provider.id === 'openai') ? 'openai' : providers[0]?.id || 'openai'
}

export function modelSuggestions(provider) {
  return [...new Set([
    provider?.defaultModel,
    ...(MODEL_SUGGESTIONS[provider?.id] || []),
  ].filter(Boolean))]
}
