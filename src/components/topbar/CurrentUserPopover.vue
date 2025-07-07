<!-- A popover that shows current user information and actions -->
<template>
  <div class="current-user-popover w-72">
    <!-- User Info Section -->
    <div class="p-3">
      <div class="flex flex-col items-center">
        <UserAvatar
          class="mb-3"
          :photo-url="userPhotoUrl"
          :pt:icon:class="{
            '!text-2xl': !userPhotoUrl
          }"
          size="large"
        />

        <!-- User Details -->
        <h3 class="text-lg font-semibold truncate my-0 mb-1">
          {{ userDisplayName || $t('g.user') }}
        </h3>
        <p v-if="userEmail" class="text-sm text-muted truncate my-0">
          {{ userEmail }}
        </p>
      </div>
    </div>

    <Divider class="my-2" />

    <Button
      class="justify-start"
      :label="$t('userSettings.title')"
      icon="pi pi-cog"
      text
      fluid
      severity="secondary"
      @click="handleOpenUserSettings"
    />

    <!-- JWT用户显示认证状态信息 -->
    <div v-if="isJwtLogin" class="p-3 mt-2 bg-blue-50 rounded border border-blue-200">
      <div class="flex items-center text-sm text-blue-700">
        <i class="pi pi-shield mr-2"></i>
        <span>{{ $t('userSettings.jwtAuthStatus') }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button'
import Divider from 'primevue/divider'

import UserAvatar from '@/components/common/UserAvatar.vue'
import { useCurrentUser } from '@/composables/auth/useCurrentUser'
import { useDialogService } from '@/services/dialogService'

const emit = defineEmits<{
  close: []
}>()

const { userDisplayName, userEmail, userPhotoUrl, isJwtLogin } = useCurrentUser()
const dialogService = useDialogService()

const handleOpenUserSettings = () => {
  dialogService.showSettingsDialog('user')
  emit('close')
}
</script>
