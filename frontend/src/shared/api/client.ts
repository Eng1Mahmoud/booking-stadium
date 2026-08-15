import axios, { type AxiosError } from 'axios'
import { manageCookie } from './csrfCookie'

const baseURL = import.meta.env.VITE_API_BASE_URL

export const api = axios.create({
  baseURL,
  timeout: 10_000,
  // The session cookie belongs to the API's origin, so the browser treats it as
  // third-party and withholds it unless every request opts in here.
  withCredentials: true,
})

const SAFE_METHODS = new Set(['get', 'head', 'options'])

// The browser sends the session cookie itself; what we must attach is the CSRF
// value, on the writes the API guards. Public endpoints send it and ignore it.
api.interceptors.request.use((config) => {
  if (SAFE_METHODS.has((config.method ?? 'get').toLowerCase())) return config

  const csrfToken = manageCookie.get()
  if (csrfToken) {
    config.headers['X-CSRF-Token'] = csrfToken
  }
  return config
})

// Arabic copy in place of axios's own English "Network Error" / "timeout of
// 10000ms exceeded", which never went through the server anyway.
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
