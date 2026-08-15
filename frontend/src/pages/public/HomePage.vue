<script setup lang="ts">
import { RouterLink } from 'vue-router'

// A real sequence — the player performs these in order — so numbering them
// carries information rather than decorating the section.
const STEPS = [
  { title: 'اختر اليوم', body: 'التقويم يعرض الأيام المتاحة للحجز فقط.' },
  {
    title: 'اختر موعد الانطلاق',
    body: 'كل حجز ساعة كاملة. المواعيد المحجوزة أو المنتهية تظهر مغلقة.',
  },
  { title: 'أكّد الحجز', body: 'اسمك ورقمك فقط — نتصل بك لو تغيّر أي شيء.' },
]

const FACTS = [
  { value: '24 ساعة', label: 'مفتوح كل يوم بلا توقف', mono: false },
  { value: 'نقدًا عند الوصول', label: 'بدون دفع مسبق', mono: false },
  { value: 'اسمك ورقمك', label: 'بدون إنشاء حساب', mono: false },
]

const FEATURES = [
  { title: 'عشب صناعي', body: 'أرضية ثابتة تصلح للعب طوال السنة.' },
  { title: 'إضاءة كاملة', body: 'نلعب بعد المغرب بنفس وضوح النهار.' },
  { title: 'غرف تغيير', body: 'مع دورات مياه نظيفة.' },
  { title: 'مواقف مجانية', body: 'أمام البوابة مباشرة.' },
  { title: 'كرات متاحة', body: 'لو نسيت كرتك، عندنا واحدة.' },
  { title: 'ملعب واحد', body: 'حجز واحد في الساعة — الملعب لك وحدك.' },
]
</script>

