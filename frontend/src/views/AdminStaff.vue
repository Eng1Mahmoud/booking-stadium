<script setup lang="ts">
import StaffManager from '@/components/StaffManager.vue'
import AdminNav from '@/components/AdminNav.vue'
</script>

<template>
  <section class="mx-auto max-w-6xl px-5 py-8 sm:py-12">
    <p class="text-xs font-semibold text-grass-400">التحكم بالملعب</p>
    <h1 class="mt-2 font-display text-4xl font-black sm:text-5xl">الموظفون</h1>

    <AdminNav class="mt-6" />

    <StaffManager class="mt-8" />
  </section>
</template>
