import Vue from 'vue';
import Router from 'vue-router';
import Dashboard from '../views/Dashboard.vue';
import KRIPending from '../views/KRIPending.vue';
import KRIDetail from '../views/KRIDetail.vue';
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
      component: KRIDetail,
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
router.beforeEach(async (to, from, next) => {
  // Restore user from sessionStorage if not already in state
  if (!store.getters['kri/isAuthenticated']) {
    await store.dispatch('kri/restoreUserFromStorage');
  }

  const isAuthenticated = store.getters['kri/isAuthenticated'];
  const currentUser = store.getters['kri/currentUser'];
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
  const redirectIfAuthenticated = to.matched.some(record => record.meta.redirectIfAuthenticated);

  // Enhanced authentication checks
  if (requiresAuth && !isAuthenticated) {
    // Redirect to login if route requires auth and user is not authenticated
    next({
      name: 'Login',
      query: { redirect: to.fullPath }
    });
    return;
  }

  if (redirectIfAuthenticated && isAuthenticated) {
    // Redirect to dashboard if trying to access login while authenticated
    next({ path: '/' });
    return;
  }

  // Department-based access control validation
  if (isAuthenticated && currentUser) {
    // Validate user has required department information for data access
    if (!currentUser.department || currentUser.department.trim() === '') {
      console.warn('Authenticated user missing department information');
      // Allow access but log warning - user will see no data due to service-level filtering
    }

    // Initialize permissions if not already loaded and user is authenticated
    if ((!currentUser.permissions || currentUser.permissions.length === 0) && 
        to.name !== 'Login') {
      try {
        await store.dispatch('kri/initPermission');
      } catch (error) {
        console.error('Error initializing user permissions in router:', error);
        // Continue navigation - permissions will be handled at component level
      }
    }
  }

  // Additional security check for sensitive routes
  if (to.name === 'AdminManagement' && isAuthenticated) {
    // Admin route requires additional validation - could add role-based checks here
    if (!currentUser || !currentUser.department) {
      next({
        name: 'Dashboard',
        query: { error: 'insufficient_permissions' }
      });
      return;
    }
  }

  next();
});

export default router;