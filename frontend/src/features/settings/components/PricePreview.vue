<script setup lang="ts">
import { computed } from 'vue'
import { formatDuration } from '@/shared/utils/time'
import { formatMoney, priceFor } from '@/shared/utils/money'

const props = defineProps<{
  rate: number | null
  currency: string
  isDirty: boolean
}>()

/** Four common lengths are more use than explaining the formula — the owner
 *  types a number and reads the bill. */
const rows = computed(() =>
  [60, 90, 120, 180].map((minutes) => ({
    minutes,
    label: formatDuration(minutes),
    amount: formatMoney(priceFor(minutes, props.rate ?? 0), props.currency),
  })),
)
</script>

<template>
  <div class="rounded-lg border border-turf-700/60 bg-turf-900/50 p-4 sm:p-6">
    <h2 class="font-display text-xl font-black text-chalk-50">ماذا يدفع اللاعب</h2>
    <p class="mt-1.5 text-sm text-chalk-400">
      <span v-if="isDirty" class="text-card-yellow">معاينة للسعر الجديد قبل الحفظ.</span>
      <span v-else>الأسعار المعمول بها الآن.</span>
    </p>

    <dl class="mt-5 divide-y divide-turf-700/60">
      <div
        v-for="row in rows"
        :key="row.minutes"
        class="flex items-baseline justify-between gap-4 py-3"
      >
        <dt class="text-sm text-chalk-300">{{ row.label }}</dt>
        <dd class="font-mono text-lg font-semibold tabular-nums text-grass-400">
          {{ row.amount }}
        </dd>
      </div>
    </dl>

    <p class="mt-4 text-xs text-chalk-600">
      نصف الساعة تُحتسب بنصف السعر، والدفع نقدًا عند الوصول.
    </p>
  </div>
</template>
