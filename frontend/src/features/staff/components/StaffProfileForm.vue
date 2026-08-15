<script setup lang="ts">
import { ref } from 'vue'
import { useUpdateStaffProfile } from '@/features/staff/queries/mutations'
import { useSubmit } from '@/shared/composables/useSubmit'
import { staffProfileSchema } from '@/features/staff/schemas/staff'
import type { Admin } from '@/features/staff/types'

const props = defineProps<{ member: Admin }>()
const emit = defineEmits<{ done: []; cancel: [] }>()

const updateProfile = useUpdateStaffProfile()
const { isSubmitting, error, submit } = useSubmit(staffProfileSchema)

const draft = ref({
  fullName: props.member.fullName ?? '',
  phone: props.member.phone ?? '',
})

async function save() {
  const ok = await submit(draft.value, (patch) =>
    updateProfile.mutateAsync({ id: props.member._id, patch }),
  )
  if (ok) emit('done')
}
</script>

<template>
  <form
    class="border-t border-turf-700/60 bg-turf-950/40 px-4 py-4"
    novalidate
    @submit.prevent="save"
  >
    <div class="grid gap-3 sm:grid-cols-2">
      <div class="space-y-1.5">
        <label :for="`fullName-${member._id}`" class="block text-xs font-medium text-chalk-400">
          الاسم
        </label>
        <input
          :id="`fullName-${member._id}`"
          v-model="draft.fullName"
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
          v-model="draft.phone"
          type="tel"
          dir="ltr"
          class="w-full rounded-md border border-turf-600 bg-turf-950 px-3 py-2 text-end text-sm text-chalk-50 focus-visible:border-grass-400"
        />
      </div>
    </div>
    <p v-if="error" class="mt-3 text-xs text-card-red">{{ error }}</p>
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
        @click="emit('cancel')"
      >
        إلغاء
      </button>
    </div>
  </form>
</template>
