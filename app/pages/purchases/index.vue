<script setup lang="ts">
import { h } from 'vue';
import axios from 'axios';
import type { TableColumn } from '@nuxt/ui';
import { usePurchases, type FetchPurchasesParams } from '~/composables/usePurchases';
import { useShops } from '~/composables/useShops';
import type { Purchase, PurchaseStatus, Shop, PurchaseLine, Label } from '~/types';

definePageMeta({
  middleware: ['auth']
});

function openDeleteModal(purchase: Purchase) {
  purchaseToDelete.value = purchase;
  isDeleteModalOpen.value = true;
}

function closeDeleteModal() {
  isDeleteModalOpen.value = false;
  purchaseToDelete.value = null;
}

async function handleConfirmDelete() {
  if (!purchaseToDelete.value) return;
  isDeleting.value = true;

  try {
    await deletePurchase(purchaseToDelete.value.id);

    toast.add({
      title: 'Purchase deleted',
      description: `Purchase #${purchaseToDelete.value.id} has been removed.`,
      icon: 'i-lucide-check',
      color: 'success'
    });

    // Refresh list with current filters
    const params = buildFilterParams();
    await fetchPurchases(params);
  } catch (err: unknown) {
    const message = axios.isAxiosError(err)
      ? err.response?.data?.message ?? 'Failed to delete purchase. Please try again.'
      : 'Failed to delete purchase. Please try again.';
    toast.add({
      title: 'Error',
      description: message,
      icon: 'i-lucide-alert-circle',
      color: 'error'
    });
  } finally {
    isDeleting.value = false;
    closeDeleteModal();
  }
}

const UBadge = resolveComponent('UBadge');
const UButton = resolveComponent('UButton');
const UChip = resolveComponent('UChip');
const UIcon = resolveComponent('UIcon');

const toast = useToast();
const { purchases, meta, isLoading, error: _fetchError, fetchPurchases, deletePurchase } = usePurchases();
const { shops, fetchShops, isLoading: shopsLoading } = useShops();

// Aggregates state (calculated from ALL matching purchases, not just current page)
interface PurchaseAggregates {
  totalSpent: number
  totalDiscount: number
  totalSubtotal: number
  count: number
  avgPurchase: number
}

const aggregates = ref<PurchaseAggregates>({
  totalSpent: 0,
  totalDiscount: 0,
  totalSubtotal: 0,
  count: 0,
  avgPurchase: 0
});
const isLoadingAggregates = ref(false);
const showTotalSpentAnimation = ref(false);

const breadcrumbs = [
  { label: 'Dashboard', to: '/' },
  { label: 'Purchases', to: '/purchases' }
];

const DEFAULT_PER_PAGE = 15;

const perPageOptions = [
  { label: '15 per page', value: 15 },
  { label: '25 per page', value: 25 },
  { label: '50 per page', value: 50 },
  { label: '100 per page', value: 100 }
];

const filters = reactive({
  shopId: null as number | null,
  dateFrom: null as string | null,
  dateTo: null as string | null,
  status: 'all' as PurchaseStatus | 'all',
  includeLines: false,
  page: 1,
  perPage: DEFAULT_PER_PAGE
});

