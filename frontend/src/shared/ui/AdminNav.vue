<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

/**
 * Superadmin-only destinations are absent for an admin, so nobody is offered a
 * tab that answers with a 403.
 *
 * Told rather than asking the auth store: anything under `shared/` that reached
 * into a feature would invert the dependency this layout exists to keep one-way.
 */
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

// Exact match: `/admin` is a sibling of the others, not their parent, so the
// router's prefix-based active class would light up two tabs at once.
const isCurrent = (to: string) => route.path === to
</script>

<template>
  <!-- The rule sits on the wrapper and the scroller is pulled a pixel over it,
       so nothing overflows the scroll box vertically. That matters: CSS forces
       overflow-y to `auto` the moment overflow-x stops being `visible`, and a
       single stray pixel is enough to raise a scrollbar. -->
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