<template>
  <div>
    <!-- Hero: the pitch itself, seen from the floodlights. The gradient anchors
         the bloom and lets the pitch bleed past the content column. -->
    <section
      class="relative isolate overflow-hidden bg-linear-to-b from-turf-800/55 to-transparent to-70%"
    >
      <div
        class="floodlight-bloom pointer-events-none absolute inset-x-0 top-[-30%] h-[90%]"
        aria-hidden="true"
      />

      <svg
        class="mask-pitch animate-pitch-in absolute inset-0 h-full w-full text-chalk-50 opacity-[0.09]"
        viewBox="0 0 105 68"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        focusable="false"
      >
        <g fill="none" stroke="currentColor" stroke-width="0.22">
          <rect x="2" y="2" width="101" height="64" />
          <line x1="52.5" y1="2" x2="52.5" y2="66" />
          <circle cx="52.5" cy="34" r="9.15" />
          <rect x="2" y="13.84" width="16.5" height="40.32" />
          <rect x="86.5" y="13.84" width="16.5" height="40.32" />
          <rect x="2" y="24.84" width="5.5" height="18.32" />
          <rect x="97.5" y="24.84" width="5.5" height="18.32" />
          <path d="M2 3 A1 1 0 0 0 3 2" />
          <path d="M102 2 A1 1 0 0 0 103 3" />
          <path d="M3 66 A1 1 0 0 0 2 65" />
          <path d="M103 65 A1 1 0 0 0 102 66" />
        </g>
        <g fill="currentColor">
          <circle cx="52.5" cy="34" r="0.45" />
          <circle cx="15.2" cy="34" r="0.45" />
          <circle cx="89.8" cy="34" r="0.45" />
        </g>
      </svg>

      <div class="relative mx-auto max-w-5xl px-5 py-24 text-center sm:py-32">
        <p class="animate-reveal-up text-xs font-semibold text-grass-400 [animation-delay:0.15s]">
          ملعب واحد · عشب صناعي · إضاءة ليلية
        </p>

        <h1
          class="animate-reveal-up mt-4 font-display text-5xl font-black leading-[1.15] text-chalk-50 [animation-delay:0.28s] sm:text-7xl"
        >
          احجز الملعب<br />الليلة
        </h1>

        <p
          class="animate-reveal-up mx-auto mt-6 max-w-lg text-lg leading-relaxed text-chalk-300 [animation-delay:0.42s]"
        >
          اختر اليوم والوقت، اكتب اسمك ورقمك، وتعال العب. بدون حساب وبدون دفع مقدّم.
        </p>

        <div class="animate-reveal-up mt-9 [animation-delay:0.56s]">
          <RouterLink
            to="/book"
            class="inline-flex items-center justify-center rounded-md bg-grass-500 px-9 py-3.5 text-lg font-bold text-turf-950 shadow-[0_0_32px_-6px_rgba(52,201,122,0.6)] transition-colors hover:bg-grass-400"
          >
            احجز الآن
          </RouterLink>
          <p class="mt-4 text-xs text-chalk-600">مفتوح 24 ساعة — احجز أي وقت</p>
        </div>
      </div>
    </section>

    <!-- Facts -->
    <section class="mx-auto max-w-5xl px-5">
      <div class="grid divide-y divide-turf-700/60 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div v-for="fact in FACTS" :key="fact.label" class="px-2 py-7 text-center">
          <p
            class="text-xl font-bold text-chalk-50"
            :class="fact.mono && 'font-mono tabular-nums ltr-embed'"
          >
            {{ fact.value }}
          </p>
          <p class="mt-1.5 text-sm text-chalk-400">{{ fact.label }}</p>
        </div>
      </div>
    </section>

    <div
      class="relative mx-auto h-px max-w-5xl bg-turf-700 opacity-60 after:absolute after:top-1/2 after:left-1/2 after:h-9 after:w-9 after:-translate-x-1/2 after:-translate-y-1/2 after:rounded-full after:border after:border-turf-700 after:bg-turf-950 after:content-['']"
      aria-hidden="true"
    />

    <!-- How it works -->
    <section class="mx-auto max-w-5xl px-5 py-16">
      <h2 class="font-display text-3xl font-black text-chalk-50">الحجز في ثلاث خطوات</h2>
      <ol class="mt-9 grid gap-8 sm:grid-cols-3">
        <li v-for="(step, index) in STEPS" :key="step.title">
          <span
            class="grid h-9 w-9 place-items-center rounded-full border border-grass-500/50 font-mono text-sm text-grass-400"
            aria-hidden="true"
          >
            {{ index + 1 }}
          </span>
          <h3 class="mt-4 text-lg font-bold text-chalk-50">{{ step.title }}</h3>
          <p class="mt-1.5 leading-relaxed text-chalk-400">{{ step.body }}</p>
        </li>
      </ol>
    </section>

    <div
      class="relative mx-auto h-px max-w-5xl bg-turf-700 opacity-60 after:absolute after:top-1/2 after:left-1/2 after:h-9 after:w-9 after:-translate-x-1/2 after:-translate-y-1/2 after:rounded-full after:border after:border-turf-700 after:bg-turf-950 after:content-['']"
      aria-hidden="true"
    />

    <!-- On the pitch -->
    <section class="mx-auto max-w-5xl px-5 py-16">
      <h2 class="font-display text-3xl font-black text-chalk-50">في الملعب</h2>
      <ul class="mt-9 grid gap-x-8 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
        <li
          v-for="feature in FEATURES"
          :key="feature.title"
          class="border-t border-turf-700/60 pt-4"
        >
          <h3 class="font-bold text-chalk-50">{{ feature.title }}</h3>
          <p class="mt-1 text-sm leading-relaxed text-chalk-400">{{ feature.body }}</p>
        </li>
      </ul>
    </section>

    <!-- Closing call -->
    <section class="mx-auto max-w-5xl px-5 pb-20">
      <div
        class="rounded-xl border border-grass-500/25 bg-grass-500/[0.07] px-6 py-12 text-center sm:px-12"
      >
        <h2 class="font-display text-3xl font-black text-chalk-50 sm:text-4xl">
          الملعب فاضي دلوقتي
        </h2>
        <p class="mx-auto mt-3 max-w-md leading-relaxed text-chalk-300">
          حجز واحد في كل ساعة — الملعب لك ولأصحابك وحدكم.
        </p>
        <RouterLink
          to="/book"
          class="mt-7 inline-flex items-center justify-center rounded-md bg-grass-500 px-9 py-3.5 text-lg font-bold text-turf-950 transition-colors hover:bg-grass-400"
        >
          احجز الآن
        </RouterLink>
      </div>
    </section>
  </div>
</template>
