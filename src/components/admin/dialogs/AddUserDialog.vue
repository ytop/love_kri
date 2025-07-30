<template>
  <el-dialog 
    title="Add New User" 
    :visible.sync="dialogVisible"
    width="500px"
    @close="resetDialog"
  >
    <div class="admin-dialog-content">
      <el-form 
        :model="newUser" 
        :rules="formRules" 
        ref="form"
        label-width="120px"
      >
        <el-form-item label="User ID:" prop="user_id">
          <el-input 
            v-model="newUser.user_id" 
            placeholder="Enter unique user ID"
            class="admin-full-width"
          ></el-input>
        </el-form-item>
        
        <el-form-item label="User Name:" prop="user_name">
          <el-input 
            v-model="newUser.user_name" 
            placeholder="Enter full name"
            class="admin-full-width"
          ></el-input>
        </el-form-item>
        
        <el-form-item label="Department:" prop="department">
          <el-select 
            v-model="newUser.department" 
            placeholder="Select department" 
            class="admin-full-width"
          >
            <el-option 
              v-for="dept in departments" 
              :key="dept" 
              :label="dept" 
              :value="dept"
            ></el-option>
          </el-select>
        </el-form-item>
        
        <el-form-item label="Role:" prop="user_role">
          <el-select 
            v-model="newUser.user_role" 
            placeholder="Select role" 
            class="admin-full-width"
          >
            <el-option 
              v-for="role in assignableRoles" 
              :key="role" 
              :label="getRoleDisplayName(role)" 
              :value="role"
            ></el-option>
          </el-select>
        </el-form-item>
        
        <el-form-item label="Other Info:">
          <el-input 
            v-model="newUser.other_info" 
            type="textarea"
            :rows="2"
            placeholder="Additional information (optional)"
            class="admin-full-width"
          ></el-input>
        </el-form-item>
      </el-form>
    </div>
    
    <div slot="footer" class="admin-dialog-footer">
      <el-button @click="dialogVisible = false">Cancel</el-button>
      <el-button 
        type="primary" 
        @click="handleSubmit"
        :loading="loading"
      >
        Add User
      </el-button>
    </div>
  </el-dialog>
</template>

<script>
import { kriService } from '@/services/kriService';

export default {
  name: 'AddUserDialog',
  
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    departments: {
      type: Array,
      default: () => []
    },
    assignableRoles: {
      type: Array,
      default: () => []
    }
  },
  
  data() {
    return {
      loading: false,
      newUser: {
        user_id: '',
        user_name: '',
        department: '',
        user_role: 'user',
        other_info: ''
      },
      formRules: {
        user_id: [
          { required: true, message: 'Please enter user ID', trigger: 'blur' },
          { min: 2, max: 50, message: 'Length should be 2 to 50 characters', trigger: 'blur' },
          { validator: this.validateUserId, trigger: 'blur' }
        ],
        user_name: [
          { required: true, message: 'Please enter user name', trigger: 'blur' },
          { min: 2, max: 100, message: 'Length should be 2 to 100 characters', trigger: 'blur' }
        ],
        department: [
          { required: true, message: 'Please select department', trigger: 'change' }
        ],
        user_role: [
          { required: true, message: 'Please select role', trigger: 'change' }
        ]
      }
    };
  },
  
  computed: {
    dialogVisible: {
      get() {
        return this.visible;
      },
      set(value) {
        this.$emit('update:visible', value);
      }
    }
  },
  
  watch: {
    visible(newVal) {
      if (newVal) {
        this.resetForm();
      }
    }
  },
  
  methods: {
    async handleSubmit() {
      // Validate form
      try {
        await this.$refs.form.validate();
      } catch (error) {
        return;
      }
      
      this.loading = true;
      try {
        const newUser = await kriService.createUser(
          this.newUser, 
          this.$store.getters['kri/currentUser'].User_ID
        );
        
        this.$message.success(`User ${this.newUser.user_id} created successfully`);
        this.$emit('user-created', newUser);
        this.dialogVisible = false;
      } catch (error) {
        console.error('Error creating user:', error);
        if (error.message.includes('already exists')) {
          this.$message.error(`User ID '${this.newUser.user_id}' already exists. Please choose a different User ID.`);
        } else {
          this.$message.error('Failed to create user: ' + error.message);
        }
      } finally {
        this.loading = false;
      }
    },
    
    resetDialog() {
      this.resetForm();
      this.loading = false;
    },
    
    resetForm() {
      this.newUser = {
        user_id: '',
        user_name: '',
        department: '',
        user_role: 'user',
        other_info: ''
      };
      
      // Reset form validation
      this.$nextTick(() => {
        if (this.$refs.form) {
          this.$refs.form.resetFields();
          this.$refs.form.clearValidate();
        }
      });
    },
    
    validateUserId(rule, value, callback) {
      if (!value) {
        callback();
        return;
      }
      
      // Check for valid characters (alphanumeric and underscore)
      const validPattern = /^[a-zA-Z0-9_]+$/;
      if (!validPattern.test(value)) {
        callback(new Error('User ID can only contain letters, numbers, and underscores'));
        return;
      }
      
      callback();
    },
    
    getRoleDisplayName(role) {
      switch (role) {
      case 'admin': return 'System Admin';
      case 'dept_admin': return 'Dept Admin';
      case 'user': return 'User';
      default: return role || 'User';
      }
    }
  }
};
</script>

<style scoped>
/* Component-specific styles if needed */
/* Most styles are in admin.css */
</style>