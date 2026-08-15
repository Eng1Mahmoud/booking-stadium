<script setup lang="ts">
import { computed, ref } from 'vue'
import { useUpdateSettings } from '@/features/settings/queries/mutations'
import { useSubmit } from '@/shared/composables/useSubmit'
import { priceSchema } from '@/features/settings/schemas/settings'

/** The drafts live in the parent because the preview card beside this one shows
 *  them too — genuinely shared state rather than plumbing. */
const price = defineModel<number | null>('price', { required: true })
const currency = defineModel<string>('currency', { required: true })

const props = defineProps<{ isDirty: boolean }>()
const emit = defineEmits<{ reset: [] }>()

const saveSettings = useUpdateSettings()
const { isSubmitting, error, submit } = useSubmit(priceSchema)
const message = ref<string | null>(null)

const isValid = computed(
  () => priceSchema.safeParse({ pricePerHour: price.value, currency: currency.value }).success,
)

async function save() {
  if (!isValid.value) return
  message.value = null

  const ok = await submit(
    { pricePerHour: Math.round(price.value ?? 0), currency: currency.value },
    (input) => saveSettings.mutateAsync(input),
  )
  if (ok) message.value = 'تم حفظ السعر.'
}

function undo() {
  message.value = null
  emit('reset')
}
</script>

<template>
  <form
    class="rounded-lg border border-turf-700/60 bg-turf-900 p-4 sm:p-6"
    novalidate
    @submit.prevent="save"
  >
    <h2 class="font-display text-xl font-black text-chalk-50">سعر الساعة</h2>
    <p class="mt-1.5 text-sm text-chalk-400">
      يُطبَّق على الحجوزات الجديدة فقط. الحجوزات القائمة تحتفظ بالسعر الذي دُفع عليه.
    </p>

    <div class="mt-5 grid gap-4 sm:grid-cols-[1fr_9rem]">
      <div class="space-y-1.5">
        <label for="pricePerHour" class="block text-sm font-medium text-chalk-300">السعر</label>
        <input
          id="pricePerHour"
          v-model.number="price"
          type="number"
          min="0"
          step="1"
          dir="ltr"
          class="w-full rounded-md border border-turf-600 bg-turf-950 px-3 py-2.5 text-end font-mono text-lg tabular-nums text-chalk-50 focus-visible:border-grass-400"
        />
      </div>
      <div class="space-y-1.5">
        <label for="currency" class="block text-sm font-medium text-chalk-300">العملة</label>
        <input
          id="currency"
          v-model="currency"
          type="text"
          maxlength="10"
          class="w-full rounded-md border border-turf-600 bg-turf-950 px-3 py-2.5 text-lg text-chalk-50 focus-visible:border-grass-400"
        />
      </div>
    </div>

    <p v-if="message" class="mt-4 text-sm text-grass-400">{{ message }}</p>
    <p v-if="error" class="mt-4 rounded-md bg-card-red-dim/40 px-3 py-2 text-sm text-card-red">
      {{ error }}
    </p>

    <div class="mt-5 flex items-center gap-3">
      <button
        type="submit"
        :disabled="isSubmitting || !isValid || !props.isDirty"
        class="inline-flex items-center justify-center rounded-md bg-grass-500 px-5 py-2.5 font-medium text-turf-950 transition-colors hover:bg-grass-400 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
      >
        {{ isSubmitting ? 'جارٍ الحفظ…' : 'حفظ السعر' }}
      </button>
      <button
        v-if="props.isDirty"
        type="button"
        class="text-sm text-chalk-400 transition-colors hover:text-chalk-50 cursor-pointer"
        @click="undo"
      >
        تراجع
      </button>
    </div>
  </form>
</template>
