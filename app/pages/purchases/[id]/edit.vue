<script setup lang="ts">
import { usePurchases } from '~/composables/usePurchases'
import { useShops } from '~/composables/useShops'
import { useUserPaymentMethods } from '~/composables/useUserPaymentMethods'
import { eurosToCents, centsToEuros, formatCents } from '~/utils/money'
import type { Shop, ShopAddress, PurchaseStatus } from '~/types'

definePageMeta({
  middleware: ['auth']
})

const route = useRoute()
const router = useRouter()
const toast = useToast()

const purchaseId = computed(() => Number(route.params.id))

// Composables
const { purchase, purchaseLoading, fetchPurchase, updatePurchase } = usePurchases()
const { shops, fetchShops, isLoading: shopsLoading } = useShops()
const { 
  activePaymentMethods, 
  fetchPaymentMethods, 
  isLoading: paymentMethodsLoading 
} = useUserPaymentMethods()

// Breadcrumbs
const breadcrumbs = computed(() => [
  { label: 'Dashboard', to: '/' },
  { label: 'Purchases', to: '/purchases' },
  { label: `Purchase #${purchaseId.value}`, to: `/purchases/${purchaseId.value}` },
  { label: 'Edit', to: `/purchases/${purchaseId.value}/edit` }
])

// Form state
const isSubmitting = ref(false)
const updateMode = ref<'header' | 'full'>('header')

// Purchase header state
const selectedShopId = ref<number | null>(null)
const selectedAddressId = ref<number | null>(null)
const selectedPaymentMethodId = ref<number | null>(null)
const purchaseDate = ref('')
const currency = ref('EUR')
const status = ref<PurchaseStatus>('confirmed')
const notes = ref('')
const receiptNumber = ref('')

// Line items state
interface LineItem {
  id: string // Temporary ID for UI
  description: string
  quantity: number
  unitPriceEuros: number
  taxRate: number
  discountPercent: number | null
  discountAmountEuros: number // Absolute discount in euros
  notes: string
}

const lines = ref<LineItem[]>([])
const hasModifiedLines = ref(false)

function createLineFromData(line: any, index: number): LineItem {
  return {
    id: crypto.randomUUID(),
    description: line.description,
    quantity: line.quantity,
    unitPriceEuros: centsToEuros(line.unitPrice),
    taxRate: line.taxRate,
    discountPercent: line.discountPercent,
    discountAmountEuros: centsToEuros(line.discountAmount ?? 0),
    notes: line.notes || ''
  }
}

function createEmptyLine(): LineItem {
  return {
    id: crypto.randomUUID(),
    description: '',
    quantity: 1,
    unitPriceEuros: 0,
    taxRate: 0,
    discountPercent: null,
    discountAmountEuros: 0,
    notes: ''
  }
}

// Computed: Available addresses for selected shop
const availableAddresses = computed<ShopAddress[]>(() => {
  if (!selectedShopId.value) return []
  const shop = shops.value.find((s: Shop) => s.id === selectedShopId.value)
  return shop?.addresses?.filter((a: ShopAddress) => a.isActive) ?? []
})

// Computed: Shop options for dropdown
const shopOptions = computed(() => {
  return shops.value
    .filter((s: Shop) => s.isActive)
    .map((s: Shop) => ({
      label: s.name,
      value: s.id
    }))
})

// Computed: Address options for dropdown
const addressOptions = computed(() => {
  return availableAddresses.value.map((a: ShopAddress) => ({
    label: `${a.street} ${a.houseNumber}, ${a.postalCode} ${a.city}`,
    value: a.id
  }))
})

// Computed: Payment method options for dropdown
const paymentMethodOptions = computed(() => {
  const options = [{ label: 'No payment method', value: null }]
  activePaymentMethods.value.forEach((pm: any) => {
    options.push({ label: pm.name, value: pm.id })
  })
  return options
})

// Computed: Status options
const statusOptions = [
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Draft', value: 'draft' },
  { label: 'Cancelled', value: 'cancelled' }
]

// Computed: Calculate line amount
function calculateLineAmount(line: LineItem): number {
  const unitPriceCents = eurosToCents(line.unitPriceEuros)
  const subtotal = line.quantity * unitPriceCents
  const percentDiscount = line.discountPercent ? subtotal * (line.discountPercent / 100) : 0
  const absoluteDiscount = eurosToCents(line.discountAmountEuros)
  return Math.round(subtotal - percentDiscount - absoluteDiscount)
}