const statusOptions = [
  { label: 'All statuses', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Cancelled', value: 'cancelled' }
];

const shopOptions = computed(() => {
  const base = [{ label: 'All shops', value: null }];
  const dynamic = shops.value.map((shop: Shop) => ({
    label: shop.name,
    value: shop.id
  }));
  return [...base, ...dynamic];
});

onMounted(async () => {
  // Load shops for filter dropdown
  await fetchShops({ includeAddresses: 0 }).catch(err => console.error('Failed to load shops for filters', err));

  // Load purchases and aggregates on page load
  await Promise.all([
    fetchPurchases({ perPage: filters.perPage, page: filters.page }).catch(err => console.error('Failed to load purchases on mount', err)),
    fetchAggregates()
  ]);
});

function buildFilterParams(): FetchPurchasesParams {
  const params: FetchPurchasesParams = {};

  if (filters.shopId) {
    params.shopId = filters.shopId;
  }

  if (filters.dateFrom) {
    params.dateFrom = filters.dateFrom;
  }

  if (filters.dateTo) {
    params.dateTo = filters.dateTo;
  }

  if (filters.status !== 'all') {
    params.status = filters.status as PurchaseStatus;
  }

  if (filters.includeLines) {
    params.includeLines = true;
  }

  params.perPage = filters.perPage;
  params.page = filters.page;

  return params;
}

// Fetch aggregates for ALL matching purchases (across all pages)
async function fetchAggregates() {
  isLoadingAggregates.value = true;
  showTotalSpentAnimation.value = false;

  try {
    // Build base params (include lines for discount calculation)
    const baseParams: Record<string, unknown> = {};
    if (filters.shopId) baseParams.shopId = filters.shopId;
    if (filters.dateFrom) baseParams.dateFrom = filters.dateFrom;
    if (filters.dateTo) baseParams.dateTo = filters.dateTo;
    if (filters.status !== 'all') baseParams.status = filters.status;
    baseParams.perPage = 100; // Max allowed per request
    baseParams.includeLines = 1; // Need lines to calculate discounts

    // Fetch all pages to get complete data
    let allPurchases: Purchase[] = [];
    let currentPage = 1;
    let lastPage = 1;

    do {
      const response = await axios.get('/purchases', {
        params: { ...baseParams, page: currentPage }
      });

      const pageData = response.data.data || [];
      allPurchases = [...allPurchases, ...pageData];

      // Get pagination info from first request
      if (currentPage === 1 && response.data.meta) {
        lastPage = response.data.meta.lastPage || 1;
      }

      currentPage++;
    } while (currentPage <= lastPage);

    // Calculate aggregates from API data
    let totalSpent = 0;
    let totalDiscount = 0;
    let totalSubtotal = 0;

    allPurchases.forEach((p: Purchase) => {
      totalSpent += p.totalAmount ?? 0;
      totalSubtotal += p.subtotal ?? 0;

      // Calculate discount from line items
      const lines = p.lines || [];
      lines.forEach((line: PurchaseLine) => {
        totalDiscount += line.discountAmount ?? 0;
      });
    });

    const count = allPurchases.length;
    aggregates.value = {
      totalSpent,
      totalDiscount,
      totalSubtotal,
      count,
      avgPurchase: count > 0 ? totalSpent / count : 0
    };

    // Trigger animation after successful calculation
    await nextTick();
    showTotalSpentAnimation.value = true;
  } catch (err) {
    console.error('Failed to fetch aggregates:', err);
  } finally {
    isLoadingAggregates.value = false;
  }
}

// Pagination computed properties
const currentPage = computed(() => meta.value?.currentPage ?? 1);
const lastPage = computed(() => meta.value?.lastPage ?? 1);
const totalItems = computed(() => meta.value?.total ?? 0);
const fromItem = computed(() => meta.value?.from ?? 0);
const toItem = computed(() => meta.value?.to ?? 0);

const canGoPrev = computed(() => currentPage.value > 1);
const canGoNext = computed(() => currentPage.value < lastPage.value);

// Pagination navigation
async function goToPage(page: number) {
  if (page < 1 || page > lastPage.value) return;
  filters.page = page;
  await fetchPurchases(buildFilterParams());
}

function goToPrevPage() {
  if (canGoPrev.value) goToPage(currentPage.value - 1);
}

function goToNextPage() {
  if (canGoNext.value) goToPage(currentPage.value + 1);
}

async function handlePerPageChange(newPerPage: number) {
  filters.perPage = newPerPage;
  filters.page = 1; // Reset to first page when changing perPage
  await fetchPurchases(buildFilterParams());
}

const hasActiveFilters = computed(() => {
  return Boolean(filters.shopId || filters.dateFrom || filters.dateTo || filters.includeLines || filters.status !== 'all');
});

async function handleApplyFilters() {
  filters.page = 1; // Reset to first page when applying filters
  const params = buildFilterParams();
  await Promise.all([
    fetchPurchases(params).catch(err => console.error('Failed to apply filters:', err)),
    fetchAggregates()
  ]);
}

async function handleResetFilters() {
  filters.shopId = null;
  filters.dateFrom = null;
  filters.dateTo = null;
  filters.status = 'all';
  filters.includeLines = false;
  filters.page = 1;
  filters.perPage = DEFAULT_PER_PAGE;
  await Promise.all([
    fetchPurchases({ perPage: filters.perPage, page: filters.page }),
    fetchAggregates()
  ]);
}

// Table configuration
interface PurchaseTableRow {
  id: number
  purchaseDateValue: number | null
  purchaseDateDisplay: string | null
  shopName: string
  shopAddress: string
  paymentMethod: string
  totalAmountValue: number
  totalAmountDisplay: string
  status: Purchase['status']
  attachmentCount: number
  _original: Purchase // Keep reference for expansion
}

function createSortableHeader(label: string) {
  return ({ column }: { column: { getIsSorted: () => false | 'asc' | 'desc', toggleSorting: (ascending?: boolean) => void } }) => {
    const isSorted = column.getIsSorted();
    const icon = isSorted ? (isSorted === 'asc' ? 'i-lucide-arrow-up-narrow-wide' : 'i-lucide-arrow-down-wide-narrow') : 'i-lucide-arrow-up-down';

    return h(UButton, {
      color: 'neutral',
      variant: 'ghost',
      class: '-mx-2 px-2 flex items-center gap-1 text-sm font-medium text-highlighted',
      label,
      icon,
      iconRight: true,
      onClick: () => column.toggleSorting(column.getIsSorted() === 'asc')
    });
  };
}

const isDeleteModalOpen = ref(false);
const isDeleting = ref(false);
const purchaseToDelete = ref<Purchase | null>(null);

// Sorting state for TanStack Table
const sorting = ref([
  { id: 'purchaseDateValue', desc: true }
]);

const purchaseDateFormatter = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
});

