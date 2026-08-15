<script setup lang="ts">
import { ref } from 'vue'
import { useCreateStaff } from '@/features/staff/queries/mutations'
import { useSubmit } from '@/shared/composables/useSubmit'
import { createStaffSchema } from '@/features/staff/schemas/staff'
import { ROLE_LABEL } from '@/shared/labels'
import type { AdminRole } from '@/shared/types'

const emit = defineEmits<{ created: [] }>()

const createStaff = useCreateStaff()
const { isSubmitting, error, submit } = useSubmit(createStaffSchema)

const BLANK = {
  username: '',
  password: '',
  fullName: '',
  phone: '',
  role: 'admin' as AdminRole,
}
const draft = ref({ ...BLANK })

async function save() {
  // The schema trims and lowercases, and `submit` passes what it produced — so
  // the server receives exactly what was validated.
  const ok = await submit(draft.value, (input) => createStaff.mutateAsync(input))

  if (ok) {
    draft.value = { ...BLANK }
    emit('created')
  }
}
</script>

<template>
  <form
    class="mt-4 space-y-4 rounded-lg border border-grass-500/30 bg-turf-900 p-4 sm:p-5"
    novalidate
    @submit.prevent="save"
  >
    <div class="grid gap-4 sm:grid-cols-2">
      <div class="space-y-1.5">
        <label for="newFullName" class="block text-sm font-medium text-chalk-300">الاسم</label>
        <input
          id="newFullName"
          v-model="draft.fullName"
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
          v-model="draft.phone"
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
          v-model="draft.username"
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
          v-model="draft.password"
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
            draft.role === option
              ? 'border-grass-400 bg-grass-500/15 text-chalk-50'
              : 'border-turf-600 text-chalk-400 hover:text-chalk-50'
          "
        >
          <input v-model="draft.role" type="radio" :value="option" class="sr-only" />
          {{ ROLE_LABEL[option] }}
        </label>
      </div>
      <p class="text-xs text-chalk-600">
        الموظف يدير الحجوزات فقط. المدير العام يدير الحجوزات والموظفين والأسعار.
      </p>
    </fieldset>

    <p v-if="error" class="rounded-md bg-card-red-dim/40 px-3 py-2 text-sm text-card-red">
      {{ error }}
    </p>

    <button
      type="submit"
      :disabled="isSubmitting"
      class="inline-flex items-center justify-center rounded-md bg-grass-500 px-5 py-2.5 font-medium text-turf-950 transition-colors hover:bg-grass-400 disabled:opacity-60 cursor-pointer"
    >
      {{ isSubmitting ? 'جارٍ الإضافة…' : 'إضافة الموظف' }}
    </button>
  </form>
</template>
