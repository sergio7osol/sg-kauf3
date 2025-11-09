<script setup lang="ts">
import type { AuthFormField, FormSubmitEvent } from '@nuxt/ui'
import type { LoginCredentials } from '~/composables/useAuth'

definePageMeta({
  layout: 'plain',
  middleware: 'guest'
})

const { login: authLogin } = useAuth();

async function handleLogin(event: FormSubmitEvent<LoginCredentials>) {
  try {
    await authLogin(event.data);
  } catch (error) {
    // TODO: Show error message e.g. as a toast
    console.error('Login failed:', error);
  }
}

const fields = ref<AuthFormField[]>([
  {
    name: 'email',
    type: 'email',
    label: 'Email',
    placeholder: 'Enter your email',
    required: true
  }, {
    name: 'password',
    type: 'password',
    label: 'Password',
    placeholder: 'Enter your password',
    required: true
  }
])
</script>

<template>
  <UDashboardPanel id="login">
    <template #body>
      <div class="flex items-center justify-center min-h-[calc(100vh-theme(spacing.16))]">
        <UAuthForm
          title="Login"
          description="Enter your credentials to access your account."
          icon="i-lucide-lock"
          :fields="fields"
          class="max-w-md"
          @submit.prevent="handleLogin"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>
