<script setup lang="ts">
import { ref, watch } from 'vue'
import BlockRangePicker from '@/features/booking/components/BlockRangePicker.vue'
import { useBlockSlot } from '@/features/booking/queries/mutations'
import { useSubmit } from '@/shared/composables/useSubmit'
import { MINUTES_PER_DAY, toMinutes, toTimeString } from '@/shared/utils/time'
import type { AvailabilitySlot } from '@/features/booking/types'

const props = defineProps<{
  slots: AvailabilitySlot[]
  date: string
  /** A free band tapped in the agenda, to open pre-filled. */
  prefill: { startTime: string; endTime: string } | null
}>()

const emit = defineEmits<{ blocked: [] }>()

const blockSlot = useBlockSlot()
// No schema: the range comes from the grid, which can't produce an illegal one.
const { isSubmitting, error, submit, fail } = useSubmit()

const draft = ref({
  startHour: null as number | null,
  endHour: null as number | null,
  reason: '',
})

function selectRange(startHour: number | null, endHour: number | null) {
  draft.value.startHour = startHour
  draft.value.endHour = endHour
}

/**
 * A band ending mid-hour rounds *up* to close that hour whole: the grid works in
 * whole hours, and leaving the last half hour open is the worse of the two ways
 * to be wrong about a maintenance window.
 */
watch(
  () => props.prefill,
  (band) => {
    if (!band) return
    const endMinutes = band.endTime === '24:00' ? MINUTES_PER_DAY : toMinutes(band.endTime)
    draft.value = {
      startHour: Math.floor(toMinutes(band.startTime) / 60),
      endHour: Math.min(Math.ceil(endMinutes / 60) - 1, 23),
      reason: '',
    }
  },
)

async function save() {
  const { startHour, endHour, reason } = draft.value
  if (startHour === null || endHour === null) return fail('حدّد أول وآخر ساعة تريد إغلاقها.')

  const ok = await submit(null, () =>
    blockSlot.mutateAsync({
      date: props.date,
      startTime: toTimeString(startHour * 60),
      // The last closed hour runs to the top of the next one, so closing 11 م
      // yields "24:00" — midnight ending the day, which the API accepts and
      // "00:00" could not express.
      endTime: toTimeString((endHour + 1) * 60),
      reason: reason.trim() || undefined,
    }),
  )

  if (ok) {
    draft.value = { startHour: null, endHour: null, reason: '' }
    emit('blocked')
  }
}
</script>

<template>
  <form
    class="mt-4 rounded-md border border-card-yellow/30 bg-turf-900 p-4 space-y-4 sm:p-5"
    novalidate
    @submit.prevent="save"
  >
    <BlockRangePicker
      :slots="slots"
      :start-hour="draft.startHour"
      :end-hour="draft.endHour"
      @update:range="selectRange"
    />
    <div class="space-y-1.5">
      <label class="block text-sm font-medium text-chalk-300" for="blockReason">
        السبب (اختياري)
      </label>
      <input
        id="blockReason"
        v-model="draft.reason"
        type="text"
        placeholder="مثال: صيانة الملعب"
        class="w-full rounded-md border border-turf-600 bg-turf-950 px-3 py-2 text-chalk-50 focus-visible:border-card-yellow"
      />
    </div>
    <p v-if="error" class="rounded-md bg-card-red-dim/40 px-3 py-2 text-sm text-card-red">
      {{ error }}
    </p>
    <button
      type="submit"
      :disabled="isSubmitting"
      class="inline-flex items-center justify-center rounded-md bg-card-yellow px-5 py-2.5 font-medium text-turf-950 hover:brightness-95 disabled:opacity-60 cursor-pointer transition-colors"
    >
      {{ isSubmitting ? 'جارٍ الحظر…' : 'حظر الموعد' }}
    </button>
  </form>
</template>
