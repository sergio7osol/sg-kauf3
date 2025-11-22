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
                />

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
