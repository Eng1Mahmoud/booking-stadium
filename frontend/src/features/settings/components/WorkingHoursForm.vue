<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useUpdateSettings } from '@/features/settings/queries/mutations'
import { useSubmit } from '@/shared/composables/useSubmit'
import { workingHoursSchema } from '@/features/settings/schemas/settings'
import {
  MINUTES_PER_DAY,
  SLOT_MINUTES,
  formatDuration,
  formatTime12h,
  toMinutes,
  toTimeString,
} from '@/shared/utils/time'
import type { SiteConfig } from '@/shared/types'

const props = defineProps<{ saved: SiteConfig | undefined }>()

const saveSettings = useUpdateSettings()
const { isSubmitting, error, submit, reset: clearError } = useSubmit(workingHoursSchema)

const opensDraft = ref('')
const closesDraft = ref('')
const message = ref<string | null>(null)

/** "24:00" is a closing time only — it means midnight ending the day, which
 *  "00:00" would read as opening it. */
const gridTimes = Array.from({ length: MINUTES_PER_DAY / SLOT_MINUTES }, (_, i) =>
  toTimeString(i * SLOT_MINUTES),
)
const openOptions = gridTimes
const closeOptions = [...gridTimes.slice(1), '24:00']

const isDirty = computed(
  () =>
    !!props.saved &&
    (opensDraft.value !== props.saved.opensAt || closesDraft.value !== props.saved.closesAt),
)

const isValid = computed(
  () =>
    workingHoursSchema.safeParse({ opensAt: opensDraft.value, closesAt: closesDraft.value })
      .success,
)

const openMinutes = computed(() => {
  const open = toMinutes(opensDraft.value || '00:00')
  const close = toMinutes(closesDraft.value || '24:00')
  return close > open ? close - open : MINUTES_PER_DAY - open + close
})

const wrapsMidnight = computed(
  () => toMinutes(closesDraft.value || '24:00') <= toMinutes(opensDraft.value || '00:00'),
)

const isAlwaysOpen = computed(() => openMinutes.value >= MINUTES_PER_DAY)

/** What the owner is actually shutting. */
const closedLabel = computed(() =>
  isAlwaysOpen.value
    ? ''
    : `${formatTime12h(closesDraft.value)} إلى ${formatTime12h(opensDraft.value)}`,
)

function reset() {
  opensDraft.value = props.saved?.opensAt ?? '00:00'
  closesDraft.value = props.saved?.closesAt ?? '24:00'
  message.value = null
  clearError()
}

async function save() {
  if (!isValid.value) return
  message.value = null

  const ok = await submit(
    { opensAt: opensDraft.value, closesAt: closesDraft.value },
    (input) => saveSettings.mutateAsync(input),
  )
  if (ok) message.value = 'تم حفظ مواعيد العمل.'
}

// The drafts seed from the cache, which may arrive after mount.
watch(() => props.saved, reset, { immediate: true })
</script>

<template>
  <form
    class="rounded-lg border border-turf-700/60 bg-turf-900 p-4 sm:p-6 lg:col-span-2"
    novalidate
    @submit.prevent="save"
  >
    <h2 class="font-display text-xl font-black text-chalk-50">مواعيد العمل</h2>
    <p class="mt-1.5 text-sm text-chalk-400">
      تتكرر كل يوم. اللاعبون لا يستطيعون الحجز خارجها، أما الموظفون فيستطيعون تسجيل حجز خارجها
      بالاتفاق.
    </p>

    <div class="mt-5 grid gap-4 sm:grid-cols-2 sm:max-w-md">
      <div class="space-y-1.5">
        <label for="opensAt" class="block text-sm font-medium text-chalk-300">يفتح</label>
        <select
          id="opensAt"
          v-model="opensDraft"
          class="w-full rounded-md border border-turf-600 bg-turf-950 px-3 py-2.5 font-mono text-base tabular-nums text-chalk-50 focus-visible:border-grass-400 cursor-pointer"
        >
          <option v-for="time in openOptions" :key="time" :value="time">
            {{ formatTime12h(time) }}
          </option>
        </select>
      </div>
      <div class="space-y-1.5">
        <label for="closesAt" class="block text-sm font-medium text-chalk-300">يغلق</label>
        <select
          id="closesAt"
          v-model="closesDraft"
          class="w-full rounded-md border border-turf-600 bg-turf-950 px-3 py-2.5 font-mono text-base tabular-nums text-chalk-50 focus-visible:border-grass-400 cursor-pointer"
        >
          <option v-for="time in closeOptions" :key="time" :value="time">
            {{ time === '24:00' ? 'منتصف الليل' : formatTime12h(time) }}
          </option>
        </select>
      </div>
    </div>

    <!-- A wrapping window is hard to picture from two fields alone, so state
         the span and its mirror image before it is saved. -->
    <div class="mt-5 space-y-1.5 border-t border-turf-700/60 pt-4 text-sm">
      <p v-if="!isValid" class="text-card-yellow">اختر وقتين مختلفين للفتح والإغلاق.</p>
      <template v-else>
        <p class="text-chalk-300">
          <span aria-hidden="true">▸</span>
          مفتوح
          <strong class="text-chalk-50">{{ formatDuration(openMinutes) }}</strong>
          يوميًا
          <span v-if="wrapsMidnight && !isAlwaysOpen" class="text-card-yellow">
            · يمتد بعد منتصف الليل
          </span>
        </p>
        <p v-if="isAlwaysOpen" class="text-chalk-400">
          <span aria-hidden="true">▸</span> الملعب مفتوح على مدار الساعة.
        </p>
        <p v-else class="text-chalk-400">
          <span aria-hidden="true">▸</span> مغلق من {{ closedLabel }}
        </p>
      </template>
    </div>

    <p v-if="message" class="mt-4 text-sm text-grass-400">{{ message }}</p>
    <p v-if="error" class="mt-4 rounded-md bg-card-red-dim/40 px-3 py-2 text-sm text-card-red">
      {{ error }}
    </p>

    <div class="mt-5 flex items-center gap-3">
      <button
        type="submit"
        :disabled="isSubmitting || !isValid || !isDirty"
        class="inline-flex items-center justify-center rounded-md bg-grass-500 px-5 py-2.5 font-medium text-turf-950 transition-colors hover:bg-grass-400 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
      >
        {{ isSubmitting ? 'جارٍ الحفظ…' : 'حفظ المواعيد' }}
      </button>
      <button
        v-if="isDirty"
        type="button"
        class="text-sm text-chalk-400 transition-colors hover:text-chalk-50 cursor-pointer"
        @click="reset"
      >
        تراجع
      </button>
    </div>

    <p class="mt-4 text-xs text-chalk-600">
      الحجوزات القائمة خارج المواعيد الجديدة تبقى كما هي — لا يُلغى شيء بأثر رجعي.
    </p>
  </form>
</template>
