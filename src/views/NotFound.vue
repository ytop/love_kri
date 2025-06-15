<template>
  <div class="not-found">
    <el-card>
      <div class="not-found-content">
        <i class="el-icon-warning" style="font-size: 64px; color: #f56c6c;"></i>
        <h1>404 - Page Not Found</h1>
        <p>The page you are looking for doesn't exist.</p>
        <el-button type="primary" @click="$router.push('/')">
          Back to Dashboard
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script>
export default {
  name: 'NotFound'
};
</script>

<style scoped>
.not-found {
  min-height: 100vh;
  background-color: #f1f5f9;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1.5rem;
}

.not-found-content {
  text-align: center;
  padding: 2rem;
}

.not-found-content h1 {
  font-size: 1.5rem;
  color: #0f172a;
  margin: 1rem 0;
}

.not-found-content p {
  color: #64748b;
  margin-bottom: 1.5rem;
}
</style>