<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { formatTime12h, toMinutes } from '@/utils/time'
import type { TimeOption } from '@/types'

/**
 * A time chooser built for this app rather than the browser's.
 *
 * `<input type="time">` can't grey out the hours that are already taken, styles
 * inconsistently across browsers, and on desktop asks people to type digits
 * when every legal value is one of 48 fixed points. This shows those 48 split
 * into four periods of twelve, so no single view is ever a wall of numbers.
 */

const props = withDefaults(
  defineProps<{
    /** "HH:MM", or null when nothing is chosen yet. */
    modelValue: string | null
    /** Every selectable point on the grid, in ascending order. */
    options: TimeOption[]
    label: string
    placeholder?: string
    /** Matches the surrounding form — closing hours are the app's yellow. */
    accent?: 'grass' | 'yellow'
    disabled?: boolean
  }>(),
  { placeholder: 'اختر الوقت', accent: 'grass', disabled: false },
)

const emit = defineEmits<{ 'update:modelValue': [time: string] }>()

/**
 * Six-hour periods, twelve half-hour points each — one tidy 3×4 grid per tab.
 * The names are how people actually describe these hours in Egypt, not clock
 * quadrants: فجرًا covers the after-midnight games this pitch exists for.
 *
 * The last period runs one minute past the day so that "24:00" — midnight as a
 * closing boundary rather than an opening one — has somewhere to live.
 */
const PERIODS = [
  { key: 'dawn', label: 'فجرًا', from: 0, to: 360 },
  { key: 'morning', label: 'صباحًا', from: 360, to: 720 },
  { key: 'noon', label: 'ظهرًا', from: 720, to: 1080 },
  { key: 'evening', label: 'مساءً', from: 1080, to: 1441 },
] as const

type PeriodKey = (typeof PERIODS)[number]['key']

const isOpen = ref(false)
const activePeriod = ref<PeriodKey>('evening')
const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)

function periodOf(time: string): PeriodKey {
  const minutes = toMinutes(time)
  return (PERIODS.find((period) => minutes < period.to) ?? PERIODS[3]).key
}

const groups = computed(() =>
  PERIODS.map((period) => {
    const options = props.options.filter((option) => {
      const minutes = toMinutes(option.time)
      return minutes >= period.from && minutes < period.to
    })
    return {
      ...period,
      options,
      // A live count, so a period worth opening is obvious before you open it.
      freeCount: options.filter((option) => !option.disabled).length,
    }
  }),
)

const visibleOptions = computed(
  () => groups.value.find((group) => group.key === activePeriod.value)?.options ?? [],
)

const selectedLabel = computed(() =>
  props.modelValue ? formatTime12h(props.modelValue) : props.placeholder,
)

const accentRing = computed(() =>
  props.accent === 'yellow' ? 'border-card-yellow' : 'border-grass-400',
)
const accentFill = computed(() =>
  props.accent === 'yellow' ? 'bg-card-yellow text-turf-950' : 'bg-grass-500 text-turf-950',
)
const accentText = computed(() =>
  props.accent === 'yellow' ? 'text-card-yellow' : 'text-grass-400',
)

function open() {
  if (props.disabled) return
  // Land on the period worth looking at: the one already chosen, else the
  // earliest that still has something free.
  activePeriod.value = props.modelValue
    ? periodOf(props.modelValue)
    : (groups.value.find((group) => group.freeCount > 0)?.key ?? 'evening')
  isOpen.value = true
}

function close({ refocus = false } = {}) {
  if (!isOpen.value) return
  isOpen.value = false
  if (refocus) nextTick(() => trigger.value?.focus())
}

function choose(option: TimeOption) {
  if (option.disabled) return
  emit('update:modelValue', option.time)
  close({ refocus: true })
}

function onDocumentPointerDown(event: PointerEvent) {
  if (!root.value?.contains(event.target as Node)) close()
}

// Bound only while open, so a page with several of these isn't running four
// listeners for a panel nobody has touched.
watch(isOpen, (value) => {
  if (value) document.addEventListener('pointerdown', onDocumentPointerDown)
  else document.removeEventListener('pointerdown', onDocumentPointerDown)
})

onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocumentPointerDown))
</script>

<template>
  <div ref="root" class="relative" @keydown.esc.stop="close({ refocus: true })">
    <span class="mb-1.5 block text-sm font-medium text-chalk-300">{{ label }}</span>

    <button
      ref="trigger"
      type="button"
      :disabled="disabled"
      :aria-expanded="isOpen"
      aria-haspopup="dialog"
      class="flex w-full min-h-11 items-center justify-between gap-2 rounded-md border bg-turf-950 px-3 py-2.5 text-start transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      :class="[
        isOpen ? accentRing : 'border-turf-600 hover:border-turf-500',
        disabled ? '' : 'cursor-pointer',
      ]"
      @click="isOpen ? close({ refocus: true }) : open()"
    >
      <span
        class="font-mono text-base tabular-nums"
        :class="modelValue ? 'text-chalk-50' : 'text-chalk-600'"
      >
        {{ selectedLabel }}
      </span>
      <span
        class="text-xs transition-transform"
        :class="[isOpen ? 'rotate-180' : '', accentText]"
        aria-hidden="true"
      >
        &#9660;
      </span>
    </button>

    <div
      v-if="isOpen"
      role="dialog"
      :aria-label="label"
      class="absolute inset-x-0 top-full z-20 mt-1.5 rounded-lg border border-turf-600 bg-turf-900 p-2 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.75)]"
    >
      <div class="grid grid-cols-4 gap-1" role="tablist">
        <button
          v-for="group in groups"
          :key="group.key"
          type="button"
          role="tab"
          :aria-selected="activePeriod === group.key"
          class="rounded px-1 py-1.5 text-center transition-colors cursor-pointer"
          :class="
            activePeriod === group.key
              ? 'bg-turf-700 text-chalk-50'
              : 'text-chalk-400 hover:bg-turf-800 hover:text-chalk-50'
          "
          @click="activePeriod = group.key"
        >
          <span class="block text-xs font-semibold">{{ group.label }}</span>
          <span
            class="block text-[10px] tabular-nums"
            :class="group.freeCount ? accentText : 'text-chalk-600'"
          >
            {{ group.freeCount }} متاح
          </span>
        </button>
      </div>

      <!-- Capped and scrollable: twelve 44px targets plus the tabs is taller
           than a landscape phone, and an unbounded panel would put the last
           row past the bottom of the screen with no way to reach it. -->
      <div
        class="mt-2 grid max-h-[min(15rem,45vh)] grid-cols-3 gap-1 overflow-y-auto overscroll-contain"
      >
        <button
          v-for="option in visibleOptions"
          :key="option.time"
          type="button"
          :disabled="option.disabled"
          :aria-pressed="modelValue === option.time"
          class="flex min-h-11 flex-col items-center justify-center rounded px-1 py-1 transition-colors"
          :class="
            modelValue === option.time
              ? `${accentFill} font-bold cursor-pointer`
              : option.disabled
                ? 'cursor-not-allowed text-chalk-600'
                : 'cursor-pointer text-chalk-50 hover:bg-turf-800'
          "
          @click="choose(option)"
        >
          <span class="font-mono text-xs tabular-nums">{{ formatTime12h(option.time) }}</span>
          <span v-if="option.note" class="text-[10px] leading-tight opacity-80">
            {{ option.note }}
          </span>
        </button>
      </div>

      <p
        v-if="visibleOptions.length === 0"
        class="px-2 py-6 text-center text-sm text-chalk-400"
      >
        لا توجد أوقات في هذه الفترة.
      </p>
    </div>
  </div>
</template>
