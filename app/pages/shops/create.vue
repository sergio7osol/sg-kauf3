<script setup lang="ts">
import axios, { type AxiosError } from 'axios'
import type { FormSubmitEvent } from '@nuxt/ui'
import {
  SHOP_COUNTRIES,
  SHOP_TYPES,
  buildShopPayload,
  createShopFormState,
  extractValidationErrors,
  shopFormSchema,
  type ShopFormState
} from '~/composables/useShopForm'

const router = useRouter()

const state = reactive<ShopFormState>(createShopFormState())

// Form submission
const submitting = ref(false)
const formErrors = ref<Record<string, string>>({})

async function onSubmit(event: FormSubmitEvent<ShopFormState>) {
  submitting.value = true
  formErrors.value = {}

  try {
    const payload = buildShopPayload(event.data)

    console.log('Axios baseURL:', axios.defaults.baseURL)
    console.log('Submitting payload:', payload)
    console.log('Axios headers:', axios.defaults.headers.common)
    console.log('withCredentials:', axios.defaults.withCredentials)
    console.log('Document cookies:', document.cookie)
    
    await axios.post('/shops', payload)
    await router.push('/shops')
  } catch (error) {
    const axiosError = error as AxiosError<{ message: string; errors?: Record<string, string[]> }>
    const backendErrors = extractValidationErrors(axiosError)

    if (backendErrors) {
      Object.keys(backendErrors).forEach(key => {
        formErrors.value[key] = backendErrors[key][0]
      })
    } else {
      console.error('Shop creation failed:', error)
      // Could show a toast notification here
    }
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <UDashboardPage>
    <UDashboardPanel grow>
      <UDashboardNavbar title="Create Shop" />

      <UDashboardPanelContent>
        <UForm
          :schema="shopFormSchema"
          :state="state"
          class="space-y-6 max-w-2xl"
          @submit="onSubmit"
        >
          <!-- Name -->
          <UFormGroup
            label="Shop Name"
            name="name"
            required
            :error="formErrors.name"
          >
            <UInput
              v-model="state.name"
              placeholder="Enter shop name"
              size="lg"
            />
          </UFormGroup>

          <!-- Slug (optional) -->
          <UFormGroup
            label="Slug"
            name="slug"
            :error="formErrors.slug"
            help="Leave empty to auto-generate from name"
          >
            <UInput
              v-model="state.slug"
              placeholder="custom-slug"
              size="lg"
            />
          </UFormGroup>

          <!-- Type -->
          <UFormGroup
            label="Shop Type"
            name="type"
            required
            :error="formErrors.type"
          >
            <USelect
              v-model="state.type"
              :items="SHOP_TYPES"
              placeholder="Select shop type"
              size="lg"
            />
          </UFormGroup>

          <!-- Country -->
          <UFormGroup
            label="Country"
            name="country"
            required
            :error="formErrors.country"
          >
            <USelect
              v-model="state.country"
              :items="SHOP_COUNTRIES"
              placeholder="Select country"
              size="lg"
            />
          </UFormGroup>

          <!-- Is Active -->
          <UFormGroup
            label="Active Status"
            name="isActive"
            :error="formErrors.isActive"
            help="Inactive shops are hidden from the public"
          >
            <USwitch v-model="state.isActive" />
            <span class="ml-3 text-sm">
              {{ state.isActive ? 'Active' : 'Inactive' }}
            </span>
          </UFormGroup>

          <!-- Submit Button -->
          <div class="flex gap-3">
            <UButton
              type="submit"
              size="lg"
              :loading="submitting"
              :disabled="submitting"
            >
              Create Shop
            </UButton>
            <UButton
              color="gray"
              variant="ghost"
              size="lg"
              :disabled="submitting"
              @click="router.push('/shops')"
            >
              Cancel
            </UButton>
          </div>
        </UForm>
      </UDashboardPanelContent>
    </UDashboardPanel>
  </UDashboardPage>
</template>
