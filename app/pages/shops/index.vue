<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import type { TableColumn, TableRow } from '@nuxt/ui'
import { upperFirst } from 'scule'
import { useShops } from '~/composables/useShops'
import type { Shop, ShopType, CountryCode } from '~/types'

definePageMeta({
  middleware: ['auth']
})

const { user } = useAuth();

const UBadge = resolveComponent('UBadge');
const UButton = resolveComponent('UButton');
const UDropdownMenu = resolveComponent('UDropdownMenu');
const UIcon = resolveComponent('UIcon');
const table = useTemplateRef('table');

const selectedRow = ref<TableRow<Shop> | null>(null);

function onHover(_e: Event, row: TableRow<Shop> | null) {
  selectedRow.value = row;
}

const breadcrumbs = [
  { label: 'Dashboard', to: '/' },
  { label: 'Shops', to: '/shops' }
];

const shopTypes: ShopType[] = ['in_store', 'online', 'hybrid'];
const countries: CountryCode[] = ['Germany', 'Russia'];

const filters = reactive({
  search: '',
  type: null as ShopType | null,
  country: null as CountryCode | null,
  showInactive: true
});

const { shops, meta, isLoading, error: fetchError, fetchShops } = useShops();

function buildParams() {
  return {
    includeAddresses: 1,
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.country ? { country: filters.country } : {}),
    ...(filters.showInactive ? {} : { isActive: true })
  }
}

async function loadShops() {
  try {
    await fetchShops(buildParams());
  } catch (err) {
    console.error('Failed to fetch shops:', err);
  }
}

const debouncedFetch = useDebounceFn(loadShops, 250);

watch(
  () => [filters.type, filters.country, filters.showInactive],
  () => {
    debouncedFetch()
  }
)

onMounted(() => {
  loadShops()
})

const filteredShops = computed(() => {
  const term = filters.search.trim().toLowerCase()
  if (!term) return shops.value
  return shops.value.filter((shop: Shop) =>
    shop.name.toLowerCase().includes(term) ||
    shop.slug.toLowerCase().includes(term)
  )
});

const totalCount = computed(() => meta.value?.count ?? shops.value.length);

const columns: TableColumn<Shop>[] = [
  {
    accessorKey: 'name',
    header: 'Shop',
    cell: ({ row }: any) => {
      return h('div', undefined, [
        h('p', { class: 'font-medium text-gray-900' }, row.original.name),
        h('p', { class: 'text-xs text-gray-500' }, row.original.slug)
      ])
    }
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }: any) => {
      return h(UBadge, { variant: 'soft', color: 'primary' }, () => row.original.type)
    }
  },
  {
    accessorKey: 'country',
    header: 'Country'
  },
  {
    accessorKey: 'isActive',
    header: 'Status',
    cell: ({ row }: any) => {
      const color = row.original.isActive ? 'success' : 'gray'
      const label = row.original.isActive ? 'Active' : 'Inactive'
      return h(UBadge, { color, variant: 'subtle' }, () => label)
    }
  },
  {
    id: 'primaryAddress',
    header: 'Primary address',
    cell: ({ row }: any) => {
      return getAddressSummary(row.original)
    }
  },
  {
    id: 'addressCount',
    header: 'Addresses',
    cell: ({ row }: any) => {
      return h('div', { class: 'text-right text-gray-500' }, row.original.addresses?.length ?? 0)
    }
  },
  {
    id: 'actions',
    header: '',
    enableHiding: false,
    cell: ({ row }: any) => {
      const hasAddresses = row.original.addresses && row.original.addresses.length > 0
      if (!hasAddresses) return null
      
      return h(UButton, {
        icon: row.getIsExpanded() ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down',
        color: 'neutral',
        variant: 'ghost',
        size: 'xs',
        onClick: () => row.toggleExpanded(),
        'aria-label': row.getIsExpanded() ? 'Collapse addresses' : 'Expand addresses'
      })
    }
  }
];

function getAddressSummary(shop: Shop) {
  if (!shop.addresses || shop.addresses.length === 0) return '—';
  
  const primary = shop.addresses.find(address => address.isPrimary) ?? shop.addresses[0];
  if (!primary) return '—';
  
  return `${primary.city}, ${primary.street} ${primary.houseNumber}`;
}

function handleShopCreated() {
  loadShops();
}
</script>

