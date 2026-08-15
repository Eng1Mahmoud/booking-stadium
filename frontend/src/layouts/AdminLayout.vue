<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import AdminNav from '@/shared/ui/AdminNav.vue'
import { useAuthStore } from '@/features/auth/store'

/**
 * The staff area's shell. Its pages are route children, so none of them mentions
 * this file — a new admin page gets the chrome by being routed here, rather than
 * by remembering to wrap itself.
 *
 * It lives in `layouts/` rather than `shared/ui/` because it reads the auth
 * store, and nothing under `shared/` may import from a feature.
 *
 * The title comes from route meta rather than from the page: a child cannot fill
 * a slot in its parent, since no template writes `<AdminLayout>` around it — the
 * router does. Meta is what lets the heading stay above the nav.
 */
const route = useRoute()
const authStore = useAuthStore()

const title = computed(() => route.meta.title ?? '')
</script>

<template>
  <section class="mx-auto max-w-6xl px-5 py-8 sm:py-12">
    <p class="text-xs font-semibold text-grass-400">التحكم بالملعب</p>
    <h1 class="mt-2 font-display text-4xl font-black sm:text-5xl">{{ title }}</h1>

    <AdminNav class="mt-6" :is-super-admin="authStore.isSuperAdmin" />

    <RouterView />
  </section>
</template>
