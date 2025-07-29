<template>
  <div class="department-admin">
    <div class="dept-admin-header">
      <h1 class="dept-admin-title">
        <i class="el-icon-office-building"></i>
        Department Administration
      </h1>
      <div class="dept-admin-breadcrumb">
        <el-breadcrumb separator="/">
          <el-breadcrumb-item :to="{ path: '/' }">Dashboard</el-breadcrumb-item>
          <el-breadcrumb-item>Department Admin</el-breadcrumb-item>
        </el-breadcrumb>
      </div>
      <div class="department-info">
        <el-tag type="primary" size="large">{{ currentUser.Department }}</el-tag>
        <span class="user-role">Department Administrator</span>
      </div>
    </div>

    <el-card class="dept-admin-container">
      <el-tabs v-model="activeTab" type="card" @tab-click="handleTabClick">
        <!-- Dashboard Tab -->
        <el-tab-pane label="Dashboard" name="dashboard">
          <div class="tab-content">
            <div class="dashboard-overview">
              <el-row :gutter="20">
                <el-col :span="6">
                  <el-card class="metric-card">
                    <div class="metric-content">
                      <div class="metric-icon">
                        <i class="el-icon-user"></i>
                      </div>
                      <div class="metric-data">
                        <div class="metric-number">{{ departmentStats.totalUsers }}</div>
                        <div class="metric-label">Team Members</div>
                      </div>
                    </div>
                  </el-card>
                </el-col>
                <el-col :span="6">
                  <el-card class="metric-card">
                    <div class="metric-content">
                      <div class="metric-icon">
                        <i class="el-icon-data-analysis"></i>
                      </div>
                      <div class="metric-data">
                        <div class="metric-number">{{ departmentStats.totalKRIs }}</div>
                        <div class="metric-label">Department KRIs</div>
                      </div>
                    </div>
                  </el-card>
                </el-col>
                <el-col :span="6">
                  <el-card class="metric-card">
                    <div class="metric-content">
                      <div class="metric-icon">
                        <i class="el-icon-warning"></i>
                      </div>
                      <div class="metric-data">
                        <div class="metric-number">{{ departmentStats.pendingItems.pendingApprovals }}</div>
                        <div class="metric-label">Pending Approvals</div>
                      </div>
                    </div>
                  </el-card>
                </el-col>
                <el-col :span="6">
                  <el-card class="metric-card">
                    <div class="metric-content">
                      <div class="metric-icon">
                        <i class="el-icon-edit"></i>
                      </div>
                      <div class="metric-data">
                        <div class="metric-number">{{ departmentStats.pendingItems.pendingInputs }}</div>
                        <div class="metric-label">Pending Inputs</div>
                      </div>
                    </div>
                  </el-card>
                </el-col>
              </el-row>
            </div>

            <el-row :gutter="20" style="margin-top: 20px;">
              <el-col :span="12">
                <el-card>
                  <div slot="header" class="card-header">
                    <span>Team Members by Role</span>
                  </div>
                  <div class="role-distribution">
                    <div v-for="(count, role) in departmentStats.usersByRole" :key="role" class="role-item">
                      <el-tag :type="getRoleTagType(role)" size="medium">
                        {{ getRoleDisplayName(role) }}
                      </el-tag>
                      <span class="role-count">{{ count }}</span>
                    </div>
                  </div>
                </el-card>
              </el-col>
              <el-col :span="12">
                <el-card>
                  <div slot="header" class="card-header">
                    <span>Quick Actions</span>
                  </div>
                  <div class="quick-actions">
                    <el-button 
                      type="primary" 
                      icon="el-icon-user-solid"
                      @click="activeTab = 'team'"
                    >
                      Manage Team
                    </el-button>
                    <el-button 
                      type="success" 
                      icon="el-icon-key"
                      @click="activeTab = 'permissions'"
                    >
                      Assign Permissions
                    </el-button>
                    <el-button 
                      type="info" 
                      icon="el-icon-data-analysis"
                      @click="activeTab = 'kris'"
                    >
                      Department KRIs
                    </el-button>
                    <el-button 
                      type="warning" 
                      icon="el-icon-view"
                      @click="activeTab = 'audit'"
                    >
                      View Activity
                    </el-button>
                  </div>
                </el-card>
              </el-col>
            </el-row>
          </div>
        </el-tab-pane>

        <!-- Team Management Tab -->
        <el-tab-pane label="Team Management" name="team">
          <div class="tab-content">
            <div class="content-header">
              <h3>Team Management</h3>
              <div class="header-actions">
                <el-button 
                  type="primary" 
                  icon="el-icon-refresh" 
                  @click="refreshTeamData"
                  :loading="teamLoading"
                >
                  Refresh
                </el-button>
              </div>
            </div>

            <el-table 
              :data="teamMembers" 
              v-loading="teamLoading"
              stripe
              border
              style="width: 100%"
            >
              <el-table-column prop="User_ID" label="User ID" sortable width="120">
              </el-table-column>
              
              <el-table-column prop="User_Name" label="Display Name" sortable width="150">
              </el-table-column>
              
              <el-table-column prop="user_role" label="Role" sortable width="120">
                <template slot-scope="scope">
                  <el-tag 
                    :type="getRoleTagType(scope.row.user_role)"
                    size="small"
                  >
                    {{ getRoleDisplayName(scope.row.user_role) }}
                  </el-tag>
                </template>
              </el-table-column>
              
              <el-table-column label="Permissions Summary" min-width="200">
                <template slot-scope="scope">
                  <div v-if="scope.row.permissionSummary">
                    <el-tag size="mini" type="info">
                      {{ scope.row.permissionSummary.kriCount }} KRIs
                    </el-tag>
                    <el-tag size="mini" type="success" style="margin-left: 5px;">
                      {{ scope.row.permissionSummary.totalPermissions }} permissions
                    </el-tag>
                  </div>
                  <span v-else class="text-muted">No permissions assigned</span>
                </template>
              </el-table-column>
              
              <el-table-column label="Actions" width="180">
                <template slot-scope="scope">
                  <el-button 
                    size="mini" 
                    type="primary" 
                    icon="el-icon-key"
                    @click="manageUserPermissions(scope.row)"
                  >
                    Permissions
                  </el-button>
                  <el-button 
                    size="mini" 
                    type="info" 
                    icon="el-icon-view"
                    @click="viewUserDetails(scope.row)"
                  >
                    Details
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>

        <!-- Permission Management Tab -->
        <el-tab-pane label="Permission Management" name="permissions">
          <div class="tab-content">
            <div class="content-header">
              <h3>Permission Management</h3>
              <p class="tab-description">Assign and manage permissions for department KRIs</p>
            </div>

            <div class="permission-tools">
              <el-card>
                <div slot="header" class="card-header">
                  <span>Permission Templates</span>
                </div>
                <div class="template-grid">
                  <div v-for="(template, key) in permissionTemplates" :key="key" class="template-item">
                    <div class="template-info">
                      <h4>{{ template.name }}</h4>
                      <p>{{ template.description }}</p>
                      <el-tag size="mini">{{ template.permissions }}</el-tag>
                    </div>
                    <el-button 
                      size="small" 
                      type="primary"
                      @click="openBulkPermissionDialog(key)"
                    >
                      Apply Template
                    </el-button>
                  </div>
                </div>
              </el-card>
            </div>

            <div class="bulk-permission-section" style="margin-top: 20px;">
              <el-card>
                <div slot="header" class="card-header">
                  <span>Bulk Permission Assignment</span>
                </div>
                <el-form :inline="true">
                  <el-form-item label="Select Users:">
                    <el-select 
                      v-model="bulkPermissionUsers" 
                      multiple 
                      placeholder="Choose team members"
                      style="width: 300px;"
                    >
                      <el-option 
                        v-for="user in teamMembers" 
                        :key="user.UUID" 
                        :label="`${user.User_ID} (${user.User_Name})`" 
                        :value="user.UUID"
                      ></el-option>
                    </el-select>
                  </el-form-item>
                  <el-form-item label="Select KRIs:">
                    <el-select 
                      v-model="bulkPermissionKRIs" 
                      multiple 
                      placeholder="Choose KRIs"
                      style="width: 200px;"
                    >
                      <el-option 
                        v-for="kri in departmentKRIs" 
                        :key="kri.kri_code" 
                        :label="`${kri.kri_code} - ${kri.name}`" 
                        :value="kri.kri_code"
                      ></el-option>
                    </el-select>
                  </el-form-item>
                  <el-form-item label="Permissions:">
                    <el-select 
                      v-model="bulkPermissionActions" 
                      placeholder="Select permissions"
                      style="width: 200px;"
                    >
                      <el-option label="View Only" value="view"></el-option>
                      <el-option label="View + Edit" value="view,edit"></el-option>
                      <el-option label="Data Provider" value="view,edit,review"></el-option>
                      <el-option label="KRI Owner" value="view,edit,review,acknowledge"></el-option>
                    </el-select>
                  </el-form-item>
                  <el-form-item>
                    <el-button 
                      type="primary" 
                      @click="executeBulkPermissionAssignment"
                      :disabled="!bulkPermissionUsers.length || !bulkPermissionKRIs.length || !bulkPermissionActions"
                      :loading="bulkPermissionLoading"
                    >
                      Assign Permissions
                    </el-button>
                  </el-form-item>
                </el-form>
              </el-card>
            </div>
          </div>
        </el-tab-pane>

        <!-- Department KRIs Tab -->
        <el-tab-pane label="Department KRIs" name="kris">
          <div class="tab-content">
            <div class="content-header">
              <h3>Department KRIs</h3>
              <div class="header-actions">
                <el-button 
                  type="primary" 
                  icon="el-icon-refresh" 
                  @click="refreshKRIData"
                  :loading="krisLoading"
                >
                  Refresh
                </el-button>
              </div>
            </div>

            <el-table 
              :data="departmentKRIs" 
              v-loading="krisLoading"
              stripe
              border
              style="width: 100%"
            >
              <el-table-column prop="kri_code" label="KRI Code" sortable width="120">
              </el-table-column>
              
              <el-table-column prop="name" label="KRI Name" sortable min-width="200">
              </el-table-column>
              
              <el-table-column prop="l1_risk_type" label="L1 Risk Type" sortable width="150">
              </el-table-column>
              
              <el-table-column prop="data_provider" label="Data Provider" sortable width="150">
              </el-table-column>
              
              <el-table-column prop="is_calculated_kri" label="Type" width="100">
                <template slot-scope="scope">
                  <el-tag :type="scope.row.is_calculated_kri ? 'warning' : 'info'" size="small">
                    {{ scope.row.is_calculated_kri ? 'Calculated' : 'Manual' }}
                  </el-tag>
                </template>
              </el-table-column>
              
              <el-table-column label="Actions" width="150">
                <template slot-scope="scope">
                  <el-button 
                    size="mini" 
                    type="primary" 
                    icon="el-icon-key"
                    @click="manageKRIPermissions(scope.row)"
                  >
                    Permissions
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>

        <!-- Activity Audit Tab -->
        <el-tab-pane label="Activity Audit" name="audit">
          <div class="tab-content">
            <div class="content-header">
              <h3>Department Activity Audit</h3>
              <p class="tab-description">Monitor department activities and changes</p>
            </div>

            <div class="audit-summary">
              <el-row :gutter="20">
                <el-col :span="8">
                  <el-card class="audit-stat-card">
                    <div class="audit-stat">
                      <div class="audit-number">{{ auditStats.totalActivities }}</div>
                      <div class="audit-label">Total Activities</div>
                    </div>
                  </el-card>
                </el-col>
                <el-col :span="8">
                  <el-card class="audit-stat-card">
                    <div class="audit-stat">
                      <div class="audit-number">{{ auditStats.todayActivities }}</div>
                      <div class="audit-label">Today's Activities</div>
                    </div>
                  </el-card>
                </el-col>
                <el-col :span="8">
                  <el-card class="audit-stat-card">
                    <div class="audit-stat">
                      <div class="audit-number">{{ auditStats.uniqueUsers }}</div>
                      <div class="audit-label">Active Users</div>
                    </div>
                  </el-card>
                </el-col>
              </el-row>
            </div>

            <div class="audit-filters" style="margin-bottom: 20px;">
              <el-form :inline="true">
                <el-form-item label="Date Range:">
                  <el-date-picker
                    v-model="auditDateRange"
                    type="daterange"
                    range-separator="To"
                    start-placeholder="Start date"
                    end-placeholder="End date"
                    format="yyyy-MM-dd"
                    value-format="yyyy-MM-dd"
                    @change="loadAuditData"
                  >
                  </el-date-picker>
                </el-form-item>
                <el-form-item label="Activity Type:">
                  <el-select 
                    v-model="auditTypeFilter" 
                    placeholder="All Types"
                    clearable
                    @change="loadAuditData"
                  >
                    <el-option label="KRI Updates" value="kri_update"></el-option>
                    <el-option label="Permission Changes" value="permission_change"></el-option>
                    <el-option label="Status Changes" value="status_change"></el-option>
                    <el-option label="Data Input" value="data_input"></el-option>
                  </el-select>
                </el-form-item>
                <el-form-item>
                  <el-button 
                    type="primary" 
                    @click="loadAuditData"
                    :loading="auditLoading"
                  >
                    Refresh
                  </el-button>
                </el-form-item>
              </el-form>
            </div>

            <el-table 
              :data="auditTrailData" 
              v-loading="auditLoading"
              stripe
              border
              style="width: 100%"
              :default-sort="{ prop: 'changed_at', order: 'descending' }"
            >
              <el-table-column prop="changed_at" label="Date/Time" width="180" sortable>
                <template slot-scope="scope">
                  {{ formatDateTime(scope.row.changed_at) }}
                </template>
              </el-table-column>
              
              <el-table-column prop="kri_id" label="KRI ID" width="80" sortable>
              </el-table-column>
              
              <el-table-column prop="action" label="Action" width="150" sortable>
                <template slot-scope="scope">
                  <el-tag :type="getActionTagType(scope.row.action)" size="small">
                    {{ scope.row.action }}
                  </el-tag>
                </template>
              </el-table-column>
              
              <el-table-column prop="changed_by" label="User" width="120" sortable>
              </el-table-column>
              
              <el-table-column prop="field_name" label="Field" width="150">
              </el-table-column>
              
              <el-table-column label="Changes" min-width="200">
                <template slot-scope="scope">
                  <div v-if="scope.row.old_value || scope.row.new_value">
                    <span class="change-item">
                      <el-tag type="info" size="mini">From:</el-tag>
                      <span class="old-value">{{ scope.row.old_value || 'N/A' }}</span>
                    </span>
                    <br>
                    <span class="change-item">
                      <el-tag type="success" size="mini">To:</el-tag>
                      <span class="new-value">{{ scope.row.new_value || 'N/A' }}</span>
                    </span>
                  </div>
                  <span v-else class="text-muted">{{ scope.row.comment || 'No details' }}</span>
                </template>
              </el-table-column>
            </el-table>
            
            <div v-if="auditTrailData.length === 0 && !auditLoading" class="no-audit-data">
              <el-empty description="No audit data found for the selected criteria">
              </el-empty>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- Bulk Permission Template Dialog -->
    <el-dialog 
      title="Apply Permission Template" 
      :visible.sync="bulkPermissionDialogVisible"
      width="600px"
    >
      <div v-if="selectedTemplate">
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
                :key="user.UUID" 
                :label="`${user.User_ID} (${user.User_Name})`" 
                :value="user.UUID"
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
        <el-button @click="bulkPermissionDialogVisible = false">Cancel</el-button>
        <el-button 
          type="primary" 
          @click="applyPermissionTemplate"
          :disabled="!dialogBulkUsers.length || !dialogBulkKRIs.length"
          :loading="templateApplyLoading"
        >
          Apply Template
        </el-button>
      </div>
    </el-dialog>

    <!-- User Permissions Management Dialog -->
    <el-dialog 
      title="Manage User Permissions" 
      :visible.sync="userPermissionsDialogVisible"
      width="80%"
      @close="userPermissionsDialogVisible = false"
    >
      <div v-if="selectedUser">
        <div class="user-info-header">
          <h4>{{ selectedUser.User_Name }} ({{ selectedUser.User_ID }})</h4>
          <el-tag :type="getRoleTagType(selectedUser.user_role)" size="medium">
            {{ getRoleDisplayName(selectedUser.user_role) }}
          </el-tag>
        </div>
        
        <el-table 
          :data="editablePermissions" 
          v-loading="userPermissionsLoading"
          stripe
          border
          style="width: 100%; margin-top: 20px;"
        >
          <el-table-column prop="kri_id" label="KRI Code" width="120">
          </el-table-column>
          
          <el-table-column prop="kri_name" label="KRI Name" min-width="200">
          </el-table-column>
          
          <el-table-column prop="is_calculated" label="Type" width="100">
            <template slot-scope="scope">
              <el-tag :type="scope.row.is_calculated ? 'warning' : 'info'" size="small">
                {{ scope.row.is_calculated ? 'Calculated' : 'Manual' }}
              </el-tag>
            </template>
          </el-table-column>
          
          <el-table-column label="Current Permissions" width="200">
            <template slot-scope="scope">
              <div v-if="scope.row.current_actions">
                <el-tag 
                  v-for="action in scope.row.current_actions.split(',')" 
                  :key="action" 
                  size="mini"
                  style="margin-right: 5px;"
                >
                  {{ action.trim() }}
                </el-tag>
              </div>
              <span v-else class="text-muted">No permissions</span>
            </template>
          </el-table-column>
          
          <el-table-column label="New Permissions" width="200">
            <template slot-scope="scope">
              <el-select 
                v-model="scope.row.new_actions" 
                placeholder="Select permissions"
                style="width: 100%;"
              >
                <el-option label="No Access" value=""></el-option>
                <el-option label="View Only" value="view"></el-option>
                <el-option label="View + Edit" value="view,edit"></el-option>
                <el-option label="Data Provider" value="view,edit,review"></el-option>
                <el-option label="KRI Owner" value="view,edit,review,acknowledge"></el-option>
              </el-select>
            </template>
          </el-table-column>
        </el-table>
      </div>
      
      <div slot="footer" class="dialog-footer">
        <el-button @click="userPermissionsDialogVisible = false">Cancel</el-button>
        <el-button 
          type="primary" 
          @click="updateUserPermissions"
          :loading="permissionUpdateLoading"
        >
          Update Permissions
        </el-button>
      </div>
    </el-dialog>

    <!-- User Details Dialog -->
    <el-dialog 
      title="User Details" 
      :visible.sync="userDetailsDialogVisible"
      width="70%"
      @close="userDetailsDialogVisible = false"
    >
      <div v-if="userDetailData" v-loading="userDetailsLoading">
        <div class="user-profile">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-card>
                <div slot="header" class="card-header">
                  <span>User Information</span>
                </div>
                <div class="user-details">
                  <p><strong>User ID:</strong> {{ userDetailData.User_ID }}</p>
                  <p><strong>Display Name:</strong> {{ userDetailData.User_Name }}</p>
                  <p><strong>Department:</strong> {{ userDetailData.Department }}</p>
                  <p><strong>Role:</strong> 
                    <el-tag :type="getRoleTagType(userDetailData.user_role)" size="small">
                      {{ getRoleDisplayName(userDetailData.user_role) }}
                    </el-tag>
                  </p>
                </div>
              </el-card>
            </el-col>
            <el-col :span="12">
              <el-card>
                <div slot="header" class="card-header">
                  <span>Permission Summary</span>
                </div>
                <div class="permission-summary">
                  <div class="summary-item">
                    <span class="summary-label">KRIs with Access:</span>
                    <span class="summary-value">{{ userDetailData.permissionSummary.totalKRIs }}</span>
                  </div>
                  <div class="summary-item">
                    <span class="summary-label">Total Permissions:</span>
                    <span class="summary-value">{{ userDetailData.permissionSummary.totalPermissions }}</span>
                  </div>
                  <div class="summary-item">
                    <span class="summary-label">Last Activity:</span>
                    <span class="summary-value">{{ formatDateTime(userDetailData.permissionSummary.lastActivity) }}</span>
                  </div>
                </div>
              </el-card>
            </el-col>
          </el-row>
        </div>
        
        <div style="margin-top: 20px;">
          <el-tabs>
            <el-tab-pane label="Permissions" name="permissions">
              <el-table :data="userDetailData.permissions" stripe style="width: 100%">
                <el-table-column prop="kri_id" label="KRI ID" width="120">
                </el-table-column>
                <el-table-column prop="actions" label="Permissions">
                  <template slot-scope="scope">
                    <el-tag 
                      v-for="action in scope.row.actions.split(',')" 
                      :key="action" 
                      size="mini"
                      style="margin-right: 5px;"
                    >
                      {{ action.trim() }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="effect" label="Status" width="80">
                  <template slot-scope="scope">
                    <el-tag :type="scope.row.effect ? 'success' : 'danger'" size="small">
                      {{ scope.row.effect ? 'Active' : 'Inactive' }}
                    </el-tag>
                  </template>
                </el-table-column>
              </el-table>
            </el-tab-pane>
            <el-tab-pane label="Recent Activity" name="activity">
              <el-table :data="userDetailData.recentActivity" stripe style="width: 100%">
                <el-table-column prop="changed_at" label="Date/Time" width="180">
                  <template slot-scope="scope">
                    {{ formatDateTime(scope.row.changed_at) }}
                  </template>
                </el-table-column>
                <el-table-column prop="kri_id" label="KRI ID" width="80">
                </el-table-column>
                <el-table-column prop="action" label="Action" width="120">
                </el-table-column>
                <el-table-column prop="field_name" label="Field">
                </el-table-column>
              </el-table>
            </el-tab-pane>
          </el-tabs>
        </div>
      </div>
      
      <div slot="footer" class="dialog-footer">
        <el-button @click="userDetailsDialogVisible = false">Close</el-button>
      </div>
    </el-dialog>

    <!-- KRI Permissions Management Dialog -->
    <el-dialog 
      title="Manage KRI Permissions" 
      :visible.sync="kriPermissionsDialogVisible"
      width="80%"
      @close="kriPermissionsDialogVisible = false"
    >
      <div v-if="selectedKRI">
        <div class="kri-info-header">
          <h4>{{ selectedKRI.kri_code }} - {{ selectedKRI.name }}</h4>
          <el-tag :type="selectedKRI.is_calculated_kri ? 'warning' : 'info'" size="medium">
            {{ selectedKRI.is_calculated_kri ? 'Calculated KRI' : 'Manual KRI' }}
          </el-tag>
        </div>
        
        <!-- Add New User Permission -->
        <el-card style="margin-bottom: 20px;">
          <div slot="header" class="card-header">
            <span>Add User Permission</span>
          </div>
          <el-form :inline="true">
            <el-form-item label="User:">
              <el-select 
                v-model="newUserPermissions.user_uuid" 
                placeholder="Select user"
                style="width: 200px;"
              >
                <el-option 
                  v-for="user in availableUsersForKRI" 
                  :key="user.UUID" 
                  :label="`${user.User_ID} (${user.User_Name})`" 
                  :value="user.UUID"
                ></el-option>
              </el-select>
            </el-form-item>
            <el-form-item label="Permissions:">
              <el-select 
                v-model="newUserPermissions.actions" 
                placeholder="Select permissions"
                style="width: 200px;"
              >
                <el-option label="View Only" value="view"></el-option>
                <el-option label="View + Edit" value="view,edit"></el-option>
                <el-option label="Data Provider" value="view,edit,review"></el-option>
                <el-option label="KRI Owner" value="view,edit,review,acknowledge"></el-option>
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button 
                type="primary" 
                @click="addKRIUserPermission"
                :disabled="!newUserPermissions.user_uuid || !newUserPermissions.actions"
              >
                Add Permission
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>
        
        <!-- Current Users with Permissions -->
        <el-table 
          :data="kriUserPermissions" 
          v-loading="kriPermissionsLoading"
          stripe
          border
          style="width: 100%"
        >
          <el-table-column prop="user_id" label="User ID" width="120">
          </el-table-column>
          
          <el-table-column prop="user_name" label="User Name" width="150">
          </el-table-column>
          
          <el-table-column prop="user_department" label="Department" width="120">
          </el-table-column>
          
          <el-table-column prop="actions" label="Permissions">
            <template slot-scope="scope">
              <el-tag 
                v-for="action in scope.row.actions.split(',')" 
                :key="action" 
                size="mini"
                style="margin-right: 5px;"
              >
                {{ action.trim() }}
              </el-tag>
            </template>
          </el-table-column>
          
          <el-table-column prop="effect" label="Status" width="80">
            <template slot-scope="scope">
              <el-tag :type="scope.row.effect ? 'success' : 'danger'" size="small">
                {{ scope.row.effect ? 'Active' : 'Inactive' }}
              </el-tag>
            </template>
          </el-table-column>
          
          <el-table-column label="Actions" width="100">
            <template slot-scope="scope">
              <el-button 
                size="mini" 
                type="danger" 
                icon="el-icon-delete"
                @click="removeKRIUserPermission(scope.row)"
              >
                Remove
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
      
      <div slot="footer" class="dialog-footer">
        <el-button @click="kriPermissionsDialogVisible = false">Close</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';
import { departmentAdminService } from '@/services/departmentAdminService';
import { kriService } from '@/services/kriService';
import Permission from '@/utils/permission';

export default {
  name: 'DepartmentAdmin',
  data() {
    return {
      activeTab: 'dashboard',
      
      // Department data
      departmentStats: {
        totalUsers: 0,
        totalKRIs: 0,
        usersByRole: {},
        pendingItems: {
          pendingApprovals: 0,
          pendingInputs: 0,
          overdueTasks: 0
        }
      },
      
      // Team management
      teamMembers: [],
      teamLoading: false,
      
      // Permission management
      bulkPermissionUsers: [],
      bulkPermissionKRIs: [],
      bulkPermissionActions: '',
      bulkPermissionLoading: false,
      
      // Department KRIs
      departmentKRIs: [],
      krisLoading: false,
      
      // Audit data
      auditStats: {
        totalActivities: 0,
        todayActivities: 0,
        uniqueUsers: 0
      },
      
      // Dialog data
      bulkPermissionDialogVisible: false,
      selectedTemplate: '',
      dialogBulkUsers: [],
      dialogBulkKRIs: [],
      templateApplyLoading: false,
      
      // User Permissions Dialog
      userPermissionsDialogVisible: false,
      selectedUser: null,
      userCurrentPermissions: [],
      editablePermissions: [],
      userPermissionsLoading: false,
      permissionUpdateLoading: false,
      
      // User Details Dialog
      userDetailsDialogVisible: false,
      userDetailData: null,
      userDetailsLoading: false,
      
      // KRI Permissions Dialog
      kriPermissionsDialogVisible: false,
      selectedKRI: null,
      kriUserPermissions: [],
      availableUsersForKRI: [],
      kriPermissionsLoading: false,
      newUserPermissions: {
        user_uuid: '',
        actions: ''
      },
      
      // Audit Trail
      auditTrailData: [],
      auditLoading: false,
      auditDateRange: [],
      auditTypeFilter: ''
    };
  },
  computed: {
    ...mapGetters('kri', ['currentUser']),
    
    permissionTemplates() {
      return departmentAdminService.getPermissionTemplates(this.currentUser.Department);
    }
  },
  async mounted() {
    // Verify department admin access
    if (!Permission.isDepartmentAdmin(this.currentUser) && !Permission.isSystemAdmin(this.currentUser)) {
      this.$message.error('Access denied. Department administrator privileges required.');
      this.$router.push('/');
      return;
    }
    
    await this.loadDepartmentData();
  },
  methods: {
    async loadDepartmentData() {
      try {
        // Load department overview
        const overview = await departmentAdminService.getDepartmentOverview(
          this.currentUser.Department, 
          this.currentUser
        );
        
        this.departmentStats = overview;
        this.teamMembers = overview.detailedUsers || [];
        this.departmentKRIs = overview.detailedKRIs || [];
        
        // Load team members with permissions
        await this.loadTeamMembersWithPermissions();
        
      } catch (error) {
        console.error('Error loading department data:', error);
        this.$message.error('Failed to load department data');
      }
    },
    
    async loadTeamMembersWithPermissions() {
      try {
        this.teamMembers = await departmentAdminService.getDepartmentUsersWithPermissions(
          this.currentUser.Department,
          this.currentUser
        );
      } catch (error) {
        console.error('Error loading team members with permissions:', error);
        this.$message.error('Failed to load team member permissions');
      }
    },
    
    async handleTabClick(tab) {
      switch (tab.name) {
        case 'team':
          if (this.teamMembers.length === 0) {
            await this.refreshTeamData();
          }
          break;
        case 'kris':
          if (this.departmentKRIs.length === 0) {
            await this.refreshKRIData();
          }
          break;
        case 'audit':
          if (this.auditTrailData.length === 0) {
            await this.loadAuditData();
          }
          break;
      }
    },
    
    async refreshTeamData() {
      this.teamLoading = true;
      try {
        await this.loadTeamMembersWithPermissions();
        this.$message.success('Team data refreshed');
      } catch (error) {
        console.error('Error refreshing team data:', error);
        this.$message.error('Failed to refresh team data');
      } finally {
        this.teamLoading = false;
      }
    },
    
    async refreshKRIData() {
      this.krisLoading = true;
      try {
        this.departmentKRIs = await kriService.getDepartmentKRIs(this.currentUser.Department);
        this.$message.success('KRI data refreshed');
      } catch (error) {
        console.error('Error refreshing KRI data:', error);
        this.$message.error('Failed to refresh KRI data');
      } finally {
        this.krisLoading = false;
      }
    },
    
    async loadAuditData() {
      this.auditLoading = true;
      try {
        // Load department-specific audit trail data
        let auditData = [];
        
        // Get audit data for all department KRIs
        for (const kri of this.departmentKRIs) {
          try {
            const kriAudit = await kriService.fetchKRIAuditTrail(kri.kri_code, '*');
            auditData = auditData.concat(kriAudit || []);
          } catch (error) {
            console.warn(`Failed to load audit data for KRI ${kri.kri_code}:`, error);
          }
        }
        
        // Filter by date range if specified
        if (this.auditDateRange && this.auditDateRange.length === 2) {
          const startDate = new Date(this.auditDateRange[0]);
          const endDate = new Date(this.auditDateRange[1]);
          endDate.setHours(23, 59, 59, 999); // Include the entire end date
          
          auditData = auditData.filter(item => {
            const itemDate = new Date(item.changed_at);
            return itemDate >= startDate && itemDate <= endDate;
          });
        }
        
        // Filter by activity type if specified
        if (this.auditTypeFilter) {
          auditData = auditData.filter(item => 
            item.action && item.action.toLowerCase().includes(this.auditTypeFilter.replace('_', ' '))
          );
        }
        
        // Sort by date (newest first)
        auditData.sort((a, b) => new Date(b.changed_at) - new Date(a.changed_at));
        
        this.auditTrailData = auditData;
        
        // Update audit statistics
        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const todayActivities = auditData.filter(item => 
          new Date(item.changed_at) >= todayStart
        ).length;
        
        const uniqueUsers = new Set(auditData.map(item => item.changed_by)).size;
        
        this.auditStats = {
          totalActivities: auditData.length,
          todayActivities,
          uniqueUsers
        };
        
      } catch (error) {
        console.error('Error loading audit data:', error);
        this.$message.error('Failed to load audit trail data');
      } finally {
        this.auditLoading = false;
      }
    },
    
    async manageUserPermissions(user) {
      this.selectedUser = user;
      this.userPermissionsLoading = true;
      this.userPermissionsDialogVisible = true;
      
      try {
        // Load user's current permissions
        this.userCurrentPermissions = await kriService.getUserPermissionsSummary(user.UUID);
        
        // Transform permissions for editing
        this.editablePermissions = this.departmentKRIs.map(kri => {
          const existingPerm = this.userCurrentPermissions.find(p => p.kri_id === kri.kri_code);
          return {
            kri_id: kri.kri_code,
            kri_name: kri.name,
            current_actions: existingPerm ? existingPerm.actions : '',
            new_actions: existingPerm ? existingPerm.actions : '',
            is_calculated: kri.is_calculated_kri
          };
        });
      } catch (error) {
        console.error('Error loading user permissions:', error);
        this.$message.error('Failed to load user permissions');
      } finally {
        this.userPermissionsLoading = false;
      }
    },
    
    async viewUserDetails(user) {
      this.selectedUser = user;
      this.userDetailsLoading = true;
      this.userDetailsDialogVisible = true;
      
      try {
        // Load detailed user information
        const [permissions, recentActivity] = await Promise.all([
          kriService.getUserPermissionsSummary(user.UUID),
          this.getUserRecentActivity(user.UUID)
        ]);
        
        this.userDetailData = {
          ...user,
          permissions,
          recentActivity,
          permissionSummary: {
            totalKRIs: permissions.length,
            totalPermissions: permissions.reduce((sum, p) => sum + (p.actions ? p.actions.split(',').length : 0), 0),
            lastActivity: recentActivity.length > 0 ? recentActivity[0].changed_at : null
          }
        };
      } catch (error) {
        console.error('Error loading user details:', error);
        this.$message.error('Failed to load user details');
      } finally {
        this.userDetailsLoading = false;
      }
    },
    
    async manageKRIPermissions(kri) {
      this.selectedKRI = kri;
      this.kriPermissionsLoading = true;
      this.kriPermissionsDialogVisible = true;
      
      try {
        // Load all users who have permissions on this KRI
        const allPermissions = await kriService.getUserPermissionsSummary();
        this.kriUserPermissions = allPermissions
          .filter(p => p.kri_id === kri.kri_code)
          .map(p => ({
            ...p,
            user_name: p.kri_user ? p.kri_user.User_Name : 'Unknown',
            user_id: p.kri_user ? p.kri_user.User_ID : 'Unknown',
            user_department: p.kri_user ? p.kri_user.Department : 'Unknown'
          }));
          
        // Prepare available users for assignment (department members without current permissions)
        this.availableUsersForKRI = this.teamMembers.filter(member => 
          !this.kriUserPermissions.some(p => p.user_uuid === member.UUID)
        );
      } catch (error) {
        console.error('Error loading KRI permissions:', error);
        this.$message.error('Failed to load KRI permissions');
      } finally {
        this.kriPermissionsLoading = false;
      }
    },
    
    openBulkPermissionDialog(templateKey) {
      this.selectedTemplate = templateKey;
      this.dialogBulkUsers = [];
      this.dialogBulkKRIs = [];
      this.bulkPermissionDialogVisible = true;
    },
    
    async applyPermissionTemplate() {
      if (!this.selectedTemplate || !this.dialogBulkUsers.length || !this.dialogBulkKRIs.length) {
        return;
      }
      
      this.templateApplyLoading = true;
      try {
        const reportingDate = parseInt(new Date().toISOString().slice(0, 10).replace(/-/g, ''));
        
        await departmentAdminService.applyPermissionTemplate(
          this.selectedTemplate,
          this.dialogBulkUsers,
          this.dialogBulkKRIs,
          reportingDate,
          this.currentUser
        );
        
        this.$message.success('Permission template applied successfully');
        this.bulkPermissionDialogVisible = false;
        await this.loadTeamMembersWithPermissions();
      } catch (error) {
        console.error('Error applying permission template:', error);
        this.$message.error('Failed to apply permission template');
      } finally {
        this.templateApplyLoading = false;
      }
    },
    
    async executeBulkPermissionAssignment() {
      if (!this.bulkPermissionUsers.length || !this.bulkPermissionKRIs.length || !this.bulkPermissionActions) {
        return;
      }
      
      this.bulkPermissionLoading = true;
      try {
        const reportingDate = parseInt(new Date().toISOString().slice(0, 10).replace(/-/g, ''));
        
        await departmentAdminService.bulkAssignDepartmentPermissions(
          this.currentUser.Department,
          this.bulkPermissionUsers,
          this.bulkPermissionKRIs,
          this.bulkPermissionActions,
          reportingDate,
          this.currentUser
        );
        
        this.$message.success('Bulk permissions assigned successfully');
        this.bulkPermissionUsers = [];
        this.bulkPermissionKRIs = [];
        this.bulkPermissionActions = '';
        await this.loadTeamMembersWithPermissions();
      } catch (error) {
        console.error('Error executing bulk permission assignment:', error);
        this.$message.error('Failed to assign permissions');
      } finally {
        this.bulkPermissionLoading = false;
      }
    },
    getRoleTagType(role) {
      switch (role) {
        case 'admin': return 'danger';
        case 'dept_admin': return 'warning';
        case 'user': return 'info';
        default: return 'info';
      }
    },
    
    getRoleDisplayName(role) {
      switch (role) {
        case 'admin': return 'System Admin';
        case 'dept_admin': return 'Dept Admin';
        case 'user': return 'User';
        default: return role || 'User';
      }
    },
    
    // Helper methods for new functionality
    async getUserRecentActivity(userUuid) {
      try {
        // Get recent audit trail entries for this user across department KRIs
        let recentActivity = [];
        for (const kri of this.departmentKRIs.slice(0, 5)) { // Limit to avoid too many requests
          try {
            const kriAudit = await kriService.fetchKRIAuditTrail(kri.kri_code, '*');
            const userActivity = (kriAudit || []).filter(item => item.changed_by === userUuid);
            recentActivity = recentActivity.concat(userActivity);
          } catch (error) {
            console.warn(`Failed to load activity for KRI ${kri.kri_code}:`, error);
          }
        }
        
        // Sort by date and return recent 10 items
        return recentActivity
          .sort((a, b) => new Date(b.changed_at) - new Date(a.changed_at))
          .slice(0, 10);
      } catch (error) {
        console.error('Error loading user recent activity:', error);
        return [];
      }
    },
    
    formatDateTime(timestamp) {
      if (!timestamp) return 'N/A';
      return new Date(timestamp).toLocaleString();
    },
    
    getActionTagType(action) {
      if (!action) return 'info';
      const actionLower = action.toLowerCase();
      if (actionLower.includes('approve') || actionLower.includes('finalize')) return 'success';
      if (actionLower.includes('reject') || actionLower.includes('delete')) return 'danger';
      if (actionLower.includes('submit') || actionLower.includes('update')) return 'warning';
      return 'info';
    },
    
    async updateUserPermissions() {
      if (!this.selectedUser || !this.editablePermissions.length) return;
      
      this.permissionUpdateLoading = true;
      try {
        const reportingDate = parseInt(new Date().toISOString().slice(0, 10).replace(/-/g, ''));
        
        // Update permissions for each KRI that has changes
        for (const perm of this.editablePermissions) {
          if (perm.current_actions !== perm.new_actions) {
            const permissionUpdate = {
              user_uuid: this.selectedUser.UUID,
              kri_id: perm.kri_id,
              actions: perm.new_actions,
              effect: perm.new_actions ? true : false,
              reporting_date: reportingDate
            };
            
            await kriService.bulkUpdatePermissions([permissionUpdate], this.currentUser.User_ID);
          }
        }
        
        this.$message.success('User permissions updated successfully');
        this.userPermissionsDialogVisible = false;
        await this.loadTeamMembersWithPermissions();
      } catch (error) {
        console.error('Error updating user permissions:', error);
        this.$message.error('Failed to update user permissions');
      } finally {
        this.permissionUpdateLoading = false;
      }
    },
    
    async addKRIUserPermission() {
      if (!this.newUserPermissions.user_uuid || !this.newUserPermissions.actions || !this.selectedKRI) {
        return;
      }
      
      try {
        const reportingDate = parseInt(new Date().toISOString().slice(0, 10).replace(/-/g, ''));
        
        const permissionUpdate = {
          user_uuid: this.newUserPermissions.user_uuid,
          kri_id: this.selectedKRI.kri_code,
          actions: this.newUserPermissions.actions,
          effect: true,
          reporting_date: reportingDate
        };
        
        await kriService.bulkUpdatePermissions([permissionUpdate], this.currentUser.User_ID);
        
        this.$message.success('KRI permission added successfully');
        this.newUserPermissions = { user_uuid: '', actions: '' };
        await this.manageKRIPermissions(this.selectedKRI); // Refresh data
      } catch (error) {
        console.error('Error adding KRI permission:', error);
        this.$message.error('Failed to add KRI permission');
      }
    },
    
    async removeKRIUserPermission(permission) {
      try {
        const reportingDate = parseInt(new Date().toISOString().slice(0, 10).replace(/-/g, ''));
        
        const permissionUpdate = {
          user_uuid: permission.user_uuid,
          kri_id: permission.kri_id,
          actions: '',
          effect: false,
          reporting_date: reportingDate
        };
        
        await kriService.bulkUpdatePermissions([permissionUpdate], this.currentUser.User_ID);
        
        this.$message.success('KRI permission removed successfully');
        await this.manageKRIPermissions(this.selectedKRI); // Refresh data
      } catch (error) {
        console.error('Error removing KRI permission:', error);
        this.$message.error('Failed to remove KRI permission');
      }
    }
  }
};
</script>

<style scoped>
.department-admin {
  padding: 20px;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.dept-admin-header {
  margin-bottom: 20px;
}

.dept-admin-title {
  margin: 0 0 10px 0;
  font-size: 28px;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 10px;
}

.department-info {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-role {
  color: #909399;
  font-size: 14px;
}

.dept-admin-container {
  background: white;
  border-radius: 8px;
}

.tab-content {
  padding: 20px 0;
}

.content-header {
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.content-header h3 {
  margin: 0;
  color: #303133;
}

.tab-description {
  color: #909399;
  margin: 5px 0 0 0;
  font-size: 14px;
}

.header-actions {
  display: flex;
  align-items: center;
}

/* Dashboard styles */
.dashboard-overview {
  margin-bottom: 20px;
}

.metric-card {
  text-align: center;
}

.metric-content {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  gap: 15px;
}

.metric-icon {
  font-size: 40px;
  color: #409eff;
}

.metric-data {
  text-align: left;
}

.metric-number {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 5px;
}

.metric-label {
  font-size: 14px;
  color: #909399;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.role-distribution {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.role-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.role-count {
  font-weight: bold;
  color: #409eff;
}

.quick-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.quick-actions .el-button {
  justify-content: flex-start;
}

/* Permission template styles */
.permission-tools {
  margin-bottom: 20px;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.template-item {
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.template-info h4 {
  margin: 0 0 5px 0;
  color: #303133;
}

.template-info p {
  margin: 0 0 10px 0;
  color: #606266;
  font-size: 14px;
}

.text-muted {
  color: #c0c4cc;
  font-style: italic;
}

/* Audit styles */
.audit-summary {
  margin-bottom: 30px;
}

.audit-stat-card {
  text-align: center;
}

.audit-stat {
  padding: 20px;
}

.audit-number {
  font-size: 32px;
  font-weight: bold;
  color: #409eff;
  margin-bottom: 5px;
}

.audit-label {
  font-size: 14px;
  color: #909399;
}

.audit-placeholder {
  text-align: center;
  padding: 60px;
}

/* Dialog styles */
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

/* New dialog styles */
.user-info-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 4px;
}

.user-info-header h4 {
  margin: 0;
  color: #303133;
}

.kri-info-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 4px;
}

.kri-info-header h4 {
  margin: 0;
  color: #303133;
}

.user-profile {
  margin-bottom: 20px;
}

.user-details p {
  margin: 10px 0;
  color: #606266;
}

.permission-summary {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.summary-label {
  color: #606266;
  font-weight: 500;
}

.summary-value {
  color: #303133;
  font-weight: bold;
}

.change-item {
  display: block;
  margin: 2px 0;
}

.old-value {
  color: #909399;
  margin-left: 5px;
}

.new-value {
  color: #67c23a;
  margin-left: 5px;
}

.no-audit-data {
  text-align: center;
  padding: 40px;
  color: #909399;
}

.audit-filters {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 20px;
}

/* Responsive design */
@media (max-width: 768px) {
  .department-admin {
    padding: 10px;
  }
  
  .content-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .metric-content {
    flex-direction: column;
    gap: 10px;
  }
  
  .metric-data {
    text-align: center;
  }
  
  .template-grid {
    grid-template-columns: 1fr;
  }
  
  .template-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
}
</style>