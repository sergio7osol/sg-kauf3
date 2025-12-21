<script setup lang="ts">
import axios from 'axios';
import { usePurchases } from '~/composables/usePurchases';
import { useShops } from '~/composables/useShops';
import { useUserPaymentMethods } from '~/composables/useUserPaymentMethods';
import { eurosToCents, centsToEuros, formatCents } from '~/utils/money';
import type { Shop, ShopAddress, PurchaseStatus, ParsedReceiptData, UserPaymentMethod } from '~/types';

definePageMeta({
  middleware: ['auth']
});

const router = useRouter();
const toast = useToast();

// Composables
const { createPurchase } = usePurchases();
const { shops, fetchShops, isLoading: shopsLoading } = useShops();
const {
  activePaymentMethods,
  fetchPaymentMethods,
  isLoading: paymentMethodsLoading
} = useUserPaymentMethods();

// Breadcrumbs
const breadcrumbs = [
  { label: 'Dashboard', to: '/' },
  { label: 'Purchases', to: '/purchases' },
  { label: 'New Purchase', to: '/purchases/create' }
];

// Form state
const isSubmitting = ref(false);

// Receipt upload modal state
const receiptModalOpen = ref(false);
const wasImportedFromReceipt = ref(false);
const importWarnings = ref<string[]>([]);
const importedAddressLabel = ref<string | null>(null);

// Purchase header state
const selectedShopId = ref<number | null>(null);
const selectedAddressId = ref<number | null>(null);
const selectedPaymentMethodId = ref<number | null>(null);
const purchaseDate = ref(new Date().toISOString().split('T')[0]); // Today
const purchaseTime = ref<string | null>(null);
const currency = ref('EUR');
const status = ref<PurchaseStatus>('confirmed');
const notes = ref('');
const receiptNumber = ref('');

// Line items state
interface LineItem {
  id: string // Temporary ID for UI
  description: string
  quantity: number
  unitPriceEuros: number // User inputs euros, we convert
  taxRate: number
  discountPercent: number | null
  discountAmountEuros: number // Absolute discount in euros (used for receipt discounts)
  notes: string
}

const lines = ref<LineItem[]>([
  createEmptyLine()
]);

function createEmptyLine(): LineItem {
  return {
    id: crypto.randomUUID(),
    description: '',
    quantity: 1,
    unitPriceEuros: 0,
    taxRate: 0, // German prices include tax, so we use 0
    discountPercent: null,
    discountAmountEuros: 0,
    notes: ''
  };
}

// Computed: Available addresses for selected shop
const availableAddresses = computed<ShopAddress[]>(() => {
  if (!selectedShopId.value) return [];
  const shop = shops.value.find((s: Shop) => s.id === selectedShopId.value);
  return shop?.addresses?.filter((a: ShopAddress) => a.isActive) ?? [];
});

// Computed: Shop options for dropdown
const shopOptions = computed(() => {
  return shops.value
    .filter((s: Shop) => s.isActive)
    .map((s: Shop) => ({
      label: s.name,
      value: s.id
    }));
});

// Computed: Address options for dropdown
const addressOptions = computed(() => {
  const baseOptions = availableAddresses.value.map((a: ShopAddress) => ({
    label: `${a.street} ${a.houseNumber}, ${a.postalCode} ${a.city}`,
    value: a.id
  }));

  const hasSelectedAddress = baseOptions.some(option => option.value === selectedAddressId.value);
  if (!hasSelectedAddress && selectedAddressId.value && importedAddressLabel.value) {
    baseOptions.unshift({
      label: importedAddressLabel.value,
      value: selectedAddressId.value
    });
  }

  return baseOptions;
});

// Computed: Payment method options for dropdown
const paymentMethodOptions = computed(() => {
  const options = [{ label: 'No payment method', value: null }];
  activePaymentMethods.value.forEach((pm: UserPaymentMethod) => {
    options.push({ label: pm.name, value: pm.id });
  });
  return options;
});

// Computed: Status options
const statusOptions = [
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Draft', value: 'draft' },
  { label: 'Cancelled', value: 'cancelled' }
];

// Computed: Calculate line amount
function calculateLineAmount(line: LineItem): number {
  const unitPriceCents = eurosToCents(line.unitPriceEuros);
  const subtotal = line.quantity * unitPriceCents;
  const percentDiscount = line.discountPercent ? subtotal * (line.discountPercent / 100) : 0;
  const absoluteDiscount = eurosToCents(line.discountAmountEuros);
  return Math.round(subtotal - percentDiscount - absoluteDiscount);
}

// Check if a line has any discount applied
function lineHasDiscount(line: LineItem): boolean {
  return (line.discountPercent != null && line.discountPercent > 0) || line.discountAmountEuros > 0;
}

function normalizeTimeForInput(time: string | null): string | null {
  if (!time) return null;
  const trimmed = time.trim();
  if (!trimmed) return null;
  // Backend may return HH:MM:SS; native time inputs usually expect HH:MM
  return trimmed.length >= 5 ? trimmed.slice(0, 5) : trimmed;
}

