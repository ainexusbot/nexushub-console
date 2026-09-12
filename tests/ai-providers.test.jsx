import assert from 'node:assert/strict'
import { afterEach, beforeEach, test } from 'node:test'
import { JSDOM } from 'jsdom'
import React from 'react'
import { AuthProvider } from '../src/context/AuthContext'
import {
  FALLBACK_AI_PROVIDERS,
  modelSuggestions,
  normalizeAIProviders,
  providerOption,
} from '../src/constants/aiProviders'
import AiModelsPage from '../src/pages/AiModelsPage'
import AiProviderKeysPage from '../src/pages/AiProviderKeysPage'

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://test.invalid',
})
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  HTMLElement: dom.window.HTMLElement,
  localStorage: dom.window.localStorage,
  IS_REACT_ACT_ENVIRONMENT: true,
})
Object.defineProperty(globalThis, 'navigator', {
  value: dom.window.navigator,
  configurable: true,
})

const { cleanup, fireEvent, render, screen, waitFor } = await import('@testing-library/react')

const providersPayload = {
  providers: [
    {
      id: 'anthropic',
      label: 'Anthropic',
      defaultModel: 'claude-sonnet-4-5',
      apiKeyEnv: 'ANTHROPIC_API_KEY',
      supportsServerWebTools: true,
      envFallbackConfigured: false,
    },
    {
      id: 'openai',
      label: 'OpenAI',
      defaultModel: 'gpt-4o-mini',
      apiKeyEnv: 'OPENAI_API_KEY',
      supportsServerWebTools: false,
      envFallbackConfigured: true,
    },
    {
      id: 'deepseek',
      label: 'DeepSeek',
      defaultModel: 'deepseek-flash',
      apiKeyEnv: 'DEEPSEEK_API_KEY',
      supportsServerWebTools: false,
      envFallbackConfigured: false,
    },
  ],
}

let requests
let storedKeys

function reply(data, status = 200) {
  return { ok: status < 400, status, json: async () => structuredClone(data) }
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('nexushub_token', 'test-only')
  localStorage.setItem(
    'nexushub_user',
    JSON.stringify({ role: 'admin', email: 'admin@example.test' }),
  )
  requests = []
  storedKeys = []

  globalThis.fetch = async (url, options = {}) => {
    const parsed = new URL(url)
    const path = parsed.pathname.replace('/api', '')
    const method = options.method || 'GET'
    const body = options.body ? JSON.parse(options.body) : null
    requests.push({ path, method, body })

    if (path === '/ai-models/providers') return reply(providersPayload)
    if (path === '/ai-models' && method === 'GET') return reply({ models: [] })
    if (path === '/ai-provider-keys' && method === 'GET') return reply({ keys: storedKeys })
    if (path === '/ai-models' && method === 'POST') {
      return reply({ model: { id: 'model-deepseek', ...body.input, isActive: body.active } }, 201)
    }
    if (path === '/ai-provider-keys' && method === 'POST') {
      return reply({ key: { id: 'key-deepseek', ...body.input, isActive: body.active } }, 201)
    }
    if (path.startsWith('/ai-provider-keys/') && method === 'PUT') {
      return reply({ key: { id: path.split('/').at(-1), ...body.input } })
    }
    throw new Error(`Unexpected request ${method} ${path}`)
  }
})

afterEach(() => cleanup())

function mount(element) {
  return render(<AuthProvider>{element}</AuthProvider>)
}

test('provider metadata keeps DeepSeek available and exposes its model suggestion', () => {
  const providers = normalizeAIProviders(providersPayload)
  const deepseek = providerOption(providers, 'deepseek')
  assert.equal(deepseek.defaultModel, 'deepseek-flash')
  assert.equal(deepseek.apiKeyEnv, 'DEEPSEEK_API_KEY')
  assert(modelSuggestions(deepseek).includes('deepseek-v4-pro'))
  assert(FALLBACK_AI_PROVIDERS.some((provider) => provider.id === 'deepseek'))
})

test('creating a DeepSeek model sends the provider and official default model', async () => {
  mount(<AiModelsPage />)
  fireEvent.click((await screen.findAllByRole('button', { name: 'Add Model' }))[0])
  fireEvent.click(screen.getByRole('button', { name: 'DeepSeek' }))

  assert.equal(screen.getByLabelText('Model ID').value, 'deepseek-flash')
  fireEvent.change(screen.getByLabelText('Model label'), {
    target: { value: 'DeepSeek Flash' },
  })
  fireEvent.click(screen.getByLabelText('Activate immediately'))
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))

  await waitFor(() => {
    const request = requests.find((item) => item.path === '/ai-models' && item.method === 'POST')
    assert(request)
    assert.equal(request.body.input.provider, 'deepseek')
    assert.equal(request.body.input.model, 'deepseek-flash')
    assert.equal(request.body.active, true)
  })
})

test('creating a DeepSeek API key sends the expected provider and can activate it', async () => {
  mount(<AiProviderKeysPage />)
  fireEvent.click((await screen.findAllByRole('button', { name: 'Add Key' }))[0])
  fireEvent.click(screen.getByRole('button', { name: 'DeepSeek' }))
  fireEvent.change(screen.getByLabelText('Key label'), {
    target: { value: 'DeepSeek production' },
  })
  fireEvent.change(screen.getByLabelText('API key'), {
    target: { value: 'sk-deepseek-test-only' },
  })
  fireEvent.click(screen.getByLabelText('Activate immediately for this provider'))
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))

  await waitFor(() => {
    const request = requests.find(
      (item) => item.path === '/ai-provider-keys' && item.method === 'POST',
    )
    assert(request)
    assert.equal(request.body.input.provider, 'deepseek')
    assert.equal(request.body.input.apiKey, 'sk-deepseek-test-only')
    assert.equal(request.body.active, true)
  })
})

test('changing an existing key provider requires a replacement secret', async () => {
  storedKeys = [
    {
      id: 'key-openai',
      provider: 'openai',
      label: 'OpenAI production',
      keyPreview: 'sk-...old',
      isActive: true,
      createdAt: '2026-09-01T00:00:00.000Z',
    },
  ]
  mount(<AiProviderKeysPage />)
  fireEvent.click(await screen.findByRole('button', { name: 'Edit' }))
  fireEvent.click(screen.getByRole('button', { name: 'DeepSeek' }))
  fireEvent.submit(screen.getByLabelText('API key').closest('form'))

  await screen.findByText('Enter a new API key when changing the provider.')
  assert.equal(requests.some((item) => item.method === 'PUT'), false)
})
