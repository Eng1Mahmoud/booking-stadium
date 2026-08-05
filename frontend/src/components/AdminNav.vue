<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'

/**
 * The staff area's own tab bar. Superadmin-only destinations are simply absent
 * for an admin, so nobody is offered a tab that answers with a 403.
 */
const authStore = useAuthStore()
const route = useRoute()

const links = computed(() => [
  { to: '/admin', label: 'الحجوزات' },
  ...(authStore.isSuperAdmin
    ? [
        { to: '/admin/staff', label: 'الموظفون' },
        { to: '/admin/settings', label: 'الإعدادات' },
      ]
    : []),
  { to: '/admin/account', label: 'حسابي' },
])

// Exact match: `/admin` is a sibling of the others, not their parent, so the
// router's own prefix-based active class would light up two tabs at once.
const isCurrent = (to: string) => route.path === to
</script>

<template>
  <nav class="flex gap-1 overflow-x-auto border-b border-turf-700/60">
    <RouterLink
      v-for="link in links"
      :key="link.to"
      :to="link.to"
      :aria-current="isCurrent(link.to) ? 'page' : undefined"
      class="-mb-px shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors"
      :class="
        isCurrent(link.to)
          ? 'border-grass-500 text-chalk-50'
          : 'border-transparent text-chalk-400 hover:text-chalk-50'
      "
    >
      {{ link.label }}
    </RouterLink>
  </nav>
</template>
