<script setup lang="ts">
import type { ShopType, CountryCode } from '~/types'

const breadcrumbs = [
  { label: 'Dashboard', to: '/' },
  { label: 'Shops', to: '/shops' }
]

const shopTypes: ShopType[] = ['in_store', 'online', 'hybrid']
const countries: CountryCode[] = ['Germany', 'Russia']

const filters = reactive({
  search: '',
  type: '' as ShopType | '',
  country: '' as CountryCode | '',
  showInactive: false
})

const isLoading = ref(false)
</script>

<template>
  <UDashboardPanel id="shops">
    <template #header>
      <UDashboardNavbar title="Shops">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <ShopsAddModal />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      
    </template>
  </UDashboardPanel>
</template>
