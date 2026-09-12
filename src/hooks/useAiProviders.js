import { useCallback, useEffect, useState } from 'react'
import { FALLBACK_AI_PROVIDERS, normalizeAIProviders } from '../constants/aiProviders'
import { api, readError } from '../utils/api'

export function useAiProviders() {
  const [providers, setProviders] = useState(FALLBACK_AI_PROVIDERS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const response = await api.get('/ai-models/providers')
      if (!response.ok) {
        throw new Error(await readError(response, 'Failed to fetch supported AI providers'))
      }
      const data = await response.json()
      setProviders(normalizeAIProviders(data))
      setError(null)
    } catch (err) {
      // Keep all three built-in options available while clearly warning that
      // the backend metadata endpoint could not be verified.
      setProviders(FALLBACK_AI_PROVIDERS)
      setError(err instanceof Error ? err.message : 'Failed to fetch supported AI providers')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return { providers, loading, error, reload }
}
