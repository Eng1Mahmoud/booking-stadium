import { defineStore } from 'pinia'
import { api, getErrorMessage } from '@/services/api'
import type { Admin, AdminProfile, AdminRole } from '@/types'

export const useStaffStore = defineStore('staff', {
  // `staff` needs the annotation: an empty literal would otherwise be inferred
  // as `never[]`, and nothing could ever be assigned to it.
  state: () => ({
    staff: [] as Admin[],
    isLoading: false,
    error: null as string | null,
  }),

  actions: {
    async fetchStaff(): Promise<void> {
      this.isLoading = true
      this.error = null
      try {
        const { data } = await api.get<Admin[]>('/admins')
        this.staff = data
      } catch (err) {
        this.error = getErrorMessage(err)
      } finally {
        this.isLoading = false
      }
    },

    /** Each mutation refetches rather than patching locally — the server owns the
     *  lockout rules, so its list is the only trustworthy view of the outcome.
     *
     *  Underscored because it is an internal helper: an options store exposes
     *  every action, so the prefix is the only way left to say "not for callers".
     */
    async _run(action: () => Promise<unknown>): Promise<boolean> {
      this.error = null
      try {
        await action()
        await this.fetchStaff()
        return true
      } catch (err) {
        this.error = getErrorMessage(err)
        return false
      }
    },

    createStaff(
      input: { username: string; password: string; role: AdminRole } & AdminProfile,
    ): Promise<boolean> {
      return this._run(() => api.post('/admins', input))
    },

    updateProfile(id: string, patch: AdminProfile): Promise<boolean> {
      return this._run(() => api.patch(`/admins/${id}`, patch))
    },

    setActive(id: string, isActive: boolean): Promise<boolean> {
      return this._run(() => api.patch(`/admins/${id}/status`, { isActive }))
    },

    setRole(id: string, role: AdminRole): Promise<boolean> {
      return this._run(() => api.patch(`/admins/${id}/role`, { role }))
    },

    resetPassword(id: string, password: string): Promise<boolean> {
      return this._run(() => api.patch(`/admins/${id}/password`, { password }))
    },

    async changeOwnPassword(currentPassword: string, newPassword: string): Promise<boolean> {
      this.error = null
      try {
        await api.patch('/admins/me/password', { currentPassword, newPassword })
        return true
      } catch (err) {
        this.error = getErrorMessage(err)
        return false
      }
    },

    /** Self-service, so it doesn't refetch the staff list an admin can't read. */
    async updateOwnProfile(patch: AdminProfile): Promise<boolean> {
      this.error = null
      try {
        await api.patch('/admins/me', patch)
        return true
      } catch (err) {
        this.error = getErrorMessage(err)
        return false
      }
    },
  },
})
