<script setup lang="ts">
import axios from 'axios';
import * as z from 'zod';
import type { FormSubmitEvent } from '@nuxt/ui';
import { useUserPaymentMethods, type CreatePaymentMethodPayload, type UpdatePaymentMethodPayload } from '~/composables/useUserPaymentMethods';
import type { UserPaymentMethod } from '~/types';

const toast = useToast();

const {
  isLoading,
  error,
  activePaymentMethods,
  archivedPaymentMethods,
  fetchPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  archivePaymentMethod,
  restorePaymentMethod,
  deletePaymentMethod
} = useUserPaymentMethods();

// Modal state
const isModalOpen = ref(false);
const isEditing = ref(false);
const editingId = ref<number | null>(null);
const isSubmitting = ref(false);

// Delete confirmation state
const isDeleteModalOpen = ref(false);
const deletingMethod = ref<UserPaymentMethod | null>(null);
const isDeleting = ref(false);

// Form schema
const paymentMethodSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or less'),
  notes: z.string()
    .max(1000, 'Notes must be 1000 characters or less')
    .optional()
    .nullable(),
  isActive: z.boolean().optional()
});

type PaymentMethodSchema = z.output<typeof paymentMethodSchema>;

// Form state
const formState = reactive<PaymentMethodSchema>({
  name: '',
  notes: '',
  isActive: true
});

// Load payment methods on mount
onMounted(async () => {
  await fetchPaymentMethods().catch((err) => {
    console.error('Failed to load payment methods:', err);
  });
});

// Open modal for creating new payment method
function openCreateModal() {
  isEditing.value = false;
  editingId.value = null;
  formState.name = '';
  formState.notes = '';
  formState.isActive = true;
  isModalOpen.value = true;
}

// Open modal for editing existing payment method
function openEditModal(method: UserPaymentMethod) {
  isEditing.value = true;
  editingId.value = method.id;
  formState.name = method.name;
  formState.notes = method.notes ?? '';
  formState.isActive = method.isActive;
  isModalOpen.value = true;
}

// Close modal and reset state
function closeModal() {
  isModalOpen.value = false;
  isEditing.value = false;
  editingId.value = null;
}

// Handle form submission
async function onSubmit(event: FormSubmitEvent<PaymentMethodSchema>) {
  isSubmitting.value = true;

  try {
    if (isEditing.value && editingId.value) {
      // Update existing
      const payload: UpdatePaymentMethodPayload = {
        name: event.data.name,
        notes: event.data.notes || null,
        isActive: event.data.isActive
      };
      await updatePaymentMethod(editingId.value, payload);
      toast.add({
        title: 'Payment method updated',
        description: `"${event.data.name}" has been updated successfully.`,
        icon: 'i-lucide-check',
        color: 'success'
      });
    } else {
      // Create new
      const payload: CreatePaymentMethodPayload = {
        name: event.data.name,
        notes: event.data.notes || null,
        isActive: event.data.isActive ?? true
      };
      await createPaymentMethod(payload);
      toast.add({
        title: 'Payment method created',
        description: `"${event.data.name}" has been added successfully.`,
        icon: 'i-lucide-check',
        color: 'success'
      });
    }
    closeModal();
  } catch (err: unknown) {
    const errorMessage = axios.isAxiosError(err)
      ? (err.response?.data?.errors?.name?.[0] ?? err.response?.data?.message ?? 'An error occurred. Please try again.')
      : 'An error occurred. Please try again.';
    toast.add({
      title: 'Error',
      description: errorMessage,
      icon: 'i-lucide-alert-circle',
      color: 'error'
    });
  } finally {
    isSubmitting.value = false;
  }
}

// Archive a payment method (soft delete)
async function handleArchive(method: UserPaymentMethod) {
  try {
    await archivePaymentMethod(method.id);
    toast.add({
      title: 'Payment method archived',
      description: `"${method.name}" has been archived. It will no longer appear in dropdowns.`,
      icon: 'i-lucide-archive',
      color: 'success'
    });
  } catch {
    toast.add({
      title: 'Error',
      description: 'Failed to archive payment method. Please try again.',
      icon: 'i-lucide-alert-circle',
      color: 'error'
    });
  }
}

