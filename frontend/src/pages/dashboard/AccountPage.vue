<script setup lang="ts">
import ProfileForm from '@/features/account/components/ProfileForm.vue'
import ChangePasswordForm from '@/features/account/components/ChangePasswordForm.vue'
import { useAuthStore } from '@/features/auth/store'
import { ROLE_LABEL } from '@/shared/labels'

const authStore = useAuthStore()
</script>

<template>
  <div class="mt-8">
    <!-- Who you are signed in as. It used to sit in this page's heading, which
         is now uniform with the other admin pages — but the role appears
         nowhere else in the app, so it stays here as ordinary content. -->
    <p v-if="authStore.role" class="text-sm text-chalk-400">
      <span class="font-mono ltr-embed">{{ authStore.username }}</span>
      &middot; {{ ROLE_LABEL[authStore.role] }}
    </p>

    <!-- Two panels side by side: on a laptop this page used to be one short
         column with two thirds of the screen empty beside it. -->
    <div class="mt-4 grid gap-6 lg:grid-cols-2 lg:items-start lg:gap-8">
      <ProfileForm />
      <ChangePasswordForm :username="authStore.username" />
    </div>
  </div>
</template>
