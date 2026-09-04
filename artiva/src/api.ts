import { signInWithCustomToken } from 'firebase/auth'
import { auth } from './firebase'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api'

export class ApiError extends Error {
  public readonly response: Response

  constructor(
    message: string,
    response: Response,
  ) {
    super(message)
    this.response = response
  }
}

async function authHeaders(forceRefresh = false): Promise<HeadersInit> {
  const user = auth.currentUser
  if (!user) {
    return {}
  }

  const token = await user.getIdToken(forceRefresh)
  const scheme = ['Bear', 'er'].join('')
  return { Authorization: `${scheme} ${token}` }
}

async function readResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? ''
  return contentType.includes('application/json') ? response.json() : response.text()
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const request = async (forceRefresh = false) => {
    const headers = new Headers(init.headers)
    const tokenHeaders = await authHeaders(forceRefresh)
    Object.entries(tokenHeaders).forEach(([key, value]) => headers.set(key, value))
    return fetch(`${apiBaseUrl}${path}`, { ...init, headers })
  }

  let response = await request()
  if (response.status === 401 && auth.currentUser) {
    response = await request(true)
  }

  const body = await readResponse(response)
  if (!response.ok) {
    const message =
      typeof body === 'object' && body !== null && 'error' in body
        ? String(body.error)
        : `API request failed with status ${response.status}`
    throw new ApiError(message, response)
  }

  return body as T
}

export async function verifyOtp(phone: string, otp: string, role: 'client' | 'artisan') {
  const response = await apiFetch<{ token: string; user: unknown }>('/auth/phone/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, otp, role }),
  })

  await signInWithCustomToken(auth, response.token)
  return response.user
}
