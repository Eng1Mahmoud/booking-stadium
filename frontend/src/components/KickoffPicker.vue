<script setup lang="ts">
import { computed } from 'vue'
import HourGrid from '@/components/HourGrid.vue'
import { endOptionsFor, hasAnyEnd } from '@/utils/availability'
import { formatDurationShort, formatTime12h, toMinutes } from '@/utils/time'
import { formatMoney, priceFor } from '@/utils/money'
import type { EndOption } from '@/utils/availability'
import type { HourCell, SlotStatus, TimelineSlot } from '@/types'

/**
 * Picking a slot the way a match is actually described: a kick-off and a
 * length. The end is derived from those two and only ever displayed.
 *
 * Shared by the player page and the staff walk-in panel. Elapsed hours are shut
 * to both; `allowClosed` is the single exemption staff get, for taking a booking
 * outside the pitch's working hours by arrangement.
 */

const props = withDefaults(
  defineProps<{
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
    /** Staff only — see the note on RangeRules.allowClosed. */
    allowClosed?: boolean
  }>(),
  { loading: false, allowClosed: false },
)

const emit = defineEmits<{ select: [startIndex: number, durationMinutes: number | null] }>()

const rules = computed(() => ({
  slotMinutes: props.slotMinutes,
  minMinutes: props.minMinutes,
  maxMinutes: props.maxMinutes,
  allowClosed: props.allowClosed,
}))

const STATUS_LABEL: Record<SlotStatus, string> = {
  available: '',
  booked: 'محجوز',
  blocked: 'مغلق',
  // Distinct wording from "مغلق" on purpose: that is a staff decision about one
  // date, this is the pitch simply not working at that hour.
  closed: 'خارج الدوام',
  passed: 'انتهى',
}

/** Timeline index behind each hour cell, so a press can be turned back into a start. */
const indexByHour = new Map<number, number>()

/**
 * Only the selected date's own units can be a kick-off. The next-day overhang
 * exists purely as end territory — starting there is both redundant (choose
 * tomorrow in the calendar) and a dead end, since too few units are fetched
 * beyond it to ever reach a legal end.
 *
 * Keyed by minutes-since-midnight so the two units inside an hour can be looked
 * up directly, without assuming the timeline starts at 00:00.
 */
const unitsByMinute = computed(() => {
  const map = new Map<number, { slot: TimelineSlot; index: number }>()
  props.timeline.forEach((slot, index) => {
    if (!slot.isNextDay) map.set(toMinutes(slot.startTime), { slot, index })
  })
  return map
})

function fits(entry: { slot: TimelineSlot; index: number } | undefined): boolean {
  if (!entry) return false
  const usable =
    entry.slot.status === 'available' || (props.allowClosed && entry.slot.status === 'closed')
  return usable && hasAnyEnd(props.timeline, entry.index, rules.value)
}

/**
 * One cell per hour of the day — 24 buttons rather than the 48 the half-hour
 * grid really contains.
 *
 * Halving the list must not cost availability, so a cell resolves to whichever
 * start inside its hour is actually bookable. Normally that is the hour itself;
 * when the hour is taken but its half-hour mark is free, the cell offers 8:30
 * rather than disappearing. That is what keeps a staff booking of 10:30–11:30 —
 * or simply the clock passing 8:15 — from stranding the time after it.
 */
const cells = computed<HourCell[]>(() => {
  indexByHour.clear()

  return Array.from({ length: 24 }, (_, hour) => {
    const onHour = unitsByMinute.value.get(hour * 60)
    const halfHour = unitsByMinute.value.get(hour * 60 + 30)

    const hours12 = hour % 12 === 0 ? 12 : hour % 12
    const period = hour < 12 ? 'ص' : 'م'
    const status = (onHour ?? halfHour)?.slot.status ?? 'passed'

    if (fits(onHour)) {
      indexByHour.set(hour, onHour!.index)
      return { hour, label: `${hours12} ${period}`, disabled: false, note: '', status }
    }

    if (fits(halfHour)) {
      indexByHour.set(hour, halfHour!.index)
      // Named rather than left to the digits: an hour that starts at half past
      // is a surprise, and the label alone is easy to skim over.
      return {
        hour,
        label: formatTime12h(halfHour!.slot.startTime),
        disabled: false,
        note: 'ونصف',
        status,
      }
    }

    return {
      hour,
      label: `${hours12} ${period}`,
      disabled: true,
      // A free hour with nothing bookable after it says so, rather than looking
      // identical to one somebody else has taken.
      note: status === 'available' ? 'أقل من ساعة' : STATUS_LABEL[status],
      status,
    }
  })
})

