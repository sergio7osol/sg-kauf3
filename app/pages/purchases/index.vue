<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { usePurchases, type FetchPurchasesParams } from '~/composables/usePurchases'
import { useShops } from '~/composables/useShops'
import type { Purchase, PurchaseStatus } from '~/types'

definePageMeta({
  middleware: ['auth']
})

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UChip = resolveComponent('UChip')

const { purchases, meta, isLoading, error: fetchError, fetchPurchases } = usePurchases()
const { shops, fetchShops, isLoading: shopsLoading } = useShops()

const breadcrumbs = [
  { label: 'Dashboard', to: '/' },
  { label: 'Purchases', to: '/purchases' }
]

const filters = reactive({
  shop_id: null as number | null,
  date_from: null as string | null,
  date_to: null as string | null,
  status: 'all' as PurchaseStatus | 'all',
  include_lines: false
})

const statusOptions = [
  { label: 'All statuses', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Cancelled', value: 'cancelled' }
]

const shopOptions = computed(() => {
  const base = [{ label: 'All shops', value: null }]
  const dynamic = shops.value.map((shop: any) => ({
    label: shop.name,
    value: shop.id
  }))
  return [...base, ...dynamic]
})

onMounted(async () => {
  // Load shops for filter dropdown
  await fetchShops({ includeAddresses: 0 }).catch(err => console.error('Failed to load shops for filters', err))
  
  // Load all purchases on page load (no filters)
  await fetchPurchases({}).catch(err => console.error('Failed to load purchases on mount', err))
})

function buildFilterParams(): FetchPurchasesParams {
  const params: FetchPurchasesParams = {}

  if (filters.shop_id) {
    params.shop_id = filters.shop_id
  }

  if (filters.date_from) {
    params.date_from = filters.date_from
  }

  if (filters.date_to) {
    params.date_to = filters.date_to
  }

  if (filters.status !== 'all') {
    params.status = filters.status as PurchaseStatus
  }

  if (filters.include_lines) {
    params.include_lines = true
  }

  return params
}

const hasActiveFilters = computed(() => {
  return Boolean(filters.shop_id || filters.date_from || filters.date_to || filters.include_lines || filters.status !== 'all')
})

async function handleApplyFilters() {
  const params = buildFilterParams()
  await fetchPurchases(params).catch(err => {
    console.error('Failed to apply filters:', err)
  })
}

function handleResetFilters() {
  filters.shop_id = null
  filters.date_from = null
  filters.date_to = null
  filters.status = 'all'
  filters.include_lines = false
  fetchPurchases({})
}

// Table configuration
interface PurchaseTableRow {
  id: number
  purchase_date: string | null
  shop_name: string
  shop_address: string
  payment_method: string
  total_amount: string
  status: Purchase['status']
  _original: Purchase // Keep reference for expansion
}

const tableColumns: TableColumn<PurchaseTableRow>[] = [
  { 
    accessorKey: 'purchase_date', 
    header: 'Date' 
  },
  { 
    accessorKey: 'shop_name', 
    header: 'Shop' 
  },
  { 
    accessorKey: 'shop_address', 
    header: 'Address' 
  },
  { 
    accessorKey: 'payment_method', 
    header: 'Payment',
    cell: ({ row }: any) => {
      const method = row.original.payment_method
      if (method === 'Not specified') {
        return h('span', { class: 'text-muted text-sm' }, method)
      }
      return h('span', { class: 'text-sm' }, method)
    }
  },
  { 
    accessorKey: 'total_amount', 
    header: 'Total',
    cell: ({ row }: any) => {
      const purchase = row.original._original
      const lineCount = purchase.lines?.length || 0
      return h('div', { class: 'flex items-center gap-2' }, [
        h('span', {}, row.original.total_amount),
        lineCount > 0 ? h(UChip, { 
          size: 'sm',
          color: 'primary',
          class: 'text-xs'
        }, () => `${lineCount} ${lineCount === 1 ? 'line' : 'lines'}`) : null
      ])
    }
  },
  { 
    accessorKey: 'status', 
    header: 'Status',
    cell: ({ row }: any) => {
      const statusColors = {
        confirmed: 'green',
        draft: 'gray',
        cancelled: 'red'
      }
      return h(UBadge, {
        color: statusColors[row.original.status as keyof typeof statusColors] || 'gray',
        variant: 'subtle'
      }, () => row.original.status)
    }
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }: any) => {
      const purchase = row.original._original
      const hasLines = purchase.lines && purchase.lines.length > 0
      
      return h('div', { class: 'flex items-center gap-1' }, [
        h(UButton, {
          icon: 'i-lucide-eye',
          color: 'neutral',
          variant: 'ghost',
          size: 'sm',
          to: `/purchases/${purchase.id}`,
          title: 'View details'
        }),
        h(UButton, {
          icon: row.getIsExpanded() ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down',
          color: 'neutral',
          variant: 'ghost',
          size: 'sm',
          disabled: !hasLines,
          onClick: () => row.toggleExpanded(),
          title: hasLines ? 'Toggle line items' : 'Enable "Include lines" to view details'
        })
      ])
    },
    enableSorting: false,
    enableHiding: false
  }
]