function normalizeTimeForSubmit(time: string | null): string | null {
  if (!time) return null;
  const trimmed = time.trim();
  return trimmed ? trimmed : null;
}

// Computed: Total amount
const totalAmountCents = computed(() => {
  return lines.value.reduce((sum, line) => sum + calculateLineAmount(line), 0);
});

// Computed: Check if form is valid for submission
const isFormValid = computed(() => {
  return (
    selectedShopId.value !== null
    && selectedAddressId.value !== null
    && purchaseDate.value
    && lines.value.length > 0
    && lines.value.every(line => line.description.trim() && line.quantity > 0 && line.unitPriceEuros >= 0)
  );
});

// Watch: Reset address when shop changes
watch(selectedShopId, (newShopId) => {
  selectedAddressId.value = null;
  importedAddressLabel.value = null;
  // Auto-select first address if only one
  if (newShopId) {
    const addresses = availableAddresses.value;
    if (addresses.length === 1) {
      selectedAddressId.value = addresses[0].id;
    }
  }
});

// Actions: Line management
function addLine() {
  lines.value.push(createEmptyLine());
}

function removeLine(id: string) {
  if (lines.value.length > 1) {
    lines.value = lines.value.filter(line => line.id !== id);
  }
}

function duplicateLine(line: LineItem) {
  const newLine = { ...line, id: crypto.randomUUID() };
  const index = lines.value.findIndex(l => l.id === line.id);
  lines.value.splice(index + 1, 0, newLine);
}

// Load data on mount
onMounted(async () => {
  await Promise.all([
    fetchShops({ includeAddresses: 1 }).catch(err => console.error('Failed to load shops:', err)),
    fetchPaymentMethods().catch(err => console.error('Failed to load payment methods:', err))
  ]);
});

// Submit handler
async function handleSubmit() {
  if (!isFormValid.value) {
    toast.add({
      title: 'Validation Error',
      description: 'Please fill in all required fields.',
      icon: 'i-lucide-alert-circle',
      color: 'error'
    });
    return;
  }

  isSubmitting.value = true;

  try {
    const payload = {
      shopId: selectedShopId.value!,
      shopAddressId: selectedAddressId.value!,
      userPaymentMethodId: selectedPaymentMethodId.value,
      purchaseDate: purchaseDate.value,
      purchaseTime: normalizeTimeForSubmit(purchaseTime.value),
      currency: currency.value,
      status: status.value,
      notes: notes.value || null,
      receiptNumber: receiptNumber.value || null,
      lines: lines.value.map((line, index) => ({
        lineNumber: index + 1,
        description: line.description.trim(),
        quantity: line.quantity,
        unitPrice: eurosToCents(line.unitPriceEuros),
        taxRate: line.taxRate,
        discountPercent: line.discountPercent ?? 0,
        discountAmount: eurosToCents(line.discountAmountEuros),
        notes: line.notes || null
      }))
    };

    await createPurchase(payload);

    toast.add({
      title: 'Purchase Created',
      description: `Purchase of ${formatCents(totalAmountCents.value)} created successfully.`,
      icon: 'i-lucide-check',
      color: 'success'
    });

    // Navigate to purchases list
    await router.push('/purchases');
  } catch (err: unknown) {
    const errorMessage = axios.isAxiosError(err)
      ? err.response?.data?.message ?? 'Failed to create purchase. Please try again.'
      : 'Failed to create purchase. Please try again.';
    const errors = axios.isAxiosError(err) ? err.response?.data?.errors : undefined;

    toast.add({
      title: 'Error',
      description: errorMessage,
      icon: 'i-lucide-alert-circle',
      color: 'error'
    });

    // Log validation errors for debugging
    if (errors) {
      console.error('Validation errors:', errors);
    }
  } finally {
    isSubmitting.value = false;
  }
}

// Cancel handler
function handleCancel() {
  router.push('/purchases');
}

/**
 * Apply parsed receipt data to the form.
 * Maps the parsed data to form fields and line items.
 */
function applyParsedReceipt(data: ParsedReceiptData) {
  // Set shop if matched
  if (data.shop.id) {
    selectedShopId.value = data.shop.id;
    // Address will be set after shop changes trigger availableAddresses update
    nextTick(() => {
      if (data.address.id) {
        selectedAddressId.value = data.address.id;
        importedAddressLabel.value = data.address.display ?? null;
      }
    });
  } else {
    importedAddressLabel.value = null;
  }

  // Set purchase date
  if (data.purchaseDate) {
    purchaseDate.value = data.purchaseDate;
  }

  // Set notes with time if available
  purchaseTime.value = normalizeTimeForInput(data.purchaseTime);

  // Set currency
  if (data.currency) {
    currency.value = data.currency;
  }

  // Map items to line items
  if (data.items && data.items.length > 0) {
    lines.value = data.items.map(item => ({
      id: crypto.randomUUID(),
      description: item.name,
      quantity: item.quantity,
      unitPriceEuros: centsToEuros(item.submitUnitPrice), // Convert cents to euros for display
      taxRate: 0, // German prices include tax
      discountPercent: null,
      discountAmountEuros: centsToEuros(item.submitDiscountAmount), // Convert cents to euros
      notes: item.isDiscount ? 'Discount/Rabatt' : ''
    }));
  }

  // Track that form was imported
  wasImportedFromReceipt.value = true;

  // Collect warnings for display
  const warnings: string[] = [];
  if (!data.shop.id) {
    warnings.push(`Shop "${data.shop.name}" was not matched - please select manually`);
  }
  if (!data.address.id) {
    warnings.push(`Address "${data.address.display}" was not matched - please select manually`);
  } else {
    importedAddressLabel.value = data.address.display;
  }
  warnings.push('Payment method was not detected - please select manually');
  importWarnings.value = warnings;
}
</script>

