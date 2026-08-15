<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AdminNav from '@/components/AdminNav.vue'
import { useBookingStore } from '@/stores/bookingStore'
import {
  MINUTES_PER_DAY,
  SLOT_MINUTES,
  formatDuration,
  formatTime12h,
  toMinutes,
  toTimeString,
} from '@/utils/time'
import { formatMoney, priceFor } from '@/utils/money'

const bookingStore = useBookingStore()

const priceDraft = ref<number | null>(null)
const currencyDraft = ref('')
const isSaving = ref(false)
const message = ref<string | null>(null)
const errorMessage = ref<string | null>(null)

const opensDraft = ref('')
const closesDraft = ref('')
const isSavingHours = ref(false)
const hoursMessage = ref<string | null>(null)
const hoursError = ref<string | null>(null)

const saved = computed(() => bookingStore.config)

const isDirty = computed(
  () =>
    saved.value !== null &&
    (priceDraft.value !== saved.value.pricePerHour ||
      currencyDraft.value.trim() !== saved.value.currency),
)

const isValid = computed(
  () =>
    priceDraft.value !== null &&
    Number.isFinite(priceDraft.value) &&
    priceDraft.value >= 0 &&
    currencyDraft.value.trim().length > 0,
)

/** Four common lengths are more use than explaining the formula — the owner
 *  types a number and reads the bill. */
const preview = computed(() => {
  const rate = priceDraft.value ?? 0
  const currency = currencyDraft.value.trim() || saved.value?.currency || ''
  return [60, 90, 120, 180].map((minutes) => ({
    minutes,
    label: formatDuration(minutes),
    amount: formatMoney(priceFor(minutes, rate), currency),
  }))
})

/** "24:00" is a closing time only — it means midnight ending the day, which
 *  "00:00" would read as opening it. */
const gridTimes = Array.from({ length: MINUTES_PER_DAY / SLOT_MINUTES }, (_, i) =>
  toTimeString(i * SLOT_MINUTES),
)
const openOptions = gridTimes
const closeOptions = [...gridTimes.slice(1), '24:00']

const hoursDirty = computed(
  () =>
    saved.value !== null &&
    (opensDraft.value !== saved.value.opensAt || closesDraft.value !== saved.value.closesAt),
)

const hoursValid = computed(
  () =>
    opensDraft.value !== '' && closesDraft.value !== '' && opensDraft.value !== closesDraft.value,
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
  priceDraft.value = saved.value?.pricePerHour ?? null
  currencyDraft.value = saved.value?.currency ?? ''
  message.value = null
  errorMessage.value = null
}

function resetHours() {
  opensDraft.value = saved.value?.opensAt ?? '00:00'
  closesDraft.value = saved.value?.closesAt ?? '24:00'
  hoursMessage.value = null
  hoursError.value = null
}

async function saveHours() {
  if (!hoursValid.value) return
  isSavingHours.value = true
  hoursMessage.value = null
  hoursError.value = null

  const ok = await bookingStore.updateSettings({
    opensAt: opensDraft.value,
    closesAt: closesDraft.value,
  })

  isSavingHours.value = false
  if (ok) hoursMessage.value = 'تم حفظ مواعيد العمل.'
  else hoursError.value = bookingStore.error
}

async function save() {
  if (!isValid.value) return
  isSaving.value = true
  message.value = null
  errorMessage.value = null

  const ok = await bookingStore.updateSettings({
    pricePerHour: Math.round(priceDraft.value!),
    currency: currencyDraft.value.trim(),
  })

  isSaving.value = false
  if (ok) message.value = 'تم حفظ السعر.'
  else errorMessage.value = bookingStore.error
}

onMounted(async () => {
  await bookingStore.fetchConfig()
  reset()
  resetHours()
})
</script>

