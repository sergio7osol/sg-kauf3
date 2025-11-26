<script setup lang="ts">
import { usePurchases } from '~/composables/usePurchases'

definePageMeta({
  middleware: ['auth']
})

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { purchase, purchaseLoading, purchaseError, fetchPurchase, deletePurchase } = usePurchases()

// Delete modal state
const isDeleteModalOpen = ref(false)
const isDeleting = ref(false)

const purchaseId = computed(() => route.params.id as string)

const breadcrumbs = computed(() => [
  { label: 'Dashboard', to: '/' },
  { label: 'Purchases', to: '/purchases' },
  { label: `Purchase #${purchaseId.value}`, to: `/purchases/${purchaseId.value}` }
])

onMounted(async () => {
  try {
    await fetchPurchase(purchaseId.value)
  } catch (err: any) {
    if (err?.response?.status === 404) {
      // Redirect to purchases list on 404
      await router.push('/purchases')
    }
  }
})

const statusColor = computed(() => {
  if (!purchase.value) return { badge: 'neutral', text: 'text-muted' }
  const colors = {
    confirmed: { badge: 'green', text: 'text-green-600 dark:text-green-400' },
    draft: { badge: 'neutral', text: 'text-muted' },
    cancelled: { badge: 'red', text: 'text-red-600 dark:text-red-400' }
  }
  return colors[purchase.value.status as keyof typeof colors] || { badge: 'neutral', text: 'text-muted' }
})

