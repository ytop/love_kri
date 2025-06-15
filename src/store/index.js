import Vue from 'vue';
import Vuex from 'vuex';
import kri from './modules/kri';

Vue.use(Vuex);

export default new Vuex.Store({
  modules: {
    kri
  }
});