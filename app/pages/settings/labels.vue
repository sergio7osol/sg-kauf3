<script setup lang="ts">
import axios from 'axios';
import * as z from 'zod';
import type { FormSubmitEvent } from '@nuxt/ui';
import { useLabels, type CreateLabelPayload, type UpdateLabelPayload } from '~/composables/useLabels';
import type { Label } from '~/types';

const toast = useToast();

const {
  labels,
  isLoading,
  error,
  fetchLabels,
  createLabel,
  updateLabel,
  deleteLabel
} = useLabels();

const isModalOpen = ref(false);
const isEditing = ref(false);
const editingId = ref<number | null>(null);
const isSubmitting = ref(false);

const isDeleteModalOpen = ref(false);
const deletingLabel = ref<Label | null>(null);
const isDeleting = ref(false);

const labelSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(30, 'Name must be 30 characters or less'),
  description: z.string()
    .max(255, 'Description must be 255 characters or less')
    .optional()
    .nullable()
});

type LabelSchema = z.output<typeof labelSchema>;

const formState = reactive<LabelSchema>({
  name: '',
  description: ''
});

onMounted(async () => {
  await fetchLabels().catch((err) => {
    console.error('Failed to load labels:', err);
  });
});

function openCreateModal() {
  isEditing.value = false;
  editingId.value = null;
  formState.name = '';
  formState.description = '';
  isModalOpen.value = true;
}

function openEditModal(label: Label) {
  isEditing.value = true;
  editingId.value = label.id;
  formState.name = label.name;
  formState.description = label.description ?? '';
  isModalOpen.value = true;
}

function closeModal() {
  isModalOpen.value = false;
  isEditing.value = false;
  editingId.value = null;
}

async function onSubmit(event: FormSubmitEvent<LabelSchema>) {
  isSubmitting.value = true;

  try {
    if (isEditing.value && editingId.value) {
      const payload: UpdateLabelPayload = {
        name: event.data.name,
        description: event.data.description || null
      };
      await updateLabel(editingId.value, payload);
      toast.add({
        title: 'Label updated',
        description: `"${event.data.name}" has been updated successfully.`,
        icon: 'i-lucide-check',
        color: 'success'
      });
    } else {
      const payload: CreateLabelPayload = {
        name: event.data.name,
        description: event.data.description || null
      };
      await createLabel(payload);
      toast.add({
        title: 'Label created',
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

function openDeleteModal(label: Label) {
  deletingLabel.value = label;
  isDeleteModalOpen.value = true;
}

async function confirmDelete() {
  if (!deletingLabel.value) return;

  isDeleting.value = true;
  try {
    const name = deletingLabel.value.name;
    await deleteLabel(deletingLabel.value.id);
    toast.add({
      title: 'Label deleted',
      description: `"${name}" has been permanently deleted.`,
      icon: 'i-lucide-trash-2',
      color: 'success'
    });
    isDeleteModalOpen.value = false;
    deletingLabel.value = null;
  } catch {
    toast.add({
      title: 'Error',
      description: 'Failed to delete label. Please try again.',
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
    <UPageCard
      title="Labels"
      description="Manage labels to organize and categorize your purchases."
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    >
      <UButton
        label="Add label"
        color="primary"
        icon="i-lucide-plus"
        class="w-fit lg:ms-auto"
        @click="openCreateModal"
      />
    </UPageCard>

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
        Loading labels...
      </p>
    </div>

    <UAlert
      v-else-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-alert-circle"
      :title="error"
      class="mb-4"
    />

    <template v-else>
      <UPageCard variant="subtle">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon
              name="i-lucide-tag"
              class="w-5 h-5 text-primary"
            />
            <h3 class="font-semibold">
              Your Labels
            </h3>
            <UBadge
              v-if="labels.length"
              color="primary"
              variant="subtle"
              size="sm"
            >
              {{ labels.length }}
            </UBadge>
          </div>
        </template>

        <div
          v-if="labels.length === 0"
          class="py-8 text-center text-muted"
        >
          <UIcon
            name="i-lucide-tag"
            class="w-12 h-12 mx-auto mb-2 opacity-40"
          />
          <p>No labels yet</p>
          <p class="text-sm mt-1">
            Create labels to organize your purchases by category, project, or any custom grouping.
          </p>
        </div>

        <div
          v-else
          class="divide-y divide-default"
        >
          <div
            v-for="label in labels"
            :key="label.id"
            class="flex items-center justify-between py-3 first:pt-0 last:pb-0"
          >
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <UBadge
                  color="neutral"
                  variant="subtle"
                >
                  {{ label.name }}
                </UBadge>
              </div>
              <p
                v-if="label.description"
                class="text-sm text-muted truncate mt-1"
              >
                {{ label.description }}
              </p>
            </div>

            <div class="flex items-center gap-1 ml-4">
              <UButton
                icon="i-lucide-pencil"
                color="neutral"
                variant="ghost"
                size="sm"
                title="Edit"
                @click="openEditModal(label)"
              />
              <UButton
                icon="i-lucide-trash-2"
                color="error"
                variant="ghost"
                size="sm"
                title="Delete"
                @click="openDeleteModal(label)"
              />
            </div>
          </div>
        </div>
      </UPageCard>
    </template>

    <UModal v-model:open="isModalOpen">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold">
                {{ isEditing ? 'Edit Label' : 'Add Label' }}
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
            :schema="labelSchema"
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
                placeholder="e.g., Groceries, Birthday Gift, Work Expense"
                maxlength="30"
                autofocus
              />
              <template #hint>
                <span class="text-xs text-muted">{{ formState.name.length }}/30 characters</span>
              </template>
            </UFormField>

            <UFormField
              name="description"
              label="Description"
            >
              <UTextarea
                v-model="formState.description"
                placeholder="Optional description..."
                :rows="2"
                maxlength="255"
                autoresize
              />
              <template #hint>
                <span class="text-xs text-muted">{{ (formState.description || '').length }}/255 characters</span>
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
                :label="isEditing ? 'Save changes' : 'Add label'"
                color="primary"
                :loading="isSubmitting"
              />
            </div>
          </UForm>
        </UCard>
      </template>
    </UModal>

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
                Delete Label
              </h3>
            </div>
          </template>

          <p class="text-sm text-muted">
            Are you sure you want to permanently delete
            <strong class="text-default">"{{ deletingLabel?.name }}"</strong>?
          </p>
          <p class="text-sm text-muted mt-2">
            This action cannot be undone. The label will be removed from all purchases that use it.
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
