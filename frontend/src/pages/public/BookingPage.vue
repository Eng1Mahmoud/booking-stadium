<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import dayjs from 'dayjs'
import DatePicker from '@/components/DatePicker.vue'
import KickoffPicker from '@/components/KickoffPicker.vue'
import BookingForm from '@/components/BookingForm.vue'
import { useSiteConfig } from '@/queries/useSiteConfig'
import { useAvailability } from '@/queries/useAvailability'
import { useCreateBooking } from '@/queries/mutations'
import { getErrorMessage } from '@/services/api'
import { formatArabicDate } from '@/utils/date'
import { isSpanFree } from '@/utils/availability'
import { formatMoney, priceFor } from '@/utils/money'
import { MINUTES_PER_DAY, formatTime12h, toMinutes, toTimeString } from '@/utils/time'

const today = dayjs().format('YYYY-MM-DD')
const selectedDate = ref(today)
const startIndex = ref<number | null>(null)
const selectedDuration = ref<number | null>(null)
const justConfirmed = ref(false)
const confirmedSummary = ref<{ range: string; date: string; price: number } | null>(null)

const { data: config } = useSiteConfig()
// The date is a ref, so the query refetches on its own — no watcher to keep in step.
const { timeline, isPending, error: loadError } = useAvailability(selectedDate)
const createBooking = useCreateBooking()

const slotMinutes = computed(() => config.value?.slotMinutes ?? 30)
const minMinutes = computed(() => config.value?.minBookingMinutes ?? 60)
const maxMinutes = computed(() => config.value?.maxBookingMinutes ?? 360)
const currency = computed(() => config.value?.currency ?? '')

// The load error and the submit error are separate now, so a failed booking
// can't blank the grid and a failed fetch can't sit under the form.
const errorMessage = computed(() => {
  const err = createBooking.error.value ?? loadError.value
  return err ? getErrorMessage(err) : null
})

const formattedDate = computed(() => formatArabicDate(selectedDate.value))

const startSlot = computed(() =>
  startIndex.value === null ? null : (timeline.value[startIndex.value] ?? null),
)

const durationMinutes = computed(() => selectedDuration.value ?? 0)

/** End of the range, wrapping past midnight where needed. */
const endTimeLabel = computed(() => {
  if (!startSlot.value || !durationMinutes.value) return null
  const total = toMinutes(startSlot.value.startTime) + durationMinutes.value
  return formatTime12h(toTimeString(total % MINUTES_PER_DAY))
})

const rangeLabel = computed(() =>
  startSlot.value && endTimeLabel.value
    ? `${formatTime12h(startSlot.value.startTime)} – ${endTimeLabel.value}`
    : null,
)

const price = computed(() => priceFor(durationMinutes.value, config.value?.pricePerHour ?? 0))

function resetSelection() {
  startIndex.value = null
  selectedDuration.value = null
}

function handleSelect(start: number, duration: number | null) {
  startIndex.value = start
  selectedDuration.value = duration
  justConfirmed.value = false
}

async function handleConfirm(payload: { playerName: string; playerPhone: string }) {
  if (!startSlot.value || !durationMinutes.value) return

  const summary = {
    range: rangeLabel.value!,
    date: formatArabicDate(startSlot.value.date),
    price: price.value,
  }

  try {
    await createBooking.mutateAsync({
      // The start unit owns the booking's date — which may be tomorrow if the
      // player started after midnight in the overhang section.
      date: startSlot.value.date,
      startTime: startSlot.value.startTime,
      durationMinutes: durationMinutes.value,
      ...payload,
    })
    confirmedSummary.value = summary
    resetSelection()
    justConfirmed.value = true
  } catch {
    // Surfaced through createBooking.error; the selection stays for a retry.
  }
}

watch(selectedDate, () => {
  resetSelection()
  justConfirmed.value = false
  createBooking.reset()
})

// Someone else may take the slot while this page sits open; drop a selection
// that has stopped being bookable rather than failing at submit.
watch(timeline, () => {
  if (startIndex.value === null || !selectedDuration.value) return
  const units = selectedDuration.value / slotMinutes.value
  if (!isSpanFree(timeline.value, startIndex.value, units)) resetSelection()
})
</script>

<template>
  <section class="mx-auto max-w-5xl px-5 py-10 sm:py-14">
    <h1 class="font-display text-3xl font-black sm:text-4xl">احجز الملعب</h1>
    <p class="mt-2 max-w-lg text-chalk-400">
      اختر اليوم وموعد البداية، ثم حدّد كم ساعة تريد اللعب. يمكنك الحجز بعد منتصف الليل أيضًا.
    </p>

    <div class="mt-8 grid gap-6 lg:grid-cols-[20rem_1fr] lg:gap-8 lg:items-start">
      <div class="lg:sticky lg:top-6">
        <h2 class="mb-3 text-sm font-bold text-chalk-50">1 · اختر اليوم</h2>
        <DatePicker v-model="selectedDate" />

        <p
          v-if="config"
          class="mt-4 rounded-lg border border-turf-700/60 bg-turf-900/60 px-4 py-3 text-sm text-chalk-400"
        >
          السعر
          <span class="font-bold text-chalk-50">
            {{ config.pricePerHour }} {{ currency }}
          </span>
          للساعة
        </p>
      </div>

      <div>
        <h2 class="mb-3 flex flex-wrap items-baseline gap-2 text-sm font-bold text-chalk-50">
          2 · اختر موعد البداية والمدة
          <span class="text-xs font-normal text-chalk-400">{{ formattedDate }}</span>
        </h2>

        <p
          v-if="errorMessage && !startSlot"
          class="mb-3 rounded-md bg-card-red-dim/40 px-4 py-3 text-sm text-card-red"
        >
          {{ errorMessage }}
        </p>

        <div
          v-if="justConfirmed && confirmedSummary"
          class="mb-4 rounded-lg border border-grass-500/40 bg-grass-500/10 px-5 py-4"
        >
          <p class="text-xs font-semibold text-grass-400">تم تأكيد الحجز</p>
          <p class="mt-1 font-display text-2xl font-black">{{ confirmedSummary.range }}</p>
          <p class="mt-1 text-sm text-chalk-300">
            {{ confirmedSummary.date }} — الإجمالي
            <span class="font-bold text-chalk-50">{{
              formatMoney(confirmedSummary.price, currency)
            }}</span>
            تُدفع نقدًا عند الوصول.
          </p>
        </div>

        <KickoffPicker
          :timeline="timeline"
          :start-index="startIndex"
          :duration-minutes="selectedDuration"
          :slot-minutes="slotMinutes"
          :min-minutes="minMinutes"
          :max-minutes="maxMinutes"
          :price-per-hour="config?.pricePerHour ?? 0"
          :currency="currency"
          :loading="isPending"
          @select="handleSelect"
        />

        <div v-if="rangeLabel && durationMinutes" class="mt-6">
          <h2 class="mb-3 text-sm font-bold text-chalk-50">3 · أكّد بياناتك</h2>
          <BookingForm
            :range-label="rangeLabel"
            :date="formattedDate"
            :submitting="createBooking.isPending.value"
            :server-error="errorMessage"
            @confirm="handleConfirm"
            @cancel="resetSelection"
          />
        </div>
      </div>
    </div>
  </section>
</template>