const tableColumns: TableColumn<PurchaseTableRow>[] = [
  {
    accessorKey: 'purchaseDateValue',
    header: createSortableHeader('Date'),
    cell: ({ row }: { row: { original: { purchaseDateDisplay?: string | null } } }) => row.original.purchaseDateDisplay ?? '—'
  },
  {
    accessorKey: 'shopName',
    header: createSortableHeader('Shop')
  },
  {
    accessorKey: 'shopAddress',
    header: createSortableHeader('Address')
  },
  {
    accessorKey: 'paymentMethod',
    header: createSortableHeader('Payment'),
    cell: ({ row }: { row: { original: { paymentMethod?: string } } }) => {
      const method = row.original.paymentMethod;
      if (method === 'Not specified') {
        return h('span', { class: 'text-muted text-sm' }, method);
      }
      return h('span', { class: 'text-sm' }, method);
    }
  },
  {
    accessorKey: 'totalAmountValue',
    header: createSortableHeader('Total'),
    cell: ({ row }: { row: { original: { _original: Purchase, totalAmountDisplay?: string } } }) => {
      const purchase = row.original._original;
      const lineCount = purchase.lines?.length || 0;
      return h('div', { class: 'flex items-center gap-2' }, [
        h('span', {}, row.original.totalAmountDisplay),
        lineCount > 0
          ? h(UChip, {
              size: 'sm',
              color: 'primary',
              class: 'text-xs'
            }, () => `${lineCount} ${lineCount === 1 ? 'line' : 'lines'}`)
          : null
      ]);
    }
  },
  {
    accessorKey: 'status',
    header: createSortableHeader('Status'),
    cell: ({ row }: { row: { original: { status?: PurchaseStatus } } }) => {
      const statusColors = {
        confirmed: 'green',
        draft: 'gray',
        cancelled: 'red'
      };
      return h(UBadge, {
        color: statusColors[row.original.status as keyof typeof statusColors] || 'gray',
        variant: 'subtle'
      }, () => row.original.status);
    }
  },
  {
    accessorKey: 'labels',
    header: 'Labels',
    cell: ({ row }: { row: { original: { _original: Purchase } } }) => {
      const labels = row.original._original.labels;
      if (!labels || labels.length === 0) {
        return h('span', { class: 'text-muted text-xs' }, '—');
      }
      return h('div', { class: 'flex flex-wrap gap-1' },
        labels.slice(0, 3).map((label: Label) =>
          h(UBadge, {
            key: label.id,
            color: 'neutral',
            variant: 'subtle',
            class: 'text-xs'
          }, () => label.name)
        ).concat(
          labels.length > 3
            ? [h('span', { class: 'text-xs text-muted' }, `+${labels.length - 3}`)]
            : []
        )
      );
    },
    enableSorting: false
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }: { row: { original: { _original: Purchase, attachmentCount: number }, getIsExpanded: () => boolean, toggleExpanded: () => void } }) => {
      const purchase = row.original._original;
      const hasLines = purchase.lines && purchase.lines.length > 0;
      const attachmentCount = row.original.attachmentCount;

      const elements = [];

      elements.push(
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
          class: 'btn-standard',
          onClick: () => row.toggleExpanded(),
          title: hasLines ? 'Toggle line items' : 'Enable "Include lines" to view details'
        }),
        h(UButton, {
          icon: 'i-lucide-trash-2',
          color: 'error',
          variant: 'ghost',
          size: 'sm',
          class: 'btn-standard',
          title: 'Delete purchase',
          onClick: () => openDeleteModal(purchase)
        })
      );

      if (attachmentCount > 0) {
        elements.push(
          h(UBadge, {
            'color': 'neutral',
            'variant': 'soft',
            'class': 'ml-2 rounded-full px-2 py-1 flex items-center gap-1 text-[11px] font-medium leading-none',
            'aria-label': `${attachmentCount} attachment${attachmentCount === 1 ? '' : 's'}`
          }, () => [
            h(UIcon, {
              name: 'i-lucide-paperclip',
              class: 'w-4 h-4 text-highlighted'
            }),
            h('span', {}, attachmentCount)
          ])
        );
      }

      return h('div', { class: 'flex items-center gap-1' }, elements);
    },
    enableSorting: false,
    enableHiding: false
  }
];

