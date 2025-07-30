import Vue from 'vue';
import Router from 'vue-router';
import Dashboard from '../views/Dashboard.vue';
import KRIPending from '../views/KRIPending.vue';
import KRIDetail from '../views/KRIDetail.vue';
import Login from '../views/Login.vue';
import AdminManagement from '../views/AdminManagement.vue';
import NotFound from '../views/NotFound.vue';
import store from '../store';
import Permission from '../utils/permission';

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
      meta: { 
        requiresAuth: true,
        requiresRole: 'admin'
      }
    },
    {
      path: '/dept-admin',
      name: 'DepartmentAdmin',
      component: AdminManagement,
      meta: { 
        requiresAuth: true,
        requiresRole: 'dept_admin'
      }
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

  // Role-based access control for admin routes
  const requiredRole = to.matched.find(record => record.meta.requiresRole)?.meta.requiresRole;
  if (requiredRole && isAuthenticated && currentUser) {
    let hasRequiredRole = false;
    
    switch (requiredRole) {
    case 'admin':
      hasRequiredRole = Permission.isSystemAdmin(currentUser);
      break;
    case 'dept_admin':
      hasRequiredRole = Permission.isDepartmentAdmin(currentUser) || Permission.isSystemAdmin(currentUser);
      break;
    default:
      hasRequiredRole = false;
    }
    
    if (!hasRequiredRole) {
      console.warn(`Access denied to ${to.path}: User ${currentUser.user_id} lacks required role: ${requiredRole}`);
      next({
        name: 'Dashboard',
        query: { error: 'insufficient_permissions' }
      });
      return;
    }
  }

  // KRI-level permission check for KRI detail routes
  if (to.name === 'KRIDetail' && isAuthenticated && currentUser) {
    const kriId = to.params.id;
    const userPermissions = currentUser.permissions || [];
    
    // Prevent redirect loops - if we're already coming from a permission error, allow navigation
    if (from.name === 'Dashboard' && from.query.error === 'kri_access_denied' && from.query.kriId === kriId) {
      console.warn(`Permission check loop detected for KRI ${kriId}, allowing navigation to prevent infinite loop`);
      next();
      return;
    }
    
    // Only check permissions if permissions are loaded (non-empty array with valid permission records)
    if (userPermissions.length > 0 && Permission.findKRIPermissions(userPermissions, kriId).length > 0) {
      // Check if user has view permission for this specific KRI
      if (!Permission.canView(kriId, null, userPermissions)) {
        console.warn(`Access denied to KRI ${kriId}: User ${currentUser.user_id} lacks view permission`);
        next({
          name: 'Dashboard',
          query: { error: 'kri_access_denied', kriId: kriId }
        });
        return;
      }
    } else {
      // Permissions not fully loaded yet - try to initialize them
      console.log(`Permissions not loaded for KRI ${kriId} access check, attempting to initialize...`);
      try {
        await store.dispatch('kri/initPermission');
        const updatedUser = store.getters['kri/currentUser'];
        const updatedPermissions = updatedUser.permissions || [];
        
        // Re-check with loaded permissions
        if (updatedPermissions.length > 0 && !Permission.canView(kriId, null, updatedPermissions)) {
          console.warn(`Access denied to KRI ${kriId}: User ${currentUser.user_id} lacks view permission after permission load`);
          next({
            name: 'Dashboard',
            query: { error: 'kri_access_denied', kriId: kriId }
          });
          return;
        }
      } catch (error) {
        console.error('Error initializing permissions in router guard:', error);
        // Allow navigation but log warning - component-level checks will handle it
        console.warn(`Allowing navigation to KRI ${kriId} due to permission initialization error`);
      }
    }
  }

  next();
});

export default router;