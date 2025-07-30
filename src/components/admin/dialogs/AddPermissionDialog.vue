<template>
  <el-dialog 
    title="Add New Permission" 
    :visible.sync="dialogVisible"
    width="600px"
    @close="resetDialog"
  >
    <div class="admin-dialog-content">
      <el-form 
        :model="newPermission" 
        :rules="formRules" 
        ref="form"
        label-width="140px"
      >
        <el-form-item label="User:" prop="user_uuid">
          <el-select 
            v-model="newPermission.user_uuid" 
            placeholder="Select user" 
            filterable 
            class="admin-full-width"
          >
            <el-option 
              v-for="user in users" 
              :key="user.uuid" 
              :label="`${user.user_id} (${user.user_name} - ${user.department})`" 
              :value="user.uuid"
            ></el-option>
          </el-select>
        </el-form-item>
        
        <el-form-item label="KRI:" prop="kri_id">
          <el-select 
            v-model="newPermission.kri_id" 
            placeholder="Select KRI" 
            filterable 
            class="admin-full-width"
          >
            <el-option 
              v-for="kri in availableKris" 
              :key="kri.kri_id || kri.kri_code" 
              :label="`${kri.kri_id || kri.kri_code} - ${kri.kri_name || kri.name}`" 
              :value="kri.kri_id || kri.kri_code"
            ></el-option>
          </el-select>
        </el-form-item>
        
        <el-form-item label="Reporting Date:" prop="reporting_date">
          <el-date-picker
            v-model="newPermission.reporting_date"
            type="date"
            placeholder="Select date"
            format="yyyy-MM-dd"
            value-format="yyyyMMdd"
            class="admin-full-width"
          ></el-date-picker>
        </el-form-item>
        
        <el-form-item label="Actions:" prop="actions">
          <el-input 
            v-model="newPermission.actions" 
            type="textarea"
            :rows="3"
            placeholder="e.g., edit,view,review,acknowledge,delete,atomic1.edit,atomic1.view"
            class="admin-full-width"
          ></el-input>
          <div class="admin-permission-help">
            <small>Available actions: edit, view, review, acknowledge, delete</small><br>
            <small>Atomic actions: atomic1.edit, atomic1.view, atomic2.edit, etc. (dot notation)</small>
          </div>
        </el-form-item>
        
        <el-form-item label="Permission Templates:">
          <el-select 
            v-model="selectedTemplate" 
            placeholder="Choose a template (optional)"
            clearable
            @change="applyTemplate"
            class="admin-full-width"
          >
            <el-option 
              v-for="(template, key) in permissionTemplates" 
              :key="key"
              :label="template.name"
              :value="key"
            >
              <span>{{ template.name }}</span>
              <span style="float: right; color: #8492a6; font-size: 13px">{{ template.description }}</span>
            </el-option>
          </el-select>
        </el-form-item>
        
        <el-form-item label="Status:">
          <el-switch 
            v-model="newPermission.effect" 
            active-text="Active" 
            inactive-text="Inactive"
          ></el-switch>
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
        Add Permission
      </el-button>
    </div>
  </el-dialog>
</template>

<script>
import { kriService } from '@/services/kriService';
import { getLastDayOfPreviousMonth } from '@/utils/helpers';

