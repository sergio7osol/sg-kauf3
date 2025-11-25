import axios from 'axios'
import type { Purchase, PurchaseStatus, CreatePurchasePayload, PaginationMeta } from '~/types'

export interface FetchPurchasesParams {
  shop_id?: number | null
  date_from?: string | null
  date_to?: string | null
  status?: PurchaseStatus | null
  include_lines?: boolean
  per_page?: number
  page?: number
  // Allow camelCase aliases (converted internally)
  shopId?: number | null
  dateFrom?: string | null
  dateTo?: string | null
  includeLines?: boolean
  perPage?: number
}

export function normalizeFetchPurchasesParams(params: FetchPurchasesParams = {}): Record<string, unknown> {
  const normalized: Record<string, unknown> = {}

  const mappings: Record<string, keyof FetchPurchasesParams> = {
    shop_id: 'shop_id',
    date_from: 'date_from',
    date_to: 'date_to',
    status: 'status',
    include_lines: 'include_lines',
    per_page: 'per_page',
    page: 'page'
  }

  const aliasPairs: Array<[keyof FetchPurchasesParams, keyof FetchPurchasesParams]> = [
    ['shop_id', 'shopId'],
    ['date_from', 'dateFrom'],
    ['date_to', 'dateTo'],
    ['include_lines', 'includeLines'],
    ['per_page', 'perPage']
  ]

  Object.entries(mappings).forEach(([snakeKey, snakeProp]) => {
    const alias = aliasPairs.find(([target]) => target === snakeProp)
    const aliasProp = alias?.[1]
    const value = params[snakeProp] ?? (aliasProp ? params[aliasProp] : undefined)
    if (value !== undefined && value !== null && value !== '') {
      normalized[snakeKey] = typeof value === 'boolean' ? Number(value) : value
    }
  })

  if (params.page !== undefined) {
    normalized.page = params.page
  }

  return normalized
}

export const usePurchases = () => {
  const purchases = useState<Purchase[]>('purchases', () => [])
  const meta = useState<PaginationMeta | null>('purchasesMeta', () => null)
  const isLoading = useState('purchasesLoading', () => false)
  const error = useState<string | null>('purchasesError', () => null)
  
  // Single purchase state
  const purchase = useState<Purchase | null>('purchase', () => null)
  const purchaseLoading = useState('purchaseLoading', () => false)
  const purchaseError = useState<string | null>('purchaseError', () => null)

  async function fetchPurchases(params: FetchPurchasesParams = {}) {
    isLoading.value = true
    error.value = null
    purchases.value = [] // Clear stale data before fetch
    const queryParams = normalizeFetchPurchasesParams(params)

    try {
      const { data } = await axios.get<{ data: Purchase[]; meta?: PaginationMeta }>('/purchases', {
        params: queryParams
      })

      purchases.value = Array.isArray(data.data) ? data.data : []
      meta.value = data.meta ?? null

      return data
    } catch (err) {
      error.value = 'Unable to load purchases. Please try again.'
      console.error('Failed to fetch purchases:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function fetchPurchase(id: number | string) {
    purchaseLoading.value = true
    purchaseError.value = null
    purchase.value = null

    try {
      const { data } = await axios.get<{ data: Purchase }>(`/purchases/${id}`)
      purchase.value = data.data
      return data
    } catch (err: any) {
      if (err?.response?.status === 404) {
        purchaseError.value = 'Purchase not found.'
      } else {
        purchaseError.value = 'Unable to load purchase details. Please try again.'
      }
      console.error('Failed to fetch purchase:', err)
      throw err
    } finally {
      purchaseLoading.value = false
    }
  }

  async function createPurchase(payload: CreatePurchasePayload) {
    try {
      const { data } = await axios.post<{ data: Purchase }>('/purchases', payload)
      return data
    } catch (err) {
      console.error('Failed to create purchase:', err)
      throw err
    }
  }

  async function updatePurchase() {
    throw new Error('updatePurchase is not implemented yet.')
  }

  async function deletePurchase() {
    throw new Error('deletePurchase is not implemented yet.')
  }

  return {
    purchases,
    meta,
    isLoading,
    error,
    purchase,
    purchaseLoading,
    purchaseError,
    fetchPurchases,
    fetchPurchase,
    createPurchase,
    updatePurchase,
    deletePurchase
  }
}