<template>
  <section class="mx-auto max-w-6xl px-5 py-8 sm:py-12">
    <p class="text-xs font-semibold text-grass-400">التحكم بالملعب</p>
    <h1 class="mt-2 font-display text-4xl font-black sm:text-5xl">الإعدادات</h1>

    <AdminNav class="mt-6" />

    <div class="mt-8 grid gap-6 lg:grid-cols-2 lg:items-start lg:gap-8">
      <form
        class="rounded-lg border border-turf-700/60 bg-turf-900 p-4 sm:p-6"
        novalidate
        @submit.prevent="save"
      >
        <h2 class="font-display text-xl font-black text-chalk-50">سعر الساعة</h2>
        <p class="mt-1.5 text-sm text-chalk-400">
          يُطبَّق على الحجوزات الجديدة فقط. الحجوزات القائمة تحتفظ بالسعر الذي دُفع عليه.
        </p>

        <div class="mt-5 grid gap-4 sm:grid-cols-[1fr_9rem]">
          <div class="space-y-1.5">
            <label for="pricePerHour" class="block text-sm font-medium text-chalk-300">
              السعر
            </label>
            <input
              id="pricePerHour"
              v-model.number="priceDraft"
              type="number"
              min="0"
              step="1"
              dir="ltr"
              class="w-full rounded-md border border-turf-600 bg-turf-950 px-3 py-2.5 text-end font-mono text-lg tabular-nums text-chalk-50 focus-visible:border-grass-400"
            />
          </div>
          <div class="space-y-1.5">
            <label for="currency" class="block text-sm font-medium text-chalk-300">العملة</label>
            <input
              id="currency"
              v-model="currencyDraft"
              type="text"
              maxlength="10"
              class="w-full rounded-md border border-turf-600 bg-turf-950 px-3 py-2.5 text-lg text-chalk-50 focus-visible:border-grass-400"
            />
          </div>
        </div>

        <p v-if="message" class="mt-4 text-sm text-grass-400">{{ message }}</p>
        <p
          v-if="errorMessage"
          class="mt-4 rounded-md bg-card-red-dim/40 px-3 py-2 text-sm text-card-red"
        >
          {{ errorMessage }}
        </p>

        <div class="mt-5 flex items-center gap-3">
          <button
            type="submit"
            :disabled="isSaving || !isValid || !isDirty"
            class="inline-flex items-center justify-center rounded-md bg-grass-500 px-5 py-2.5 font-medium text-turf-950 transition-colors hover:bg-grass-400 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            {{ isSaving ? 'جارٍ الحفظ…' : 'حفظ السعر' }}
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
      </form>

      <div class="rounded-lg border border-turf-700/60 bg-turf-900/50 p-4 sm:p-6">
        <h2 class="font-display text-xl font-black text-chalk-50">ماذا يدفع اللاعب</h2>
        <p class="mt-1.5 text-sm text-chalk-400">
          <span v-if="isDirty" class="text-card-yellow">معاينة للسعر الجديد قبل الحفظ.</span>
          <span v-else>الأسعار المعمول بها الآن.</span>
        </p>

        <dl class="mt-5 divide-y divide-turf-700/60">
          <div
            v-for="row in preview"
            :key="row.minutes"
            class="flex items-baseline justify-between gap-4 py-3"
          >
            <dt class="text-sm text-chalk-300">{{ row.label }}</dt>
            <dd class="font-mono text-lg font-semibold tabular-nums text-grass-400">
              {{ row.amount }}
            </dd>
          </div>
        </dl>

        <p class="mt-4 text-xs text-chalk-600">
          نصف الساعة تُحتسب بنصف السعر، والدفع نقدًا عند الوصول.
        </p>
      </div>

      <form
        class="rounded-lg border border-turf-700/60 bg-turf-900 p-4 sm:p-6 lg:col-span-2"
        novalidate
        @submit.prevent="saveHours"
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
          <p v-if="!hoursValid" class="text-card-yellow">اختر وقتين مختلفين للفتح والإغلاق.</p>
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

        <p v-if="hoursMessage" class="mt-4 text-sm text-grass-400">{{ hoursMessage }}</p>
        <p
          v-if="hoursError"
          class="mt-4 rounded-md bg-card-red-dim/40 px-3 py-2 text-sm text-card-red"
        >
          {{ hoursError }}
        </p>

        <div class="mt-5 flex items-center gap-3">
          <button
            type="submit"
            :disabled="isSavingHours || !hoursValid || !hoursDirty"
            class="inline-flex items-center justify-center rounded-md bg-grass-500 px-5 py-2.5 font-medium text-turf-950 transition-colors hover:bg-grass-400 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            {{ isSavingHours ? 'جارٍ الحفظ…' : 'حفظ المواعيد' }}
          </button>
          <button
            v-if="hoursDirty"
            type="button"
            class="text-sm text-chalk-400 transition-colors hover:text-chalk-50 cursor-pointer"
            @click="resetHours"
          >
            تراجع
          </button>
        </div>

        <p class="mt-4 text-xs text-chalk-600">
          الحجوزات القائمة خارج المواعيد الجديدة تبقى كما هي — لا يُلغى شيء بأثر رجعي.
        </p>
      </form>
    </div>
  </section>
</template>
