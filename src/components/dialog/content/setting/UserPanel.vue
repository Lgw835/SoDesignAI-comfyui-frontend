<template>
  <TabPanel value="User" class="user-settings-container h-full">
    <div class="flex flex-col h-full">
      <h2 class="text-2xl font-bold mb-2">{{ $t('userSettings.title') }}</h2>
      <Divider class="mb-3" />

      <!-- Normal User Panel -->
      <div v-if="isLoggedIn" class="flex flex-col gap-2">
        <UserAvatar
          v-if="userPhotoUrl"
          :photo-url="userPhotoUrl"
          shape="circle"
          size="large"
        />

        <div class="flex flex-col gap-0.5">
          <h3 class="font-medium">
            {{ $t('userSettings.name') }}
          </h3>
          <div class="text-muted">
            {{ userDisplayName || $t('userSettings.notSet') }}
          </div>
        </div>

        <div class="flex flex-col gap-0.5">
          <h3 class="font-medium">
            {{ $t('userSettings.email') }}
          </h3>
          <span class="text-muted">
            {{ userEmail }}
          </span>
        </div>

        <div class="flex flex-col gap-0.5">
          <h3 class="font-medium">
            {{ $t('userSettings.provider') }}
          </h3>
          <div class="text-muted flex items-center gap-1">
            <i :class="providerIcon" />
            {{ providerName }}
            <Button
              v-if="isEmailProvider"
              v-tooltip="{
                value: $t('userSettings.updatePassword'),
                showDelay: 300
              }"
              icon="pi pi-pen-to-square"
              severity="secondary"
              text
              @click="dialogService.showUpdatePasswordDialog()"
            />
          </div>
        </div>

        <!-- JWT User Additional Info -->
        <div v-if="isJwtLogin" class="flex flex-col gap-2">
          <div class="flex flex-col gap-0.5">
            <h3 class="font-medium">
              {{ $t('userSettings.role') }}
            </h3>
            <div class="text-muted">
              {{ jwtAuth.userRole.value || $t('userSettings.notSet') }}
            </div>
          </div>

          <div class="flex flex-col gap-0.5">
            <h3 class="font-medium">
              {{ $t('userSettings.permissions') }}
            </h3>
            <div class="text-muted">
              <div v-if="jwtAuth.userPermissions.value && jwtAuth.userPermissions.value.length > 0" class="flex flex-wrap gap-1">
                <span
                  v-for="permission in jwtAuth.userPermissions.value"
                  :key="permission"
                  class="inline-block bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs"
                >
                  {{ permission }}
                </span>
              </div>
              <span v-else>{{ $t('userSettings.noPermissions') }}</span>
            </div>
          </div>
        </div>

        <!-- JWT用户不需要登出按钮 -->
        <div v-if="isJwtLogin" class="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
          <p class="text-sm text-blue-700 mb-0">
            <i class="pi pi-info-circle mr-2"></i>
            {{ $t('userSettings.jwtAuthInfo') }}
          </p>
        </div>

        <!-- 其他认证方式保留原有功能 -->
        <template v-else>
          <ProgressSpinner
            v-if="loading"
            class="w-8 h-8 mt-4"
            style="--pc-spinner-color: #000"
          />
          <Button
            v-else
            class="mt-4 w-32"
            severity="secondary"
            :label="$t('auth.signOut.signOut')"
            icon="pi pi-sign-out"
            @click="handleSignOut"
          />
        </template>
      </div>

      <!-- Login Section -->
      <div v-else class="flex flex-col gap-4">
        <p class="text-gray-600">
          {{ $t('auth.login.title') }}
        </p>

        <Button
          class="w-52"
          severity="primary"
          :loading="loading"
          :label="$t('auth.login.signInOrSignUp')"
          icon="pi pi-user"
          @click="handleSignIn"
        />
      </div>
    </div>
  </TabPanel>
</template>

<script setup lang="ts">
import Button from 'primevue/button'
import Divider from 'primevue/divider'
import ProgressSpinner from 'primevue/progressspinner'
import TabPanel from 'primevue/tabpanel'

import UserAvatar from '@/components/common/UserAvatar.vue'
import { useCurrentUser } from '@/composables/auth/useCurrentUser'
import { useDialogService } from '@/services/dialogService'

const dialogService = useDialogService()
const {
  loading,
  isLoggedIn,
  isEmailProvider,
  isJwtLogin,
  userDisplayName,
  userEmail,
  userPhotoUrl,
  providerName,
  providerIcon,
  handleSignOut,
  handleSignIn,
  jwtAuth
} = useCurrentUser()
</script>