const tableRows = computed<PurchaseTableRow[]>(() => {
  return purchases.value.map((purchase: Purchase) => ({
    id: purchase.id,
    purchase_date: purchase.purchaseDate ?? null,
    shop_name: purchase.shop?.name ?? `Shop #${purchase.shopId ?? 'Unknown'}`,
    shop_address: purchase.shopAddress ? `${purchase.shopAddress.city}, ${purchase.shopAddress.street}` : `Address #${purchase.shopAddressId ?? 'N/A'}`,
    payment_method: purchase.userPaymentMethod?.name ?? 'Not specified',
    total_amount: `€${(purchase.totalAmount / 100).toFixed(2)}`,
    status: purchase.status,
    _original: purchase
  }))
})
</script>

<template>
  <UDashboardPanel id="purchases">
    <template #header>
      <UDashboardNavbar title="Purchases" :links="breadcrumbs">
        <template #right>
          <div class="flex gap-2">
            <UButton to="/purchases/create" icon="i-lucide-plus" label="Add purchase" />
            <UButton color="neutral" variant="outline" icon="i-lucide-download" label="Export" disabled />
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-4 space-y-6">

        <UDashboardToolbar>
          <template #left>
            <USelectMenu
              v-model="filters.shop_id"
              :items="shopOptions"
              :loading="shopsLoading"
              value-key="value"
              placeholder="Select shop"
              class="min-w-[220px]"
            />
            <UInput v-model="filters.date_from" type="date" placeholder="Date from" class="min-w-[150px]" />
            <UInput v-model="filters.date_to" type="date" placeholder="Date to" class="min-w-[150px]" />
            <USelectMenu v-model="filters.status" :items="statusOptions" value-key="value" class="min-w-[160px]" />
            <USwitch v-model="filters.include_lines" label="Include lines" />
          </template>

          <template #right>
            <UButton
              color="primary"
              icon="i-lucide-filter"
              :disabled="isLoading"
              :loading="isLoading"
              label="Apply filters"
              @click="handleApplyFilters"
            />
            <UButton
              v-if="hasActiveFilters"
              color="neutral"
              variant="ghost"
              icon="i-lucide-rotate-ccw"
              label="Reset"
              @click="handleResetFilters"
            />
          </template>
        </UDashboardToolbar>

        <!-- Purchases Table -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-lg font-semibold">Purchases List</h3>
                <p class="text-sm text-muted">{{ tableRows.length }} purchase(s) displayed</p>
              </div>
            </div>
          </template>

          <UTable
            :data="tableRows"
            :columns="tableColumns"
            :loading="isLoading"
            :empty-state="{ icon: 'i-lucide-inbox', label: 'No purchases found' }"
          >
            <template #expanded="{ row }">
              <div class="p-4 bg-elevated/30">
                <div v-if="row.original._original.lines && row.original._original.lines.length > 0">
                  <h4 class="text-sm font-semibold mb-3 text-highlighted">Line Items</h4>
                  <div class="overflow-x-auto">
                    <table class="min-w-full text-sm">
                      <thead class="border-b border-default">
                        <tr class="text-left text-muted">
                          <th class="pb-2 pr-4">#</th>
                          <th class="pb-2 pr-4">Description</th>
                          <th class="pb-2 pr-4 text-right">Qty</th>
                          <th class="pb-2 pr-4 text-right">Unit Price</th>
                          <th class="pb-2 pr-4 text-right">Tax</th>
                          <th class="pb-2 pr-4 text-right">Discount</th>
                          <th class="pb-2 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-default">
                        <tr v-for="line in row.original._original.lines" :key="line.id" class="text-default">
                          <td class="py-2 pr-4 text-muted">{{ line.lineNumber }}</td>
                          <td class="py-2 pr-4 font-medium">
                            {{ line.description }}
                            <span v-if="line.notes" class="block text-xs text-muted mt-0.5">{{ line.notes }}</span>
                          </td>
                          <td class="py-2 pr-4 text-right">{{ line.quantity }}</td>
                          <td class="py-2 pr-4 text-right">€{{ (line.unitPrice / 100).toFixed(2) }}</td>
                          <td class="py-2 pr-4 text-right">{{ line.taxRate }}%</td>
                          <td class="py-2 pr-4 text-right">{{ line.discountPercent ? `${line.discountPercent}%` : '—' }}</td>
                          <td class="py-2 text-right font-medium">
                            €{{ ((line.quantity * line.unitPrice * (1 - (line.discountPercent || 0) / 100)) / 100).toFixed(2) }}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <div v-else class="text-sm text-muted text-center py-4">
                  <p>No line items available. Enable "Include lines" filter and reload.</p>
                </div>
              </div>
            </template>
          </UTable>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
