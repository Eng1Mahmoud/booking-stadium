<script setup lang="ts">
import { computed, ref, toRef } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { useStaff } from '@/queries/useAdminData'
import {
  useCreateStaff,
  useResetStaffPassword,
  useSetStaffActive,
  useSetStaffRole,
  useUpdateStaffProfile,
} from '@/queries/mutations'
import { getErrorMessage } from '@/services/api'
import { formatArabicDateTime } from '@/utils/date'
import type { Admin, AdminRole } from '@/types'

const authStore = useAuthStore()

const { data, isPending, error: loadError } = useStaff(toRef(() => authStore.isSuperAdmin))
const staff = computed(() => data.value ?? [])

const createStaff = useCreateStaff()
const updateProfile = useUpdateStaffProfile()
const resetStaffPassword = useResetStaffPassword()
const setRole = useSetStaffRole()
const setActive = useSetStaffActive()

const showAddForm = ref(false)
const isSubmitting = ref(false)
/** Local: a validation message this component produces itself. Server failures
 *  come from whichever mutation raised them, so one form's error can no longer
 *  appear under another's. */
const formError = ref<string | null>(null)

const listError = computed(() => (loadError.value ? getErrorMessage(loadError.value) : null))

const BLANK_STAFF = { username: '', password: '', fullName: '', phone: '', role: 'admin' as AdminRole }
const newStaff = ref({ ...BLANK_STAFF })

/**
 * Which row is expanded and what for. One at a time: two open editors side by
 * side in a list of accounts is an easy way to change the wrong person's password.
 */
const openRow = ref<{ id: string; mode: 'profile' | 'password' } | null>(null)
const resetPassword = ref('')
const profileDraft = ref({ fullName: '', phone: '' })

const ROLE_LABEL: Record<AdminRole, string> = {
  superadmin: 'مدير عام',
  admin: 'موظف',
}

const PHONE_PATTERN = /^\+?[0-9]{8,15}$/

const activeCount = computed(() => staff.value.filter((member) => member.isActive).length)

function isSelf(member: Admin): boolean {
  return member.username === authStore.username
}

function isOpen(id: string, mode: 'profile' | 'password'): boolean {
  return openRow.value?.id === id && openRow.value.mode === mode
}

function toggleRow(member: Admin, mode: 'profile' | 'password') {
  formError.value = null
  if (isOpen(member._id, mode)) {
    openRow.value = null
    return
  }
  openRow.value = { id: member._id, mode }
  resetPassword.value = ''
  profileDraft.value = { fullName: member.fullName ?? '', phone: member.phone ?? '' }
}

function toggleAddForm() {
  showAddForm.value = !showAddForm.value
  formError.value = null
}

async function submitNewStaff() {
  formError.value = null
  const { username, password, fullName, phone } = newStaff.value

  if (!/^[a-z0-9._-]{3,32}$/.test(username.trim().toLowerCase())) {
    formError.value = 'اسم المستخدم: 3-32 حرفًا إنجليزيًا أو رقمًا، بدون مسافات.'
    return
  }
  if (password.length < 8) {
    formError.value = 'كلمة المرور يجب أن تكون 8 أحرف على الأقل.'
    return
  }
  if (phone.trim() && !PHONE_PATTERN.test(phone.trim())) {
    formError.value = 'رقم الهاتف غير صالح.'
    return
  }

  isSubmitting.value = true
  try {
    await createStaff.mutateAsync({
      username: username.trim().toLowerCase(),
      password,
      fullName: fullName.trim(),
      phone: phone.trim(),
      role: newStaff.value.role,
    })
    newStaff.value = { ...BLANK_STAFF }
    showAddForm.value = false
  } catch (err) {
    formError.value = getErrorMessage(err)
  } finally {
    isSubmitting.value = false
  }
}

async function submitProfile(id: string) {
  formError.value = null
  const phone = profileDraft.value.phone.trim()
  if (phone && !PHONE_PATTERN.test(phone)) {
    formError.value = 'رقم الهاتف غير صالح.'
    return
  }

  isSubmitting.value = true
  try {
    await updateProfile.mutateAsync({
      id,
      patch: { fullName: profileDraft.value.fullName.trim(), phone },
    })
    openRow.value = null
  } catch (err) {
    formError.value = getErrorMessage(err)
  } finally {
    isSubmitting.value = false
  }
}

