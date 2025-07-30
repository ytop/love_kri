<template>
  <el-dialog 
    title="Apply Permission Template" 
    :visible="dialogVisible"
    width="600px"
    @close="handleClose"
  >
    <div v-if="selectedTemplate && permissionTemplates[selectedTemplate]">
      <div class="template-details">
        <h4>{{ permissionTemplates[selectedTemplate].name }}</h4>
        <p>{{ permissionTemplates[selectedTemplate].description }}</p>
        <el-tag>{{ permissionTemplates[selectedTemplate].permissions }}</el-tag>
      </div>
      
      <el-form style="margin-top: 20px;">
        <el-form-item label="Select Users:">
          <el-select 
            v-model="dialogBulkUsers" 
            multiple 
            placeholder="Choose team members"
            style="width: 100%;"
          >
            <el-option 
              v-for="user in teamMembers" 
              :key="user.uuid" 
              :label="`${user.user_id} (${user.user_name})`" 
              :value="user.uuid"
            ></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="Select KRIs:">
          <el-select 
            v-model="dialogBulkKRIs" 
            multiple 
            placeholder="Choose KRIs"
            style="width: 100%;"
          >
            <el-option 
              v-for="kri in departmentKRIs" 
              :key="kri.kri_code" 
              :label="`${kri.kri_code} - ${kri.name}`" 
              :value="kri.kri_code"
            ></el-option>
          </el-select>
        </el-form-item>
      </el-form>
    </div>
    
    <div slot="footer" class="dialog-footer">
      <el-button @click="handleClose">Cancel</el-button>
      <el-button 
        type="primary" 
        @click="applyTemplate"
        :disabled="!dialogBulkUsers.length || !dialogBulkKRIs.length"
        :loading="templateApplyLoading"
      >
        Apply Template
      </el-button>
    </div>
  </el-dialog>
</template>

<script>
export default {
  name: 'BulkPermissionTemplateDialog',
  
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    selectedTemplate: {
      type: String,
      default: ''
    },
    permissionTemplates: {
      type: Object,
      default: () => ({})
    },
    teamMembers: {
      type: Array,
      default: () => []
    },
    departmentKRIs: {
      type: Array,
      default: () => []
    },
    templateApplyLoading: {
      type: Boolean,
      default: false
    }
  },
  
  data() {
    return {
      dialogBulkUsers: [],
      dialogBulkKRIs: []
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
  
  methods: {
    handleClose() {
      this.$emit('update:visible', false);
      this.dialogBulkUsers = [];
      this.dialogBulkKRIs = [];
    },
    
    applyTemplate() {
      this.$emit('apply-permission-template', {
        template: this.selectedTemplate,
        users: this.dialogBulkUsers,
        kris: this.dialogBulkKRIs
      });
    }
  }
};
</script>

<style scoped>
.template-details {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.template-details h4 {
  margin: 0 0 10px 0;
  color: #303133;
}

.template-details p {
  margin: 0 0 10px 0;
  color: #606266;
}

.dialog-footer {
  text-align: right;
}
</style>