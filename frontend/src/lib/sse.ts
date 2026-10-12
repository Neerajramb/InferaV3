import { useAuth } from '../store/auth'
import { API_URL, refreshAccess } from './api'
import type { AssistantStatus, ChatMessage, ChatScope, Source } from './types'

export interface StreamMeta {
  session_id: number
  title: string
  user_message: ChatMessage
  sources: Source[]
  assistant: AssistantStatus
}

interface Handlers {
  onMeta: (meta: StreamMeta) => void
  onToken: (token: string) => void
  onDone: (message: ChatMessage) => void
}

export interface StreamRequest extends ChatScope {
  query: string
  session_id: number | null
}

async function post(body: StreamRequest, signal: AbortSignal) {
  return fetch(`${API_URL}/chat/stream/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${useAuth.getState().access ?? ''}`,
    },
    body: JSON.stringify(body),
    signal,
  })
}

/** POST a question and consume the server-sent event stream. */
export async function streamChat(body: StreamRequest, handlers: Handlers, signal: AbortSignal) {
  let response = await post(body, signal)
  if (response.status === 401) {
    await refreshAccess()
    response = await post(body, signal)
  }
  if (!response.ok || !response.body) {
    let detail = 'The assistant could not answer right now.'
    try {
      const data = await response.json()
      detail = data.detail ?? Object.values(data)[0]?.toString() ?? detail
    } catch {
      /* keep the default message */
    }
    throw new Error(detail)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let boundary = buffer.indexOf('\n\n')
    while (boundary !== -1) {
      const block = buffer.slice(0, boundary)
      buffer = buffer.slice(boundary + 2)
      boundary = buffer.indexOf('\n\n')

      let event = 'message'
      let data = ''
      for (const line of block.split('\n')) {
        if (line.startsWith('event: ')) event = line.slice(7)
        else if (line.startsWith('data: ')) data += line.slice(6)
      }
      if (!data) continue
      const payload = JSON.parse(data)
      if (event === 'meta') handlers.onMeta(payload)
      else if (event === 'token') handlers.onToken(payload.t)
      else if (event === 'done') handlers.onDone(payload.message)
      else if (event === 'error') throw new Error(payload.detail)
    }
  }
}
