/**
 * The anti-CSRF value the API returns at login, echoed back in a header on every
 * write. Kept first-party because the session cookie belongs to the API's domain
 * and is unreadable here. It authenticates nothing on its own.
 */
import Cookies from 'js-cookie'

const CSRF_KEY = 'booking_admin_csrf'

// Shared so `clear` targets the exact cookie `set` wrote — differing attributes
// make it a different cookie, and the original survives. `secure` is dropped on
// http://localhost, where the browser would reject it.
const attributes: Cookies.CookieAttributes = {
  path: '/',
  sameSite: 'lax',
  secure: location.protocol === 'https:',
}

export const manageCookie = {
  get: (): string | null => Cookies.get(CSRF_KEY) ?? null,

  /** One day, matching the session cookie — both must outlive a browser restart. */
  set: (token: string): void => {
    Cookies.set(CSRF_KEY, token, { ...attributes, expires: 1 })
  },

  clear: (): void => Cookies.remove(CSRF_KEY, attributes),
}
