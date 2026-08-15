import { useMutation } from '@tanstack/vue-query'
import { api } from '@/shared/api/client'
import { keys } from '@/shared/api/keys'
import { useInvalidator } from '@/shared/api/invalidate'
import type { AdminRole } from '@/shared/types'
import type { AdminProfile } from '../types'

export function useCreateStaff() {
  const invalidate = useInvalidator()
  return useMutation({
    mutationFn: (input: { username: string; password: string; role: AdminRole } & AdminProfile) =>
      api.post('/admins', input),
    onSuccess: () => invalidate(keys.staff),
  })
}

export function useUpdateStaffProfile() {
  const invalidate = useInvalidator()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: AdminProfile }) =>
      api.patch(`/admins/${id}`, patch),
    onSuccess: () => invalidate(keys.staff),
  })
}

export function useSetStaffActive() {
  const invalidate = useInvalidator()
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/admins/${id}/status`, { isActive }),
    onSuccess: () => invalidate(keys.staff),
  })
}

export function useSetStaffRole() {
  const invalidate = useInvalidator()
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: AdminRole }) =>
      api.patch(`/admins/${id}/role`, { role }),
    onSuccess: () => invalidate(keys.staff),
  })
}

export function useResetStaffPassword() {
  const invalidate = useInvalidator()
  return useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      api.patch(`/admins/${id}/password`, { password }),
    onSuccess: () => invalidate(keys.staff),
  })
}

// The two self-service ones deliberately invalidate nothing: an ordinary admin
// can't read the staff list, so asking for it after their own edit would 403.

export function useChangeOwnPassword() {
  return useMutation({
    mutationFn: (input: { currentPassword: string; newPassword: string }) =>
      api.patch('/admins/me/password', input),
  })
}

export function useUpdateOwnProfile() {
  return useMutation({
    mutationFn: (patch: AdminProfile) => api.patch('/admins/me', patch),
  })
}
