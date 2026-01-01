<script setup lang="ts">
import axios from 'axios';
import { useLabels } from '~/composables/useLabels';
import type { Label } from '~/types';

interface LabelOption {
  label: string
  value: number
  description?: string | null
}

const props = withDefaults(defineProps<{
  modelValue: number[]
  hideCreateButton?: boolean
  placeholder?: string
}>(), {
  hideCreateButton: false,
  placeholder: 'Select labels...'
});

const emit = defineEmits<{
  'update:modelValue': [value: number[]]
}>();

const toast = useToast();
const { labels, isLoading, fetchLabels, createLabel } = useLabels();

const createModalOpen = ref(false);
const isCreating = ref(false);
const newLabelName = ref('');
const newLabelDescription = ref('');
const validationError = ref<string | null>(null);

const labelOptions = computed<LabelOption[]>(() => {
  return labels.value.map((l: Label) => ({
    label: l.name,
    value: l.id,
    description: l.description
  }));
});

const selectedLabelObjects = computed(() => {
  return labels.value.filter((l: Label) => props.modelValue.includes(l.id));
});

const selectedLabels = computed({
  get: () => props.modelValue,
  set: (val: number[]) => emit('update:modelValue', val)
});

onMounted(async () => {
  if (labels.value.length === 0) {
    await fetchLabels().catch(err => console.error('Failed to load labels:', err));
  }
});

function openCreateModal() {
  newLabelName.value = '';
  newLabelDescription.value = '';
  validationError.value = null;
  createModalOpen.value = true;
}

async function handleCreateLabel() {
  validationError.value = null;

  const name = newLabelName.value.trim();
  if (!name) {
    validationError.value = 'Label name is required.';
    return;
  }
  if (name.length > 30) {
    validationError.value = 'Label name must be 30 characters or less.';
    return;
  }

  isCreating.value = true;

  try {
    const response = await createLabel({
      name,
      description: newLabelDescription.value.trim() || null
    });

    if (response.data) {
      selectedLabels.value = [...selectedLabels.value, response.data.id];
    }

    toast.add({
      title: 'Label Created',
      description: `Label "${name}" has been created.`,
      icon: 'i-lucide-check',
      color: 'success'
    });

    createModalOpen.value = false;
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const errors = err.response?.data?.errors;
      if (errors?.name) {
        validationError.value = Array.isArray(errors.name) ? errors.name[0] : errors.name;
      } else {
        validationError.value = err.response?.data?.message ?? 'Failed to create label.';
      }
    } else {
      validationError.value = 'Failed to create label.';
    }
  } finally {
    isCreating.value = false;
  }
}
</script>

<template>
  <div class="space-y-2">
    <USelectMenu
      v-model="selectedLabels"
      :items="labelOptions"
      :loading="isLoading"
      multiple
      value-key="value"
      placeholder="Select labels..."
      class="w-full"
    >
      <template #default>
        <div class="flex flex-wrap items-center gap-1 min-h-6 text-sm">
          <span
            v-if="selectedLabelObjects.length === 0"
            class="text-muted"
          >
            {{ placeholder }}
          </span>
          <template v-else>
            <UBadge
              v-for="label in selectedLabelObjects"
              :key="label.id"
              color="neutral"
              variant="subtle"
              size="md"
            >
              {{ label.name }}
            </UBadge>
          </template>
        </div>
      </template>
      <template #empty>
        <div class="p-2 text-center text-sm text-muted">
          No labels yet
        </div>
      </template>
    </USelectMenu>

    <UButton
      v-if="!hideCreateButton"
      color="neutral"
      variant="ghost"
      icon="i-lucide-plus"
      label="Create new label"
      size="xs"
      class="btn-standard"
      @click="openCreateModal"
    />

    <UModal
      v-model:open="createModalOpen"
      title="Create New Label"
      description="Add a label to organize your purchases."
      :ui="{ footer: 'justify-end' }"
    >
      <template #body>
        <div class="space-y-4">
          <UFormField
            label="Name"
            required
            :error="validationError"
          >
            <UInput
              v-model="newLabelName"
              placeholder="e.g., Groceries, Birthday Gift..."
              maxlength="30"
              autofocus
              class="w-full"
              @keydown.enter.prevent="handleCreateLabel"
            />
            <template #hint>
              <span class="text-xs text-muted">{{ newLabelName.length }}/30 characters</span>
            </template>
          </UFormField>

          <UFormField label="Description">
            <UTextarea
              v-model="newLabelDescription"
              placeholder="Optional description..."
              :rows="2"
              maxlength="255"
              class="w-full"
            />
            <template #hint>
              <span class="text-xs text-muted">{{ newLabelDescription.length }}/255 characters</span>
            </template>
          </UFormField>
        </div>
      </template>

      <template #footer>
        <UButton
          color="neutral"
          variant="outline"
          label="Cancel"
          @click="createModalOpen = false"
        />
        <UButton
          color="primary"
          label="Create Label"
          :loading="isCreating"
          :disabled="!newLabelName.trim()"
          @click="handleCreateLabel"
        />
      </template>
    </UModal>
  </div>
</template>
