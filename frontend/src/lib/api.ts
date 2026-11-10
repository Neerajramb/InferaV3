import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'

import { useAuth } from '../store/auth'

export const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://127.0.0.1:8000/api'

export const api = axios.create({ baseURL: API_URL })

api.interceptors.request.use((config) => {
  const token = useAuth.getState().access
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let refreshing: Promise<string> | null = null

/** Exchange the refresh token for a new access token. Concurrent callers share one request. */
export function refreshAccess(): Promise<string> {
  if (!refreshing) {
    const refresh = useAuth.getState().refresh
    refreshing = (async () => {
      if (!refresh) throw new Error('No refresh token')
      const { data } = await axios.post(`${API_URL}/token/refresh/`, { refresh })
      useAuth.getState().setTokens({ access: data.access, refresh: data.refresh })
      return data.access as string
    })()
      .catch((error) => {
        useAuth.getState().clear()
        throw error
      })
      .finally(() => {
        refreshing = null
      })
  }
  return refreshing
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined
    const isAuthCall = original?.url?.includes('/token/')
    if (error.response?.status === 401 && original && !original._retried && !isAuthCall && useAuth.getState().refresh) {
      original._retried = true
      const access = await refreshAccess()
      original.headers.Authorization = `Bearer ${access}`
      return api(original)
    }
    return Promise.reject(error)
  },
)

/** Turn any API error into one readable sentence. */
export function errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) return "Can't reach the server. Check your connection and try again."
    const data = error.response.data as unknown
    if (typeof data === 'string') return fallback
    if (data && typeof data === 'object') {
      const record = data as Record<string, unknown>
      if (typeof record.detail === 'string') return record.detail
      const first = Object.values(record)[0]
      if (Array.isArray(first) && typeof first[0] === 'string') return first[0]
      if (typeof first === 'string') return first
    }
  }
  if (error instanceof Error && error.message) return error.message
  return fallback
}

/**
 * Fetch an authenticated file and open it in a new tab or save it.
 * The tab is opened before the request so popup blockers treat it as a user action.
 */
export async function openDocument(id: number, title: string, download = false) {
  const tab = download ? null : window.open('', '_blank')
  try {
    const response = await api.get(`/documents/${id}/download/`, {
      params: download ? { download: 1 } : undefined,
      responseType: 'blob',
    })
    const url = URL.createObjectURL(response.data as Blob)
    if (download) {
      const link = Object.assign(document.createElement('a'), { href: url, download: title })
      document.body.appendChild(link)
      link.click()
      link.remove()
    } else if (tab) {
      tab.location.href = url
    } else {
      window.open(url, '_blank', 'noopener')
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch (error) {
    tab?.close()
    throw error
  }
}
