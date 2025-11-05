<script setup lang="ts">
import type { AuthFormField, FormSubmitEvent } from '@nuxt/ui'
import axios from "axios"

definePageMeta({
  layout: 'plain',
  middleware: 'guest'
})

async function login(event: FormSubmitEvent) {
  await axios.post('/login', event.data);
  
  useRouter().push('/me');
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
          @submit.prevent="login"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>
