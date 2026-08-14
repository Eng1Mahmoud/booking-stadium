import axios, { type AxiosError } from 'axios'
import { manageCookie } from './manageCookie'

const baseURL = import.meta.env.VITE_API_BASE_URL

export const api = axios.create({
  baseURL,
  timeout: 10_000,
  // The session cookie is set by the API's origin, not this one, so the browser
  // treats it as third-party and withholds it unless every request opts in here.
  withCredentials: true,
})

const SAFE_METHODS = new Set(['get', 'head', 'options'])

// Nothing attaches the session any more — the browser sends the httpOnly cookie
// on its own. What we do have to attach is the CSRF value the API minted at
// login, on the writes it guards. Public endpoints send it too and ignore it.
api.interceptors.request.use((config) => {
  if (SAFE_METHODS.has((config.method ?? 'get').toLowerCase())) return config

  const csrfToken = manageCookie.get()
  if (csrfToken) {
    config.headers['X-CSRF-Token'] = csrfToken
  }
  return config
})

// Central place to pull a human-readable message out of a failed request.
// Falls back to Arabic copy instead of axios's own English "Network Error" /
// "timeout of 10000ms exceeded" messages, which never go through the server.
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const err = error as AxiosError<{ error?: string }>
    if (err.response?.data?.error) return err.response.data.error
    if (err.code === 'ECONNABORTED') return 'انتهت مهلة الاتصال بالخادم. يرجى المحاولة مرة أخرى.'
    if (!err.response) return 'تعذّر الوصول إلى الخادم. تحقق من اتصالك بالإنترنت وحاول مرة أخرى.'
    return 'حدث خطأ ما. يرجى المحاولة مرة أخرى.'
  }
  return 'حدث خطأ ما. يرجى المحاولة مرة أخرى.'
}
