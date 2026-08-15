<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import dayjs from 'dayjs'
import { useBookingStore } from '@/stores/bookingStore'
import AdminNav from '@/components/AdminNav.vue'
import BookingsList from '@/components/BookingsList.vue'
import DatePicker from '@/components/DatePicker.vue'
import DayAgenda from '@/components/DayAgenda.vue'
import DayTotals from '@/components/DayTotals.vue'
import BlockRangePicker from '@/components/BlockRangePicker.vue'
import KickoffPicker from '@/components/KickoffPicker.vue'
import { formatArabicDate } from '@/utils/date'
import { buildAgenda, summariseDay } from '@/utils/agenda'
import { endOptionsFor } from '@/utils/availability'
import { MINUTES_PER_DAY, toMinutes, toTimeString } from '@/utils/time'
import type { Booking } from '@/types'

const bookingStore = useBookingStore()

const today = dayjs().format('YYYY-MM-DD')
const selectedDate = ref(today)
const formattedDate = computed(() => formatArabicDate(selectedDate.value))

const activePanel = ref<'none' | 'add' | 'block'>('none')

const manualForm = ref({
  startIndex: null as number | null,
  durationMinutes: null as number | null,
  playerName: '',
  playerPhone: '',
})
// Whole hours; the times the API wants are derived at submit.
const blockForm = ref({
  startHour: null as number | null,
  endHour: null as number | null,
  reason: '',
})
const isSubmitting = ref(false)
const formError = ref<string | null>(null)
const manualNameInput = ref<HTMLInputElement | null>(null)

// Booking rules come from the server so this panel can't drift from the validator.
const slotMinutes = computed(() => bookingStore.config?.slotMinutes ?? 30)
const minMinutes = computed(() => bookingStore.config?.minBookingMinutes ?? 60)
const maxMinutes = computed(() => bookingStore.config?.maxBookingMinutes ?? 360)
const currency = computed(() => bookingStore.config?.currency ?? '')

/** Staff take bookings outside working hours by arrangement; players can't. */
const rules = computed(() => ({
  slotMinutes: slotMinutes.value,
  minMinutes: minMinutes.value,
  maxMinutes: maxMinutes.value,
  allowClosed: true,
}))

const agendaBands = computed(() =>
  buildAgenda(
    selectedDate.value,
    bookingStore.slots,
    bookingStore.adminBookings,
    bookingStore.blockedSlots,
  ),
)
const dayTotals = computed(() => summariseDay(agendaBands.value, selectedDate.value))

function selectManualSlot(startIndex: number, durationMinutes: number | null) {
  manualForm.value.startIndex = startIndex
  manualForm.value.durationMinutes = durationMinutes
}

function selectBlockRange(startHour: number | null, endHour: number | null) {
  blockForm.value.startHour = startHour
  blockForm.value.endHour = endHour
}

function load() {
  bookingStore.fetchAvailability(selectedDate.value)
  bookingStore.fetchAdminBookings(selectedDate.value)
  bookingStore.fetchBlockedSlots(selectedDate.value)
}

function togglePanel(panel: 'add' | 'block') {
  activePanel.value = activePanel.value === panel ? 'none' : panel
  formError.value = null
}

async function submitManualBooking() {
  formError.value = null
  const { startIndex, durationMinutes, playerName, playerPhone } = manualForm.value

  // The picker only offers legal lengths, so there is nothing to re-check but
  // that a slot was chosen at all.
  const slot = startIndex === null ? null : bookingStore.timeline[startIndex]
  if (
    !slot ||
    !durationMinutes ||
    playerName.trim().length < 2 ||
    !/^\+?[0-9]{8,15}$/.test(playerPhone.trim())
  ) {
    formError.value = 'اختر موعدًا ومدة، وأدخل الاسم ورقم الهاتف.'
    return
  }

  isSubmitting.value = true
  const ok = await bookingStore.createManualBooking({
    // The start unit owns the booking's date, which may be tomorrow for a match
    // recorded after midnight.
    date: slot.date,
    startTime: slot.startTime,
    durationMinutes,
    playerName: playerName.trim(),
    playerPhone: playerPhone.trim(),
  })
  isSubmitting.value = false
  if (ok) {
    manualForm.value = {
      startIndex: null,
      durationMinutes: null,
      playerName: '',
      playerPhone: '',
    }
    activePanel.value = 'none'
    load()
  } else {
    formError.value = bookingStore.error
  }
}

async function submitBlock() {
  formError.value = null
  const { startHour, endHour, reason } = blockForm.value
  if (startHour === null || endHour === null) {
    formError.value = 'حدّد أول وآخر ساعة تريد إغلاقها.'
    return
  }

  isSubmitting.value = true
  const ok = await bookingStore.blockSlot({
    date: selectedDate.value,
    startTime: toTimeString(startHour * 60),
    // The last closed hour runs to the top of the next one, so closing 11 م
    // yields "24:00" — midnight ending the day, which the API accepts and
    // "00:00" could not express.
    endTime: toTimeString((endHour + 1) * 60),
    reason: reason.trim() || undefined,
  })
  isSubmitting.value = false
  if (ok) {
    blockForm.value = { startHour: null, endHour: null, reason: '' }
    activePanel.value = 'none'
    load()
  } else {
    formError.value = bookingStore.error
  }
}

