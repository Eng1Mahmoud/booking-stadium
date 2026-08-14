<script setup lang="ts">
import { computed } from 'vue'
import HourGrid from '@/components/HourGrid.vue'
import { formatTime12h, toTimeString } from '@/utils/time'
import type { AvailabilitySlot, HourCell } from '@/types'

/**
 * Closing a stretch of the day, on the same hour grid the booking forms use.
 *
 * A block has no fixed length — an hour of maintenance and a whole closed day
 * are both normal — so the duration chips that suit a booking can't express it.
 * It is a range instead: press the first hour, then the last one.
 *
 * The second press names the last hour to *close*, not the moment to stop, so
 * "close from one to three" lights up exactly the three buttons it closes. The
 * end time the server needs is derived from that, which is also how blocking
 * until midnight comes out at 24:00 without a special button for it.
 */

const props = defineProps<{
  /** The selected day's availability, for context only — staff may close an
   *  hour that already holds a booking, so nothing here is disabled. */
  slots: AvailabilitySlot[]
  startHour: number | null
  endHour: number | null
}>()

const emit = defineEmits<{ 'update:range': [startHour: number | null, endHour: number | null] }>()

const STATUS_NOTE: Record<string, string> = {
  booked: 'محجوز',
  blocked: 'مغلق',
  closed: 'خارج الدوام',
  passed: 'مرّ',
}

const statusAt = (minutes: number) =>
  props.slots.find((slot) => slot.startTime === toTimeString(minutes))?.status

const cells = computed<HourCell[]>(() =>
  Array.from({ length: 24 }, (_, hour) => {
    // An hour that is only half taken still reads as taken here. Staff are
    // choosing what to close, and a half-occupied hour is exactly the case they
    // most need to notice before closing it.
    const onHour = statusAt(hour * 60)
    const halfHour = statusAt(hour * 60 + 30)
    const status = (onHour === 'available' || onHour === undefined ? halfHour : onHour) ?? 'available'

    const hours12 = hour % 12 === 0 ? 12 : hour % 12
    return {
      hour,
      label: `${hours12} ${hour < 12 ? 'ص' : 'م'}`,
      // Elapsed hours are closed to staff too — there is nothing left to close.
      // Everything else stays open, including hours that already hold a booking:
      // closing one is a deliberate act the dashboard exists for.
      disabled: status === 'passed',
      note: STATUS_NOTE[status] ?? '',
      status,
    }
  }),
)

/** Every hour the range covers, so the whole span lights up rather than its ends. */
const selectedHours = computed(() => {
  if (props.startHour === null) return []
  const last = props.endHour ?? props.startHour
  return Array.from({ length: last - props.startHour + 1 }, (_, i) => props.startHour! + i)
})

const isComplete = computed(() => props.startHour !== null && props.endHour !== null)

const startLabel = computed(() =>
  props.startHour === null ? '' : formatTime12h(toTimeString(props.startHour * 60)),
)

/** 23 closes at 24:00 — midnight as the day's end, which "12 ص" would read as its start. */
const endLabel = computed(() => {
  if (props.endHour === null) return ''
  return props.endHour === 23 ? 'منتصف الليل' : formatTime12h(toTimeString((props.endHour + 1) * 60))
})

const hoursCount = computed(() =>
  props.startHour === null || props.endHour === null ? 0 : props.endHour - props.startHour + 1,
)

function pick(cell: HourCell) {
  const hour = cell.hour

  // A finished range, or none yet — this press starts a new one.
  if (props.startHour === null || props.endHour !== null) {
    emit('update:range', hour, null)
    return
  }

  // Pressing something earlier than the start reads as changing your mind about
  // where to begin, not as an invalid range.
  if (hour < props.startHour) {
    emit('update:range', hour, null)
    return
  }

  emit('update:range', props.startHour, hour)
}

function clear() {
  emit('update:range', null, null)
}
</script>

<template>
  <div class="space-y-3">
    <!-- The instruction changes with the step, so the two-press sequence never
         has to be remembered or guessed at. -->
    <div
      class="rounded-md border px-3 py-2.5 text-sm"
      :class="
        isComplete
          ? 'border-card-yellow/40 bg-card-yellow/10 text-chalk-200'
          : 'border-turf-700/60 bg-turf-950/60 text-chalk-300'
      "
    >
      <template v-if="startHour === null">
        <span class="font-medium">الخطوة 1 من 2</span>
        <span class="block text-chalk-400">اضغط على الساعة التي يبدأ منها الإغلاق.</span>
      </template>

      <template v-else-if="!isComplete">
        <span class="font-medium">الخطوة 2 من 2</span>
        <span class="block text-chalk-400">
          اضغط على <strong class="text-chalk-200">آخر ساعة</strong> تريد إغلاقها. لإغلاق ساعة
          واحدة فقط، اضغط على <strong class="text-chalk-200">{{ startLabel }}</strong> مرة أخرى.
        </span>
      </template>

      <template v-else>
        <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <span class="font-mono tabular-nums text-chalk-50">
            من {{ startLabel }} إلى {{ endLabel }}
          </span>
          <span class="text-xs text-chalk-400">{{ hoursCount }} ساعات مغلقة</span>
        </div>
        <span class="mt-1 block text-xs text-chalk-500">
          اضغط أي ساعة لبدء تحديد جديد.
        </span>
      </template>
    </div>

    <HourGrid :cells="cells" :selected-hours="selectedHours" accent="yellow" @pick="pick" />

    <button
      v-if="startHour !== null"
      type="button"
      class="text-xs text-chalk-400 underline underline-offset-4 transition-colors hover:text-chalk-50 cursor-pointer"
      @click="clear"
    >
      إلغاء التحديد
    </button>
  </div>
</template>