// Restore an archived payment method
async function handleRestore(method: UserPaymentMethod) {
  try {
    await restorePaymentMethod(method.id);
    toast.add({
      title: 'Payment method restored',
      description: `"${method.name}" is now active again.`,
      icon: 'i-lucide-refresh-cw',
      color: 'success'
    });
  } catch {
    toast.add({
      title: 'Error',
      description: 'Failed to restore payment method. Please try again.',
      icon: 'i-lucide-alert-circle',
      color: 'error'
    });
  }
}

// Open delete confirmation modal
function openDeleteModal(method: UserPaymentMethod) {
  deletingMethod.value = method;
  isDeleteModalOpen.value = true;
}

// Confirm and execute delete
async function confirmDelete() {
  if (!deletingMethod.value) return;

  isDeleting.value = true;
  try {
    const name = deletingMethod.value.name;
    await deletePaymentMethod(deletingMethod.value.id);
    toast.add({
      title: 'Payment method deleted',
      description: `"${name}" has been permanently deleted.`,
      icon: 'i-lucide-trash-2',
      color: 'success'
    });
    isDeleteModalOpen.value = false;
    deletingMethod.value = null;
  } catch {
    toast.add({
      title: 'Error',
      description: 'Failed to delete payment method. Please try again.',
      icon: 'i-lucide-alert-circle',
      color: 'error'
    });
  } finally {
    isDeleting.value = false;
  }
}
</script>

