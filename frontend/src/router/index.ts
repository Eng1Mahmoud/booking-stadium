import { createRouter, createWebHistory } from 'vue-router'
import AdminLayout from '@/layouts/AdminLayout.vue'
import { useAuthStore } from '@/features/auth/store'

/** Typed so the guard and the layout read real fields rather than `unknown`, and
 *  a mistyped key fails the build instead of rendering an empty heading. */
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
    // Outside the admin layout on purpose: it is the one staff screen that must
    // render without the shell, since nobody is signed in yet.
    {
      path: '/admin/login',
      name: 'admin-login',
      component: () => import('@/pages/dashboard/LoginPage.vue'),
      meta: { guestOnly: true },
    },
    {
      // Unlinked from the public UI, reachable by typing the URL. The guard
      // below, not the missing link, is the access control.
      //
      // Deliberately unnamed: naming a route that has children is ambiguous
      // about which one it resolves to. `requiresAuth` sits here because Vue
      // Router merges every matched record's meta into `to.meta`, so all four
      // children inherit it and the guard needs no knowledge of the nesting.
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
