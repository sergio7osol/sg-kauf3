<script setup lang="ts">
import axios, { type AxiosError } from 'axios';
import type { FormSubmitEvent } from '@nuxt/ui';
import type { Shop } from '~/types';
import {
  SHOP_COUNTRIES,
  SHOP_TYPES,
  buildShopPayload,
  createShopFormState,
  extractValidationErrors,
  shopFormSchema,
  type ShopFormState,
  type ValidatedShopFormState
} from '~/composables/useShopForm';

const emit = defineEmits<{ (e: 'created', shop: Shop): void }>();

const open = ref(false);
const submitting = ref(false);
const toast = useToast();
const schema = shopFormSchema;
const shopTypes = SHOP_TYPES.map(type => ({
  label: type.replace('_', ' ').replace(/\b\w/g, char => char.toUpperCase()),
  value: type
}));
const countries = SHOP_COUNTRIES.map(country => ({
  label: country,
  value: country
}));
const state = reactive<ShopFormState>(createShopFormState({
  type: 'in_store',
  country: 'Germany'
}));

function resetForm() {
  Object.assign(state, createShopFormState({
    type: 'in_store',
    country: 'Germany'
  }));
}

async function onSubmit(event: FormSubmitEvent<ValidatedShopFormState>) {
  submitting.value = true;
  try {
    const payload = buildShopPayload(event.data);

    const { data } = await axios.post<{ data?: Shop }>('/shops', payload);
    const createdShop = (data?.data ?? data) as Shop;

    toast.add({
      title: 'Shop created',
      description: `${createdShop.name} was created successfully`,
      color: 'success'
    });

    emit('created', createdShop);
    open.value = false;
    resetForm();
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string, errors?: Record<string, string[]> }>;
    const validationErrors = extractValidationErrors(axiosError);
    const message = validationErrors
      ? Object.values(validationErrors)[0]?.[0] ?? 'Validation error'
      : axiosError.response?.data?.message ?? 'Failed to create shop';
    toast.add({ title: 'Error', description: message, color: 'error' });
  } finally {
    submitting.value = false;
  }
}

watch(open, (value: boolean) => {
  if (!value) {
    resetForm();
  }
});
</script>

<template>
  <UModal
    v-model:open="open"
    title="New shop"
    description="Create a new shop entry"
  >
    <UButton
      label="New shop"
      icon="i-lucide-plus"
      color="primary"
    />

    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField
          label="Name"
          name="name"
          required
        >
          <UInput
            v-model="state.name"
            placeholder="Name"
          />
        </UFormField>

        <UFormField
          label="Slug"
          name="slug"
          help="Leave empty to auto-generate"
        >
          <UInput
            v-model="state.slug"
            placeholder="Slug"
          />
        </UFormField>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <UFormField
            label="Type"
            name="type"
            required
          >
            <USelect
              v-model="state.type"
              :items="shopTypes"
            />
          </UFormField>

          <UFormField
            label="Country"
            name="country"
            required
          >
            <USelect
              v-model="state.country"
              :items="countries"
            />
          </UFormField>
        </div>

        <UFormField
          label="Active"
          name="isActive"
        >
          <div class="flex items-center gap-3">
            <USwitch v-model="state.isActive" />
            <span class="text-sm text-gray-500">{{ state.isActive ? 'Visible in listings' : 'Created as draft' }}</span>
          </div>
        </UFormField>

        <div class="flex justify-end gap-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="subtle"
            @click="open = false"
          />
          <UButton
            label="Create"
            color="primary"
            :loading="submitting"
            type="submit"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
