<script setup lang="ts">
import { computed } from 'vue'
import { DAY_PERIODS } from '@/utils/time'
import type { HourCell, SlotStatus } from '@/types'

/**
 * Presentation only: handed finished cells, reports which was pressed. What a
 * cell *means* differs by caller — a kick-off on the booking forms, an hour to
 * close on the block form — and keeping that out of here is what lets the player
 * page and both staff panels share one look.
 */

const props = withDefaults(
  defineProps<{
    cells: HourCell[]
    /** A range is just every hour it covers. */
    selectedHours?: number[]
    accent?: 'grass' | 'yellow'
  }>(),
  { selectedHours: () => [], accent: 'grass' },
)

const emit = defineEmits<{ pick: [cell: HourCell] }>()

const selected = computed(() => new Set(props.selectedHours))

const accentClass = computed(() =>
  props.accent === 'yellow'
    ? 'border-card-yellow bg-card-yellow text-turf-950'
    : 'border-grass-400 bg-grass-500 text-turf-950',
)

const hoverClass = computed(() =>
  props.accent === 'yellow'
    ? 'border-turf-600 text-chalk-50 hover:border-card-yellow/60 hover:bg-turf-800'
    : 'border-turf-600 text-chalk-50 hover:border-grass-500/60 hover:bg-turf-800',
)

/**
 * The agenda's colours — red for taken, yellow for closed — so an hour reads the
 * same wherever it appears. Dimmed, because these are the grid's background
 * rather than its subject. `passed` and `closed` stay plain grey: neither is a
 * state anyone did anything about.
 */
const TONE: Partial<Record<SlotStatus, string>> = {
  booked: 'border-card-red-dim/60 bg-card-red-dim/15 text-card-red/80',
  blocked: 'border-card-yellow-dim/60 bg-card-yellow-dim/15 text-card-yellow/80',
}

function cellClass(cell: HourCell): string {
  if (selected.value.has(cell.hour)) return `${accentClass.value} font-bold cursor-pointer`

  const tone = TONE[cell.status] ?? 'border-turf-800 text-chalk-600'

  if (cell.disabled) return `cursor-not-allowed ${tone}`

  // Selectable but not free: only the block form reaches this, where staff may
  // deliberately close an hour that already holds a booking.
  if (TONE[cell.status]) return `cursor-pointer ${tone} hover:bg-turf-800`

  return `${hoverClass.value} cursor-pointer`
}

/**
 * A period whose hours have all passed or fall outside working hours is dropped;
 * neither is actionable, and together they can be most of the page. Booked and
 * blocked hours stay, greyed: "the evening is full" is worth seeing.
 *
 * Requiring `disabled` is what keeps the whole day in view for staff, who may
 * book and close outside working hours.
 */
const IGNORABLE: SlotStatus[] = ['passed', 'closed']

const sections = computed(() =>
  DAY_PERIODS.map((period) => ({
    key: period.key,
    label: period.label,
    cells: props.cells.filter(
      (cell) => cell.hour * 60 >= period.from && cell.hour * 60 < period.to,
    ),
  })).filter(
    (section) =>
      section.cells.length > 0 &&
      !section.cells.every((cell) => cell.disabled && IGNORABLE.includes(cell.status)),
  ),
)
</script>

<template>
  <div class="space-y-4">
    <section v-for="section in sections" :key="section.key">
      <h3 class="mb-2 text-xs font-semibold text-chalk-600">{{ section.label }}</h3>
      <!-- Four across on a phone keeps every target near 44px on a 360px screen;
           six on desktop puts each period on a single row. -->
      <div class="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
        <button
          v-for="cell in section.cells"
          :key="cell.hour"
          type="button"
          :disabled="cell.disabled"
          :aria-pressed="selected.has(cell.hour)"
          class="flex min-h-14 flex-col items-center justify-center rounded-md border px-1 py-1.5 transition-colors"
          :class="cellClass(cell)"
          @click="emit('pick', cell)"
        >
          <span class="font-mono text-sm tabular-nums">{{ cell.label }}</span>
          <span v-if="cell.note" class="text-[10px] leading-tight opacity-80">
            {{ cell.note }}
          </span>
        </button>
      </div>
    </section>
  </div>
</template>
