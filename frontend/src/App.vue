<script setup lang="ts">
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

async function handleLogout() {
  // Awaited so we leave only once the server has actually cleared the cookie.
  await authStore.logout()
  // Leave the dashboard explicitly — clearing the session alone doesn't re-run the guard.
  router.push('/')
}
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <header class="border-b border-turf-700/60">
      <!-- Wraps rather than overflowing: signed in as a superadmin the nav runs
           to three items, which together with the wordmark needs more than a
           360px phone has. -->
      <div
        class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-4"
      >
        <RouterLink to="/" class="flex shrink-0 items-center gap-2 group">
          <span
            class="h-2.5 w-2.5 rounded-full bg-grass-400 shadow-[0_0_10px_2px_rgba(99,230,160,0.6)] group-hover:bg-grass-500 transition-colors"
            aria-hidden="true"
          />
          <span class="font-display font-black text-lg">ملعب واحد</span>
        </RouterLink>

        <!-- No staff link here by design: the dashboard is reached by URL only,
             so players never see a door they can't open. -->
        <nav
          class="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium text-chalk-400"
        >
          <template v-if="authStore.isAuthenticated()">
            <!-- Redundant on the staff pages, which carry their own tab bar, so
                 it only appears where there is no other way back. -->
            <RouterLink
              v-if="!String(route.name ?? '').startsWith('admin')"
              to="/admin"
              class="transition-colors hover:text-chalk-50"
            >
              لوحة التحكم
            </RouterLink>
            <!-- Always visible: on a phone this is the only route to the
                 account screen, and phones are the primary device here. -->
            <RouterLink
              to="/admin/account"
              class="min-w-0 max-w-40 truncate transition-colors hover:text-chalk-50"
            >
              {{ authStore.displayName ?? 'حسابي' }}
            </RouterLink>
            <button
              type="button"
              class="shrink-0 hover:text-card-red transition-colors cursor-pointer"
              @click="handleLogout"
            >
              تسجيل الخروج
            </button>
          </template>
          <RouterLink
            v-else-if="route.name === 'landing'"
            to="/book"
            class="rounded-md bg-grass-500 px-4 py-2 font-bold text-turf-950 transition-colors hover:bg-grass-400"
          >
            احجز الآن
          </RouterLink>
        </nav>
      </div>
    </header>

    <main class="flex-1">
      <RouterView />
    </main>

    <footer class="border-t border-turf-700/60 py-6">
      <p class="mx-auto max-w-6xl px-5 text-xs text-chalk-600">
        ملعب واحد &middot; الدفع نقدًا عند الوصول &middot; ملعب واحد، حجز واحد في كل مرة
      </p>
    </footer>
  </div>
</template>
