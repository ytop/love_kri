<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script>
import { mapActions } from 'vuex';

export default {
  name: 'App',
  async created() {
    // Restore user authentication state from sessionStorage on app startup
    await this.restoreUserFromStorage();
  },
  methods: {
    ...mapActions('kri', ['restoreUserFromStorage'])
  }
};
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: #f1f5f9;
}

#app {
  min-height: 100vh;
}

/* Status Badges Styles (shared) */
.el-tag.el-tag--warning.status-tag {
  background-color: rgba(245, 158, 11, 0.1);
  border-color: rgba(245, 158, 11, 0.2);
  color: #92400e;
}

.el-tag.el-tag--info.status-tag {
  background-color: rgba(59, 130, 246, 0.1);
  border-color: rgba(59, 130, 246, 0.2);
  color: #1d4ed8;
}

.el-tag.el-tag--primary.status-tag {
  background-color: rgba(168, 85, 247, 0.1);
  border-color: rgba(168, 85, 247, 0.2);
  color: #7c3aed;
}

.el-tag.el-tag--success.status-tag {
  background-color: rgba(34, 197, 94, 0.1);
  border-color: rgba(34, 197, 94, 0.2);
  color: #15803d;
}

.el-tag.el-tag--danger.status-tag {
  background-color: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.2);
  color: #dc2626;
}

/* Status info sections in pending input/approval pages */
.status-info .el-tag {
  margin-right: 0.5rem;
  margin-bottom: 0.25rem;
} 
</style>