<script setup lang="ts">
import { formatTimeRange } from '@/utils/time'
import { formatMoney } from '@/utils/money'
import type { Booking } from '@/types'

defineProps<{
  bookings: Booking[]
  currency: string
  loading?: boolean
}>()

const emit = defineEmits<{ cancel: [booking: Booking] }>()
</script>

<template>
  <div>
    <div v-if="loading" class="space-y-2" aria-hidden="true">
      <div v-for="n in 5" :key="n" class="h-16 rounded-md bg-turf-800/60 animate-pulse" />
    </div>

    <p
      v-else-if="bookings.length === 0"
      class="rounded-md border border-turf-700/60 bg-turf-900 px-4 py-8 text-center"
    >
      <span class="block text-xs font-semibold text-chalk-600">لا توجد حجوزات بعد</span>
      <span class="block mt-1 text-sm text-chalk-400"
        >أضف حجزًا حضوريًا أو انتظر حجز اللاعبين عبر الإنترنت.</span
      >
    </p>

    <ul
      v-else
      class="divide-y divide-turf-700/60 rounded-md border border-turf-700/60 overflow-hidden"
    >
      <!--
        Two stacked lines at every width rather than one row that only fits a
        laptop. The old layout reserved ~400px of fixed columns — a 360px phone
        had to squeeze or scroll. Name and price lead, because those are what
        staff scan for; everything else is supporting detail on the line below.
      -->
      <li
        v-for="booking in bookings"
        :key="booking._id"
        class="px-4 py-3.5"
        :class="booking.status === 'cancelled' ? 'bg-turf-950/60 opacity-60' : 'bg-turf-900'"
      >
        <div class="flex items-baseline justify-between gap-3">
          <span class="min-w-0 truncate text-sm font-medium text-chalk-50">
            {{ booking.playerName }}
          </span>
          <span
            class="shrink-0 text-sm font-bold tabular-nums"
            :class="booking.status === 'cancelled' ? 'text-chalk-600' : 'text-grass-400'"
          >
            {{ formatMoney(booking.price, currency) }}
          </span>
        </div>

        <div class="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span class="text-xs tabular-nums text-chalk-300">
            {{ formatTimeRange(booking.startTime, booking.endTime) }}
          </span>
          <span class="font-mono text-xs text-chalk-400 ltr-embed">
            {{ booking.playerPhone }}
          </span>
          <span
            class="rounded px-2 py-0.5 text-[10px] font-semibold"
            :class="
              booking.bookingSource === 'manual'
                ? 'bg-turf-700 text-chalk-300'
                : 'bg-turf-700/50 text-chalk-400'
            "
          >
            {{ booking.bookingSource === 'manual' ? 'حضوري' : 'إلكتروني' }}
          </span>

          <!-- `ms-auto` rather than a spacer element: it pushes the action to
               the far end when the line has room, and costs nothing when the
               line wraps on a narrow screen. -->
          <span
            v-if="booking.status === 'cancelled'"
            class="ms-auto text-[11px] font-semibold text-chalk-600"
          >
            ملغى
          </span>
          <button
            v-else
            type="button"
            class="ms-auto text-[11px] font-semibold text-card-red hover:text-card-red/80 transition-colors cursor-pointer"
            @click="emit('cancel', booking)"
          >
            إلغاء
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>
