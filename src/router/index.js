import Vue from 'vue';
import Router from 'vue-router';
import Dashboard from '../views/Dashboard.vue';
import KRIListByStatus from '../views/KRIListByStatus.vue';
import KRIPendingInput from '../views/KRIPendingInput.vue';
import KRIPendingApproval from '../views/KRIPendingApproval.vue';
import NotFound from '../views/NotFound.vue';

Vue.use(Router);

export default new Router({
  mode: 'history',
  routes: [
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
      path: '/kris/pending-input',
      name: 'PendingKRIs',
      component: KRIPendingInput
    },
    {
      path: '/kris/pending-approval',
      name: 'SubmittedKRIs',
      component: KRIPendingApproval
    },
    // Keep the old routes for backward compatibility
    {
      path: '/kris/pending',
      redirect: '/kris/pending-input'
    },
    {
      path: '/kris/submitted',
      redirect: '/kris/pending-approval'
    },
    // Generic status-based route for other statuses
    {
      path: '/kris/status/:status',
      name: 'KRIsByStatus',
      component: KRIListByStatus,
      props: true
    },
    {
      path: '*',
      name: 'NotFound',
      component: NotFound
    }
  ]
});