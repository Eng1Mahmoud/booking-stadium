<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import PriceForm from '@/features/settings/components/PriceForm.vue'
import PricePreview from '@/features/settings/components/PricePreview.vue'
import WorkingHoursForm from '@/features/settings/components/WorkingHoursForm.vue'
import { useSiteConfig } from '@/features/settings/queries/useSiteConfig'

const { data: config } = useSiteConfig()

// Held here rather than inside PriceForm because the preview card beside it
// reads the same draft — the one piece of state the two genuinely share.
const priceDraft = ref<number | null>(null)
const currencyDraft = ref('')

const isDirty = computed(
  () =>
    !!config.value &&
    (priceDraft.value !== config.value.pricePerHour ||
      currencyDraft.value.trim() !== config.value.currency),
)

function resetPrice() {
  priceDraft.value = config.value?.pricePerHour ?? null
  currencyDraft.value = config.value?.currency ?? ''
}

// The draft seeds from the cache, which may arrive after mount.
watch(config, resetPrice, { immediate: true })
</script>

<template>
  <div class="mt-8 grid gap-6 lg:grid-cols-2 lg:items-start lg:gap-8">
    <PriceForm
      v-model:price="priceDraft"
      v-model:currency="currencyDraft"
      :is-dirty="isDirty"
      @reset="resetPrice"
    />
    <PricePreview :rate="priceDraft" :currency="currencyDraft.trim() || config?.currency || ''" :is-dirty="isDirty" />
    <WorkingHoursForm :saved="config" />
  </div>
</template>
