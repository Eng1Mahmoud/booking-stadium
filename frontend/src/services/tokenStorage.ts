/**
 * Small wrapper around sessionStorage for the admin JWT.
 *
 * sessionStorage (not localStorage) so the token is wiped when the tab
 * closes, shrinking the window an XSS payload could exfiltrate it in.
 * Note this is still JS-readable storage — for a production deployment,
 * moving to an httpOnly cookie issued by the backend removes that risk
 * entirely, at the cost of needing CSRF protection. Fine tradeoff for
 * this MVP's bearer-token API.
 */
const TOKEN_KEY = 'booking_admin_token'

export const tokenStorage = {
  get(): string | null {
    return sessionStorage.getItem(TOKEN_KEY)
  },
  set(token: string): void {
    sessionStorage.setItem(TOKEN_KEY, token)
  },
  clear(): void {
    sessionStorage.removeItem(TOKEN_KEY)
  },
}
