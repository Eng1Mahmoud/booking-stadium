import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'landing',
      component: () => import('@/views/LandingPage.vue'),
    },
    {
      path: '/book',
      name: 'booking',
      component: () => import('@/views/BookingPage.vue'),
    },
    // Unlinked from the public UI, reachable by typing the URL. The guard below,
    // not the missing link, is the access control.
    {
      path: '/admin/login',
      name: 'admin-login',
      component: () => import('@/views/AdminLogin.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/admin',
      name: 'admin-dashboard',
      component: () => import('@/views/AdminDashboard.vue'),
      meta: { requiresAuth: true },
    },
    {
      // Role-agnostic: /api/admins/me sits above the requireSuperAdmin gate.
      path: '/admin/account',
      name: 'admin-account',
      component: () => import('@/views/AdminAccount.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/admin/staff',
      name: 'admin-staff',
      component: () => import('@/views/AdminStaff.vue'),
      meta: { requiresAuth: true, requiresSuperAdmin: true },
    },
    {
      path: '/admin/settings',
      name: 'admin-settings',
      component: () => import('@/views/AdminSettings.vue'),
      meta: { requiresAuth: true, requiresSuperAdmin: true },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth) {
    if (!authStore.isAuthenticated()) {
      return { name: 'admin-login', query: { redirect: to.fullPath } }
    }
    // Also rejects a session whose account was deactivated mid-tab.
    if (!(await authStore.restoreSession())) {
      return { name: 'admin-login', query: { redirect: to.fullPath } }
    }
    // The API is the real gate — this only spares an admin a screen of 403s.
    if (to.meta.requiresSuperAdmin && !authStore.isSuperAdmin) {
      return { name: 'admin-dashboard' }
    }
  }

  if (to.meta.guestOnly && authStore.isAuthenticated()) {
    return { name: 'admin-dashboard' }
  }

  return true
})

export default router
