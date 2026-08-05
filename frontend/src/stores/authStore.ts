import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { api, getErrorMessage } from '@/services/api'
import { tokenStorage } from '@/services/tokenStorage'
import type { AdminRole } from '@/types'

interface SessionPayload {
  token: string
  username: string
  role: AdminRole
  fullName?: string
  phone?: string
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(tokenStorage.get())
  const username = ref<string | null>(null)
  const role = ref<AdminRole | null>(null)
  const fullName = ref<string | null>(null)
  const phone = ref<string | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = () => Boolean(token.value)
  const isSuperAdmin = computed(() => role.value === 'superadmin')
  /** What to call this person in the UI — their name if they gave one. */
  const displayName = computed(() => fullName.value || username.value)

  async function login(usernameInput: string, password: string): Promise<boolean> {
    isLoading.value = true
    error.value = null
    try {
      const { data } = await api.post<SessionPayload>('/auth/login', {
        username: usernameInput,
        password,
      })
      token.value = data.token
      username.value = data.username
      role.value = data.role
      fullName.value = data.fullName ?? null
      phone.value = data.phone ?? null
      tokenStorage.set(data.token)
      return true
    } catch (err) {
      error.value = getErrorMessage(err)
      return false
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Only the token survives a reload, so the username and role have to be
   * re-fetched before any role-gated UI can render. Doubles as a liveness
   * check: a token belonging to a deactivated account fails here and logs out.
   */
  async function restoreSession(): Promise<boolean> {
    if (!token.value) return false
    if (role.value) return true

    try {
      const { data } = await api.get<Omit<SessionPayload, 'token'>>('/auth/me')
      username.value = data.username
      role.value = data.role
      fullName.value = data.fullName ?? null
      phone.value = data.phone ?? null
      return true
    } catch {
      logout()
      return false
    }
  }

  /** Keeps the header and account page in step after an edit, without a refetch. */
  function setProfile(patch: { fullName?: string; phone?: string }): void {
    if (patch.fullName !== undefined) fullName.value = patch.fullName || null
    if (patch.phone !== undefined) phone.value = patch.phone || null
  }

  function logout(): void {
    token.value = null
    username.value = null
    role.value = null
    fullName.value = null
    phone.value = null
    tokenStorage.clear()
  }

  return {
    token,
    username,
    role,
    fullName,
    phone,
    isLoading,
    error,
    isSuperAdmin,
    displayName,
    isAuthenticated,
    login,
    restoreSession,
    setProfile,
    logout,
  }
})
