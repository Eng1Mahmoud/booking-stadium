<script setup lang="ts">
import { computed } from 'vue'
import TimeField from '@/components/TimeField.vue'
import { endOptionsFor, hasAnyEnd } from '@/utils/availability'
import { formatDuration, formatTime12h } from '@/utils/time'
import { formatMoney, priceFor } from '@/utils/money'
import type { SlotStatus, TimeOption, TimelineSlot } from '@/types'

/**
 * Picking a slot the way a match is actually described: a kick-off and a
 * length. The end is derived from those two and only ever displayed, which is
 * what lets this replace two parallel lists of times with one dropdown and a
 * pair of stepper buttons.
 */

const props = defineProps<{
  /** Selected day's units followed by the next morning's overhang. */
  timeline: TimelineSlot[]
  startIndex: number | null
  /** Chosen length; the end time is derived from it. */
  durationMinutes: number | null
  slotMinutes: number
  minMinutes: number
  maxMinutes: number
  pricePerHour: number
  currency: string
  loading?: boolean
}>()

const emit = defineEmits<{ select: [startIndex: number, durationMinutes: number | null] }>()

const rules = computed(() => ({
  slotMinutes: props.slotMinutes,
  minMinutes: props.minMinutes,
  maxMinutes: props.maxMinutes,
}))

const STATUS_LABEL: Record<SlotStatus, string> = {
  available: '',
  booked: 'محجوز',
  blocked: 'مغلق',
  passed: 'انتهى',
}

/**
 * Only the selected date's own units are offered as a kick-off. The next-day
 * overhang exists purely as end territory — starting there is both redundant
 * (choose tomorrow in the calendar) and a dead end, since too few units are
 * fetched beyond it to ever reach a legal end.
 */
const startCandidates = computed(() =>
  props.timeline
    .map((slot, index) => ({ slot, index }))
    .filter(({ slot }) => !slot.isNextDay),
)

const startOptions = computed<TimeOption[]>(() =>
  startCandidates.value.map(({ slot, index }) => {
    const free = slot.status === 'available'
    const fits = free && hasAnyEnd(props.timeline, index, rules.value)
    return {
      time: slot.startTime,
      disabled: !fits,
      // A free slot with nothing bookable after it says so, rather than being
      // offered and then yielding no length at all.
      note: free ? (fits ? '' : 'أقل من ساعة') : STATUS_LABEL[slot.status],
    }
  }),
)

const hasAnyStart = computed(() => startOptions.value.some((option) => !option.disabled))

const selectedStart = computed(() =>
  props.startIndex === null ? null : (props.timeline[props.startIndex] ?? null),
)

/** Legal lengths for the chosen kick-off, ascending — the stepper's track. */
const lengths = computed(() =>
  props.startIndex === null ? [] : endOptionsFor(props.timeline, props.startIndex, rules.value),
)

const currentStep = computed(() =>
  lengths.value.findIndex((option) => option.durationMinutes === props.durationMinutes),
)

const current = computed(() => lengths.value[currentStep.value] ?? null)

const price = computed(() =>
  current.value ? priceFor(current.value.durationMinutes, props.pricePerHour) : 0,
)

const canShorten = computed(() => currentStep.value > 0)
const canExtend = computed(
  () => currentStep.value >= 0 && currentStep.value < lengths.value.length - 1,
)

function chooseStart(time: string) {
  const match = startCandidates.value.find(({ slot }) => slot.startTime === time)
  if (!match) return

  // Keep the current length if it still fits, so nudging the kick-off by half
  // an hour doesn't throw the choice away. Otherwise fall to the shortest legal
  // one, which leaves the player with a complete booking after a single tap.
  const options = endOptionsFor(props.timeline, match.index, rules.value)
  const kept = options.find((option) => option.durationMinutes === props.durationMinutes)
  emit('select', match.index, (kept ?? options[0])?.durationMinutes ?? null)
}

function step(delta: number) {
  if (props.startIndex === null) return
  const next = lengths.value[currentStep.value + delta]
  if (next) emit('select', props.startIndex, next.durationMinutes)
}
</script>

