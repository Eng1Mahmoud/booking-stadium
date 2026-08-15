<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  /** Already-formatted range, e.g. "11:00 م – 1:00 ص". */
  rangeLabel: string
  date: string
  submitting: boolean
  serverError: string | null
}>()

const emit = defineEmits<{
  confirm: [payload: { playerName: string; playerPhone: string }]
  cancel: []
}>()

const playerName = ref('')
const playerPhone = ref('')
const touched = ref(false)

// Reset the form whenever a different range is selected.
watch(
  () => props.rangeLabel,
  () => {
    playerName.value = ''
    playerPhone.value = ''
    touched.value = false
  },
)

const nameError = computed(() => {
  const value = playerName.value.trim()
  if (!touched.value) return null
  if (value.length < 2) return 'اكتب اسمك — حرفان على الأقل.'
  return null
})

const phoneError = computed(() => {
  const value = playerPhone.value.trim()
  if (!touched.value) return null
  if (!/^\+?[0-9]{8,15}$/.test(value))
    return 'أدخل رقم هاتف صحيح حتى نتمكن من التواصل معك عند الحاجة.'
  return null
})

const isValid = computed(
  () => playerName.value.trim().length >= 2 && /^\+?[0-9]{8,15}$/.test(playerPhone.value.trim()),
)

function handleSubmit() {
  touched.value = true
  if (!isValid.value) return
  emit('confirm', { playerName: playerName.value.trim(), playerPhone: playerPhone.value.trim() })
}
</script>

<template>
  <form
    class="rounded-md border border-grass-500/30 bg-turf-900 p-4 space-y-4 sm:p-5"
    novalidate
    @submit.prevent="handleSubmit"
  >
    <div class="flex items-baseline justify-between">
      <p class="text-xs font-semibold text-grass-400">تأكيد الحجز</p>
      <p class="text-sm tabular-nums text-chalk-300">{{ date }} &middot; {{ rangeLabel }}</p>
    </div>

    <div class="space-y-1.5">
      <label for="playerName" class="block text-sm font-medium text-chalk-300">اسمك</label>
      <input
        id="playerName"
        v-model="playerName"
        type="text"
        autocomplete="name"
        placeholder="مثال: محمود عباس"
        class="w-full rounded-md border border-turf-600 bg-turf-950 px-3 py-2.5 text-chalk-50 placeholder:text-chalk-600 focus-visible:border-grass-400"
        :aria-invalid="Boolean(nameError)"
        @blur="touched = true"
      />
      <p v-if="nameError" class="text-xs text-card-red">{{ nameError }}</p>
    </div>

    <div class="space-y-1.5">
      <label for="playerPhone" class="block text-sm font-medium text-chalk-300">رقم الهاتف</label>
      <input
        id="playerPhone"
        v-model="playerPhone"
        type="tel"
        dir="ltr"
        autocomplete="tel"
        placeholder="مثال: 01012345678"
        class="w-full rounded-md border border-turf-600 bg-turf-950 px-3 py-2.5 text-end text-chalk-50 placeholder:text-chalk-600 focus-visible:border-grass-400"
        :aria-invalid="Boolean(phoneError)"
        @blur="touched = true"
      />
      <p v-if="phoneError" class="text-xs text-card-red">{{ phoneError }}</p>
    </div>

    <p v-if="serverError" class="rounded-md bg-card-red-dim/40 px-3 py-2 text-sm text-card-red">
      {{ serverError }}
    </p>

    <div class="flex items-center gap-3 pt-1">
      <button
        type="submit"
        :disabled="submitting"
        class="inline-flex items-center justify-center rounded-md bg-grass-500 px-5 py-2.5 font-medium text-turf-950 transition-colors hover:bg-grass-400 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
      >
        {{ submitting ? 'جارٍ الحجز…' : 'تأكيد الحجز' }}
      </button>
      <button
        type="button"
        class="text-sm text-chalk-400 hover:text-chalk-50 transition-colors cursor-pointer"
        @click="emit('cancel')"
      >
        إلغاء
      </button>
    </div>
  </form>
</template>
