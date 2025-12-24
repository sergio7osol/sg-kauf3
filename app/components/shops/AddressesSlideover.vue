<script setup lang="ts">
import type { AxiosError } from 'axios';
import type { FormSubmitEvent } from '@nuxt/ui';
import type { Shop, ShopAddress } from '~/types';
import { useShopAddresses } from '~/composables/useShopAddresses';
import {
  ADDRESS_COUNTRY_OPTIONS,
  buildShopAddressPayload,
  createShopAddressFormState,
  extractAddressValidationErrors,
  formatValidationError,
  normalizeCountryCode,
  shopAddressFormSchema,
  type ShopAddressFormState,
  type ValidatedShopAddressFormState
} from '~/composables/useShopAddressForm';

const props = defineProps<{
  shop: Shop | null
}>();

const open = defineModel<boolean>('open', { default: false });

const emit = defineEmits<{
  (e: 'updated'): void
}>();

const toast = useToast();

const shopId = computed(() => props.shop?.id ?? null);
const {
  addresses,
  isLoading,
  error,
  fetchAddresses,
  createAddress,
  updateAddress,
  setPrimary,
  toggleActive,
  reset
} = useShopAddresses(shopId);

const isAddMode = ref(false);
const editingAddressId = ref<number | null>(null);
const submitting = ref(false);

const formState = reactive<ShopAddressFormState>(createShopAddressFormState());

const countries = [...ADDRESS_COUNTRY_OPTIONS];

function resetForm() {
  Object.assign(formState, createShopAddressFormState());
  isAddMode.value = false;
  editingAddressId.value = null;
}

function startAddMode() {
  resetForm();
  isAddMode.value = true;
}

function startEditMode(address: ShopAddress) {
  Object.assign(formState, {
    country: normalizeCountryCode(address.country),
    postalCode: address.postalCode,
    city: address.city,
    street: address.street,
    houseNumber: address.houseNumber,
    isPrimary: address.isPrimary,
    isActive: address.isActive
  });
  editingAddressId.value = address.id;
  isAddMode.value = false;
}

function cancelForm() {
  resetForm();
}

async function onSubmit(event: FormSubmitEvent<ValidatedShopAddressFormState>) {
  submitting.value = true;
  try {
    const payload = buildShopAddressPayload(event.data);

    if (editingAddressId.value) {
      await updateAddress(editingAddressId.value, payload);
      toast.add({
        title: 'Address updated',
        description: 'The address was updated successfully',
        color: 'success'
      });
    } else {
      await createAddress(payload);
      toast.add({
        title: 'Address created',
        description: 'The address was created successfully',
        color: 'success'
      });
    }

    resetForm();
    emit('updated');
  } catch (err) {
    const axiosError = err as AxiosError<{ message?: string, errors?: Record<string, string[]> }>;
    const validationErrors = extractAddressValidationErrors(axiosError);
    const message = validationErrors
      ? formatValidationError(validationErrors)
      : axiosError.response?.data?.message ?? 'Failed to save address';
    toast.add({ title: 'Error', description: message, color: 'error' });
  } finally {
    submitting.value = false;
  }
}

async function handleSetPrimary(addressId: number) {
  try {
    await setPrimary(addressId);
    toast.add({
      title: 'Primary address set',
      description: 'The address is now the primary address',
      color: 'success'
    });
    emit('updated');
  } catch (err) {
    const axiosError = err as AxiosError<{ message?: string }>;
    toast.add({
      title: 'Error',
      description: axiosError.response?.data?.message ?? 'Failed to set primary address',
      color: 'error'
    });
  }
}

async function handleToggleActive(addressId: number) {
  try {
    const updated = await toggleActive(addressId);
    toast.add({
      title: updated.isActive ? 'Address activated' : 'Address deactivated',
      description: updated.isActive
        ? 'The address is now active'
        : 'The address has been deactivated',
      color: 'success'
    });
    emit('updated');
  } catch (err) {
    const axiosError = err as AxiosError<{ message?: string }>;
    toast.add({
      title: 'Error',
      description: axiosError.response?.data?.message ?? 'Failed to toggle address status',
      color: 'error'
    });
  }
}

watch(open, async (isOpen) => {
  if (isOpen && props.shop) {
    resetForm();
    await fetchAddresses();
  } else if (!isOpen) {
    reset();
    resetForm();
  }
});

const isFormVisible = computed(() => isAddMode.value || editingAddressId.value !== null);
const formTitle = computed(() => editingAddressId.value ? 'Edit address' : 'Add new address');
</script>

