<script setup lang="ts">
import { computed } from 'vue'
import dayjs from 'dayjs'
import { formatDuration, formatTimeRange, toMinutes } from '@/utils/time'
import { formatMoney } from '@/utils/money'
import type { AgendaBand } from '@/utils/agenda'
import type { Booking } from '@/types'

const props = defineProps<{
  /** The page derives the day's totals from these too, so the schedule and the
   *  figures can't disagree. */
  bands: AgendaBand[]
  date: string
  currency: string
  loading?: boolean
}>()

const emit = defineEmits<{
  cancel: [booking: Booking]
  unblock: [id: string]
  pickFree: [range: { startTime: string; endTime: string }]
  blockRange: [range: { startTime: string; endTime: string }]
}>()

/** From the clock rather than the last elapsed band, so a booking interrupting
 *  the elapsed stretch can't misplace it. */
const nowBoundary = computed(() => {
  const now = dayjs()
  if (props.date !== now.format('YYYY-MM-DD')) return null
  const minutes = now.hour() * 60 + now.minute()
  return props.bands.find((band) => toMinutes(band.startTime) >= minutes)?.key ?? null
})

const RAIL: Record<AgendaBand['kind'], string> = {
  free: 'bg-grass-500',
  booked: 'bg-card-red',
  blocked: 'bg-card-yellow',
  past: 'bg-turf-700',
}
</script>

<template>
  <div>
    <div v-if="loading" class="space-y-2" aria-hidden="true">
      <div v-for="n in 5" :key="n" class="h-16 rounded-lg bg-turf-800/60 animate-pulse" />
    </div>

    <p
      v-else-if="bands.length === 0"
      class="rounded-lg border border-turf-700/60 bg-turf-900 px-4 py-8 text-center text-sm text-chalk-400"
    >
      لا توجد بيانات لهذا اليوم.
    </p>

    <ul v-else class="space-y-2">
      <template v-for="band in bands" :key="band.key">
        <li v-if="band.key === nowBoundary" class="flex items-center gap-2 pt-1" aria-hidden="true">
          <span class="h-px flex-1 bg-grass-500/50" />
          <span class="text-[11px] font-semibold text-grass-400">الآن</span>
          <span class="h-px flex-1 bg-grass-500/50" />
        </li>

        <li
          class="flex items-stretch gap-3 overflow-hidden rounded-lg border"
          :class="{
            'border-card-red-dim/50 bg-turf-900': band.kind === 'booked',
            'border-card-yellow-dim/50 bg-turf-900': band.kind === 'blocked',
            'border-turf-800 bg-turf-950/40': band.kind === 'past',
            'border-turf-700/60 bg-turf-900': band.kind === 'free',
          }"
        >
          <span class="w-1.5 shrink-0" :class="RAIL[band.kind]" aria-hidden="true" />

          <!-- Free time: the whole card books it, and إغلاق closes it. -->
          <template v-if="band.kind === 'free'">
            <button
              type="button"
              class="flex min-h-11 flex-1 flex-wrap items-center gap-x-3 gap-y-1 px-2 py-2.5 text-start transition-colors cursor-pointer hover:bg-turf-800"
              @click="emit('pickFree', { startTime: band.startTime, endTime: band.endTime })"
            >
              <span class="text-sm font-medium tabular-nums text-chalk-50">
                {{ formatTimeRange(band.startTime, band.endTime) }}
              </span>
              <span class="text-xs text-chalk-400">{{ formatDuration(band.minutes) }}</span>
              <span class="text-xs font-semibold text-grass-400">متاح</span>
            </button>
            <button
              type="button"
              class="shrink-0 px-3 text-[11px] font-semibold text-chalk-400 transition-colors hover:text-card-yellow cursor-pointer"
              @click="emit('blockRange', { startTime: band.startTime, endTime: band.endTime })"
            >
              إغلاق
            </button>
          </template>

          <!-- A record, not a control: both panels refuse hours that have gone,
               so tapping one would open a form that can't accept it. -->
          <template v-else-if="band.kind === 'past'">
            <span class="flex flex-1 flex-wrap items-center gap-x-3 gap-y-1 px-2 py-2.5">
              <span class="text-sm font-medium tabular-nums text-chalk-600">
                {{ formatTimeRange(band.startTime, band.endTime) }}
              </span>
              <span class="text-xs text-chalk-600">{{ formatDuration(band.minutes) }}</span>
              <span class="text-xs font-semibold text-chalk-600">انتهى</span>
            </span>
          </template>

          <template v-else-if="band.booking">
            <span class="min-w-0 flex-1 px-2 py-2.5">
              <span class="block truncate text-sm font-bold text-chalk-50">
                {{ band.booking.playerName }}
              </span>
              <span class="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span class="text-xs tabular-nums text-chalk-300">
                  {{ formatTimeRange(band.booking.startTime, band.booking.endTime) }}
                </span>
                <span class="text-xs text-chalk-400">
                  {{ formatDuration(band.booking.durationMinutes) }}
                </span>
                <span class="font-mono text-xs text-chalk-400 ltr-embed">
                  {{ band.booking.playerPhone }}
                </span>
                <span class="text-sm font-bold tabular-nums text-grass-400">
                  {{ formatMoney(band.booking.price, currency) }}
                </span>
                <span class="text-[10px] text-chalk-600">
                  {{ band.booking.bookingSource === 'manual' ? 'حضوري' : 'إلكتروني' }}
                </span>
                <span v-if="band.startedEarlier" class="text-[10px] text-card-yellow">بدأ أمس</span>
                <span v-if="band.endsLater" class="text-[10px] text-card-yellow">
                  يمتد بعد منتصف الليل
                </span>
              </span>
            </span>
            <button
              type="button"
              class="shrink-0 px-3 text-[11px] font-semibold text-card-red transition-colors hover:text-card-red/80 cursor-pointer"
              @click="emit('cancel', band.booking)"
            >
              إلغاء
            </button>
          </template>

          <template v-else-if="band.blocked">
            <span class="min-w-0 flex-1 px-2 py-2.5">
              <span class="block text-sm font-bold text-card-yellow">مغلق</span>
              <span class="mt-0.5 flex flex-wrap items-center gap-x-2">
                <span class="text-xs tabular-nums text-chalk-300">
                  {{ formatTimeRange(band.blocked.startTime, band.blocked.endTime) }}
                </span>
                <span v-if="band.blocked.reason" class="truncate text-xs text-chalk-400">
                  {{ band.blocked.reason }}
                </span>
              </span>
            </span>
            <button
              type="button"
              class="shrink-0 px-3 text-[11px] font-semibold text-chalk-400 transition-colors hover:text-chalk-50 cursor-pointer"
              @click="emit('unblock', band.blocked._id)"
            >
              فتح
            </button>
          </template>
        </li>
      </template>
    </ul>
  </div>
</template>
