import { createRouter, createWebHistory } from 'vue-router'
import AdminLayout from '@/layouts/AdminLayout.vue'
import { useAuthStore } from '@/features/auth/store'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    requiresAuth?: boolean
    requiresSuperAdmin?: boolean
    guestOnly?: boolean
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'landing',
      component: () => import('@/pages/public/HomePage.vue'),
    },
    {
      path: '/book',
      name: 'booking',
      component: () => import('@/pages/public/BookingPage.vue'),
    },

    {
      path: '/admin/login',
      name: 'admin-login',
      component: () => import('@/pages/dashboard/LoginPage.vue'),
      meta: { guestOnly: true },
    },
    {
      
      path: '/admin',
      component: AdminLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'admin-dashboard',
          component: () => import('@/pages/dashboard/SchedulePage.vue'),
          meta: { title: 'مباريات اليوم' },
        },
        {
          // Role-agnostic: /api/admins/me sits above the requireSuperAdmin gate.
          path: 'account',
          name: 'admin-account',
          component: () => import('@/pages/dashboard/AccountPage.vue'),
          meta: { title: 'حسابي' },
        },
        {
          path: 'staff',
          name: 'admin-staff',
          component: () => import('@/pages/dashboard/StaffPage.vue'),
          meta: { title: 'الموظفون', requiresSuperAdmin: true },
        },
        {
          path: 'settings',
          name: 'admin-settings',
          component: () => import('@/pages/dashboard/SettingsPage.vue'),
          meta: { title: 'الإعدادات', requiresSuperAdmin: true },
        },
      ],
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
