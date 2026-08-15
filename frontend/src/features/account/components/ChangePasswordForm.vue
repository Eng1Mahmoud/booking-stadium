<script setup lang="ts">
import { computed, ref } from 'vue'
import { useChangeOwnPassword } from '@/features/staff/queries/mutations'
import { useSubmit } from '@/shared/composables/useSubmit'
import { changePasswordSchema } from '@/features/staff/schemas/staff'

defineProps<{ username: string | null }>()

const changeOwnPassword = useChangeOwnPassword()
const { isSubmitting, error, submit } = useSubmit(changePasswordSchema)

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const touched = ref(false)
const succeeded = ref(false)

const values = computed(() => ({
  currentPassword: currentPassword.value,
  newPassword: newPassword.value,
  confirmPassword: confirmPassword.value,
}))

const parsed = computed(() => changePasswordSchema.safeParse(values.value))
const isValid = computed(() => parsed.value.success)

/**
 * One schema drives the three fields. `touched` only decides *when* a message
 * appears — an empty form shouldn't open covered in red — which is a question
 * the schema has no opinion about.
 */
function fieldError(name: 'currentPassword' | 'newPassword' | 'confirmPassword') {
  if (!touched.value || parsed.value.success) return null
  return parsed.value.error.flatten().fieldErrors[name]?.[0] ?? null
}

async function handleSubmit() {
  touched.value = true
  succeeded.value = false

  const ok = await submit(values.value, ({ currentPassword: current, newPassword: next }) =>
    changeOwnPassword.mutateAsync({ currentPassword: current, newPassword: next }),
  )

  if (ok) {
    succeeded.value = true
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    touched.value = false
  }
}
</script>

<template>
  <form
    class="rounded-lg border border-turf-700/60 bg-turf-900 p-4 sm:p-6"
    novalidate
    @submit.prevent="handleSubmit"
  >
    <h2 class="font-display text-xl font-black text-chalk-50">كلمة المرور</h2>
    <p class="mt-1.5 text-sm text-chalk-400">
      تحتاج كلمة المرور الحالية للتأكيد. ستظل مسجّل الدخول بعد التغيير.
    </p>

    <!-- Lets a password manager attach the change to the right account. -->
    <input
      type="text"
      autocomplete="username"
      :value="username ?? ''"
      readonly
      tabindex="-1"
      class="sr-only"
      aria-hidden="true"
    />

    <div class="mt-5 space-y-4">
      <div class="space-y-1.5">
        <label for="currentPassword" class="block text-sm font-medium text-chalk-300">
          كلمة المرور الحالية
        </label>
        <input
          id="currentPassword"
          v-model="currentPassword"
          type="password"
          dir="ltr"
          autocomplete="current-password"
          class="w-full rounded-md border border-turf-600 bg-turf-950 px-3 py-2.5 text-end text-chalk-50 focus-visible:border-grass-400"
          :aria-invalid="Boolean(fieldError('currentPassword'))"
          @blur="touched = true"
        />
        <p v-if="fieldError('currentPassword')" class="text-xs text-card-red">{{ fieldError('currentPassword') }}</p>
      </div>

      <div class="space-y-1.5">
        <label for="newPassword" class="block text-sm font-medium text-chalk-300">
          كلمة المرور الجديدة
        </label>
        <input
          id="newPassword"
          v-model="newPassword"
          type="password"
          dir="ltr"
          autocomplete="new-password"
          class="w-full rounded-md border border-turf-600 bg-turf-950 px-3 py-2.5 text-end text-chalk-50 focus-visible:border-grass-400"
          :aria-invalid="Boolean(fieldError('newPassword'))"
          @blur="touched = true"
        />
        <p v-if="fieldError('newPassword')" class="text-xs text-card-red">{{ fieldError('newPassword') }}</p>
      </div>

      <div class="space-y-1.5">
        <label for="confirmPassword" class="block text-sm font-medium text-chalk-300">
          تأكيد كلمة المرور الجديدة
        </label>
        <input
          id="confirmPassword"
          v-model="confirmPassword"
          type="password"
          dir="ltr"
          autocomplete="new-password"
          class="w-full rounded-md border border-turf-600 bg-turf-950 px-3 py-2.5 text-end text-chalk-50 focus-visible:border-grass-400"
          :aria-invalid="Boolean(fieldError('confirmPassword'))"
          @blur="touched = true"
        />
        <p v-if="fieldError('confirmPassword')" class="text-xs text-card-red">{{ fieldError('confirmPassword') }}</p>
      </div>
    </div>

    <p v-if="error" class="mt-4 rounded-md bg-card-red-dim/40 px-3 py-2 text-sm text-card-red">
      {{ error }}
    </p>
    <p v-else-if="succeeded" class="mt-4 text-sm text-grass-400">تم تغيير كلمة المرور.</p>

    <button
      type="submit"
      :disabled="isSubmitting || (touched && !isValid)"
      class="mt-5 inline-flex items-center justify-center rounded-md bg-grass-500 px-5 py-2.5 font-medium text-turf-950 transition-colors hover:bg-grass-400 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
    >
      {{ isSubmitting ? 'جارٍ الحفظ…' : 'حفظ كلمة المرور' }}
    </button>
  </form>
</template>