const tableRows = computed<PurchaseTableRow[]>(() => {
  return purchases.value.map((purchase: Purchase) => {
    let purchaseDateValue: number | null = null;
    let purchaseDateDisplay: string | null = null;

    if (purchase.purchaseDate) {
      const parsed = new Date(purchase.purchaseDate);
      if (!Number.isNaN(parsed.getTime())) {
        purchaseDateValue = parsed.getTime();
        purchaseDateDisplay = purchaseDateFormatter.format(parsed);
      }
    }

    return {
      id: purchase.id,
      purchaseDateValue,
      purchaseDateDisplay,
      shopName: purchase.shop?.name ?? `Shop #${purchase.shopId ?? 'Unknown'}`,
      shopAddress: purchase.shopAddress ? `${purchase.shopAddress.city}, ${purchase.shopAddress.street} ${purchase.shopAddress.houseNumber}` : `Address #${purchase.shopAddressId ?? 'N/A'}`,
      paymentMethod: purchase.userPaymentMethod?.name ?? 'Not specified',
      totalAmountValue: purchase.totalAmount ?? 0,
      totalAmountDisplay: `€${(purchase.totalAmount / 100).toFixed(2)}`,
      status: purchase.status,
      attachmentCount: purchase.attachments?.length ?? 0,
      _original: purchase
    };
  });
});
</script>

