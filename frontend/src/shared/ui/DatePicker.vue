<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import dayjs from 'dayjs'
import { WEEKDAY_HEADERS, formatArabicMonth, weekdayColumn } from '@/utils/date'

const props = defineProps<{
  modelValue: string
  daysAhead?: number
}>()

const emit = defineEmits<{ 'update:modelValue': [date: string] }>()

const today = dayjs().startOf('day')
const lastBookable = computed(() => today.add(props.daysAhead ?? 60, 'day'))

// Paged independently of the selection: people look ahead before committing.
const visibleMonth = ref(dayjs(props.modelValue).startOf('month'))

watch(
  () => props.modelValue,
  (value) => {
    visibleMonth.value = dayjs(value).startOf('month')
  },
)

interface DayCell {
  key: string
  date: string
  label: number
  isToday: boolean
  isSelected: boolean
  disabled: boolean
}

const cells = computed<(DayCell | null)[]>(() => {
  const start = visibleMonth.value
  const leading = weekdayColumn(start)
  const out: (DayCell | null)[] = Array.from({ length: leading }, () => null)

  for (let day = 1; day <= start.daysInMonth(); day += 1) {
    const date = start.date(day)
    const iso = date.format('YYYY-MM-DD')
    out.push({
      key: iso,
      date: iso,
      label: day,
      isToday: date.isSame(today, 'day'),
      isSelected: iso === props.modelValue,
      disabled: date.isBefore(today, 'day') || date.isAfter(lastBookable.value, 'day'),
    })
  }

  return out
})

const canGoBack = computed(() => visibleMonth.value.isAfter(today, 'month'))
const canGoForward = computed(() => visibleMonth.value.isBefore(lastBookable.value, 'month'))

function shiftMonth(months: number) {
  visibleMonth.value = visibleMonth.value.add(months, 'month')
}

function select(cell: DayCell) {
  if (cell.disabled) return
  emit('update:modelValue', cell.date)
}
</script>

<template>
  <div class="rounded-lg border border-turf-700/60 bg-turf-900/60 p-3 sm:p-4">
    <div class="flex items-center justify-between gap-2">
      <button
        type="button"
        :disabled="!canGoBack"
        class="grid h-9 w-9 place-items-center rounded-md text-chalk-400 transition-colors hover:bg-turf-800 hover:text-chalk-50 disabled:cursor-not-allowed disabled:opacity-25 disabled:hover:bg-transparent cursor-pointer"
        aria-label="الشهر السابق"
        @click="shiftMonth(-1)"
      >
        &#8594;
      </button>

      <p class="text-base font-bold text-chalk-50">
        {{ formatArabicMonth(visibleMonth.format()) }}
      </p>

      <button
        type="button"
        :disabled="!canGoForward"
        class="grid h-9 w-9 place-items-center rounded-md text-chalk-400 transition-colors hover:bg-turf-800 hover:text-chalk-50 disabled:cursor-not-allowed disabled:opacity-25 disabled:hover:bg-transparent cursor-pointer"
        aria-label="الشهر التالي"
        @click="shiftMonth(1)"
      >
        &#8592;
      </button>
    </div>

    <!--
      The grid is capped and centred rather than stretched to the card: at full
      width on a phone the seven columns grow far wider than a day button needs,
      leaving the numbers adrift from each other.
    -->
    <div class="mx-auto mt-4 grid w-full max-w-72 grid-cols-7 justify-items-center gap-y-1">
      <span
        v-for="header in WEEKDAY_HEADERS"
        :key="header"
        class="pb-2 text-center text-[11px] font-semibold text-chalk-600"
      >
        {{ header }}
      </span>

      <!-- Fixed square centred in its column, so buttons stay square and
           evenly spaced whatever the card width. -->
      <template v-for="(cell, index) in cells">
        <span v-if="!cell" :key="`pad-${index}`" aria-hidden="true" />
        <button
          v-else
          :key="cell.key"
          type="button"
          :disabled="cell.disabled"
          :aria-pressed="cell.isSelected"
          :aria-label="cell.date"
          class="relative grid size-8 place-items-center rounded-md font-mono text-sm tabular-nums transition-colors cursor-pointer disabled:cursor-not-allowed sm:size-9"
          :class="[
            cell.isSelected
              ? 'bg-grass-500 font-bold text-turf-950'
              : cell.disabled
                ? 'text-chalk-600/40'
                : 'text-chalk-50 hover:bg-turf-700/70',
          ]"
          @click="select(cell)"
        >
          {{ cell.label }}
          <!-- Today keeps a marker even when selected, so paging back reads clearly. -->
          <span
            v-if="cell.isToday"
            class="absolute bottom-1 h-1 w-1 rounded-full"
            :class="cell.isSelected ? 'bg-turf-950' : 'bg-grass-400'"
            aria-hidden="true"
          />
        </button>
      </template>
    </div>
  </div>
</template>
