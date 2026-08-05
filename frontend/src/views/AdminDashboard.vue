<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import dayjs from 'dayjs'
import { useBookingStore } from '@/stores/bookingStore'
import AdminNav from '@/components/AdminNav.vue'
import BookingsList from '@/components/BookingsList.vue'
import DatePicker from '@/components/DatePicker.vue'
import DayAgenda from '@/components/DayAgenda.vue'
import DayTotals from '@/components/DayTotals.vue'
import TimeField from '@/components/TimeField.vue'
import { formatArabicDate } from '@/utils/date'
import { buildAgenda, summariseDay } from '@/utils/agenda'
import { MINUTES_PER_DAY, SLOT_MINUTES, toMinutes, toTimeString } from '@/utils/time'
import type { Booking, TimeOption } from '@/types'

const bookingStore = useBookingStore()

const today = dayjs().format('YYYY-MM-DD')
const selectedDate = ref(today)
const formattedDate = computed(() => formatArabicDate(selectedDate.value))

const activePanel = ref<'none' | 'add' | 'block'>('none')

const manualForm = ref({ startTime: '', endTime: '', playerName: '', playerPhone: '' })
const blockForm = ref({ startTime: '', endTime: '', reason: '' })
const isSubmitting = ref(false)
const formError = ref<string | null>(null)
const manualNameInput = ref<HTMLInputElement | null>(null)

// Booking rules come from the server so this panel can't drift from the validator.
const slotMinutes = computed(() => bookingStore.config?.slotMinutes ?? 30)
const minMinutes = computed(() => bookingStore.config?.minBookingMinutes ?? 60)
const maxMinutes = computed(() => bookingStore.config?.maxBookingMinutes ?? 360)
const currency = computed(() => bookingStore.config?.currency ?? '')

const agendaBands = computed(() =>
  buildAgenda(
    selectedDate.value,
    bookingStore.slots,
    bookingStore.adminBookings,
    bookingStore.blockedSlots,
  ),
)
const dayTotals = computed(() => summariseDay(agendaBands.value, selectedDate.value))

/** Every point on the grid, 00:00 to 23:30 — the raw material for both forms. */
const gridTimes = computed(() =>
  Array.from({ length: MINUTES_PER_DAY / SLOT_MINUTES }, (_, i) => toTimeString(i * SLOT_MINUTES)),
)

const STATUS_NOTE: Record<string, string> = {
  booked: 'محجوز',
  blocked: 'مغلق',
  passed: 'مرّ',
}

/**
 * Kick-off choices for a walk-in. Elapsed hours stay open — staff routinely
 * record a match after it has started — but hours the server will refuse are
 * closed here rather than at submit.
 */
const manualStartOptions = computed<TimeOption[]>(() =>
  gridTimes.value.map((time) => {
    const status = bookingStore.slots.find((slot) => slot.startTime === time)?.status
    return {
      time,
      disabled: status === 'booked' || status === 'blocked',
      note: status ? STATUS_NOTE[status] : undefined,
    }
  }),
)

/**
 * Boundaries, not slots: any grid point is a legal end. "24:00" is offered as
 * well — it means midnight closing the day, which "00:00" cannot say without
 * being read as midnight opening it.
 */
const boundaryOptions = computed<TimeOption[]>(() => [
  ...gridTimes.value.map((time) => ({ time })),
  { time: '24:00', note: 'نهاية اليوم' },
])

function load() {
  // Availability supplies the canonical hour grid; the other two fill in who
  // holds each hour and why it's closed.
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
  const { startTime, endTime, playerName, playerPhone } = manualForm.value
  if (
    !startTime ||
    !endTime ||
    playerName.trim().length < 2 ||
    !/^\+?[0-9]{8,15}$/.test(playerPhone.trim())
  ) {
    formError.value = 'أدخل فترة زمنية صحيحة، والاسم، ورقم الهاتف.'
    return
  }

  // An end earlier than the start means the next morning — staff record
  // late-night matches this way, so wrap rather than reject.
  const duration = (toMinutes(endTime) - toMinutes(startTime) + MINUTES_PER_DAY) % MINUTES_PER_DAY
  if (
    duration < minMinutes.value ||
    duration % slotMinutes.value !== 0 ||
    duration > maxMinutes.value
  ) {
    formError.value = `مدة الحجز يجب أن تكون من ${minMinutes.value / 60} إلى ${maxMinutes.value / 60} ساعات، بمضاعفات نصف ساعة.`
    return
  }

  isSubmitting.value = true
  const ok = await bookingStore.createManualBooking({
    date: selectedDate.value,
    startTime,
    durationMinutes: duration,
    playerName: playerName.trim(),
    playerPhone: playerPhone.trim(),
  })
  isSubmitting.value = false
  if (ok) {
    manualForm.value = { startTime: '', endTime: '', playerName: '', playerPhone: '' }
    activePanel.value = 'none'
    load()
  } else {
    formError.value = bookingStore.error
  }
}

async function submitBlock() {
  formError.value = null
  const { startTime, endTime, reason } = blockForm.value
  if (!startTime || !endTime) {
    formError.value = 'حدّد وقت البداية والنهاية للحظر.'
    return
  }
  isSubmitting.value = true
  const ok = await bookingStore.blockSlot({
    date: selectedDate.value,
    startTime,
    endTime,
    reason: reason.trim() || undefined,
  })
  isSubmitting.value = false
  if (ok) {
    blockForm.value = { startTime: '', endTime: '', reason: '' }
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
 * Tapping a free band opens the walk-in form pre-filled with it.
 *
 * The range is clamped to the maximum booking length: an empty day is one
 * 24-hour band, and pre-filling 00:00–00:00 would compute a zero duration and
 * fail validation for reasons the user can't see.
 */
function handlePickFree({ startTime, endTime }: { startTime: string; endTime: string }) {
  const rawEnd = endTime === '24:00' ? MINUTES_PER_DAY : toMinutes(endTime)
  const capped = Math.min(rawEnd, toMinutes(startTime) + maxMinutes.value)

  manualForm.value = {
    ...manualForm.value,
    startTime,
    endTime: capped === MINUTES_PER_DAY ? '24:00' : toTimeString(capped),
  }
  activePanel.value = 'add'
  formError.value = null
  nextTick(() => manualNameInput.value?.focus())
}

/**
 * Tapping إغلاق on a free band opens the block form rather than blocking
 * immediately — with merged bands a single click could otherwise close hours.
 */
function handleBlockRange({ startTime, endTime }: { startTime: string; endTime: string }) {
  blockForm.value = { startTime, endTime, reason: '' }
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
        <!-- Date picker column -->
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

        <!-- Day column -->
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
            <div class="grid gap-4 sm:grid-cols-2">
              <TimeField
                v-model="manualForm.startTime"
                :options="manualStartOptions"
                label="البداية"
              />
              <TimeField
                v-model="manualForm.endTime"
                :options="boundaryOptions"
                label="النهاية"
              />
            </div>
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
            <div class="grid gap-4 sm:grid-cols-2">
              <TimeField
                v-model="blockForm.startTime"
                :options="boundaryOptions"
                label="البداية"
                accent="yellow"
              />
              <TimeField
                v-model="blockForm.endTime"
                :options="boundaryOptions"
                label="النهاية"
                accent="yellow"
              />
            </div>
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
