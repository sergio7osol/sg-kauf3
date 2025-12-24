<script setup lang="ts">
import axios, { type AxiosError } from 'axios';
import type { FormSubmitEvent } from '@nuxt/ui';
import type { Shop, ShopAddress } from '~/types';
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
import {
  ADDRESS_COUNTRY_OPTIONS,
  buildShopAddressPayload,
  createShopAddressFormState,
  type ShopAddressFormState
} from '~/composables/useShopAddressForm';

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

const showAddressSection = ref(false);
const addressState = reactive<ShopAddressFormState>(createShopAddressFormState());

const addressCountries = [...ADDRESS_COUNTRY_OPTIONS];

const hasAddressData = computed(() => {
  return addressState.street.trim() !== ''
    || addressState.houseNumber.trim() !== ''
    || addressState.postalCode.trim() !== ''
    || addressState.city.trim() !== '';
});

function resetForm() {
  Object.assign(state, createShopFormState({
    type: 'in_store',
    country: 'Germany'
  }));
  Object.assign(addressState, createShopAddressFormState());
  showAddressSection.value = false;
}

async function onSubmit(event: FormSubmitEvent<ValidatedShopFormState>) {
  submitting.value = true;
  try {
    const payload = buildShopPayload(event.data);

    const { data } = await axios.post<{ data?: Shop }>('/shops', payload);
    const createdShop = (data?.data ?? data) as Shop;

    // If address section is filled, create the address
    if (showAddressSection.value && hasAddressData.value) {
      try {
        const addressPayload = buildShopAddressPayload({
          ...addressState,
          isPrimary: true // First address is always primary
        });
        await axios.post<{ data: ShopAddress }>(`/shops/${createdShop.id}/addresses`, addressPayload);
        toast.add({
          title: 'Shop created with address',
          description: `${createdShop.name} and its address were created successfully`,
          color: 'success'
        });
      } catch {
        // Shop was created but address failed
        toast.add({
          title: 'Shop created',
          description: `${createdShop.name} was created, but address creation failed. You can add it later.`,
          color: 'warning'
        });
      }
    } else {
      toast.add({
        title: 'Shop created',
        description: `${createdShop.name} was created successfully`,
        color: 'success'
      });
    }

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

        <div class="border-t border-gray-200 pt-4">
          <button
            type="button"
            class="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 w-full"
            @click="showAddressSection = !showAddressSection"
          >
            <UIcon
              :name="showAddressSection ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
              class="w-4 h-4"
            />
            <UIcon
              name="i-lucide-map-pin"
              class="w-4 h-4"
            />
            <span>Add initial address (optional)</span>
          </button>

          <div
            v-if="showAddressSection"
            class="mt-4 p-4 bg-gray-50 rounded-lg space-y-3"
          >
            <div class="grid grid-cols-2 gap-3">
              <UFormField
                label="Street"
                name="addressStreet"
              >
                <UInput
                  v-model="addressState.street"
                  placeholder="Hauptstraße"
                  size="sm"
                />
              </UFormField>

              <UFormField
                label="House #"
                name="addressHouseNumber"
              >
                <UInput
                  v-model="addressState.houseNumber"
                  placeholder="12a"
                  size="sm"
                />
              </UFormField>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <UFormField
                label="Postal code"
                name="addressPostalCode"
              >
                <UInput
                  v-model="addressState.postalCode"
                  placeholder="86150"
                  size="sm"
                />
              </UFormField>

              <UFormField
                label="City"
                name="addressCity"
              >
                <UInput
                  v-model="addressState.city"
                  placeholder="Augsburg"
                  size="sm"
                />
              </UFormField>
            </div>

            <UFormField
              label="Country"
              name="addressCountry"
            >
              <USelect
                v-model="addressState.country"
                :items="addressCountries"
                size="sm"
              />
            </UFormField>

            <p class="text-xs text-gray-500">
              This address will be set as the primary address for the shop.
            </p>
          </div>
        </div>

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