async function submitReset(id: string) {
  formError.value = null
  if (resetPassword.value.length < 8) {
    formError.value = 'كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل.'
    return
  }
  isSubmitting.value = true
  try {
    await resetStaffPassword.mutateAsync({ id, password: resetPassword.value })
    openRow.value = null
    resetPassword.value = ''
  } catch (err) {
    formError.value = getErrorMessage(err)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <section>
    <div class="flex flex-wrap items-end justify-between gap-3">
      <p class="text-sm text-chalk-400">
        <span class="font-bold tabular-nums text-chalk-50">{{ activeCount }}</span>
        نشط من
        <span class="font-bold tabular-nums text-chalk-50">{{ staff.length }}</span>
        حساب. المدير العام وحده يضيف الحسابات أو يوقفها.
      </p>
      <button
        type="button"
        class="rounded-md border border-turf-600 px-4 py-2 text-sm font-medium transition-colors cursor-pointer"
        :class="showAddForm ? 'bg-grass-500 text-turf-950' : 'text-chalk-300 hover:text-chalk-50'"
        @click="toggleAddForm"
      >
        {{ showAddForm ? 'إلغاء' : '+ إضافة موظف' }}
      </button>
    </div>

    <form
      v-if="showAddForm"
      class="mt-4 space-y-4 rounded-lg border border-grass-500/30 bg-turf-900 p-4 sm:p-5"
      novalidate
      @submit.prevent="submitNewStaff"
    >
      <div class="grid gap-4 sm:grid-cols-2">
        <div class="space-y-1.5">
          <label for="newFullName" class="block text-sm font-medium text-chalk-300">الاسم</label>
          <input
            id="newFullName"
            v-model="newStaff.fullName"
            type="text"
            autocomplete="off"
            placeholder="مثال: أحمد سيد"
            class="w-full rounded-md border border-turf-600 bg-turf-950 px-3 py-2 text-chalk-50 placeholder:text-chalk-600 focus-visible:border-grass-400"
          />
        </div>
        <div class="space-y-1.5">
          <label for="newStaffPhone" class="block text-sm font-medium text-chalk-300">
            رقم الهاتف
          </label>
          <input
            id="newStaffPhone"
            v-model="newStaff.phone"
            type="tel"
            dir="ltr"
            autocomplete="off"
            placeholder="01012345678"
            class="w-full rounded-md border border-turf-600 bg-turf-950 px-3 py-2 text-end text-chalk-50 placeholder:text-chalk-600 focus-visible:border-grass-400"
          />
        </div>
        <div class="space-y-1.5">
          <label for="newUsername" class="block text-sm font-medium text-chalk-300">
            اسم المستخدم
          </label>
          <input
            id="newUsername"
            v-model="newStaff.username"
            type="text"
            dir="ltr"
            autocomplete="off"
            placeholder="ahmed"
            class="w-full rounded-md border border-turf-600 bg-turf-950 px-3 py-2 text-end font-mono text-chalk-50 placeholder:text-chalk-600 focus-visible:border-grass-400"
          />
        </div>
        <div class="space-y-1.5">
          <label for="newPassword" class="block text-sm font-medium text-chalk-300">
            كلمة المرور
          </label>
          <input
            id="newPassword"
            v-model="newStaff.password"
            type="password"
            dir="ltr"
            autocomplete="new-password"
            class="w-full rounded-md border border-turf-600 bg-turf-950 px-3 py-2 text-end text-chalk-50 focus-visible:border-grass-400"
          />
        </div>
      </div>

      <fieldset class="space-y-2">
        <legend class="text-sm font-medium text-chalk-300">الصلاحية</legend>
        <div class="flex flex-wrap gap-2">
          <label
            v-for="option in ['admin', 'superadmin'] as AdminRole[]"
            :key="option"
            class="cursor-pointer rounded-md border px-4 py-2 text-sm transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-grass-400"
            :class="
              newStaff.role === option
                ? 'border-grass-400 bg-grass-500/15 text-chalk-50'
                : 'border-turf-600 text-chalk-400 hover:text-chalk-50'
            "
          >
            <input v-model="newStaff.role" type="radio" :value="option" class="sr-only" />
            {{ ROLE_LABEL[option] }}
          </label>
        </div>
        <p class="text-xs text-chalk-600">
          الموظف يدير الحجوزات فقط. المدير العام يدير الحجوزات والموظفين والأسعار.
        </p>
      </fieldset>

      <p v-if="formError" class="rounded-md bg-card-red-dim/40 px-3 py-2 text-sm text-card-red">
        {{ formError }}
      </p>

      <button
        type="submit"
        :disabled="isSubmitting"
        class="inline-flex items-center justify-center rounded-md bg-grass-500 px-5 py-2.5 font-medium text-turf-950 transition-colors hover:bg-grass-400 disabled:opacity-60 cursor-pointer"
      >
        {{ isSubmitting ? 'جارٍ الإضافة…' : 'إضافة الموظف' }}
      </button>
    </form>

    <p
      v-if="listError && !showAddForm && !openRow"
      class="mt-4 rounded-md bg-card-red-dim/40 px-4 py-3 text-sm text-card-red"
    >
      {{ listError }}
    </p>

    <div v-if="isPending" class="mt-6 space-y-2" aria-hidden="true">
      <div v-for="n in 3" :key="n" class="h-24 rounded-lg bg-turf-800/60 animate-pulse" />
    </div>

    <ul v-else class="mt-6 space-y-2">
      <li
        v-for="member in staff"
        :key="member._id"
        class="overflow-hidden rounded-lg border"
        :class="
          member.isActive
            ? 'border-turf-700/60 bg-turf-900'
            : 'border-turf-800 bg-turf-950/50'
        "
      >
        <!-- Stacks on a phone and only lines up side by side once there is room
             for all three groups; `basis-full` on identity keeps a long name
             from crushing the figures beside it. -->
        <div class="flex flex-wrap items-start gap-x-5 gap-y-3 px-4 py-4">
          <!-- Identity -->
          <div class="min-w-0 basis-full lg:basis-auto lg:flex-1">
            <p class="flex flex-wrap items-center gap-2">
              <span
                class="truncate font-bold"
                :class="member.isActive ? 'text-chalk-50' : 'text-chalk-400'"
              >
                {{ member.fullName || member.username }}
              </span>
              <span v-if="isSelf(member)" class="text-[11px] text-chalk-600">(أنت)</span>
              <span
                class="rounded px-2 py-0.5 text-[10px] font-semibold"
                :class="
                  member.isActive
                    ? 'bg-turf-700 text-chalk-300'
                    : 'bg-card-red-dim/50 text-card-red'
                "
              >
                {{ member.isActive ? 'نشط' : 'موقوف' }}
              </span>
            </p>
            <p class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <span class="font-mono text-chalk-400 ltr-embed">{{ member.username }}</span>
              <span
                :class="member.role === 'superadmin' ? 'text-grass-400' : 'text-chalk-400'"
              >
                {{ ROLE_LABEL[member.role] }}
              </span>
              <span v-if="member.phone" class="font-mono text-chalk-400 ltr-embed">
                {{ member.phone }}
              </span>
              <span v-else class="text-chalk-600">بدون رقم هاتف</span>
            </p>
          </div>

          <!-- What this account has done. Zeroes are shown rather than hidden:
               "no walk-ins recorded" is itself worth knowing about a shift. -->
          <dl class="flex flex-wrap gap-x-5 gap-y-2 text-xs">
            <div>
              <dd class="font-mono text-base font-semibold tabular-nums text-chalk-50">
                {{ member.manualBookings }}
              </dd>
              <dt class="text-chalk-600">حجز حضوري</dt>
            </div>
            <div>
              <dd class="font-mono text-base font-semibold tabular-nums text-chalk-50">
                {{ member.blockedSlots }}
              </dd>
              <dt class="text-chalk-600">إغلاق</dt>
            </div>
            <div class="max-w-full sm:max-w-40">
              <dd class="text-sm text-chalk-300">
                {{ member.lastLoginAt ? formatArabicDateTime(member.lastLoginAt) : 'لم يدخل بعد' }}
              </dd>
              <dt class="text-chalk-600">آخر دخول</dt>
            </div>
          </dl>

          <!-- Self-targeting role and status actions are hidden, not just
               rejected: the server refuses them anyway, but offering them at
               all reads as a trap. Editing your own details is fine. -->
          <div class="flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] font-semibold">
            <button
              type="button"
              class="text-chalk-400 transition-colors hover:text-chalk-50 cursor-pointer"
              @click="toggleRow(member, 'profile')"
            >
              تعديل البيانات
            </button>
            <template v-if="!isSelf(member)">
              <button
                type="button"
                class="text-chalk-400 transition-colors hover:text-chalk-50 cursor-pointer"
                @click="toggleRow(member, 'password')"
              >
                كلمة المرور
              </button>
              <button
                type="button"
                class="text-chalk-400 transition-colors hover:text-chalk-50 cursor-pointer"
                @click="
                  setRole.mutate({
                    id: member._id,
                    role: member.role === 'superadmin' ? 'admin' : 'superadmin',
                  })
                "
              >
                {{ member.role === 'superadmin' ? 'خفض لموظف' : 'ترقية لمدير عام' }}
              </button>
              <button
                type="button"
                class="transition-colors cursor-pointer"
                :class="
                  member.isActive
                    ? 'text-card-red hover:text-card-red/80'
                    : 'text-grass-400 hover:text-grass-500'
                "
                @click="setActive.mutate({ id: member._id, isActive: !member.isActive })"
              >
                {{ member.isActive ? 'إيقاف' : 'تفعيل' }}
              </button>
            </template>
          </div>
        </div>

        <form
          v-if="isOpen(member._id, 'profile')"
          class="border-t border-turf-700/60 bg-turf-950/40 px-4 py-4"
          novalidate
          @submit.prevent="submitProfile(member._id)"
        >
          <div class="grid gap-3 sm:grid-cols-2">
            <div class="space-y-1.5">
              <label
                :for="`fullName-${member._id}`"
                class="block text-xs font-medium text-chalk-400"
              >
                الاسم
              </label>
              <input
                :id="`fullName-${member._id}`"
                v-model="profileDraft.fullName"
                type="text"
                class="w-full rounded-md border border-turf-600 bg-turf-950 px-3 py-2 text-sm text-chalk-50 focus-visible:border-grass-400"
              />
            </div>
            <div class="space-y-1.5">
              <label :for="`phone-${member._id}`" class="block text-xs font-medium text-chalk-400">
                رقم الهاتف
              </label>
              <input
                :id="`phone-${member._id}`"
                v-model="profileDraft.phone"
                type="tel"
                dir="ltr"
                class="w-full rounded-md border border-turf-600 bg-turf-950 px-3 py-2 text-end text-sm text-chalk-50 focus-visible:border-grass-400"
              />
            </div>
          </div>
          <p v-if="formError" class="mt-3 text-xs text-card-red">{{ formError }}</p>
          <div class="mt-3 flex items-center gap-3">
            <button
              type="submit"
              :disabled="isSubmitting"
              class="rounded-md bg-grass-500 px-4 py-2 text-sm font-medium text-turf-950 transition-colors hover:bg-grass-400 disabled:opacity-60 cursor-pointer"
            >
              حفظ البيانات
            </button>
            <button
              type="button"
              class="text-sm text-chalk-400 transition-colors hover:text-chalk-50 cursor-pointer"
              @click="openRow = null"
            >
              إلغاء
            </button>
          </div>
        </form>

        <form
          v-else-if="isOpen(member._id, 'password')"
          class="border-t border-turf-700/60 bg-turf-950/40 px-4 py-4"
          novalidate
          @submit.prevent="submitReset(member._id)"
        >
          <label
            :for="`reset-${member._id}`"
            class="block text-xs font-medium text-chalk-400"
          >
            كلمة مرور جديدة لـ {{ member.fullName || member.username }}
          </label>
          <div class="mt-1.5 flex flex-wrap items-center gap-2">
            <input
              :id="`reset-${member._id}`"
              v-model="resetPassword"
              type="password"
              dir="ltr"
              autocomplete="new-password"
              class="min-w-0 flex-1 rounded-md border border-turf-600 bg-turf-950 px-3 py-2 text-end text-sm text-chalk-50 focus-visible:border-grass-400"
            />
            <button
              type="submit"
              :disabled="isSubmitting"
              class="rounded-md bg-grass-500 px-4 py-2 text-sm font-medium text-turf-950 transition-colors hover:bg-grass-400 disabled:opacity-60 cursor-pointer"
            >
              حفظ
            </button>
            <button
              type="button"
              class="px-2 py-2 text-sm text-chalk-400 transition-colors hover:text-chalk-50 cursor-pointer"
              @click="openRow = null"
            >
              إلغاء
            </button>
          </div>
          <p v-if="formError" class="mt-2 text-xs text-card-red">{{ formError }}</p>
        </form>
      </li>
    </ul>
  </section>
</template>
