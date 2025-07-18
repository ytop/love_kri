import Vue from 'vue';
import Router from 'vue-router';
import Dashboard from '../views/Dashboard.vue';
import KRIListByStatus from '../views/KRIListByStatus.vue';
import KRIWorkflowPage from '../views/KRIWorkflowPage.vue';
import Login from '../views/Login.vue';
import AdminManagement from '../views/AdminManagement.vue';
import NotFound from '../views/NotFound.vue';

Vue.use(Router);

export default new Router({
  mode: 'history',
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: Login
    },
    {
      path: '/',
      name: 'Dashboard',
      component: Dashboard
    },
    {
      path: '/kri/:id/:date',
      name: 'KRIDetail',
      component: () => import('../views/KRIDetail.vue'),
      props: true
    },
    {
      path: '/kris/pending',
      name: 'PendingKRIs',
      component: KRIWorkflowPage
    },
    // Generic status-based route for other statuses
    {
      path: '/kris/status/:status',
      name: 'KRIsByStatus',
      component: KRIListByStatus,
      props: true
    },
    {
      path: '/admin',
      name: 'AdminManagement',
      component: AdminManagement
    },
    {
      path: '*',
      name: 'NotFound',
      component: NotFound
    }
  ]
});