<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/features/auth/store'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

const username = ref('')
const password = ref('')

async function handleSubmit() {
  const ok = await authStore.login(username.value.trim(), password.value)
  if (ok) {
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/admin'
    router.push(redirect)
  }
}
</script>

<template>
  <!-- Two columns rather than one narrow card adrift in an empty screen. The
       second half carries the pitch markings the landing page opens with, so
       the staff door looks like the same building. -->
  <section
    class="mx-auto grid max-w-6xl gap-10 px-5 py-12 lg:grid-cols-2 lg:items-center lg:gap-16 lg:py-20"
  >
    <div class="w-full max-w-sm">
      <p class="text-xs font-semibold text-grass-400">بوابة الموظفين</p>
      <h1 class="mt-2 font-display text-3xl font-black">التحكم بالملعب</h1>
      <p class="mt-2 text-sm text-chalk-400">سجّل الدخول لإدارة حجوزات اليوم.</p>

      <form class="mt-8 space-y-4" novalidate @submit.prevent="handleSubmit">
        <div class="space-y-1.5">
          <label for="username" class="block text-sm font-medium text-chalk-300">
            اسم المستخدم
          </label>
          <input
            id="username"
            v-model="username"
            type="text"
            dir="ltr"
            autocomplete="username"
            required
            class="w-full rounded-md border border-turf-600 bg-turf-950 px-3 py-2.5 text-end font-mono text-chalk-50 focus-visible:border-grass-400"
          />
        </div>

        <div class="space-y-1.5">
          <label for="password" class="block text-sm font-medium text-chalk-300">كلمة المرور</label>
          <input
            id="password"
            v-model="password"
            type="password"
            dir="ltr"
            autocomplete="current-password"
            required
            class="w-full rounded-md border border-turf-600 bg-turf-950 px-3 py-2.5 text-end text-chalk-50 focus-visible:border-grass-400"
          />
        </div>

        <p
          v-if="authStore.error"
          class="rounded-md bg-card-red-dim/40 px-3 py-2 text-sm text-card-red"
        >
          {{ authStore.error }}
        </p>

        <button
          type="submit"
          :disabled="authStore.isLoading"
          class="inline-flex w-full items-center justify-center rounded-md bg-grass-500 px-5 py-2.5 font-medium text-turf-950 transition-colors hover:bg-grass-400 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
        >
          {{ authStore.isLoading ? 'جارٍ تسجيل الدخول…' : 'تسجيل الدخول' }}
        </button>
      </form>
    </div>

    <div
      class="relative isolate hidden overflow-hidden rounded-xl border border-turf-700/60 bg-turf-900/40 p-10 lg:block"
    >
      <svg
        class="mask-card absolute inset-0 h-full w-full text-chalk-50 opacity-[0.07]"
        viewBox="0 0 60 68"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        focusable="false"
      >
        <g fill="none" stroke="currentColor" stroke-width="0.3">
          <rect x="2" y="2" width="56" height="64" />
          <circle cx="30" cy="34" r="9.15" />
          <line x1="2" y1="34" x2="58" y2="34" />
          <rect x="14" y="2" width="32" height="11" />
          <rect x="14" y="55" width="32" height="11" />
        </g>
      </svg>

      <div class="relative">
        <p class="font-display text-3xl font-black leading-snug text-chalk-50">
          الملعب لا يُغلق.<br />ولا لوحة التحكم.
        </p>
        <p class="mt-4 max-w-sm leading-relaxed text-chalk-400">
          سجّل الدخول لترى جدول اليوم كاملًا، وتضيف الحجوزات الحضورية، وتغلق الساعات التي لا يُلعب
          فيها.
        </p>
      </div>
    </div>
  </section>
</template>