<template>
  <UDashboardPanel id="purchases">
    <template #header>
      <UDashboardNavbar
        title="Purchases"
        :links="breadcrumbs"
      >
        <template #right>
          <div class="flex gap-2">
            <UButton
              to="/purchases/create"
              icon="i-lucide-plus"
              label="Add purchase"
            />
            <UButton
              color="neutral"
              variant="outline"
              icon="i-lucide-download"
              label="Export"
              disabled
            />
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-4 space-y-6">
        <UDashboardToolbar>
          <template #left>
            <USelectMenu
              v-model="filters.shopId"
              :items="shopOptions"
              :loading="shopsLoading"
              value-key="value"
              placeholder="Select shop"
              class="min-w-[220px]"
            />
            <UInput
              v-model="filters.dateFrom"
              type="date"
              placeholder="Date from"
              class="min-w-[150px]"
            />
            <UInput
              v-model="filters.dateTo"
              type="date"
              placeholder="Date to"
              class="min-w-[150px]"
            />
            <USelectMenu
              v-model="filters.status"
              :items="statusOptions"
              value-key="value"
              class="min-w-[160px]"
            />
            <USwitch
              v-model="filters.includeLines"
              label="Include lines"
            />
          </template>

          <template #right>
            <UButton
              color="primary"
              icon="i-lucide-filter"
              :disabled="isLoading"
              :loading="isLoading"
              label="Apply filters"
              class="btn-standard"
              @click="handleApplyFilters"
            />
            <UButton
              v-if="hasActiveFilters"
              color="neutral"
              variant="ghost"
              icon="i-lucide-rotate-ccw"
              label="Reset"
              class="btn-standard"
              @click="handleResetFilters"
            />
          </template>
        </UDashboardToolbar>

        <!-- Summary Stats -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <!-- Total Spent - Hero Card with Animation -->
          <div
            class="total-spent-card p-4 rounded-lg border-2 transition-all duration-500"
            :class="[
              showTotalSpentAnimation ? 'total-spent-animate border-primary bg-primary/5 shadow-lg shadow-primary/20' : 'border-default bg-elevated'
            ]"
          >
            <div class="flex items-center gap-3">
              <div
                class="flex h-12 w-12 items-center justify-center rounded-full transition-all duration-500"
                :class="showTotalSpentAnimation ? 'bg-primary/20 scale-110' : 'bg-primary/10'"
              >
                <UIcon
                  name="i-lucide-wallet"
                  class="h-6 w-6 text-primary transition-transform duration-500"
                  :class="{ 'scale-110': showTotalSpentAnimation }"
                />
              </div>
              <div>
                <p class="text-sm text-muted">
                  Total Spent
                </p>
                <p
                  class="text-xl font-bold transition-all duration-500"
                  :class="[
                    isLoadingAggregates ? 'animate-pulse' : '',
                    showTotalSpentAnimation ? 'text-primary scale-105 origin-left' : ''
                  ]"
                >
                  €{{ (aggregates.totalSpent / 100).toFixed(2) }}
                </p>
              </div>
            </div>
          </div>

          <div class="p-4 bg-elevated rounded-lg border border-default">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-full bg-info/10">
                <UIcon
                  name="i-lucide-shopping-bag"
                  class="h-5 w-5 text-info"
                />
              </div>
              <div>
                <p class="text-sm text-muted">
                  Purchases
                </p>
                <p
                  class="text-lg font-semibold"
                  :class="{ 'animate-pulse': isLoadingAggregates }"
                >
                  {{ aggregates.count }}
                </p>
              </div>
            </div>
          </div>

          <div class="p-4 bg-elevated rounded-lg border border-default">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-full bg-success/10">
                <UIcon
                  name="i-lucide-calculator"
                  class="h-5 w-5 text-success"
                />
              </div>
              <div>
                <p class="text-sm text-muted">
                  Avg. Purchase
                </p>
                <p
                  class="text-lg font-semibold"
                  :class="{ 'animate-pulse': isLoadingAggregates }"
                >
                  €{{ (aggregates.avgPurchase / 100).toFixed(2) }}
                </p>
              </div>
            </div>
          </div>

          <div class="p-4 bg-elevated rounded-lg border border-default">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-full bg-error/10">
                <UIcon
                  name="i-lucide-percent"
                  class="h-5 w-5 text-error"
                />
              </div>
              <div>
                <p class="text-sm text-muted">
                  Total Discount
                </p>
                <p
                  class="text-lg font-semibold"
                  :class="{ 'animate-pulse': isLoadingAggregates }"
                >
                  €{{ (aggregates.totalDiscount / 100).toFixed(2) }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Purchases Table -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-lg font-semibold">
                  Purchases List
                </h3>
                <p class="text-sm text-muted">
                  {{ totalItems }} purchase(s) total
                </p>
              </div>
            </div>
          </template>

          <UTable
            v-model:sorting="sorting"
            :data="tableRows"
            :columns="tableColumns"
            :loading="isLoading"
            :empty-state="{ icon: 'i-lucide-inbox', label: 'No purchases found' }"
          >
            <template #expanded="{ row }">
              <div class="p-4 bg-elevated/30">
                <div v-if="row.original._original.lines && row.original._original.lines.length > 0">
                  <h4 class="text-sm font-semibold mb-3 text-highlighted">
                    Line Items
                  </h4>
                  <div class="overflow-x-auto">
                    <table class="min-w-full text-sm">
                      <thead class="border-b border-default">
                        <tr class="text-left text-muted">
                          <th class="pb-2 pr-4">
                            #
                          </th>
                          <th class="pb-2 pr-4">
                            Description
                          </th>
                          <th class="pb-2 pr-4 text-right">
                            Qty
                          </th>
                          <th class="pb-2 pr-4 text-right">
                            Unit Price
                          </th>
                          <th class="pb-2 pr-4 text-right">
                            Tax
                          </th>
                          <th class="pb-2 pr-4 text-right">
                            Discount
                          </th>
                          <th class="pb-2 text-right">
                            Subtotal
                          </th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-default">
                        <tr
                          v-for="line in row.original._original.lines"
                          :key="line.id"
                          class="text-default"
                        >
                          <td class="py-2 pr-4 text-muted">
                            {{ line.lineNumber }}
                          </td>
                          <td class="py-2 pr-4 font-medium">
                            {{ line.description }}
                            <span
                              v-if="line.notes"
                              class="block text-xs text-muted mt-0.5"
                            >{{ line.notes }}</span>
                          </td>
                          <td class="py-2 pr-4 text-right">
                            {{ line.quantity }}
                          </td>
                          <td class="py-2 pr-4 text-right">
                            €{{ (line.unitPrice / 100).toFixed(2) }}
                          </td>
                          <td class="py-2 pr-4 text-right">
                            {{ line.taxRate }}%
                          </td>
                          <td class="py-2 pr-4 text-right">
                            {{ line.discountPercent ? `${line.discountPercent}%` : '—' }}
                          </td>
                          <td class="py-2 text-right font-medium">
                            €{{ ((line.quantity * line.unitPrice * (1 - (line.discountPercent || 0) / 100)) / 100).toFixed(2) }}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <div
                  v-else
                  class="text-sm text-muted text-center py-4"
                >
                  <p>No line items available. Enable "Include lines" filter and reload.</p>
                </div>
              </div>
            </template>
          </UTable>

          <template #footer>
            <div class="flex items-center justify-between">
              <!-- Left: Item count info -->
              <div class="text-sm text-muted">
                <span v-if="totalItems > 0">
                  Showing {{ fromItem }} - {{ toItem }} of {{ totalItems }} purchases
                </span>
                <span v-else>No purchases</span>
              </div>

              <!-- Right: Pagination controls -->
              <div class="flex items-center gap-4">
                <!-- Per-page selector -->
                <USelectMenu
                  :model-value="filters.perPage"
                  :items="perPageOptions"
                  value-key="value"
                  @update:model-value="handlePerPageChange"
                />

                <!-- Page navigation -->
                <div class="flex items-center gap-2">
                  <UButton
                    icon="i-lucide-chevron-left"
                    color="neutral"
                    variant="outline"
                    size="sm"
                    :disabled="!canGoPrev || isLoading"
                    class="btn-standard"
                    @click="goToPrevPage"
                  />

                  <span class="text-sm text-default min-w-[80px] text-center">
                    Page {{ currentPage }} of {{ lastPage }}
                  </span>

                  <UButton
                    icon="i-lucide-chevron-right"
                    color="neutral"
                    variant="outline"
                    size="sm"
                    :disabled="!canGoNext || isLoading"
                    class="btn-standard"
                    @click="goToNextPage"
                  />
                </div>
              </div>
            </div>
          </template>
        </UCard>
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
              <UIcon
                name="i-lucide-alert-triangle"
                class="h-5 w-5 text-error"
              />
            </div>
            <h3 class="text-lg font-semibold">
              Delete Purchase
            </h3>
          </div>
        </template>

        <div class="space-y-4">
          <p class="text-sm text-muted">
            This action cannot be undone.
          </p>
          <p class="text-sm text-default">
            Are you sure you want to delete
            <strong>Purchase #{{ purchaseToDelete?.id ?? '—' }}</strong>?
          </p>

          <div
            v-if="purchaseToDelete"
            class="p-4 bg-elevated rounded-lg border border-default"
          >
            <dl class="space-y-2 text-sm">
              <div class="flex justify-between">
                <dt class="text-muted">
                  Date:
                </dt>
                <dd class="font-medium">
                  {{ purchaseToDelete.purchaseDate ? new Date(purchaseToDelete.purchaseDate).toLocaleDateString('en-US') : '—' }}
                </dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-muted">
                  Shop:
                </dt>
                <dd class="font-medium">
                  {{ purchaseToDelete.shop?.name ?? `Shop #${purchaseToDelete.shopId}` }}
                </dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-muted">
                  Total:
                </dt>
                <dd class="font-medium">
                  €{{ (purchaseToDelete.totalAmount / 100).toFixed(2) }}
                </dd>
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
              @click="closeDeleteModal"
            />
            <UButton
              color="error"
              icon="i-lucide-trash-2"
              label="Delete Purchase"
              :loading="isDeleting"
              @click="handleConfirmDelete"
            />
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