// Check if a line has any discount applied
function lineHasDiscount(line: LineItem): boolean {
  return (line.discountPercent != null && line.discountPercent > 0) || line.discountAmountEuros > 0
}

// Computed: Total amount
const totalAmountCents = computed(() => {
  return lines.value.reduce((sum, line) => sum + calculateLineAmount(line), 0)
})

// Computed: Check if form is valid for submission
const isFormValid = computed(() => {
  const headerValid = (
    selectedShopId.value !== null &&
    selectedAddressId.value !== null &&
    purchaseDate.value
  )
  
  if (updateMode.value === 'header') {
    return headerValid
  }
  
  // Full update requires valid lines
  return (
    headerValid &&
    lines.value.length > 0 &&
    lines.value.every(line => line.description.trim() && line.quantity > 0 && line.unitPriceEuros >= 0)
  )
})

// Watch: Reset address when shop changes
watch(selectedShopId, (newShopId, oldShopId) => {
  // Only reset if shop actually changed (not initial load)
  if (oldShopId !== null && newShopId !== oldShopId) {
    selectedAddressId.value = null
    // Auto-select first address if only one
    if (newShopId) {
      const addresses = availableAddresses.value
      if (addresses.length === 1) {
        selectedAddressId.value = addresses[0].id
      }
    }
  }
})

// Watch: Track if lines have been modified
watch(lines, () => {
  hasModifiedLines.value = true
}, { deep: true })

// Actions: Line management
function addLine() {
  lines.value.push(createEmptyLine())
  hasModifiedLines.value = true
}

function removeLine(id: string) {
  if (lines.value.length > 1) {
    lines.value = lines.value.filter(line => line.id !== id)
    hasModifiedLines.value = true
  }
}

function duplicateLine(line: LineItem) {
  const newLine = { ...line, id: crypto.randomUUID() }
  const index = lines.value.findIndex(l => l.id === line.id)
  lines.value.splice(index + 1, 0, newLine)
  hasModifiedLines.value = true
}

// Load data on mount
onMounted(async () => {
  try {
    // Load purchase data
    await fetchPurchase(purchaseId.value)
    
    if (purchase.value) {
      // Populate form with existing data
      selectedShopId.value = purchase.value.shopId
      selectedAddressId.value = purchase.value.shopAddressId
      selectedPaymentMethodId.value = purchase.value.userPaymentMethodId ?? null
      purchaseDate.value = purchase.value.purchaseDate
      currency.value = purchase.value.currency
      status.value = purchase.value.status
      notes.value = purchase.value.notes || ''
      receiptNumber.value = purchase.value.receiptNumber || ''
      
      // Populate line items
      if (purchase.value.lines) {
        lines.value = purchase.value.lines.map(createLineFromData)
      }
      
      // Reset modification tracking
      hasModifiedLines.value = false
    }
    
    // Load shops and payment methods
    await Promise.all([
      fetchShops({ includeAddresses: 1 }),
      fetchPaymentMethods()
    ])
  } catch (err: any) {
    if (err?.response?.status === 404) {
      toast.add({
        title: 'Purchase Not Found',
        description: 'Redirecting to purchases list...',
        icon: 'i-lucide-alert-circle',
        color: 'error'
      })
      await router.push('/purchases')
    }
  }
})