async function handleCancel(booking: Booking) {
  await bookingStore.cancelBooking(booking._id, selectedDate.value)
  load()
}

async function handleUnblock(id: string) {
  await bookingStore.unblockSlot(id, selectedDate.value)
  load()
}

/**
 * The length comes from the picker's own option list — the longest the band can
 * hold — so an empty day, which arrives as a single 24-hour band, can't pre-fill
 * a length the server would refuse for reasons the user can't see.
 */
function handlePickFree({ startTime, endTime }: { startTime: string; endTime: string }) {
  const startIndex = bookingStore.timeline.findIndex(
    (slot) => !slot.isNextDay && slot.startTime === startTime,
  )
  if (startIndex === -1) return

  const bandMinutes =
    (endTime === '24:00' ? MINUTES_PER_DAY : toMinutes(endTime)) - toMinutes(startTime)
  const options = endOptionsFor(bookingStore.timeline, startIndex, rules.value)
  const fit = [...options].reverse().find((option) => option.durationMinutes <= bandMinutes)

  manualForm.value = {
    ...manualForm.value,
    startIndex,
    durationMinutes: (fit ?? options[0])?.durationMinutes ?? null,
  }
  activePanel.value = 'add'
  formError.value = null
  nextTick(() => manualNameInput.value?.focus())
}

/**
 * Tapping إغلاق on a free band opens the block form rather than blocking
 * immediately — with merged bands a single click could otherwise close hours.
 *
 * A band ending mid-hour rounds *up* to close that hour whole: the grid works in
 * whole hours, and leaving the last half hour open is the worse of the two ways
 * to be wrong about a maintenance window.
 */
function handleBlockRange({ startTime, endTime }: { startTime: string; endTime: string }) {
  const endMinutes = endTime === '24:00' ? MINUTES_PER_DAY : toMinutes(endTime)
  blockForm.value = {
    startHour: Math.floor(toMinutes(startTime) / 60),
    endHour: Math.min(Math.ceil(endMinutes / 60) - 1, 23),
    reason: '',
  }
  activePanel.value = 'block'
  formError.value = null
}

watch(selectedDate, load)
onMounted(async () => {
  await bookingStore.fetchConfig()
  load()
})
</script>

