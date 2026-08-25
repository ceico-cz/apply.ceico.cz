const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function cookie(name: string) {
  return document.cookie.split('; ').find((row) => row.startsWith(`${name}=`))?.split('=')[1] || ''
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json')
  if (options.method && !['GET', 'HEAD'].includes(options.method)) {
    headers.set('X-CSRF-Token', decodeURIComponent(cookie('portal_csrf')))
  }
  const response = await fetch(`${API_URL}/api/v1${path}`, { ...options, headers, credentials: 'include' })
  if (!response.ok) {
    let message = response.statusText
    try {
      const body = await response.json()
      message = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail)
    } catch { /* response was not JSON */ }
    throw new ApiError(response.status, message)
  }
  if (response.status === 204) return undefined as T
  return response.json()
}

export { API_URL }