// Submit handler
async function handleSubmit() {
  if (!isFormValid.value) {
    toast.add({
      title: 'Validation Error',
      description: 'Please fill in all required fields.',
      icon: 'i-lucide-alert-circle',
      color: 'error'
    })
    return
  }

  isSubmitting.value = true

  try {
    const payload: any = {
      shopId: selectedShopId.value!,
      shopAddressId: selectedAddressId.value!,
      userPaymentMethodId: selectedPaymentMethodId.value,
      purchaseDate: purchaseDate.value,
      currency: currency.value,
      status: status.value,
      notes: notes.value || null,
      receiptNumber: receiptNumber.value || null
    }
    
    // Only include lines if user modified them (full update mode)
    if (updateMode.value === 'full' || hasModifiedLines.value) {
      payload.lines = lines.value.map((line, index) => ({
        lineNumber: index + 1,
        description: line.description.trim(),
        quantity: line.quantity,
        unitPrice: eurosToCents(line.unitPriceEuros),
        taxRate: line.taxRate,
        discountPercent: line.discountPercent ?? 0,
        discountAmount: eurosToCents(line.discountAmountEuros),
        notes: line.notes || null
      }))
    }

    await updatePurchase(purchaseId.value, payload)

    toast.add({
      title: 'Purchase Updated',
      description: 'Changes saved successfully.',
      icon: 'i-lucide-check',
      color: 'success'
    })

    // Navigate to detail view
    await router.push(`/purchases/${purchaseId.value}`)
  } catch (err: any) {
    const errorMessage = err?.response?.data?.message || 'Failed to update purchase. Please try again.'
    const errors = err?.response?.data?.errors

    toast.add({
      title: 'Error',
      description: errorMessage,
      icon: 'i-lucide-alert-circle',
      color: 'error'
    })

    // Log validation errors for debugging
    if (errors) {
      console.error('Validation errors:', errors)
    }
  } finally {
    isSubmitting.value = false
  }
}

// Cancel handler
function handleCancel() {
  router.push(`/purchases/${purchaseId.value}`)
}
</script>

