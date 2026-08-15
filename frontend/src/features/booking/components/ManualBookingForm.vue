<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import KickoffPicker from '@/features/booking/components/KickoffPicker.vue'
import { useCreateManualBooking } from '@/features/booking/queries/mutations'
import { useSubmit } from '@/shared/composables/useSubmit'
import { bookingFormSchema } from '@/features/booking/schemas/booking'
import { endOptionsFor } from '@/features/booking/utils/availability'
import { MINUTES_PER_DAY, toMinutes } from '@/shared/utils/time'
import type { SiteConfig } from '@/shared/types'
import type { TimelineSlot } from '@/features/booking/types'

const props = defineProps<{
  timeline: TimelineSlot[]
  config: SiteConfig | undefined
  isLoadingSlots: boolean
  /** A free band tapped in the agenda, to open pre-filled. */
  prefill: { startTime: string; endTime: string } | null
}>()

const emit = defineEmits<{ created: [] }>()

const createManualBooking = useCreateManualBooking()
const { isSubmitting, error, submit, fail } = useSubmit(bookingFormSchema)

const BLANK = {
  startIndex: null as number | null,
  durationMinutes: null as number | null,
  playerName: '',
  playerPhone: '',
}
const draft = ref({ ...BLANK })
const nameInput = ref<HTMLInputElement | null>(null)

const slotMinutes = computed(() => props.config?.slotMinutes ?? 30)
const minMinutes = computed(() => props.config?.minBookingMinutes ?? 60)
const maxMinutes = computed(() => props.config?.maxBookingMinutes ?? 360)

/** Staff take bookings outside working hours by arrangement; players can't. */
const rules = computed(() => ({
  slotMinutes: slotMinutes.value,
  minMinutes: minMinutes.value,
  maxMinutes: maxMinutes.value,
  allowClosed: true,
}))

function selectSlot(startIndex: number, durationMinutes: number | null) {
  draft.value.startIndex = startIndex
  draft.value.durationMinutes = durationMinutes
}

/**
 * The length comes from the picker's own option list — the longest the band can
 * hold — so an empty day, which arrives as a single 24-hour band, can't pre-fill
 * a length the server would refuse for reasons the user can't see.
 */
watch(
  () => props.prefill,
  (band) => {
    if (!band) return
    const startIndex = props.timeline.findIndex(
      (slot) => !slot.isNextDay && slot.startTime === band.startTime,
    )
    if (startIndex === -1) return

    const bandMinutes =
      (band.endTime === '24:00' ? MINUTES_PER_DAY : toMinutes(band.endTime)) -
      toMinutes(band.startTime)
    const options = endOptionsFor(props.timeline, startIndex, rules.value)
    const fit = [...options].reverse().find((option) => option.durationMinutes <= bandMinutes)

    draft.value.startIndex = startIndex
    draft.value.durationMinutes = (fit ?? options[0])?.durationMinutes ?? null
    nextTick(() => nameInput.value?.focus())
  },
)

async function save() {
  const { startIndex, durationMinutes, playerName, playerPhone } = draft.value
  const slot = startIndex === null ? null : props.timeline[startIndex]

  // Not a field rule, so it stays a `fail`: the picker can only offer legal
  // lengths, and this is just "nothing picked yet".
  if (!slot || !durationMinutes) return fail('اختر موعدًا ومدة.')

  const ok = await submit({ playerName, playerPhone }, (player) =>
    createManualBooking.mutateAsync({
      // The start unit owns the booking's date, which may be tomorrow for a match
      // recorded after midnight.
      date: slot.date,
      startTime: slot.startTime,
      durationMinutes,
      ...player,
    }),
  )

  if (ok) {
    draft.value = { ...BLANK }
    emit('created')
  }
}
</script>

<template>
  <form
    class="mt-4 rounded-md border border-grass-500/30 bg-turf-900 p-4 space-y-4 sm:p-5"
    novalidate
    @submit.prevent="save"
  >
    <KickoffPicker
      :timeline="timeline"
      :start-index="draft.startIndex"
      :duration-minutes="draft.durationMinutes"
      :slot-minutes="slotMinutes"
      :min-minutes="minMinutes"
      :max-minutes="maxMinutes"
      :price-per-hour="config?.pricePerHour ?? 0"
      :currency="config?.currency ?? ''"
      :loading="isLoadingSlots"
      allow-closed
      @select="selectSlot"
    />
    <div class="space-y-1.5">
      <label class="block text-sm font-medium text-chalk-300" for="manualName">اسم اللاعب</label>
      <input
        id="manualName"
        ref="nameInput"
        v-model="draft.playerName"
        type="text"
        class="w-full rounded-md border border-turf-600 bg-turf-950 px-3 py-2 text-chalk-50 focus-visible:border-grass-400"
      />
    </div>
    <div class="space-y-1.5">
      <label class="block text-sm font-medium text-chalk-300" for="manualPhone">الهاتف</label>
      <input
        id="manualPhone"
        v-model="draft.playerPhone"
        type="tel"
        dir="ltr"
        class="w-full rounded-md border border-turf-600 bg-turf-950 px-3 py-2 text-end text-chalk-50 focus-visible:border-grass-400"
      />
    </div>
    <p v-if="error" class="rounded-md bg-card-red-dim/40 px-3 py-2 text-sm text-card-red">
      {{ error }}
    </p>
    <button
      type="submit"
      :disabled="isSubmitting"
      class="inline-flex items-center justify-center rounded-md bg-grass-500 px-5 py-2.5 font-medium text-turf-950 hover:bg-grass-400 disabled:opacity-60 cursor-pointer transition-colors"
    >
      {{ isSubmitting ? 'جارٍ الإضافة…' : 'إضافة الحجز' }}
    </button>
  </form>
</template>
