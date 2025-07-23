<template>
  <div class="login-container">
    <div class="back-nav">
      <el-button 
        @click="goBack"
        type="text"
        icon="el-icon-arrow-left"
        class="back-button"
      >
        Back
      </el-button>
    </div>
    
    <div class="login-card">
      <div class="login-header">
        <h1>KRI Dashboard</h1>
        <p>Key Risk Indicator Management System</p>
      </div>
      
      <el-form 
        :model="loginForm" 
        :rules="loginRules" 
        ref="loginForm"
        class="login-form"
        @submit.native.prevent="handleLogin"
      >
        <el-form-item prop="username">
          <el-input
            v-model="loginForm.username"
            placeholder="Enter your username"
            prefix-icon="el-icon-user"
            size="large"
          />
        </el-form-item>
        
        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            @click="handleLogin"
            class="login-button"
          >
            Sign In
          </el-button>
        </el-form-item>
      </el-form>
      
      <div class="login-footer">
        <p>© 2024 KRI Dashboard. All rights reserved.</p>
      </div>
    </div>
  </div>
</template>

<script>
import { kriService } from '@/services/kriService';
import { mapActions, mapGetters } from 'vuex';

export default {
  name: 'Login',
  data() {
    return {
      loading: false,
      loginForm: {
        username: ''
      },
      loginRules: {
        username: [
          { required: true, message: 'Please enter your username', trigger: 'blur' },
          { min: 2, message: 'Username must be at least 2 characters', trigger: 'blur' }
        ]
      }
    };
  },
  computed: {
    ...mapGetters('kri', ['isAuthenticated'])
  },
  methods: {
    ...mapActions('kri', ['updateFilters', 'initPermission']),
    
    async handleLogin() {
      if (!this.$refs.loginForm) return;
      
      try {
        const valid = await this.$refs.loginForm.validate();
        if (!valid) return;
        
        this.loading = true;
        
        const userData = await kriService.fetchUser(this.loginForm.username);
        
        if (!userData || userData.length === 0) {
          this.$message.error('User not found. Please check your username.');
          return;
        }
        
        const user = userData[0];
        
        this.$store.commit('kri/SET_CURRENT_USER', {
          uuid: user.User_UUID,
          name: user.User_ID,
          department: user.Department,
          authenticated: true
        });
        
        await this.initPermission();
        
        this.$message.success('Login successful!');
        this.$router.push('/dashboard');
        
      } catch (error) {
        console.error('Login error:', error);
        this.$message.error('Login failed. Please try again.');
      } finally {
        this.loading = false;
      }
    },
    
    goBack() {
      this.$router.go(-1);
    }
  }
};
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  position: relative;
}

.back-nav {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 10;
}

.login-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  padding: 40px;
  width: 100%;
  max-width: 400px;
}

.login-header {
  text-align: center;
  margin-bottom: 30px;
}

.back-button {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.9rem;
  padding: 8px 12px;
  transition: color 0.3s ease;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 6px;
}

.back-button:hover {
  color: white;
  background: rgba(255, 255, 255, 0.2);
}

.back-button .el-icon-arrow-left {
  margin-right: 4px;
}

.login-header h1 {
  color: #2c3e50;
  font-size: 2rem;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.login-header p {
  color: #7f8c8d;
  font-size: 0.9rem;
  margin: 0;
}

.login-form {
  margin-bottom: 20px;
}

.login-form .el-form-item {
  margin-bottom: 20px;
}

.login-button {
  width: 100%;
  height: 45px;
  font-size: 1rem;
  font-weight: 500;
}

.role-permissions {
  font-size: 0.75rem;
  color: #909399;
  margin-left: 10px;
}

.login-footer {
  text-align: center;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.login-footer p {
  color: #95a5a6;
  font-size: 0.8rem;
  margin: 0;
}

.el-select .el-input {
  width: 100%;
}
</style>