const formattedDate = computed(() => {
  if (!purchase.value?.purchaseDate) return '—'
  return new Date(purchase.value.purchaseDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
})

// Delete handler
async function handleDelete() {
  if (!purchase.value) return

  isDeleting.value = true

  try {
    await deletePurchase(Number(purchaseId.value))

    toast.add({
      title: 'Purchase Deleted',
      description: `Purchase #${purchaseId.value} has been deleted.`,
      icon: 'i-lucide-check',
      color: 'success'
    })

    // Navigate to purchases list
    await router.push('/purchases')
  } catch (err: any) {
    const errorMessage = err?.response?.data?.message || 'Failed to delete purchase. Please try again.'

    toast.add({
      title: 'Error',
      description: errorMessage,
      icon: 'i-lucide-alert-circle',
      color: 'error'
    })
  } finally {
    isDeleting.value = false
    isDeleteModalOpen.value = false
  }
}
</script>

<template>
  <UDashboardPanel id="purchase-detail">
    <template #header>
      <UDashboardNavbar title="Purchase Details" :links="breadcrumbs">
        <template #right>
          <div class="flex gap-2">
            <UButton
              to="/purchases"
              color="neutral"
              variant="outline"
              icon="i-lucide-arrow-left"
              label="Back to list"
            />
            <UButton
              :to="`/purchases/${purchaseId}/edit`"
              color="neutral"
              variant="outline"
              icon="i-lucide-pencil"
              label="Edit"
            />
            <UButton
              color="error"
              variant="outline"
              icon="i-lucide-trash-2"
              label="Delete"
              class="btn-standard"
              @click="isDeleteModalOpen = true"
            />
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-4 space-y-6">
        <!-- Loading State -->
        <div v-if="purchaseLoading" class="py-16 text-center">
          <UProgress animation="carousel" size="lg" color="primary" class="w-64 mx-auto mb-4" />
          <p class="text-muted">Loading purchase details...</p>
        </div>

        <!-- Error State -->
        <UAlert
          v-else-if="purchaseError"
          color="error"
          variant="subtle"
          icon="i-lucide-alert-circle"
          :title="purchaseError"
          :description="'Unable to load purchase. It may not exist or you may not have access.'"
        />

        <!-- Purchase Details -->
        <template v-else-if="purchase">
          <!-- Header Card -->
          <UCard>
            <div class="grid gap-6 md:grid-cols-2">
              <div>
                <h3 class="text-sm font-medium text-muted mb-3">Purchase Information</h3>
                <dl class="space-y-2">
                  <div class="flex justify-between">
                    <dt class="text-sm text-muted">Purchase ID</dt>
                    <dd class="text-sm font-medium">#{{ purchase.id }}</dd>
                  </div>
                  <div class="flex justify-between">
                    <dt class="text-sm text-muted">Date</dt>
                    <dd class="text-sm font-medium">{{ formattedDate }}</dd>
                  </div>
                  <div class="flex justify-between">
                    <dt class="text-sm text-muted">Status</dt>
                    <dd>
                      <UBadge :color="statusColor.badge" variant="subtle" class="capitalize">
                        <span :class="statusColor.text">{{ purchase.status }}</span>
                      </UBadge>
                    </dd>
                  </div>
                  <div v-if="purchase.receiptNumber" class="flex justify-between">
                    <dt class="text-sm text-muted">Receipt #</dt>
                    <dd class="text-sm font-medium">{{ purchase.receiptNumber }}</dd>
                  </div>
                  <div class="flex justify-between">
                    <dt class="text-sm text-muted">Payment Method</dt>
                    <dd class="text-sm font-medium">
                      <span v-if="purchase.userPaymentMethod" class="inline-flex items-center gap-1">
                        <UIcon name="i-lucide-credit-card" class="w-3.5 h-3.5 text-muted" />
                        {{ purchase.userPaymentMethod.name }}
                      </span>
                      <span v-else class="text-muted">Not specified</span>
                    </dd>
                  </div>
                </dl>
              </div>

              <div>
                <h3 class="text-sm font-medium text-muted mb-3">Shop Information</h3>
                <dl class="space-y-2">
                  <div class="flex justify-between">
                    <dt class="text-sm text-muted">Shop</dt>
                    <dd class="text-sm font-medium">
                      {{ purchase.shop?.name || `Shop #${purchase.shopId}` }}
                    </dd>
                  </div>
                  <div v-if="purchase.shopAddress" class="flex justify-between">
                    <dt class="text-sm text-muted">Address</dt>
                    <dd class="text-sm font-medium text-right">
                      {{ purchase.shopAddress.street }}<br>
                      {{ purchase.shopAddress.city }}, {{ purchase.shopAddress.postalCode }}
                    </dd>
                  </div>
                  <div class="flex justify-between">
                    <dt class="text-sm text-muted">Currency</dt>
                    <dd class="text-sm font-medium">{{ purchase.currency }}</dd>
                  </div>
                </dl>
              </div>
            </div>

            <div v-if="purchase.notes" class="mt-6 pt-6 border-t border-default">
              <h3 class="text-sm font-medium text-muted mb-2">Notes</h3>
              <p class="text-sm text-default">{{ purchase.notes }}</p>
            </div>
          </UCard>

          <!-- Line Items -->
          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="text-lg font-semibold">Line Items</h3>
                  <p class="text-sm text-muted">
                    {{ purchase.lines?.length || 0 }} item(s)
                  </p>
                </div>
              </div>
            </template>

            <div v-if="purchase.lines && purchase.lines.length > 0" class="overflow-x-auto">
              <table class="min-w-full text-sm">
                <thead class="border-b border-default">
                  <tr class="text-left text-muted">
                    <th class="pb-3 pr-4">#</th>
                    <th class="pb-3 pr-4">Description</th>
                    <th class="pb-3 pr-4 text-right">Qty</th>
                    <th class="pb-3 pr-4 text-right">Unit Price</th>
                    <th class="pb-3 pr-4 text-right">Tax</th>
                    <th class="pb-3 pr-4 text-right">Discount</th>
                    <th class="pb-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-default">
                  <tr v-for="line in purchase.lines" :key="line.id" class="text-default">
                    <td class="py-3 pr-4 text-muted">{{ line.lineNumber }}</td>
                    <td class="py-3 pr-4">
                      <div class="font-medium">{{ line.description }}</div>
                      <div v-if="line.notes" class="text-xs text-muted mt-0.5">
                        {{ line.notes }}
                      </div>
                    </td>
                    <td class="py-3 pr-4 text-right">{{ line.quantity }}</td>
                    <td class="py-3 pr-4 text-right">€{{ (line.unitPrice / 100).toFixed(2) }}</td>
                    <td class="py-3 pr-4 text-right">{{ line.taxRate }}%</td>
                    <td class="py-3 pr-4 text-right">
                      {{ line.discountPercent ? `${line.discountPercent}%` : '—' }}
                    </td>
                    <td class="py-3 text-right font-medium">
                      €{{ (line.lineAmount / 100).toFixed(2) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div v-else class="py-8 text-center text-muted">
              <UIcon name="i-lucide-inbox" class="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No line items found</p>
            </div>
          </UCard>

          <!-- Totals Summary -->
          <UCard>
            <template #header>
              <h3 class="text-lg font-semibold">Summary</h3>
            </template>

            <dl class="space-y-3">
              <div class="flex justify-between text-sm">
                <dt class="text-muted">Subtotal</dt>
                <dd class="font-medium">€{{ (purchase.subtotal / 100).toFixed(2) }}</dd>
              </div>
              <div class="flex justify-between text-sm">
                <dt class="text-muted">Tax</dt>
                <dd class="font-medium">€{{ (purchase.taxAmount / 100).toFixed(2) }}</dd>
              </div>
              <div class="flex justify-between text-lg font-semibold pt-3 border-t border-default">
                <dt>Total</dt>
                <dd>€{{ (purchase.totalAmount / 100).toFixed(2) }}</dd>
              </div>
            </dl>
          </UCard>
        </template>
      </div>
    </template>
  </UDashboardPanel>

  <!-- Delete Confirmation Modal -->
  <UModal v-model:open="isDeleteModalOpen">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-full bg-error/10 flex-shrink-0">
              <UIcon name="i-lucide-alert-triangle" class="h-5 w-5 text-error" />
            </div>
            <h3 class="text-lg font-semibold">Delete Purchase</h3>
          </div>
        </template>

        <div class="space-y-4">
          <p class="text-sm text-muted">This action cannot be undone</p>
          
          <p class="text-sm text-default">
            Are you sure you want to delete <strong>Purchase #{{ purchaseId }}</strong>?
          </p>
          
          <div v-if="purchase" class="p-4 bg-elevated rounded-lg border border-default">
            <dl class="space-y-2 text-sm">
              <div class="flex justify-between">
                <dt class="text-muted">Date:</dt>
                <dd class="font-medium">{{ formattedDate }}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-muted">Shop:</dt>
                <dd class="font-medium">{{ purchase.shop?.name }}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-muted">Total:</dt>
                <dd class="font-medium">€{{ (purchase.totalAmount / 100).toFixed(2) }}</dd>
              </div>
            </dl>
          </div>

          <UAlert
            color="warning"
            variant="soft"
            icon="i-lucide-info"
            title="Note"
            description="The purchase will be soft deleted and can potentially be recovered by an administrator."
          />
        </div>

        <template #footer>
          <div class="flex gap-3 justify-end">
            <UButton
              color="neutral"
              variant="outline"
              label="Cancel"
              :disabled="isDeleting"
              @click="isDeleteModalOpen = false"
            />
            <UButton
              color="error"
              icon="i-lucide-trash-2"
              label="Delete Purchase"
              :loading="isDeleting"
              @click="handleDelete"
            />
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