<template>
  <div>
    <!-- Header -->
    <UPageCard
      title="Payment Methods"
      description="Manage your payment methods for tracking purchases. Active methods appear in purchase dropdowns."
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    >
      <UButton
        label="Add payment method"
        color="primary"
        icon="i-lucide-plus"
        class="w-fit lg:ms-auto"
        @click="openCreateModal"
      />
    </UPageCard>

    <!-- Loading State -->
    <div
      v-if="isLoading"
      class="py-12 text-center"
    >
      <UProgress
        animation="carousel"
        size="lg"
        color="primary"
        class="w-48 mx-auto mb-4"
      />
      <p class="text-sm text-muted">
        Loading payment methods...
      </p>
    </div>

    <!-- Error State -->
    <UAlert
      v-else-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-alert-circle"
      :title="error"
      class="mb-4"
    />

    <!-- Content -->
    <template v-else>
      <!-- Active Payment Methods -->
      <UPageCard
        variant="subtle"
        class="mb-6"
      >
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon
              name="i-lucide-credit-card"
              class="w-5 h-5 text-primary"
            />
            <h3 class="font-semibold">
              Active Payment Methods
            </h3>
            <UBadge
              v-if="activePaymentMethods.length"
              color="primary"
              variant="subtle"
              size="sm"
            >
              {{ activePaymentMethods.length }}
            </UBadge>
          </div>
        </template>

        <div
          v-if="activePaymentMethods.length === 0"
          class="py-8 text-center text-muted"
        >
          <UIcon
            name="i-lucide-credit-card"
            class="w-12 h-12 mx-auto mb-2 opacity-40"
          />
          <p>No active payment methods</p>
          <p class="text-sm mt-1">
            Add a payment method to track how you pay for purchases.
          </p>
        </div>

        <div
          v-else
          class="divide-y divide-default"
        >
          <div
            v-for="method in activePaymentMethods"
            :key="method.id"
            class="flex items-center justify-between py-3 first:pt-0 last:pb-0"
          >
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-medium truncate">{{ method.name }}</span>
              </div>
              <p
                v-if="method.notes"
                class="text-sm text-muted truncate mt-0.5"
              >
                {{ method.notes }}
              </p>
            </div>

            <div class="flex items-center gap-1 ml-4">
              <UButton
                icon="i-lucide-pencil"
                color="neutral"
                variant="ghost"
                size="sm"
                title="Edit"
                @click="openEditModal(method)"
              />
              <UButton
                icon="i-lucide-archive"
                color="neutral"
                variant="ghost"
                size="sm"
                title="Archive"
                @click="handleArchive(method)"
              />
            </div>
          </div>
        </div>
      </UPageCard>

      <!-- Archived Payment Methods -->
      <UPageCard
        v-if="archivedPaymentMethods.length > 0"
        variant="subtle"
      >
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon
              name="i-lucide-archive"
              class="w-5 h-5 text-muted"
            />
            <h3 class="font-semibold text-muted">
              Archived
            </h3>
            <UBadge
              color="neutral"
              variant="subtle"
              size="sm"
            >
              {{ archivedPaymentMethods.length }}
            </UBadge>
          </div>
        </template>

        <div class="divide-y divide-default">
          <div
            v-for="method in archivedPaymentMethods"
            :key="method.id"
            class="flex items-center justify-between py-3 first:pt-0 last:pb-0 opacity-60"
          >
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-medium truncate">{{ method.name }}</span>
                <UBadge
                  color="neutral"
                  variant="outline"
                  size="xs"
                >
                  Archived
                </UBadge>
              </div>
              <p
                v-if="method.notes"
                class="text-sm text-muted truncate mt-0.5"
              >
                {{ method.notes }}
              </p>
            </div>

            <div class="flex items-center gap-1 ml-4">
              <UButton
                icon="i-lucide-refresh-cw"
                color="neutral"
                variant="ghost"
                size="sm"
                title="Restore"
                @click="handleRestore(method)"
              />
              <UButton
                icon="i-lucide-trash-2"
                color="error"
                variant="ghost"
                size="sm"
                title="Delete permanently"
                @click="openDeleteModal(method)"
              />
            </div>
          </div>
        </div>
      </UPageCard>
    </template>

    <!-- Create/Edit Modal -->
    <UModal v-model:open="isModalOpen">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold">
                {{ isEditing ? 'Edit Payment Method' : 'Add Payment Method' }}
              </h3>
              <UButton
                icon="i-lucide-x"
                color="neutral"
                variant="ghost"
                size="sm"
                @click="closeModal"
              />
            </div>
          </template>

          <UForm
            :schema="paymentMethodSchema"
            :state="formState"
            class="space-y-4"
            @submit="onSubmit"
          >
            <UFormField
              name="name"
              label="Name"
              required
            >
              <UInput
                v-model="formState.name"
                placeholder="e.g., DKB Main, PayPal, Cash"
                autofocus
              />
            </UFormField>

            <UFormField
              name="notes"
              label="Notes"
            >
              <UTextarea
                v-model="formState.notes"
                placeholder="Optional description or details..."
                :rows="3"
                autoresize
              />
            </UFormField>

            <UFormField
              v-if="isEditing"
              name="isActive"
            >
              <USwitch
                v-model="formState.isActive"
                label="Active"
              />
              <template #description>
                Inactive payment methods won't appear in purchase dropdowns but preserve historical data.
              </template>
            </UFormField>

            <div class="flex justify-end gap-2 pt-4">
              <UButton
                label="Cancel"
                color="neutral"
                variant="outline"
                @click="closeModal"
              />
              <UButton
                type="submit"
                :label="isEditing ? 'Save changes' : 'Add payment method'"
                color="primary"
                :loading="isSubmitting"
              />
            </div>
          </UForm>
        </UCard>
      </template>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="isDeleteModalOpen">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center gap-2 text-error">
              <UIcon
                name="i-lucide-alert-triangle"
                class="w-5 h-5"
              />
              <h3 class="text-lg font-semibold">
                Delete Payment Method
              </h3>
            </div>
          </template>

          <p class="text-sm text-muted">
            Are you sure you want to permanently delete
            <strong class="text-default">"{{ deletingMethod?.name }}"</strong>?
          </p>
          <p class="text-sm text-muted mt-2">
            This action cannot be undone. Historical purchases using this payment method will show "Not specified".
          </p>

          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton
                label="Cancel"
                color="neutral"
                variant="outline"
                @click="isDeleteModalOpen = false"
              />
              <UButton
                label="Delete permanently"
                color="error"
                :loading="isDeleting"
                @click="confirmDelete"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
