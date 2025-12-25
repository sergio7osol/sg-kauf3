<script setup lang="ts">
const props = defineProps<{
  modelValue: File[]
  maxFiles?: number
  maxFileSizeMB?: number
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: File[]): void
}>();

const selectedFiles = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
});

const maxFiles = computed(() => props.maxFiles ?? 10);
const maxFileSizeMB = computed(() => props.maxFileSizeMB ?? 3);
const allowedFileTypes = 'application/pdf,image/jpeg,image/png';

const localError = ref<string | null>(null);

function validateFile(file: File): { valid: boolean, error?: string } {
  const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png'];

  if (!allowedMimes.includes(file.type)) {
    return {
      valid: false,
      error: 'Only PDF, JPEG, and PNG files are allowed'
    };
  }

  const maxBytes = maxFileSizeMB.value * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      valid: false,
      error: `File "${file.name}" exceeds ${maxFileSizeMB.value}MB limit`
    };
  }

  return { valid: true };
}

function handleFileChange(files: File | File[] | null | undefined) {
  localError.value = null;

  if (!files) {
    return;
  }

  const fileArray = Array.isArray(files) ? files : [files];

  if (selectedFiles.value.length + fileArray.length > maxFiles.value) {
    localError.value = `Maximum ${maxFiles.value} files allowed`;
    return;
  }

  for (const file of fileArray) {
    const validation = validateFile(file);
    if (!validation.valid) {
      localError.value = validation.error || 'Invalid file';
      return;
    }
  }

  selectedFiles.value = [...selectedFiles.value, ...fileArray];
}

function removeFile(index: number) {
  const newFiles = [...selectedFiles.value];
  newFiles.splice(index, 1);
  selectedFiles.value = newFiles;
  localError.value = null;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getFileIcon(mimeType: string): string {
  if (mimeType === 'application/pdf') return 'i-lucide-file-text';
  if (mimeType.startsWith('image/')) return 'i-lucide-image';
  return 'i-lucide-file';
}
</script>

<template>
  <div class="space-y-4">
    <UFileUpload
      :model-value="null"
      :accept="allowedFileTypes"
      :disabled="selectedFiles.length >= maxFiles"
      multiple
      label="Drop receipt files here"
      :description="`PDF, JPEG, PNG (max ${maxFileSizeMB}MB each, ${maxFiles} files max)`"
      icon="i-lucide-paperclip"
      class="w-full btn-standard"
      @update:model-value="handleFileChange"
    />

    <UAlert
      v-if="localError"
      color="error"
      variant="subtle"
      icon="i-lucide-alert-circle"
      :description="localError"
      :close-button="{ icon: 'i-lucide-x', color: 'error', variant: 'link', padded: false }"
      @close="localError = null"
    />

    <div
      v-if="selectedFiles.length > 0"
      class="space-y-2"
    >
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium text-muted">
          Selected Files ({{ selectedFiles.length }}/{{ maxFiles }})
        </span>
      </div>

      <div class="space-y-2">
        <div
          v-for="(file, index) in selectedFiles"
          :key="`${file.name}-${index}`"
          class="flex items-center justify-between p-3 border border-default rounded-lg bg-elevated/30"
        >
          <div class="flex items-center gap-3 min-w-0 flex-1">
            <UIcon
              :name="getFileIcon(file.type)"
              class="w-5 h-5 text-muted flex-shrink-0"
            />
            <div class="min-w-0 flex-1">
              <div class="text-sm font-medium truncate">
                {{ file.name }}
              </div>
              <div class="text-xs text-muted">
                {{ formatFileSize(file.size) }}
              </div>
            </div>
          </div>
          <UButton
            icon="i-lucide-x"
            color="error"
            variant="ghost"
            size="xs"
            title="Remove file"
            @click="removeFile(index)"
          />
        </div>
      </div>
    </div>
  </div>
</template>
