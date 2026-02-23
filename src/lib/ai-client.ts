export interface AIConfig {
  baseUrl: string
  apiKey: string
  model: string
  enabled: boolean
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AIModel {
  id: string
  name: string
  description?: string
  pricing?: {
    prompt: number
    completion: number
  }
}

export interface AIProvider {
  id: string
  name: string
  baseUrl: string
  defaultApiKey: string
  defaultModel: string
  description: string
}

export const AI_PROVIDERS: AIProvider[] = [
  {
    id: 'lmstudio',
    name: 'LM Studio',
    baseUrl: 'http://localhost:1234/v1',
    defaultApiKey: 'lmstudio',
    defaultModel: 'local-model',
    description: 'Local open-source models',
  },
  {
    id: 'ollama',
    name: 'Ollama',
    baseUrl: 'http://localhost:11434/v1',
    defaultApiKey: 'ollama',
    defaultModel: 'mistral',
    description: 'Open-source models via Ollama',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultApiKey: 'sk-or-...',
    defaultModel: 'openai/gpt-4o-mini',
    description: 'Access to multiple AI models',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    defaultApiKey: 'sk-...',
    defaultModel: 'gpt-4o-mini',
    description: 'OpenAI GPT models',
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    defaultApiKey: 'sk-ant-...',
    defaultModel: 'claude-3-5-haiku-20241022',
    description: 'Anthropic Claude models',
  },
]

const CONFIG_KEY = 'ai_config'

export function loadAIConfig(): AIConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (raw) return JSON.parse(raw) as AIConfig
  } catch { /* ignore */ }
  return {
    baseUrl: import.meta.env.VITE_AI_BASE_URL || 'http://localhost:1234/v1',
    apiKey: import.meta.env.VITE_AI_API_KEY || 'lmstudio',
    model: import.meta.env.VITE_AI_MODEL || 'local-model',
    enabled: false,
  }
}

export function saveAIConfig(config: AIConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
}

/**
 * Fetches available models from OpenRouter API
 * Returns empty array for non-OpenRouter endpoints
 */
export async function fetchOpenRouterModels(apiKey: string): Promise<AIModel[]> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Conversational Onboarding',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`)
    }

    const data = await response.json() as {
      data: Array<{
        id: string
        name: string
        description?: string
        pricing?: {
          prompt: string
          completion: string
        }
      }>
    }

    return data.data.map((model) => ({
      id: model.id,
      name: model.name || model.id,
      description: model.description,
      pricing: model.pricing
        ? {
            prompt: parseFloat(model.pricing.prompt),
            completion: parseFloat(model.pricing.completion),
          }
        : undefined,
    }))
  } catch (err) {
    console.error('Failed to fetch OpenRouter models:', err)
    return []
  }
}

/**
 * Streams a chat completion, calling onChunk with each new text token.
 * Compatible with OpenAI, OpenRouter, and LM Studio APIs.
 */
export async function streamChatCompletion(
  messages: ChatMessage[],
  onChunk: (token: string) => void,
  config?: AIConfig
): Promise<string> {
  const cfg = config ?? loadAIConfig()
  if (!cfg.enabled) throw new Error('AI is not enabled')

  const url = `${cfg.baseUrl.replace(/\/$/, '')}/chat/completions`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.apiKey}`,
      // OpenRouter requires these
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Conversational Onboarding',
    },
    body: JSON.stringify({
      model: cfg.model,
      messages,
      stream: true,
      max_tokens: 512,
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`AI API error ${response.status}: ${errorText}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let fullText = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    const lines = chunk.split('\n')
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') break
      try {
        const parsed = JSON.parse(data) as {
          choices: { delta: { content?: string } }[]
        }
        const token = parsed.choices[0]?.delta?.content
        if (token) {
          fullText += token
          onChunk(token)
        }
      } catch { /* skip malformed SSE lines */ }
    }
  }

  return fullText
}

/**
 * Non-streaming completion for validation tasks.
 */
export async function chatCompletion(
  messages: ChatMessage[],
  config?: AIConfig
): Promise<string> {
  const cfg = config ?? loadAIConfig()
  if (!cfg.enabled) throw new Error('AI is not enabled')

  const url = `${cfg.baseUrl.replace(/\/$/, '')}/chat/completions`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.apiKey}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Conversational Onboarding',
    },
    body: JSON.stringify({
      model: cfg.model,
      messages,
      stream: false,
      max_tokens: 2000,
      temperature: 0.3,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`AI API error ${response.status}: ${errorText}`)
  }

  const json = await response.json() as {
    choices: { message: { content: string } }[]
  }
  return json.choices[0]?.message?.content ?? ''
}
