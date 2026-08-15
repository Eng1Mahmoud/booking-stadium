<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '@/features/auth/store'
import { useUpdateOwnProfile } from '@/features/staff/queries/mutations'
import { useSubmit } from '@/shared/composables/useSubmit'
import { staffProfileSchema } from '@/features/staff/schemas/staff'

const authStore = useAuthStore()
const updateOwnProfile = useUpdateOwnProfile()
const { isSubmitting, error, submit } = useSubmit(staffProfileSchema)

const profile = ref({ fullName: '', phone: '' })
const saved = ref(false)

const isDirty = computed(
  () =>
    profile.value.fullName.trim() !== (authStore.fullName ?? '') ||
    profile.value.phone.trim() !== (authStore.phone ?? ''),
)

async function save() {
  saved.value = false

  await submit(profile.value, async (patch) => {
    await updateOwnProfile.mutateAsync(patch)
    // Keeps the header's greeting in step without a round trip.
    authStore.setProfile(patch)
    saved.value = true
  })
}

onMounted(() => {
  profile.value = { fullName: authStore.fullName ?? '', phone: authStore.phone ?? '' }
})
</script>

<template>
  <form
    class="rounded-lg border border-turf-700/60 bg-turf-900 p-4 sm:p-6"
    novalidate
    @submit.prevent="save"
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
        <label for="myPhone" class="block text-sm font-medium text-chalk-300">رقم الهاتف</label>
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

    <p v-if="error" class="mt-4 text-sm text-card-red">{{ error }}</p>
    <p v-else-if="saved" class="mt-4 text-sm text-grass-400">تم حفظ بياناتك.</p>

    <button
      type="submit"
      :disabled="isSubmitting || !isDirty"
      class="mt-5 inline-flex items-center justify-center rounded-md bg-grass-500 px-5 py-2.5 font-medium text-turf-950 transition-colors hover:bg-grass-400 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
    >
      {{ isSubmitting ? 'جارٍ الحفظ…' : 'حفظ البيانات' }}
    </button>
  </form>
</template>
