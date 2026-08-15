import { defineStore } from 'pinia'
import { api, getErrorMessage } from '@/services/api'
import { manageCookie } from '@/services/manageCookie'
import type { AdminRole } from '@/types'

interface SessionPayload {
  csrfToken: string
  username: string
  role: AdminRole
  fullName?: string
  phone?: string
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    username: null as string | null,
    role: null as AdminRole | null,
    fullName: null as string | null,
    phone: null as string | null,
    isLoading: false,
    error: null as string | null,
  }),

  getters: {
    isSuperAdmin: (state) => state.role === 'superadmin',
    displayName: (state) => state.fullName || state.username,
  },

  actions: {
    /**
     * A hint, not a verdict: the session cookie is httpOnly, so this can only
     * tell that a login happened on this browser. `restoreSession` confirms it.
     *
     * An action rather than a getter because a cookie is not reactive — a getter
     * would cache the first answer and go on reporting a cleared session.
     */
    isAuthenticated(): boolean {
      return Boolean(this.role ?? manageCookie.get())
    },

    _applySession(data: SessionPayload): void {
      this.username = data.username
      this.role = data.role
      this.fullName = data.fullName ?? null
      this.phone = data.phone ?? null
      manageCookie.set(data.csrfToken)
    },

    async login(usernameInput: string, password: string): Promise<boolean> {
      this.isLoading = true
      this.error = null
      try {
        // No token comes back — the API sets it as an httpOnly cookie the browser
        // will attach from here on, and returns only the CSRF value we echo back.
        const { data } = await api.post<SessionPayload>('/auth/login', {
          username: usernameInput,
          password,
        })
        this._applySession(data)
        return true
      } catch (err) {
        this.error = getErrorMessage(err)
        return false
      } finally {
        this.isLoading = false
      }
    },

    /**
     * The browser holds the session but can't show it to us, so role-gated UI
     * needs this before it can render. Doubles as a liveness check: an expired
     * cookie, or one from a deactivated account, fails here and logs out.
     */
    async restoreSession(): Promise<boolean> {
      if (this.role) return true

      try {
        const { data } = await api.get<SessionPayload>('/auth/me')
        this._applySession(data)
        return true
      } catch {
        await this.logout()
        return false
      }
    },

    /** Keeps the header and account page in step after an edit, without a refetch. */
    setProfile(patch: { fullName?: string; phone?: string }): void {
      if (patch.fullName !== undefined) this.fullName = patch.fullName || null
      if (patch.phone !== undefined) this.phone = patch.phone || null
    },

    /**
     * Only the server can delete a cookie it marked httpOnly, so signing out is a
     * request now. Local state is cleared either way — a failed call must not
     * leave someone looking at a dashboard they have asked to leave.
     */
    async logout(): Promise<void> {
      try {
        await api.post('/auth/logout')
      } catch {
        // Offline, or the session was already gone. Nothing to recover.
      } finally {
        // `$reset` covers store state only; the cookie has to go separately.
        this.$reset()
        manageCookie.clear()
      }
    },
  },
})
