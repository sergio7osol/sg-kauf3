<script setup lang="ts">
import { useReceiptParser } from '~/composables/useReceiptParser'
import type { ParsedReceiptData } from '~/types'

// Props & Events
const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'parsed', data: ParsedReceiptData): void
}>()

// Modal state
const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value)
})

// Receipt parser composable
const {
  isUploading,
  isParsing,
  parseError,
  parseWarnings,
  confidence,
  parseReceipt,
  fetchSupportedShops,
  resetState,
  validateFile,
  allowedFileTypes,
  maxFileSizeMB,
  supportedShops
} = useReceiptParser()

// Local state
const selectedFile = ref<File | null>(null)
const localError = ref<string | null>(null)
const showPreview = ref(false)
const parsedResult = ref<ParsedReceiptData | null>(null)

// Toast for notifications
const toast = useToast()

// Fetch supported shops when modal opens
watch(isOpen, async (newVal) => {
  if (newVal) {
    resetState()
    selectedFile.value = null
    localError.value = null
    showPreview.value = false
    parsedResult.value = null
    await fetchSupportedShops()
  }
})

// Handle file selection from UFileUpload
function handleFileChange(file: File | File[] | null) {
  localError.value = null
  
  if (!file) {
    selectedFile.value = null
    return
  }
  
  // UFileUpload can return array if multiple, but we use single file
  const singleFile = Array.isArray(file) ? file[0] : file
  
  if (!singleFile) {
    selectedFile.value = null
    return
  }
  
  // Validate file
  const validation = validateFile(singleFile)
  if (!validation.valid) {
    localError.value = validation.error || 'Invalid file'
    selectedFile.value = null
    return
  }
  
  selectedFile.value = singleFile
}

// Upload and parse the receipt
async function handleUpload() {
  if (!selectedFile.value) {
    localError.value = 'Please select a file first'
    return
  }
  
  const result = await parseReceipt(selectedFile.value)
  
  if (result) {
    parsedResult.value = result
    showPreview.value = true
  }
}

// Confirm and apply parsed data
function handleApply() {
  if (!parsedResult.value) return
  
  emit('parsed', parsedResult.value)
  
  toast.add({
    title: 'Receipt Imported',
    description: 'Form has been pre-filled with receipt data. Please review and adjust if needed.',
    icon: 'i-lucide-check',
    color: 'success'
  })
  
  isOpen.value = false
}

// Cancel and close
function handleCancel() {
  resetState()
  isOpen.value = false
}

// Go back to upload step
function handleBack() {
  showPreview.value = false
  parsedResult.value = null
  resetState()
}

