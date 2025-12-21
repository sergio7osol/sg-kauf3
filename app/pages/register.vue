<script setup lang="ts">
import type { AuthFormField, FormSubmitEvent } from '@nuxt/ui';

definePageMeta({
  layout: 'plain',
  middleware: 'guest'
});

const { register } = useAuth();

async function registerUser(event: FormSubmitEvent) {
  await register(event.data);
}

const fields = ref<AuthFormField[]>([
  {
    name: 'name',
    type: 'text',
    label: 'Name',
    placeholder: 'Enter your name',
    required: true
  }, {
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
  }, {
    name: 'password_confirmation',
    type: 'password',
    label: 'Confirm Password',
    placeholder: 'Confirm your password',
    required: true
  }
]);
</script>

<template>
  <UDashboardPanel id="register">
    <template #body>
      <div class="flex items-center justify-center min-h-[calc(100vh-theme(spacing.16))]">
        <UAuthForm
          title="Register"
          description="Enter your credentials to register."
          icon="i-lucide-user"
          :fields="fields"
          class="max-w-md"
          @submit.prevent="registerUser"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>
