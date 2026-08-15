<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'


const props = defineProps<{ isSuperAdmin: boolean }>()

const route = useRoute()

const links = computed(() => [
  { to: '/admin', label: 'الحجوزات' },
  ...(props.isSuperAdmin
    ? [
        { to: '/admin/staff', label: 'الموظفون' },
        { to: '/admin/settings', label: 'الإعدادات' },
      ]
    : []),
  { to: '/admin/account', label: 'حسابي' },
])


const isCurrent = (to: string) => route.path === to
</script>

<template>
  <div class="border-b border-turf-700/60">
    <nav class="-mb-px flex gap-1 overflow-x-auto overflow-y-hidden">
      <RouterLink
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        :aria-current="isCurrent(link.to) ? 'page' : undefined"
        class="shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors"
        :class="
          isCurrent(link.to)
            ? 'border-grass-500 text-chalk-50'
            : 'border-transparent text-chalk-400 hover:text-chalk-50'
        "
      >
        {{ link.label }}
      </RouterLink>
    </nav>
  </div>
</template>
