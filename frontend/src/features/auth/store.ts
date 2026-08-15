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

/**
 * Shared by `login` and `restoreSession`, which receive the same payload and owe
 * the state the same four fields — the point being that a field added later
 * can't be wired into one path and forgotten in the other.
 *
 * A module function rather than an action: an options store publishes every
 * action, so anything living in `actions` is callable from any component. This
 * isn't exported, so nothing outside this file can reach it at all.
 */
function sessionState(data: SessionPayload) {
  return {
    username: data.username,
    role: data.role,
    fullName: data.fullName ?? null,
    phone: data.phone ?? null,
  }
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
    isAuthenticated(): boolean {
      return Boolean(this.role ?? manageCookie.get())
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
        this.$patch(sessionState(data))
        manageCookie.set(data.csrfToken)
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
        this.$patch(sessionState(data))
        manageCookie.set(data.csrfToken)
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
