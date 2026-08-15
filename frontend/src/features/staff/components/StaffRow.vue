<script setup lang="ts">
import { computed } from 'vue'
import StaffProfileForm from './StaffProfileForm.vue'
import StaffPasswordForm from './StaffPasswordForm.vue'
import { useSetStaffActive, useSetStaffRole } from '@/features/staff/queries/mutations'
import { formatArabicDateTime } from '@/shared/utils/date'
import { ROLE_LABEL } from '@/shared/labels'
import type { Admin } from '@/features/staff/types'

const props = defineProps<{
  member: Admin
  /** Whose account this is, so the row can mark it and hide self-targeting actions. */
  currentUsername: string | null
  /** Which editor the list has opened on this row, if any. */
  openMode: 'profile' | 'password' | null
}>()

const emit = defineEmits<{ toggle: [mode: 'profile' | 'password']; close: [] }>()

const setRole = useSetStaffRole()
const setActive = useSetStaffActive()

const isSelf = computed(() => props.member.username === props.currentUsername)
</script>

<template>
  <li
    class="overflow-hidden rounded-lg border"
    :class="member.isActive ? 'border-turf-700/60 bg-turf-900' : 'border-turf-800 bg-turf-950/50'"
  >
    <!-- Stacks on a phone and only lines up side by side once there is room
         for all three groups; `basis-full` on identity keeps a long name
         from crushing the figures beside it. -->
    <div class="flex flex-wrap items-start gap-x-5 gap-y-3 px-4 py-4">
      <div class="min-w-0 basis-full lg:basis-auto lg:flex-1">
        <p class="flex flex-wrap items-center gap-2">
          <span
            class="truncate font-bold"
            :class="member.isActive ? 'text-chalk-50' : 'text-chalk-400'"
          >
            {{ member.fullName || member.username }}
          </span>
          <span v-if="isSelf" class="text-[11px] text-chalk-600">(أنت)</span>
          <span
            class="rounded px-2 py-0.5 text-[10px] font-semibold"
            :class="
              member.isActive ? 'bg-turf-700 text-chalk-300' : 'bg-card-red-dim/50 text-card-red'
            "
          >
            {{ member.isActive ? 'نشط' : 'موقوف' }}
          </span>
        </p>
        <p class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span class="font-mono text-chalk-400 ltr-embed">{{ member.username }}</span>
          <span :class="member.role === 'superadmin' ? 'text-grass-400' : 'text-chalk-400'">
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
          @click="emit('toggle', 'profile')"
        >
          تعديل البيانات
        </button>
        <template v-if="!isSelf">
          <button
            type="button"
            class="text-chalk-400 transition-colors hover:text-chalk-50 cursor-pointer"
            @click="emit('toggle', 'password')"
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

    <StaffProfileForm
      v-if="openMode === 'profile'"
      :member="member"
      @done="emit('close')"
      @cancel="emit('close')"
    />
    <StaffPasswordForm
      v-else-if="openMode === 'password'"
      :member="member"
      @done="emit('close')"
      @cancel="emit('close')"
    />
  </li>
</template>