<template>
  <USlideover
    v-model:open="open"
    :title="shop ? `Addresses for ${shop.name}` : 'Shop Addresses'"
  >
    <template #body>
      <div class="space-y-4">
        <div
          v-if="error"
          class="text-sm text-red-500 p-3 bg-red-50 rounded-md"
        >
          {{ error }}
        </div>

        <div
          v-if="isLoading"
          class="flex justify-center py-6"
        >
          <UProgress
            animation="carousel"
            size="md"
            color="primary"
            :value="null"
            class="w-32"
          />
        </div>

        <template v-else>
          <div
            v-if="!isFormVisible"
            class="flex justify-end"
          >
            <UButton
              label="Add address"
              icon="i-lucide-plus"
              color="primary"
              size="sm"
              @click="startAddMode"
            />
          </div>

          <div
            v-if="isFormVisible"
            class="p-4 bg-gray-50 rounded-lg border border-gray-200"
          >
            <div class="flex items-center justify-between mb-4">
              <h4 class="text-sm font-medium text-gray-900">
                {{ formTitle }}
              </h4>
              <UButton
                icon="i-lucide-x"
                color="neutral"
                variant="ghost"
                size="xs"
                @click="cancelForm"
              />
            </div>

            <UForm
              :schema="shopAddressFormSchema"
              :state="formState"
              class="space-y-3"
              @submit="onSubmit"
            >
              <div class="grid grid-cols-2 gap-3">
                <UFormField
                  label="Street"
                  name="street"
                  required
                >
                  <UInput
                    v-model="formState.street"
                    placeholder="Hauptstraße"
                    size="sm"
                  />
                </UFormField>

                <UFormField
                  label="House #"
                  name="houseNumber"
                  required
                >
                  <UInput
                    v-model="formState.houseNumber"
                    placeholder="12a"
                    size="sm"
                  />
                </UFormField>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <UFormField
                  label="Postal code"
                  name="postalCode"
                  required
                >
                  <UInput
                    v-model="formState.postalCode"
                    placeholder="86150"
                    size="sm"
                  />
                </UFormField>

                <UFormField
                  label="City"
                  name="city"
                  required
                >
                  <UInput
                    v-model="formState.city"
                    placeholder="Augsburg"
                    size="sm"
                  />
                </UFormField>
              </div>

              <UFormField
                label="Country"
                name="country"
                required
              >
                <USelect
                  v-model="formState.country"
                  :items="countries"
                  size="sm"
                />
              </UFormField>

              <div class="flex items-center gap-4 pt-2">
                <div class="flex items-center gap-2">
                  <USwitch
                    v-model="formState.isPrimary"
                    size="sm"
                  />
                  <span class="text-sm text-gray-600">Primary</span>
                </div>
                <div class="flex items-center gap-2">
                  <USwitch
                    v-model="formState.isActive"
                    size="sm"
                  />
                  <span class="text-sm text-gray-600">Active</span>
                </div>
              </div>

              <div class="flex justify-end gap-2 pt-2">
                <UButton
                  label="Cancel"
                  color="neutral"
                  variant="subtle"
                  size="sm"
                  class="btn-standard"
                  @click="cancelForm"
                />
                <UButton
                  :label="editingAddressId ? 'Update' : 'Create'"
                  color="primary"
                  size="sm"
                  :loading="submitting"
                  type="submit"
                  class="btn-standard"
                />
              </div>
            </UForm>
          </div>

          <div
            v-if="addresses.length === 0 && !isFormVisible"
            class="py-8 text-center text-sm text-gray-500"
          >
            No addresses yet. Click "Add address" to create one.
          </div>

          <div
            v-else
            class="space-y-2"
          >
            <div
              v-for="address in addresses"
              :key="address.id"
              class="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-200"
              :class="{ 'opacity-50': !address.isActive }"
            >
              <div class="flex-shrink-0 mt-0.5">
                <UBadge
                  v-if="address.isPrimary"
                  color="primary"
                  variant="soft"
                  size="xs"
                >
                  Primary
                </UBadge>
                <UBadge
                  v-else
                  color="gray"
                  variant="soft"
                  size="xs"
                >
                  #{{ address.displayOrder }}
                </UBadge>
              </div>

              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <UIcon
                    name="i-lucide-map-pin"
                    class="w-4 h-4 text-gray-400"
                  />
                  <span class="font-medium text-gray-900">
                    {{ address.street }} {{ address.houseNumber }}
                  </span>
                </div>
                <div class="flex items-center gap-2 mt-1 text-sm text-gray-600">
                  <UIcon
                    name="i-lucide-map"
                    class="w-3.5 h-3.5 text-gray-400"
                  />
                  <span>{{ address.postalCode }} {{ address.city }}, {{ address.country }}</span>
                </div>
              </div>

              <div class="flex-shrink-0 flex items-center gap-1">
                <UButton
                  v-if="!address.isPrimary && address.isActive"
                  icon="i-lucide-star"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  title="Set as primary"
                  class="btn-standard"
                  @click="handleSetPrimary(address.id)"
                />
                <UButton
                  icon="i-lucide-pencil"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  title="Edit"
                  class="btn-standard"
                  @click="startEditMode(address)"
                />
                <UButton
                  :icon="address.isActive ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  :title="address.isActive ? 'Deactivate' : 'Activate'"
                  class="btn-standard"
                  @click="handleToggleActive(address.id)"
                />
              </div>
            </div>
          </div>
        </template>
      </div>
    </template>
  </USlideover>
</template>
