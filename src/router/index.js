import Vue from 'vue';
import Router from 'vue-router';
import Dashboard from '../views/Dashboard.vue';
import KRIPending from '../views/KRIPending.vue';
import Login from '../views/Login.vue';
import AdminManagement from '../views/AdminManagement.vue';
import NotFound from '../views/NotFound.vue';
import store from '../store';

Vue.use(Router);

const router = new Router({
  mode: 'history',
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: Login,
      meta: { 
        requiresAuth: false,
        redirectIfAuthenticated: true
      }
    },
    {
      path: '/',
      name: 'Dashboard',
      component: Dashboard,
      meta: { requiresAuth: false }
    },
    {
      path: '/kri/:id/:date',
      name: 'KRIDetail',
      component: () => import('../views/KRIDetail.vue'),
      props: true,
      meta: { requiresAuth: false }
    },
    {
      path: '/kri/pending',
      name: 'PendingKRIs',
      component: KRIPending,
      meta: { requiresAuth: true }
    },
    {
      path: '/admin',
      name: 'AdminManagement',
      component: AdminManagement,
      meta: { requiresAuth: true }
    },
    {
      path: '*',
      name: 'NotFound',
      component: NotFound,
      meta: { requiresAuth: false }
    }
  ]
});

// Navigation guards
router.beforeEach((to, from, next) => {
  // Restore user from sessionStorage if not already in state
  if (!store.getters['kri/isAuthenticated']) {
    store.dispatch('kri/restoreUserFromStorage');
  }

  const isAuthenticated = store.getters['kri/isAuthenticated'];
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
  const redirectIfAuthenticated = to.matched.some(record => record.meta.redirectIfAuthenticated);

  if (requiresAuth && !isAuthenticated) {
    // Redirect to login if route requires auth and user is not authenticated
    next({
      name: 'Login',
      query: { redirect: to.fullPath }
    });
  } else if (redirectIfAuthenticated && isAuthenticated) {
    // Redirect to dashboard if trying to access login while authenticated
    next({ path: '/' });
  } else {
    next();
  }
});

export default router;