const hasAnyStart = computed(() => cells.value.some((cell) => !cell.disabled))

const selectedStart = computed(() =>
  props.startIndex === null ? null : (props.timeline[props.startIndex] ?? null),
)

/** Which hour button to light up — the one whose start we are actually using. */
const selectedHours = computed(() => {
  if (props.startIndex === null) return []
  const hour = [...indexByHour.entries()].find(([, index]) => index === props.startIndex)?.[0]
  return hour === undefined ? [] : [hour]
})

/** Legal lengths for the chosen kick-off, ascending. The list is a contiguous
 *  prefix, so the last chip is genuinely the longest booking that fits here. */
const lengths = computed(() =>
  props.startIndex === null ? [] : endOptionsFor(props.timeline, props.startIndex, rules.value),
)

const current = computed(
  () => lengths.value.find((option) => option.durationMinutes === props.durationMinutes) ?? null,
)

const price = computed(() =>
  current.value ? priceFor(current.value.durationMinutes, props.pricePerHour) : 0,
)

function chooseHour(cell: HourCell) {
  const index = indexByHour.get(cell.hour)
  if (index === undefined) return

  // Keep the current length if it still fits, so nudging the kick-off by an hour
  // doesn't throw the choice away. Otherwise fall to the shortest legal one,
  // which leaves the booking complete after a single tap.
  const options = endOptionsFor(props.timeline, index, rules.value)
  const kept = options.find((option) => option.durationMinutes === props.durationMinutes)
  emit('select', index, (kept ?? options[0])?.durationMinutes ?? null)
}

function chooseLength(option: EndOption) {
  if (props.startIndex === null) return
  emit('select', props.startIndex, option.durationMinutes)
}
</script>

<template>
  <div>
    <div v-if="loading" class="space-y-3" aria-hidden="true">
      <div class="h-40 rounded-lg bg-turf-800/60 animate-pulse" />
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

    <div v-else class="space-y-5">
      <HourGrid :cells="cells" :selected-hours="selectedHours" @pick="chooseHour" />

      <div
        v-if="selectedStart"
        class="rounded-lg border border-turf-700/60 bg-turf-900/60 p-4 sm:p-5"
      >
        <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <span class="text-sm font-medium text-chalk-300">كم ساعة تريد اللعب؟</span>
          <span class="text-xs text-chalk-600">بالساعات</span>
        </div>

        <div class="mt-3 flex flex-wrap gap-1.5">
          <button
            v-for="option in lengths"
            :key="option.durationMinutes"
            type="button"
            :aria-pressed="durationMinutes === option.durationMinutes"
            class="min-h-11 min-w-14 rounded-md border px-3 py-2 font-mono text-sm tabular-nums transition-colors cursor-pointer"
            :class="
              durationMinutes === option.durationMinutes
                ? 'border-grass-400 bg-grass-500 font-bold text-turf-950'
                : 'border-turf-600 text-chalk-50 hover:border-grass-500/60 hover:bg-turf-800'
            "
            @click="chooseLength(option)"
          >
            {{ formatDurationShort(option.durationMinutes) }}
          </button>
        </div>

        <!-- The scoreboard: kick-off, end, and what it costs, read at a glance. -->
        <div
          v-if="current"
          class="mt-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-t border-turf-700/60 pt-4"
        >
          <div class="flex items-end gap-2 sm:gap-3">
            <span class="block">
              <span class="block text-[11px] font-semibold text-chalk-600">البداية</span>
              <span
                class="block font-mono text-xl font-semibold tabular-nums text-chalk-50 sm:text-2xl"
              >
                {{ formatTime12h(selectedStart.startTime) }}
              </span>
            </span>
            <span class="pb-1.5 text-grass-500" aria-hidden="true">&#10230;</span>
            <span class="block">
              <span class="block text-[11px] font-semibold text-chalk-600">
                النهاية
                <span v-if="current.crossesMidnight" class="text-card-yellow">· غدًا</span>
              </span>
              <span
                class="block font-mono text-xl font-semibold tabular-nums text-chalk-50 sm:text-2xl"
              >
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

      <p
        v-else
        class="rounded-lg border border-dashed border-turf-700/60 px-4 py-6 text-center text-sm text-chalk-400"
      >
        اختر موعد البداية لتحديد المدة.
      </p>
    </div>
  </div>
</template>
