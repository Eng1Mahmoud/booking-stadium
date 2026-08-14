/**
 * The anti-CSRF value the API returns at login, which we echo back in a header
 * on every write. The session itself is an httpOnly cookie on the API's domain —
 * unreadable here, which is why our copy is kept first-party rather than read
 * back off the server's own cookie. It authenticates nothing on its own.
 */
import Cookies from 'js-cookie'

const CSRF_KEY = 'booking_admin_csrf'

// Shared so `clear` targets the exact cookie `set` wrote: a browser treats
// differing attributes as a different cookie and keeps the original. `secure` is
// dropped on http://localhost, where the browser would reject it.
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