export default {
  name: 'AddPermissionDialog',
  
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    users: {
      type: Array,
      default: () => []
    },
    availableKris: {
      type: Array,
      default: () => []
    }
  },
  
  data() {
    return {
      loading: false,
      selectedTemplate: '',
      newPermission: {
        user_uuid: '',
        kri_id: '',
        reporting_date: new Date(),
        actions: '',
        effect: true
      },
      formRules: {
        user_uuid: [
          { required: true, message: 'Please select a user', trigger: 'change' }
        ],
        kri_id: [
          { required: true, message: 'Please select a KRI', trigger: 'change' }
        ],
        reporting_date: [
          { required: true, message: 'Please select a reporting date', trigger: 'change' }
        ],
        actions: [
          { required: true, message: 'Please enter actions', trigger: 'blur' },
          { validator: this.validateActions, trigger: 'blur' }
        ]
      },
      permissionTemplates: {
        viewOnly: {
          name: 'View Only',
          description: 'Can view KRI data but cannot edit',
          permissions: 'view'
        },
        dataEntry: {
          name: 'Data Entry',
          description: 'Can input and edit KRI data',
          permissions: 'view,edit'
        },
        dataProvider: {
          name: 'Data Provider',
          description: 'Can input data and review submissions',
          permissions: 'view,edit,review'
        },
        kriOwner: {
          name: 'KRI Owner',
          description: 'Full access including final approval',
          permissions: 'view,edit,review,acknowledge,delete'
        },
        departmentManager: {
          name: 'Department Manager',
          description: 'Comprehensive access for department oversight',
          permissions: 'view,edit,review,acknowledge'
        }
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
        // Convert reporting_date to integer format if it's a string
        let reportingDate = this.newPermission.reporting_date;
        if (typeof reportingDate === 'string') {
          reportingDate = parseInt(reportingDate.replace(/-/g, ''));
        } else if (reportingDate instanceof Date) {
          reportingDate = parseInt(reportingDate.toISOString().slice(0, 10).replace(/-/g, ''));
        }
        
        // Convert comma-separated actions to individual permission records
        const actions = this.newPermission.actions.split(',').map(a => a.trim()).filter(a => a);
        const permissionUpdates = actions.map(action => ({
          user_uuid: this.newPermission.user_uuid,
          kri_id: this.newPermission.kri_id,
          reporting_date: reportingDate,
          action: action,
          effect: this.newPermission.effect
        }));
        
        await kriService.bulkUpdatePermissions(
          permissionUpdates, 
          this.$store.getters['kri/currentUser'].user_id
        );
        
        this.$message.success('Permission added successfully');
        this.$emit('permission-created', permissionUpdate);
        this.dialogVisible = false;
      } catch (error) {
        console.error('Error adding permission:', error);
        this.$message.error('Failed to add permission: ' + error.message);
      } finally {
        this.loading = false;
      }
    },
    
    resetDialog() {
      this.resetForm();
      this.loading = false;
      this.selectedTemplate = '';
    },
    
    resetForm() {
      // Set default reporting date as Date object for the date picker
      const defaultDate = getLastDayOfPreviousMonth();
      // Convert YYYYMMDD integer to Date object
      const year = Math.floor(defaultDate / 10000);
      const month = Math.floor((defaultDate % 10000) / 100) - 1; // Month is 0-indexed in Date
      const day = defaultDate % 100;
      
      this.newPermission = {
        user_uuid: '',
        kri_id: '',
        reporting_date: new Date(year, month, day),
        actions: '',
        effect: true
      };
      
      // Reset form validation
      this.$nextTick(() => {
        if (this.$refs.form) {
          this.$refs.form.resetFields();
          this.$refs.form.clearValidate();
        }
      });
    },
    
    applyTemplate(templateKey) {
      if (templateKey && this.permissionTemplates[templateKey]) {
        this.newPermission.actions = this.permissionTemplates[templateKey].permissions;
      }
    },
    
    validateActions(rule, value, callback) {
      if (!value) {
        callback();
        return;
      }
      
      // Split actions and check for valid format
      const actions = value.split(',').map(a => a.trim()).filter(a => a);
      const validActions = ['view', 'edit', 'review', 'acknowledge', 'delete'];
      const atomicPattern = /^atomic\d+\.(edit|view|review|acknowledge|delete)$/;
      
      for (const action of actions) {
        if (!validActions.includes(action) && !atomicPattern.test(action)) {
          callback(new Error(`Invalid action: ${action}. Use valid actions or atomic patterns like atomic1.edit`));
          return;
        }
      }
      
      callback();
    }
  }
};
</script>

<style scoped>
/* Component-specific styles if needed */
/* Most styles are in admin.css */
</style>