<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AdminNav from '@/components/AdminNav.vue'
import { useAuthStore } from '@/stores/authStore'
import { useChangeOwnPassword, useUpdateOwnProfile } from '@/queries/mutations'
import { getErrorMessage } from '@/services/api'

const authStore = useAuthStore()
const updateOwnProfile = useUpdateOwnProfile()
const changeOwnPassword = useChangeOwnPassword()

const ROLE_LABEL = { superadmin: 'مدير عام', admin: 'موظف' } as const
const PHONE_PATTERN = /^\+?[0-9]{8,15}$/

// --- My details ---
const profile = ref({ fullName: '', phone: '' })
const isSavingProfile = ref(false)
const profileSaved = ref(false)
const profileError = ref<string | null>(null)

const profileDirty = computed(
  () =>
    profile.value.fullName.trim() !== (authStore.fullName ?? '') ||
    profile.value.phone.trim() !== (authStore.phone ?? ''),
)

async function saveProfile() {
  profileError.value = null
  profileSaved.value = false

  const phone = profile.value.phone.trim()
  if (phone && !PHONE_PATTERN.test(phone)) {
    profileError.value = 'أدخل رقم هاتف صحيح، أو اترك الحقل فارغًا.'
    return
  }

  const patch = { fullName: profile.value.fullName.trim(), phone }
  isSavingProfile.value = true
  try {
    await updateOwnProfile.mutateAsync(patch)
    // Keeps the header's greeting in step without a round trip.
    authStore.setProfile(patch)
    profileSaved.value = true
  } catch (err) {
    profileError.value = getErrorMessage(err)
  } finally {
    isSavingProfile.value = false
  }
}

// --- Password ---
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const touched = ref(false)
const isSubmitting = ref(false)
const succeeded = ref(false)

const formError = ref<string | null>(null)

const currentError = computed(() => {
  if (!touched.value) return null
  return currentPassword.value.length === 0 ? 'أدخل كلمة المرور الحالية.' : null
})

const newError = computed(() => {
  if (!touched.value) return null
  if (newPassword.value.length < 8) return 'كلمة المرور يجب أن تكون 8 أحرف على الأقل.'
  if (newPassword.value.length > 128) return 'كلمة المرور طويلة جدًا.'
  if (newPassword.value === currentPassword.value) return 'اختر كلمة مرور مختلفة عن الحالية.'
  return null
})

const confirmError = computed(() => {
  if (!touched.value) return null
  return confirmPassword.value !== newPassword.value ? 'كلمتا المرور غير متطابقتين.' : null
})

const isValid = computed(
  () => !currentError.value && !newError.value && !confirmError.value && touched.value,
)

async function handleSubmit() {
  touched.value = true
  formError.value = null
  if (currentError.value || newError.value || confirmError.value) return

  isSubmitting.value = true
  try {
    await changeOwnPassword.mutateAsync({
      currentPassword: currentPassword.value,
      newPassword: newPassword.value,
    })
    succeeded.value = true
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    touched.value = false
  } catch (err) {
    formError.value = getErrorMessage(err)
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => {
  profile.value = { fullName: authStore.fullName ?? '', phone: authStore.phone ?? '' }
})
</script>

<template>
  <section class="mx-auto max-w-6xl px-5 py-8 sm:py-12">
    <p class="text-xs font-semibold text-grass-400">حسابي</p>
    <h1 class="mt-2 font-display text-4xl font-black sm:text-5xl">
      {{ authStore.displayName ?? 'حسابي' }}
    </h1>
    <p v-if="authStore.role" class="mt-2 text-sm text-chalk-400">
      <span class="font-mono ltr-embed">{{ authStore.username }}</span>
      &middot; {{ ROLE_LABEL[authStore.role] }}
    </p>

    <AdminNav class="mt-6" />

    <!-- Two panels side by side: on a laptop this page used to be one short
         column with two thirds of the screen empty beside it. -->
    <div class="mt-8 grid gap-6 lg:grid-cols-2 lg:items-start lg:gap-8">
      <form
        class="rounded-lg border border-turf-700/60 bg-turf-900 p-4 sm:p-6"
        novalidate
        @submit.prevent="saveProfile"
      >
        <h2 class="font-display text-xl font-black text-chalk-50">بياناتي</h2>
        <p class="mt-1.5 text-sm text-chalk-400">
          اسمك يظهر لزملائك في قائمة الموظفين، ورقمك يتيح لهم التواصل معك.
        </p>

        <div class="mt-5 space-y-4">
          <div class="space-y-1.5">
            <label for="fullName" class="block text-sm font-medium text-chalk-300">الاسم</label>
            <input
              id="fullName"
              v-model="profile.fullName"
              type="text"
              autocomplete="name"
              placeholder="مثال: أحمد سيد"
              class="w-full rounded-md border border-turf-600 bg-turf-950 px-3 py-2.5 text-chalk-50 placeholder:text-chalk-600 focus-visible:border-grass-400"
            />
          </div>

          <div class="space-y-1.5">
            <label for="myPhone" class="block text-sm font-medium text-chalk-300">
              رقم الهاتف
            </label>
            <input
              id="myPhone"
              v-model="profile.phone"
              type="tel"
              dir="ltr"
              autocomplete="tel"
              placeholder="01012345678"
              class="w-full rounded-md border border-turf-600 bg-turf-950 px-3 py-2.5 text-end text-chalk-50 placeholder:text-chalk-600 focus-visible:border-grass-400"
            />
          </div>
        </div>

        <p v-if="profileError" class="mt-4 text-sm text-card-red">{{ profileError }}</p>
        <p v-else-if="profileSaved" class="mt-4 text-sm text-grass-400">تم حفظ بياناتك.</p>

        <button
          type="submit"
          :disabled="isSavingProfile || !profileDirty"
          class="mt-5 inline-flex items-center justify-center rounded-md bg-grass-500 px-5 py-2.5 font-medium text-turf-950 transition-colors hover:bg-grass-400 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          {{ isSavingProfile ? 'جارٍ الحفظ…' : 'حفظ البيانات' }}
        </button>
      </form>

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
          :value="authStore.username ?? ''"
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
              :aria-invalid="Boolean(currentError)"
              @blur="touched = true"
            />
            <p v-if="currentError" class="text-xs text-card-red">{{ currentError }}</p>
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
              :aria-invalid="Boolean(newError)"
              @blur="touched = true"
            />
            <p v-if="newError" class="text-xs text-card-red">{{ newError }}</p>
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
              :aria-invalid="Boolean(confirmError)"
              @blur="touched = true"
            />
            <p v-if="confirmError" class="text-xs text-card-red">{{ confirmError }}</p>
          </div>
        </div>

        <p v-if="formError" class="mt-4 rounded-md bg-card-red-dim/40 px-3 py-2 text-sm text-card-red">
          {{ formError }}
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
    </div>
  </section>
</template>