<template>
  <div>
    <div v-if="loading" class="space-y-3" aria-hidden="true">
      <div class="h-[4.5rem] rounded-lg bg-turf-800/60 animate-pulse" />
      <div class="h-24 rounded-lg bg-turf-800/60 animate-pulse" />
    </div>

    <div
      v-else-if="!hasAnyStart"
      class="rounded-lg border border-turf-700/60 bg-turf-900 px-4 py-10 text-center"
    >
      <span class="block text-sm font-semibold text-chalk-300">
        لا توجد أوقات متاحة في هذا اليوم
      </span>
      <span class="mt-1 block text-sm text-chalk-400">جرّب يومًا آخر من التقويم.</span>
    </div>

    <div v-else class="space-y-4">
      <TimeField
        :model-value="selectedStart?.startTime ?? null"
        :options="startOptions"
        label="موعد البداية"
        placeholder="اختر موعد البداية"
        @update:model-value="chooseStart"
      />

      <div
        v-if="current"
        class="rounded-lg border border-turf-700/60 bg-turf-900/60 p-4 sm:p-5"
      >
        <!-- Wraps at the narrowest widths: label plus the stepper needs about
             300px, which a 360px phone does not have once the card and page
             padding are taken out. -->
        <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <span class="text-sm font-medium text-chalk-300">مدة اللعب</span>
          <div class="flex items-center gap-2">
            <button
              type="button"
              :disabled="!canShorten"
              class="grid h-11 w-11 place-items-center rounded-md border border-turf-600 text-xl text-chalk-50 transition-colors hover:border-grass-500/60 hover:bg-turf-800 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-turf-600 disabled:hover:bg-transparent cursor-pointer"
              aria-label="تقليل المدة نصف ساعة"
              @click="step(-1)"
            >
              &minus;
            </button>
            <span
              class="min-w-24 text-center font-display text-base font-black text-chalk-50 sm:min-w-28 sm:text-lg"
              aria-live="polite"
            >
              {{ formatDuration(current.durationMinutes) }}
            </span>
            <button
              type="button"
              :disabled="!canExtend"
              class="grid h-11 w-11 place-items-center rounded-md border border-turf-600 text-xl text-chalk-50 transition-colors hover:border-grass-500/60 hover:bg-turf-800 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-turf-600 disabled:hover:bg-transparent cursor-pointer"
              aria-label="زيادة المدة نصف ساعة"
              @click="step(1)"
            >
              +
            </button>
          </div>
        </div>

        <p v-if="!canExtend" class="mt-2 text-end text-xs text-chalk-600">
          أطول مدة ممكنة من هذا الموعد.
        </p>

        <!-- The scoreboard: kick-off, end, and what it costs, read at a glance. -->
        <div
          class="mt-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-t border-turf-700/60 pt-4"
        >
          <div class="flex items-end gap-2 sm:gap-3">
            <span class="block">
              <span class="block text-[11px] font-semibold text-chalk-600">البداية</span>
              <span class="block font-mono text-xl font-semibold tabular-nums text-chalk-50 sm:text-2xl">
                {{ formatTime12h(selectedStart!.startTime) }}
              </span>
            </span>
            <span class="pb-1.5 text-grass-500" aria-hidden="true">&#10230;</span>
            <span class="block">
              <span class="block text-[11px] font-semibold text-chalk-600">
                النهاية
                <span v-if="current.crossesMidnight" class="text-card-yellow">· غدًا</span>
              </span>
              <span class="block font-mono text-xl font-semibold tabular-nums text-chalk-50 sm:text-2xl">
                {{ formatTime12h(current.endTime) }}
              </span>
            </span>
          </div>

          <div class="text-start">
            <span class="block text-[11px] font-semibold text-chalk-600">الإجمالي</span>
            <span
              class="block font-display text-xl font-black tabular-nums text-grass-400 sm:text-2xl"
            >
              {{ formatMoney(price, currency) }}
            </span>
          </div>
        </div>
      </div>

      <p v-else class="rounded-lg border border-dashed border-turf-700/60 px-4 py-6 text-center text-sm text-chalk-400">
        اختر موعد البداية لتحديد المدة.
      </p>
    </div>
  </div>
</template>
