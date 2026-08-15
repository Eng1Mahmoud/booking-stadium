<script setup lang="ts">
import { ref } from 'vue'
import { useResetStaffPassword } from '@/features/staff/queries/mutations'
import { useSubmit } from '@/shared/composables/useSubmit'
import { resetPasswordSchema } from '@/features/staff/schemas/staff'
import type { Admin } from '@/features/staff/types'

const props = defineProps<{ member: Admin }>()
const emit = defineEmits<{ done: []; cancel: [] }>()

const resetStaffPassword = useResetStaffPassword()
const { isSubmitting, error, submit } = useSubmit(resetPasswordSchema)

const password = ref('')

async function save() {
  const ok = await submit({ password: password.value }, (input) =>
    resetStaffPassword.mutateAsync({ id: props.member._id, password: input.password }),
  )
  if (ok) {
    password.value = ''
    emit('done')
  }
}
</script>

<template>
  <form
    class="border-t border-turf-700/60 bg-turf-950/40 px-4 py-4"
    novalidate
    @submit.prevent="save"
  >
    <label :for="`reset-${member._id}`" class="block text-xs font-medium text-chalk-400">
      كلمة مرور جديدة لـ {{ member.fullName || member.username }}
    </label>
    <div class="mt-1.5 flex flex-wrap items-center gap-2">
      <input
        :id="`reset-${member._id}`"
        v-model="password"
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
        @click="emit('cancel')"
      >
        إلغاء
      </button>
    </div>
    <p v-if="error" class="mt-2 text-xs text-card-red">{{ error }}</p>
  </form>
</template>