<template>
  <UDashboardPanel id="purchase-create">
    <template #header>
      <UDashboardNavbar
        title="New Purchase"
        :links="breadcrumbs"
      >
        <template #right>
          <div class="flex gap-2">
            <!-- Receipt Upload Modal -->
            <PurchasesReceiptUploadModal
              v-model:open="receiptModalOpen"
              @parsed="applyParsedReceipt"
            />
            <UButton
              color="neutral"
              variant="outline"
              icon="i-lucide-x"
              label="Cancel"
              class="btn-standard"
              @click="handleCancel"
            />
            <UButton
              color="primary"
              icon="i-lucide-save"
              label="Save Purchase"
              :loading="isSubmitting"
              :disabled="!isFormValid"
              class="btn-standard"
              @click="handleSubmit"
            />
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-4 space-y-6 max-w-4xl mx-auto">
        <!-- Import Warnings Banner -->
        <UAlert
          v-if="wasImportedFromReceipt && importWarnings.length > 0"
          color="warning"
          variant="subtle"
          icon="i-lucide-alert-triangle"
          title="Receipt Imported - Review Required"
          :close-button="{ icon: 'i-lucide-x', color: 'warning', variant: 'link', padded: false }"
          @close="wasImportedFromReceipt = false"
        >
          <template #description>
            <ul class="list-disc list-inside space-y-1 mt-1">
              <li
                v-for="(warning, idx) in importWarnings"
                :key="idx"
              >
                {{ warning }}
              </li>
            </ul>
          </template>
        </UAlert>

        <!-- Import Success Banner -->
        <UAlert
          v-else-if="wasImportedFromReceipt"
          color="success"
          variant="subtle"
          icon="i-lucide-check-circle"
          title="Receipt Imported Successfully"
          description="Form has been pre-filled with receipt data. Please review and adjust if needed."
          :close-button="{ icon: 'i-lucide-x', color: 'success', variant: 'link', padded: false }"
          @close="wasImportedFromReceipt = false"
        />

        <!-- Purchase Details Card -->
        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold">
              Purchase Details
            </h3>
          </template>

          <div class="grid gap-4 md:grid-cols-2">
            <!-- Shop Selection -->
            <UFormField
              label="Shop"
              required
            >
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
            <UFormField
              label="Address"
              required
            >
              <USelectMenu
                v-model="selectedAddressId"
                :items="addressOptions"
                :disabled="!selectedShopId || addressOptions.length === 0"
                value-key="value"
                :placeholder="!selectedShopId ? 'Select shop first' : 'Select address...'"
                class="w-full"
              />
              <template
                v-if="selectedShopId && addressOptions.length === 0"
                #hint
              >
                <span class="text-warning">No addresses found for this shop.</span>
              </template>
            </UFormField>

            <!-- Purchase Date + Time -->
            <div class="md:col-span-2 grid gap-4 md:grid-cols-2">
              <UFormField
                label="Date"
                required
              >
                <UInput
                  v-model="purchaseDate"
                  type="date"
                  :max="new Date().toISOString().split('T')[0]"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Time">
                <UInput
                  v-model="purchaseTime"
                  type="time"
                  step="60"
                  class="w-full"
                />
              </UFormField>
            </div>

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
                <h3 class="text-lg font-semibold">
                  Line Items
                </h3>
                <p class="text-sm text-muted">
                  {{ lines.length }} item(s)
                </p>
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
                  <UFormField
                    label="Description"
                    required
                  >
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

          <!-- Empty State -->
          <div
            v-if="lines.length === 0"
            class="py-8 text-center text-muted"
          >
            <UIcon
              name="i-lucide-package"
              class="w-12 h-12 mx-auto mb-2 opacity-50"
            />
            <p>No items added yet</p>
            <UButton
              color="primary"
              variant="soft"
              icon="i-lucide-plus"
              label="Add First Item"
              class="mt-2"
              @click="addLine"
            />
          </div>
        </UCard>

        <!-- Totals Card -->
        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold">
              Summary
            </h3>
          </template>

          <dl class="space-y-3">
            <div class="flex justify-between text-sm">
              <dt class="text-muted">
                Items
              </dt>
              <dd class="font-medium">
                {{ lines.length }}
              </dd>
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