<template>
  <UDashboardPanel id="shops">
    <template #header>
      <UDashboardNavbar title="Shops">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <ShopsAddModal @created="handleShopCreated" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-4">
        <section class="flex flex-col gap-4">
          <div class="flex flex-wrap gap-3 items-center justify-between">
            <div class="flex flex-wrap gap-3">
              <UInput
                v-model="filters.search"
                icon="i-lucide-search"
                placeholder="Search by name or slug"
                class="w-64"
              />
              <USelect
                v-model="filters.type"
                :items="[{ label: 'All types', value: null }, ...shopTypes.map((value: ShopType) => ({ label: value, value }))]"
                placeholder="Type"
                class="w-48"
              />
              <USelect
                v-model="filters.country"
                :items="[{ label: 'All countries', value: null }, ...countries.map((value: CountryCode) => ({ label: value, value }))]"
                placeholder="Country"
                class="w-48"
              />
              <UCheckbox v-model="filters.showInactive" label="Show inactive" />
            </div>
            <div class="text-sm text-muted">{{ filteredShops.length }} / {{ totalCount }} visible</div>
          </div>

          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <div>
                  <p class="font-medium">Shops</p>
                  <p class="text-sm text-gray-500">Live data from <small>/api/shops?includeAddresses=1</small> (user: <span class="font-mono">{{ user?.name }}</span>)</p>
                </div>
                <UBadge color="gray" variant="soft">{{ isLoading ? 'Refreshing…' : 'Up to date' }}</UBadge>
              </div>
            </template>

            <div v-if="fetchError" class="text-sm text-red-500">
              {{ fetchError }}
            </div>

            <div v-else>
              <div v-if="isLoading" class="flex justify-center py-10">
                <UProgress animation="pulse" size="lg" color="primary" :value="null" class="w-48" />
              </div>
              <div v-else-if="!filteredShops.length" class="py-10 text-center text-sm text-gray-500">
                No shops match the current filters.
              </div>
              <div v-else>
                <div class="flex items-center justify-end gap-1.5 mb-3">
                  <UDropdownMenu
                    :items="
                      table?.tableApi
                        ?.getAllColumns()
                        .filter((column: any) => column.getCanHide())
                        .map((column: any) => ({
                          label: upperFirst(column.id),
                          type: 'checkbox' as const,
                          checked: column.getIsVisible(),
                          onUpdateChecked(checked: boolean) {
                            table?.tableApi?.getColumn(column.id)?.toggleVisibility(!!checked)
                          },
                          onSelect(e?: Event) {
                            e?.preventDefault()
                          }
                        }))
                    "
                    :content="{ align: 'end' }"
                  >
                    <UButton
                      label="Columns"
                      color="neutral"
                      variant="outline"
                      trailing-icon="i-lucide-chevron-down"
                      aria-label="Columns select dropdown"
                    />
                  </UDropdownMenu>
                </div>

                <UTable
                  ref="table"
                  :data="filteredShops"
                  :columns="columns"
                  :loading="isLoading"
                  @hover="onHover"
                >
                  <template #expanded="{ row }">
                    <div class="p-4 bg-gray-50/50">
                      <div class="text-sm font-medium text-gray-700 mb-3">Addresses for {{ row.original.name }}</div>
                      <div class="space-y-2">
                        <div
                          v-for="address in row.original.addresses"
                          :key="address.id"
                          class="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-200"
                        >
                          <div class="flex-shrink-0 mt-0.5">
                            <UBadge 
                              v-if="address.isPrimary" 
                              color="primary" 
                              variant="soft"
                              size="xs"
                            >
                              Primary
                            </UBadge>
                            <UBadge 
                              v-else 
                              color="gray" 
                              variant="soft"
                              size="xs"
                            >
                              {{ address.displayOrder }}
                            </UBadge>
                          </div>
                          <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2">
                              <UIcon name="i-lucide-map-pin" class="w-4 h-4 text-gray-400" />
                              <span class="font-medium text-gray-900">
                                {{ address.street }} {{ address.houseNumber }}
                              </span>
                            </div>
                            <div class="flex items-center gap-2 mt-1 text-sm text-gray-600">
                              <UIcon name="i-lucide-map" class="w-3.5 h-3.5 text-gray-400" />
                              <span>{{ address.postalCode }} {{ address.city }}, {{ address.country }}</span>
                            </div>
                          </div>
                          <div class="flex-shrink-0">
                            <UBadge 
                              :color="address.isActive ? 'success' : 'gray'" 
                              variant="subtle"
                              size="xs"
                            >
                              {{ address.isActive ? 'Active' : 'Inactive' }}
                            </UBadge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </template>
                </UTable>

                <div class="flex items-center justify-between px-4 py-3.5 text-sm text-muted">
                  <span>{{ filteredShops.length }} of {{ shops.length }} shop(s) loaded.</span>
                  <span v-if="selectedRow" class="text-primary font-medium">
                    Hovering: {{ selectedRow.original.name }}
                  </span>
                </div>
              </div>
            </div>
          </UCard>
        </section>
      </div>
    </template>
  </UDashboardPanel>
</template>