// Format currency for display
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR'
  }).format(value)
}
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :title="showPreview ? 'Review Parsed Receipt' : 'Import Receipt'"
    :description="showPreview ? 'Review the extracted data and apply to form' : 'Upload a receipt image or PDF to auto-fill the purchase form'"
  >
    <!-- Trigger button -->
    <UButton
      color="neutral"
      variant="outline"
      icon="i-lucide-scan-line"
      class="btn-standard"
      label="Import Receipt"
    />

    <template #body>
      <!-- Upload Step -->
      <div v-if="!showPreview" class="space-y-4">
        <!-- Supported shops info -->
        <UAlert
          v-if="supportedShops.length > 0"
          color="info"
          variant="subtle"
          icon="i-lucide-info"
          title="Supported Shops"
          :description="`Currently supports: ${supportedShops.join(', ')}`"
        />

        <!-- File Upload Component -->
        <UFileUpload
          :model-value="selectedFile"
          :accept="allowedFileTypes"
          :disabled="isParsing"
          label="Drop your receipt here"
          :description="`PDF, PNG, JPG, JPEG, or WebP (max ${maxFileSizeMB}MB)`"
          icon="i-lucide-receipt"
          class="w-full min-h-48 btn-standard"
          @update:model-value="handleFileChange"
        />

        <!-- Local validation error -->
        <UAlert
          v-if="localError"
          color="error"
          variant="subtle"
          icon="i-lucide-alert-circle"
          :description="localError"
        />

        <!-- API parsing error -->
        <UAlert
          v-if="parseError"
          color="error"
          variant="subtle"
          icon="i-lucide-alert-circle"
          title="Parsing Failed"
          :description="parseError"
        />

        <!-- Action buttons -->
        <div class="flex justify-end gap-2 pt-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="subtle"
            class="btn-standard"
            @click="handleCancel"
          />
          <UButton
            label="Parse Receipt"
            color="primary"
            icon="i-lucide-scan"
            :loading="isParsing"
            :disabled="!selectedFile || isParsing"
            class="btn-standard"
            @click="handleUpload"
          />
        </div>
      </div>

      <!-- Preview Step -->
      <div v-else-if="parsedResult" class="space-y-4">
        <!-- Confidence indicator -->
        <UAlert
          :color="confidence === 'high' ? 'success' : confidence === 'medium' ? 'warning' : 'error'"
          variant="subtle"
          :icon="confidence === 'high' ? 'i-lucide-check-circle' : 'i-lucide-alert-triangle'"
          :title="`Parsing Confidence: ${confidence?.toUpperCase()}`"
          :description="confidence === 'high' ? 'Data was extracted reliably' : 'Please double-check the extracted data'"
        />

        <!-- Warnings -->
        <UAlert
          v-for="(warning, idx) in parseWarnings"
          :key="idx"
          color="warning"
          variant="subtle"
          icon="i-lucide-alert-triangle"
          :description="warning"
        />

        <!-- Parsed data summary -->
        <div class="border border-default rounded-lg divide-y divide-default">
          <!-- Shop & Address -->
          <div class="p-3 bg-elevated/30">
            <div class="grid gap-2 md:grid-cols-2">
              <div>
                <span class="text-xs text-muted uppercase tracking-wide">Shop</span>
                <div class="flex items-center gap-2">
                  <span class="font-medium">{{ parsedResult.shop.name }}</span>
                  <UBadge
                    v-if="parsedResult.shop.id"
                    color="success"
                    variant="subtle"
                    size="xs"
                  >
                    Matched
                  </UBadge>
                  <UBadge
                    v-else
                    color="warning"
                    variant="subtle"
                    size="xs"
                  >
                    Not Matched
                  </UBadge>
                </div>
              </div>
              <div>
                <span class="text-xs text-muted uppercase tracking-wide">Address</span>
                <div class="flex items-center gap-2">
                  <span class="font-medium text-sm">{{ parsedResult.address.display }}</span>
                  <UBadge
                    v-if="parsedResult.address.id"
                    color="success"
                    variant="subtle"
                    size="xs"
                  >
                    Matched
                  </UBadge>
                  <UBadge
                    v-else
                    color="warning"
                    variant="subtle"
                    size="xs"
                  >
                    Not Matched
                  </UBadge>
                </div>
              </div>
            </div>
          </div>

          <!-- Date & Time -->
          <div class="p-3">
            <div class="grid gap-2 md:grid-cols-2">
              <div>
                <span class="text-xs text-muted uppercase tracking-wide">Date</span>
                <div class="font-medium">{{ parsedResult.purchaseDate }}</div>
              </div>
              <div v-if="parsedResult.purchaseTime">
                <span class="text-xs text-muted uppercase tracking-wide">Time</span>
                <div class="font-medium">{{ parsedResult.purchaseTime }}</div>
              </div>
            </div>
          </div>

          <!-- Items preview -->
          <div class="p-3">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs text-muted uppercase tracking-wide">Items</span>
              <span class="text-sm text-muted">{{ parsedResult.items.length }} item(s)</span>
            </div>
            <div class="max-h-48 overflow-y-auto space-y-1">
              <div
                v-for="(item, idx) in parsedResult.items"
                :key="idx"
                class="flex items-center justify-between text-sm py-1"
                :class="{ 'text-warning': item.isDiscount }"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <UIcon
                    v-if="item.isDiscount"
                    name="i-lucide-tag"
                    class="w-4 h-4 flex-shrink-0"
                  />
                  <span class="truncate">{{ item.name }}</span>
                  <span v-if="item.quantity > 1" class="text-muted">× {{ item.quantity }}</span>
                </div>
                <span class="font-medium flex-shrink-0 ml-2">
                  {{ formatCurrency(item.totalPrice) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Total -->
          <div class="p-3 bg-elevated/30">
            <div class="flex items-center justify-between">
              <span class="font-semibold">Total</span>
              <span class="text-lg font-bold">{{ formatCurrency(parsedResult.total) }}</span>
            </div>
          </div>
        </div>

        <!-- Action buttons -->
        <div class="flex justify-between gap-2 pt-2">
          <UButton
            label="Back"
            color="neutral"
            variant="subtle"
            icon="i-lucide-arrow-left"
            class="btn-standard"
            @click="handleBack"
          />
          <div class="flex gap-2">
            <UButton
              label="Cancel"
              color="neutral"
              variant="subtle"
              class="btn-standard"
              @click="handleCancel"
            />
            <UButton
              label="Apply to Form"
              color="primary"
              icon="i-lucide-check"
              class="btn-standard"
              @click="handleApply"
            />
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
