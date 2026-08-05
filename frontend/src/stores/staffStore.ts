import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api, getErrorMessage } from '@/services/api'
import type { Admin, AdminProfile, AdminRole } from '@/types'

export const useStaffStore = defineStore('staff', () => {
  const staff = ref<Admin[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function fetchStaff(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      const { data } = await api.get<Admin[]>('/admins')
      staff.value = data
    } catch (err) {
      error.value = getErrorMessage(err)
    } finally {
      isLoading.value = false
    }
  }

  /** Each mutation refetches rather than patching locally — the server owns the
   *  lockout rules, so its list is the only trustworthy view of the outcome. */
  async function run(action: () => Promise<unknown>): Promise<boolean> {
    error.value = null
    try {
      await action()
      await fetchStaff()
      return true
    } catch (err) {
      error.value = getErrorMessage(err)
      return false
    }
  }

  const createStaff = (
    input: { username: string; password: string; role: AdminRole } & AdminProfile,
  ) => run(() => api.post('/admins', input))

  const updateProfile = (id: string, patch: AdminProfile) =>
    run(() => api.patch(`/admins/${id}`, patch))

  const setActive = (id: string, isActive: boolean) =>
    run(() => api.patch(`/admins/${id}/status`, { isActive }))

  const setRole = (id: string, role: AdminRole) =>
    run(() => api.patch(`/admins/${id}/role`, { role }))

  const resetPassword = (id: string, password: string) =>
    run(() => api.patch(`/admins/${id}/password`, { password }))

  async function changeOwnPassword(currentPassword: string, newPassword: string): Promise<boolean> {
    error.value = null
    try {
      await api.patch('/admins/me/password', { currentPassword, newPassword })
      return true
    } catch (err) {
      error.value = getErrorMessage(err)
      return false
    }
  }

  /** Self-service, so it doesn't refetch the staff list an admin can't read. */
  async function updateOwnProfile(patch: AdminProfile): Promise<boolean> {
    error.value = null
    try {
      await api.patch('/admins/me', patch)
      return true
    } catch (err) {
      error.value = getErrorMessage(err)
      return false
    }
  }

  return {
    staff,
    isLoading,
    error,
    fetchStaff,
    createStaff,
    updateProfile,
    setActive,
    setRole,
    resetPassword,
    changeOwnPassword,
    updateOwnProfile,
  }
})
