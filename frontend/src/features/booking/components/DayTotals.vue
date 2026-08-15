<script setup lang="ts">
import { computed } from 'vue'
import { formatMoney } from '@/utils/money'
import type { DayTotals } from '@/utils/agenda'

const props = defineProps<{
  totals: DayTotals
  currency: string
}>()

/** One decimal, trimmed — "3.5" but "4" rather than "4.0". */
const soldHours = computed(() => {
  const hours = props.totals.soldMinutes / 60
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(1)
})
</script>

<template>
  <div>
    <dl class="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <div class="rounded-lg border border-turf-700/60 bg-turf-900/60 px-3 py-3">
        <dd class="font-display text-xl font-black leading-tight tabular-nums text-chalk-50 sm:text-2xl">
          {{ totals.bookingsCount }}
        </dd>
        <dt class="mt-0.5 text-xs text-chalk-400">الحجوزات</dt>
      </div>

      <div class="rounded-lg border border-turf-700/60 bg-turf-900/60 px-3 py-3">
        <dd class="font-display text-xl font-black leading-tight tabular-nums text-chalk-50 sm:text-2xl">
          {{ soldHours }}
        </dd>
        <dt class="mt-0.5 text-xs text-chalk-400">الساعات المباعة</dt>
      </div>

      <div class="rounded-lg border border-turf-700/60 bg-turf-900/60 px-3 py-3">
        <!-- The one figure with no upper bound on its width: a five-digit
             takings line plus a currency word overruns a half-width tile on a
             narrow phone, so this tile alone is allowed to break onto two. -->
        <dd
          class="font-display text-xl font-black leading-tight tabular-nums wrap-anywhere text-grass-400 sm:text-2xl"
        >
          {{ formatMoney(totals.revenue, currency) }}
        </dd>
        <dt class="mt-0.5 text-xs text-chalk-400">الإيراد</dt>
      </div>

      <div class="rounded-lg border border-turf-700/60 bg-turf-900/60 px-3 py-3">
        <dd class="font-display text-xl font-black leading-tight tabular-nums text-chalk-50 sm:text-2xl">
          {{ totals.occupancy }}%
        </dd>
        <dt class="mt-0.5 text-xs text-chalk-400">الإشغال · من 24 ساعة</dt>
      </div>
    </dl>

    <!-- Stated plainly, because the two figures follow different rules. -->
    <p v-if="totals.hasSplit" class="mt-2 text-xs text-chalk-600">
      الساعات تُحتسب على اليوم الذي لُعبت فيه، والإيراد يُحتسب على يوم بداية الحجز.
    </p>
  </div>
</template>