<template>
  <section class="mx-auto max-w-6xl px-5 py-8 sm:py-12">
    <p class="text-xs font-semibold text-grass-400">التحكم بالملعب</p>
    <h1 class="mt-2 font-display text-4xl font-black sm:text-5xl">مباريات اليوم</h1>

    <AdminNav class="mt-6" />

    <div>
      <div class="mt-8 grid gap-6 lg:grid-cols-[20rem_1fr] lg:gap-8 lg:items-start">
        <div class="lg:sticky lg:top-6">
          <h2 class="mb-3 text-sm font-bold text-chalk-50">اختر اليوم</h2>
          <DatePicker v-model="selectedDate" :days-ahead="365" />

          <p
            v-if="bookingStore.config"
            class="mt-4 rounded-lg border border-turf-700/60 bg-turf-900/60 px-4 py-3 text-sm text-chalk-400"
          >
            سعر الساعة
            <span class="font-bold text-chalk-50">
              {{ bookingStore.config.pricePerHour }} {{ bookingStore.config.currency }}
            </span>
          </p>
        </div>

        <div>
          <div class="flex flex-wrap items-baseline justify-between gap-2">
            <h2 class="text-lg font-bold text-chalk-50">
              جدول اليوم
              <span v-if="selectedDate === today" class="text-sm font-normal text-grass-400"
                >· اليوم</span
              >
            </h2>
            <p class="font-mono text-sm tabular-nums text-chalk-400">{{ formattedDate }}</p>
          </div>

          <DayTotals
            v-if="!bookingStore.isLoadingAdminData"
            class="mt-4"
            :totals="dayTotals"
            :currency="currency"
          />

          <div class="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              class="rounded-md border border-turf-600 px-4 py-2 text-sm font-medium transition-colors cursor-pointer"
              :class="
                activePanel === 'add'
                  ? 'bg-grass-500 text-turf-950'
                  : 'text-chalk-300 hover:text-chalk-50'
              "
              @click="togglePanel('add')"
            >
              + إضافة حجز حضوري
            </button>
            <button
              type="button"
              class="rounded-md border border-turf-600 px-4 py-2 text-sm font-medium transition-colors cursor-pointer"
              :class="
                activePanel === 'block'
                  ? 'bg-card-yellow text-turf-950'
                  : 'text-chalk-300 hover:text-chalk-50'
              "
              @click="togglePanel('block')"
            >
              + حظر موعد
            </button>
          </div>

          <form
            v-if="activePanel === 'add'"
            class="mt-4 rounded-md border border-grass-500/30 bg-turf-900 p-4 space-y-4 sm:p-5"
            novalidate
            @submit.prevent="submitManualBooking"
          >
            <KickoffPicker
              :timeline="bookingStore.timeline"
              :start-index="manualForm.startIndex"
              :duration-minutes="manualForm.durationMinutes"
              :slot-minutes="slotMinutes"
              :min-minutes="minMinutes"
              :max-minutes="maxMinutes"
              :price-per-hour="bookingStore.config?.pricePerHour ?? 0"
              :currency="currency"
              :loading="bookingStore.isLoadingSlots"
              allow-closed
              @select="selectManualSlot"
            />
            <div class="space-y-1.5">
              <label class="block text-sm font-medium text-chalk-300" for="manualName"
                >اسم اللاعب</label
              >
              <input
                id="manualName"
                ref="manualNameInput"
                v-model="manualForm.playerName"
                type="text"
                class="w-full rounded-md border border-turf-600 bg-turf-950 px-3 py-2 text-chalk-50 focus-visible:border-grass-400"
              />
            </div>
            <div class="space-y-1.5">
              <label class="block text-sm font-medium text-chalk-300" for="manualPhone"
                >الهاتف</label
              >
              <input
                id="manualPhone"
                v-model="manualForm.playerPhone"
                type="tel"
                dir="ltr"
                class="w-full rounded-md border border-turf-600 bg-turf-950 px-3 py-2 text-end text-chalk-50 focus-visible:border-grass-400"
              />
            </div>
            <p
              v-if="formError"
              class="rounded-md bg-card-red-dim/40 px-3 py-2 text-sm text-card-red"
            >
              {{ formError }}
            </p>
            <button
              type="submit"
              :disabled="isSubmitting"
              class="inline-flex items-center justify-center rounded-md bg-grass-500 px-5 py-2.5 font-medium text-turf-950 hover:bg-grass-400 disabled:opacity-60 cursor-pointer transition-colors"
            >
              {{ isSubmitting ? 'جارٍ الإضافة…' : 'إضافة الحجز' }}
            </button>
          </form>

          <form
            v-if="activePanel === 'block'"
            class="mt-4 rounded-md border border-card-yellow/30 bg-turf-900 p-4 space-y-4 sm:p-5"
            novalidate
            @submit.prevent="submitBlock"
          >
            <BlockRangePicker
              :slots="bookingStore.slots"
              :start-hour="blockForm.startHour"
              :end-hour="blockForm.endHour"
              @update:range="selectBlockRange"
            />
            <div class="space-y-1.5">
              <label class="block text-sm font-medium text-chalk-300" for="blockReason"
                >السبب (اختياري)</label
              >
              <input
                id="blockReason"
                v-model="blockForm.reason"
                type="text"
                placeholder="مثال: صيانة الملعب"
                class="w-full rounded-md border border-turf-600 bg-turf-950 px-3 py-2 text-chalk-50 focus-visible:border-card-yellow"
              />
            </div>
            <p
              v-if="formError"
              class="rounded-md bg-card-red-dim/40 px-3 py-2 text-sm text-card-red"
            >
              {{ formError }}
            </p>
            <button
              type="submit"
              :disabled="isSubmitting"
              class="inline-flex items-center justify-center rounded-md bg-card-yellow px-5 py-2.5 font-medium text-turf-950 hover:brightness-95 disabled:opacity-60 cursor-pointer transition-colors"
            >
              {{ isSubmitting ? 'جارٍ الحظر…' : 'حظر الموعد' }}
            </button>
          </form>

          <div class="mt-6">
            <DayAgenda
              :bands="agendaBands"
              :date="selectedDate"
              :currency="currency"
              :loading="bookingStore.isLoadingSlots || bookingStore.isLoadingAdminData"
              @cancel="handleCancel"
              @unblock="handleUnblock"
              @pick-free="handlePickFree"
              @block-range="handleBlockRange"
            />
          </div>

          <!-- Kept for the record: the schedule above only shows live hours, so
             cancelled bookings would otherwise disappear without a trace. -->
          <details class="mt-8 rounded-lg border border-turf-700/60 bg-turf-900/40 px-4 py-3">
            <summary class="cursor-pointer text-sm font-medium text-chalk-300">
              كل حجوزات اليوم ({{ bookingStore.adminBookings.length }})
            </summary>
            <div class="mt-4">
              <BookingsList
                :bookings="bookingStore.adminBookings"
                :currency="currency"
                :loading="bookingStore.isLoadingAdminData"
                @cancel="handleCancel"
              />
            </div>
          </details>
        </div>
      </div>
    </div>
  </section>
</template>
