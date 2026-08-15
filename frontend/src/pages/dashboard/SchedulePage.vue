<script setup lang="ts">
import { computed, ref } from 'vue'
import dayjs from 'dayjs'
import BookingsList from '@/features/booking/components/BookingsList.vue'
import DatePicker from '@/shared/ui/DatePicker.vue'
import DayAgenda from '@/features/booking/components/DayAgenda.vue'
import DayTotals from '@/features/booking/components/DayTotals.vue'
import BlockSlotForm from '@/features/booking/components/BlockSlotForm.vue'
import ManualBookingForm from '@/features/booking/components/ManualBookingForm.vue'
import { useSiteConfig } from '@/features/settings/queries/useSiteConfig'
import { useAvailability } from '@/features/booking/queries/useAvailability'
import { useAdminBookings, useBlockedSlots } from '@/features/booking/queries/useAdminBookings'
import { useCancelBooking, useUnblockSlot } from '@/features/booking/queries/mutations'
import { formatArabicDate } from '@/shared/utils/date'
import { buildAgenda, summariseDay } from '@/features/booking/utils/agenda'
import type { Booking } from '@/features/booking/types'

const today = dayjs().format('YYYY-MM-DD')
const selectedDate = ref(today)
const formattedDate = computed(() => formatArabicDate(selectedDate.value))

const activePanel = ref<'none' | 'add' | 'block'>('none')
/** The free band a tap in the agenda hands to whichever panel it opens. */
const prefill = ref<{ startTime: string; endTime: string } | null>(null)

const { data: config } = useSiteConfig()
// Every query keys off the same date ref, so changing the day refetches all
// three without a watcher.
const { slots, timeline, isPending: isLoadingSlots } = useAvailability(selectedDate)
const { data: bookingsData, isPending: isLoadingBookings } = useAdminBookings(selectedDate)
const { data: blockedData } = useBlockedSlots(selectedDate)

const adminBookings = computed(() => bookingsData.value ?? [])
const blockedSlots = computed(() => blockedData.value ?? [])
const currency = computed(() => config.value?.currency ?? '')

const cancelBooking = useCancelBooking()
const unblockSlot = useUnblockSlot()

const agendaBands = computed(() =>
  buildAgenda(selectedDate.value, slots.value, adminBookings.value, blockedSlots.value),
)
const dayTotals = computed(() => summariseDay(agendaBands.value, selectedDate.value))

function togglePanel(panel: 'add' | 'block') {
  activePanel.value = activePanel.value === panel ? 'none' : panel
  prefill.value = null
}

function handleCancel(booking: Booking) {
  cancelBooking.mutate(booking._id)
}

function handleUnblock(id: string) {
  unblockSlot.mutate(id)
}

/**
 * Tapping a free band opens the matching panel pre-filled, rather than acting
 * immediately — with merged bands a single click could otherwise close hours.
 */
function openWith(panel: 'add' | 'block', band: { startTime: string; endTime: string }) {
  activePanel.value = panel
  prefill.value = band
}
</script>

<template>
  <div>
    <div class="mt-8 grid gap-6 lg:grid-cols-[20rem_1fr] lg:gap-8 lg:items-start">
      <div class="lg:sticky lg:top-6">
        <h2 class="mb-3 text-sm font-bold text-chalk-50">اختر اليوم</h2>
        <DatePicker v-model="selectedDate" :days-ahead="365" />

        <p
          v-if="config"
          class="mt-4 rounded-lg border border-turf-700/60 bg-turf-900/60 px-4 py-3 text-sm text-chalk-400"
        >
          سعر الساعة
          <span class="font-bold text-chalk-50">
            {{ config.pricePerHour }} {{ config.currency }}
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
          v-if="!isLoadingBookings"
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

        <ManualBookingForm
          v-if="activePanel === 'add'"
          :timeline="timeline"
          :config="config"
          :is-loading-slots="isLoadingSlots"
          :prefill="prefill"
          @created="activePanel = 'none'"
        />

        <BlockSlotForm
          v-if="activePanel === 'block'"
          :slots="slots"
          :date="selectedDate"
          :prefill="prefill"
          @blocked="activePanel = 'none'"
        />

        <div class="mt-6">
          <DayAgenda
            :bands="agendaBands"
            :date="selectedDate"
            :currency="currency"
            :loading="isLoadingSlots || isLoadingBookings"
            @cancel="handleCancel"
            @unblock="handleUnblock"
            @pick-free="openWith('add', $event)"
            @block-range="openWith('block', $event)"
          />
        </div>

        <!-- Kept for the record: the schedule above only shows live hours, so
           cancelled bookings would otherwise disappear without a trace. -->
        <details class="mt-8 rounded-lg border border-turf-700/60 bg-turf-900/40 px-4 py-3">
          <summary class="cursor-pointer text-sm font-medium text-chalk-300">
            كل حجوزات اليوم ({{ adminBookings.length }})
          </summary>
          <div class="mt-4">
            <BookingsList
              :bookings="adminBookings"
              :currency="currency"
              :loading="isLoadingBookings"
              @cancel="handleCancel"
            />
          </div>
        </details>
      </div>
    </div>
  </div>
</template>