<template>
  <UDashboardPanel id="purchase-edit">
    <template #header>
      <UDashboardNavbar title="Edit Purchase" :links="breadcrumbs">
        <template #right>
          <div class="flex gap-2">
            <UButton
              color="neutral"
              variant="outline"
              icon="i-lucide-x"
              label="Cancel"
              @click="handleCancel"
            />
            <UButton
              color="primary"
              icon="i-lucide-save"
              label="Save Changes"
              :loading="isSubmitting"
              :disabled="!isFormValid"
              @click="handleSubmit"
            />
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <!-- Loading State -->
      <div v-if="purchaseLoading" class="p-4 py-16 text-center">
        <UProgress animation="carousel" size="lg" color="primary" class="w-64 mx-auto mb-4" />
        <p class="text-muted">Loading purchase...</p>
      </div>

      <!-- Edit Form -->
      <div v-else-if="purchase" class="p-4 space-y-6 max-w-4xl mx-auto">
        <!-- Warning about line replacement -->
        <UAlert
          v-if="hasModifiedLines"
          color="warning"
          variant="soft"
          icon="i-lucide-alert-triangle"
          title="Line Items Modified"
          description="Saving changes will REPLACE ALL existing line items with the ones shown below."
        />

        <!-- Purchase Details Card -->
        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold">Purchase Details</h3>
          </template>

          <div class="grid gap-4 md:grid-cols-2">
            <!-- Shop Selection -->
            <UFormField label="Shop" required>
              <USelectMenu
                v-model="selectedShopId"
                :items="shopOptions"
                :loading="shopsLoading"
                value-key="value"
                placeholder="Select a shop..."
                class="w-full"
              />
            </UFormField>

            <!-- Address Selection -->
            <UFormField label="Address" required>
              <USelectMenu
                v-model="selectedAddressId"
                :items="addressOptions"
                :disabled="!selectedShopId || addressOptions.length === 0"
                value-key="value"
                :placeholder="!selectedShopId ? 'Select shop first' : 'Select address...'"
                class="w-full"
              />
              <template v-if="selectedShopId && addressOptions.length === 0" #hint>
                <span class="text-warning">No addresses found for this shop.</span>
              </template>
            </UFormField>

            <!-- Purchase Date -->
            <UFormField label="Date" required>
              <UInput
                v-model="purchaseDate"
                type="date"
                :max="new Date().toISOString().split('T')[0]"
                class="w-full"
              />
            </UFormField>

            <!-- Payment Method -->
            <UFormField label="Payment Method">
              <USelectMenu
                v-model="selectedPaymentMethodId"
                :items="paymentMethodOptions"
                :loading="paymentMethodsLoading"
                value-key="value"
                placeholder="Select payment method..."
                class="w-full"
              />
            </UFormField>

            <!-- Status -->
            <UFormField label="Status">
              <USelectMenu
                v-model="status"
                :items="statusOptions"
                value-key="value"
                class="w-full"
              />
            </UFormField>

            <!-- Receipt Number -->
            <UFormField label="Receipt Number">
              <UInput
                v-model="receiptNumber"
                placeholder="Optional receipt number..."
                class="w-full"
              />
            </UFormField>

            <!-- Notes -->
            <div class="md:col-span-2">
              <UFormField label="Notes">
                <UTextarea
                  v-model="notes"
                  placeholder="Optional notes about this purchase..."
                  :rows="2"
                  class="w-full"
                />
              </UFormField>
            </div>
          </div>
        </UCard>

        <!-- Line Items Card -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-lg font-semibold">Line Items</h3>
                <p class="text-sm text-muted">{{ lines.length }} item(s)</p>
              </div>
              <UButton
                color="primary"
                variant="soft"
                icon="i-lucide-plus"
                label="Add Item"
                size="sm"
                @click="addLine"
              />
            </div>
          </template>

          <!-- Line Items List -->
          <div class="space-y-4">
            <div
              v-for="(line, index) in lines"
              :key="line.id"
              class="p-4 border border-default rounded-lg bg-elevated/30"
            >
              <div class="flex items-start justify-between mb-3">
                <span class="text-sm font-medium text-muted">#{{ index + 1 }}</span>
                <div class="flex gap-1">
                  <UButton
                    icon="i-lucide-copy"
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    title="Duplicate"
                    @click="duplicateLine(line)"
                  />
                  <UButton
                    icon="i-lucide-trash-2"
                    color="error"
                    variant="ghost"
                    size="xs"
                    :disabled="lines.length === 1"
                    title="Remove"
                    @click="removeLine(line.id)"
                  />
                </div>
              </div>

              <div class="grid gap-3 md:grid-cols-12">
                <!-- Description -->
                <div class="md:col-span-5">
                  <UFormField label="Description" required>
                    <UInput
                      v-model="line.description"
                      placeholder="Item description..."
                      class="w-full"
                    />
                  </UFormField>
                </div>

                <!-- Quantity -->
                <div class="md:col-span-2">
                  <UFormField label="Qty">
                    <UInput
                      v-model.number="line.quantity"
                      type="number"
                      min="0.001"
                      step="0.001"
                      class="w-full"
                    />
                  </UFormField>
                </div>

                <!-- Unit Price (Euros) -->
                <div class="md:col-span-2">
                  <UFormField label="Price (€)">
                    <UInput
                      v-model.number="line.unitPriceEuros"
                      type="number"
                      min="0"
                      step="0.01"
                      class="w-full"
                    />
                  </UFormField>
                </div>

                <!-- Discount (Euros) -->
                <div class="md:col-span-2">
                  <UFormField label="Discount (€)">
                    <UInput
                      v-model.number="line.discountAmountEuros"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      class="w-full"
                    />
                  </UFormField>
                </div>

                <!-- Line Amount -->
                <div class="md:col-span-1 flex items-end">
                  <div class="text-right w-full pb-2">
                    <span
                      class="text-sm font-semibold"
                      :class="{ 'text-green-600 dark:text-green-400': lineHasDiscount(line) }"
                    >
                      {{ formatCents(calculateLineAmount(line)) }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Line Notes (collapsible) -->
              <div class="mt-2">
                <UInput
                  v-model="line.notes"
                  placeholder="Item notes (optional)..."
                  size="sm"
                  class="w-full"
                />
              </div>
            </div>
          </div>
        </UCard>

        <!-- Totals Card -->
        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold">Summary</h3>
          </template>

          <dl class="space-y-3">
            <div class="flex justify-between text-sm">
              <dt class="text-muted">Items</dt>
              <dd class="font-medium">{{ lines.length }}</dd>
            </div>
            <div class="flex justify-between text-lg font-semibold pt-3 border-t border-default">
              <dt>Total</dt>
              <dd>{{ formatCents(totalAmountCents) }}</dd>
            </div>
          </dl>
        </UCard>

        <!-- Submit Actions (Mobile) -->
        <div class="flex gap-2 md:hidden">
          <UButton
            color="neutral"
            variant="outline"
            icon="i-lucide-x"
            label="Cancel"
            class="flex-1"
            @click="handleCancel"
          />
          <UButton
            color="primary"
            icon="i-lucide-save"
            label="Save"
            :loading="isSubmitting"
            :disabled="!isFormValid"
            class="flex-1"
            @click="handleSubmit"
          />
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
