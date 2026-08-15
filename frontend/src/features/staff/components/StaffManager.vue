<script setup lang="ts">
import { computed, ref, toRef } from 'vue'
import StaffAddForm from '@/features/staff/components/StaffAddForm.vue'
import StaffRow from '@/features/staff/components/StaffRow.vue'
import { useAuthStore } from '@/features/auth/store'
import { useStaff } from '@/features/staff/queries/useStaff'
import { getErrorMessage } from '@/shared/api/client'

const authStore = useAuthStore()

const { data, isPending, error: loadError } = useStaff(toRef(() => authStore.isSuperAdmin))
const staff = computed(() => data.value ?? [])
const listError = computed(() => (loadError.value ? getErrorMessage(loadError.value) : null))

const activeCount = computed(() => staff.value.filter((member) => member.isActive).length)

const showAddForm = ref(false)

/**
 * Which row is expanded and what for. One at a time, and owned here rather than
 * by the row: two open editors side by side in a list of accounts is an easy way
 * to change the wrong person's password.
 */
const openRow = ref<{ id: string; mode: 'profile' | 'password' } | null>(null)

function toggleRow(id: string, mode: 'profile' | 'password') {
  const isOpen = openRow.value?.id === id && openRow.value.mode === mode
  openRow.value = isOpen ? null : { id, mode }
}

function modeFor(id: string) {
  return openRow.value?.id === id ? openRow.value.mode : null
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
        @click="showAddForm = !showAddForm"
      >
        {{ showAddForm ? 'إلغاء' : '+ إضافة موظف' }}
      </button>
    </div>

    <StaffAddForm v-if="showAddForm" @created="showAddForm = false" />

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
      <StaffRow
        v-for="member in staff"
        :key="member._id"
        :member="member"
        :current-username="authStore.username"
        :open-mode="modeFor(member._id)"
        @toggle="toggleRow(member._id, $event)"
        @close="openRow = null"
      />
    </ul>
  </section>
</template>
