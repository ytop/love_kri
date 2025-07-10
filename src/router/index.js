import Vue from 'vue';
import Router from 'vue-router';
import Dashboard from '../views/Dashboard.vue';
import NotFound from '../views/NotFound.vue';
import KRIListByStatus from '../views/KRIListByStatus.vue'; // Import the new component

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
      path: '/kris/pending',
      name: 'PendingKRIs',
      component: KRIListByStatus,
      props: { status: 'Pending' }
    },
    {
      path: '/kris/submitted',
      name: 'SubmittedKRIs',
      component: KRIListByStatus,
      props: { status: 'Submitted' }
    },
    {
      path: '*',
      name: 'NotFound',
      component: NotFound
    }
  ]
});