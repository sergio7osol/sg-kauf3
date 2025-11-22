import axios from 'axios'
import type { Shop, ShopType, CountryCode } from '~/types'

export interface FetchShopsParams {
  includeAddresses?: number
  type?: ShopType | null
  country?: CountryCode | null
  isActive?: boolean
}

export const useShops = () => {
  const shops = useState<Shop[]>('shops', () => [])
  const meta = useState<{ count?: number } | null>('shopsMeta', () => null)
  const isLoading = useState('shopsLoading', () => false)
  const error = useState<string | null>('shopsError', () => null)

  async function fetchShops(params: FetchShopsParams = { includeAddresses: 1 }) {
    isLoading.value = true
    error.value = null

    try {
      const { data } = await axios.get<{ data: Shop[]; meta?: { count: number } }>('/shops', {
        params: {
          includeAddresses: 1,
          ...params
        }
      })

      shops.value = Array.isArray(data.data) ? data.data : []
      meta.value = data.meta ?? null

      return data
    } catch (err) {
      error.value = 'Unable to load shops. Please try again.'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function createShop() {
    throw new Error('createShop is not implemented yet.')
  }

  async function updateShop() {
    throw new Error('updateShop is not implemented yet.')
  }

  async function deleteShop() {
    throw new Error('deleteShop is not implemented yet.')
  }

  return {
    shops,
    meta,
    isLoading,
    error,
    fetchShops,
    createShop,
    updateShop,
    deleteShop
  }
}
