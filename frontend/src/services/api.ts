import axios, { type AxiosError } from 'axios'
import { tokenStorage } from './tokenStorage'

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

export const api = axios.create({
  baseURL,
  timeout: 10_000,
})

// Attach the admin JWT to every request when we have one. Public endpoints
// simply ignore the header, so one instance is enough for both.
api.interceptors.request.use((config) => {
  const token = tokenStorage.get()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
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
