import axios from 'axios'
import type { UserPaymentMethod } from '~/types'

/**
 * Payload for creating a new user payment method
 * Uses snake_case as required by the API
 */
export interface CreatePaymentMethodPayload {
  name: string                    // required, max 100 chars, unique per user
  notes?: string | null           // optional, max 1000 chars
  isActive?: boolean              // optional, default true
}

/**
 * Payload for updating an existing user payment method
 * All fields optional - only send what needs to change
 */
export interface UpdatePaymentMethodPayload {
  name?: string                   // optional, max 100 chars, unique per user
  notes?: string | null           // optional, max 1000 chars
  isActive?: boolean              // optional, set false to "retire"
}

/**
 * API response structure for list endpoint
 */
interface PaymentMethodsListResponse {
  data: UserPaymentMethod[]
  meta: { count: number }
}

/**
 * API response structure for single item endpoints
 */
interface PaymentMethodResponse {
  data: UserPaymentMethod
}

/**
 * API response structure for delete endpoint
 */
interface DeleteResponse {
  message: string
}

/**
 * Composable for managing user payment methods
 * Provides CRUD operations and reactive state management
 */
export const useUserPaymentMethods = () => {
  // List state
  const paymentMethods = useState<UserPaymentMethod[]>('userPaymentMethods', () => [])
  const meta = useState<{ count: number } | null>('userPaymentMethodsMeta', () => null)
  const isLoading = useState('userPaymentMethodsLoading', () => false)
  const error = useState<string | null>('userPaymentMethodsError', () => null)

  // Single item state
  const paymentMethod = useState<UserPaymentMethod | null>('userPaymentMethod', () => null)
  const paymentMethodLoading = useState('userPaymentMethodLoading', () => false)
  const paymentMethodError = useState<string | null>('userPaymentMethodError', () => null)

  /**
   * Computed: Returns only active payment methods
   * Useful for dropdowns where archived methods should be hidden
   */
  const activePaymentMethods = computed(() => 
    paymentMethods.value.filter((pm: UserPaymentMethod) => pm.isActive)
  )

  /**
   * Computed: Returns only inactive (archived) payment methods
   * Useful for showing archived section separately
   */
  const archivedPaymentMethods = computed(() => 
    paymentMethods.value.filter((pm: UserPaymentMethod) => !pm.isActive)
  )

  /**
   * Fetch all payment methods for the authenticated user
   * API returns active methods first by default
   */
  async function fetchPaymentMethods() {
    isLoading.value = true
    error.value = null
    paymentMethods.value = [] // Clear stale data before fetch

    try {
      const { data } = await axios.get<PaymentMethodsListResponse>('/user-payment-methods')

      paymentMethods.value = Array.isArray(data.data) ? data.data : []
      meta.value = data.meta ?? null

      return data
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Unable to load payment methods. Please try again.'
      error.value = message
      console.error('Failed to fetch payment methods:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Fetch a single payment method by ID
   * User can only view their own payment methods
   */
  async function fetchPaymentMethod(id: number | string) {
    paymentMethodLoading.value = true
    paymentMethodError.value = null
    paymentMethod.value = null

    try {
      const { data } = await axios.get<PaymentMethodResponse>(`/user-payment-methods/${id}`)
      paymentMethod.value = data.data
      return data
    } catch (err: any) {
      if (err?.response?.status === 404) {
        paymentMethodError.value = 'Payment method not found.'
      } else if (err?.response?.status === 403) {
        paymentMethodError.value = 'You do not have access to this payment method.'
      } else {
        paymentMethodError.value = 'Unable to load payment method. Please try again.'
      }
      console.error('Failed to fetch payment method:', err)
      throw err
    } finally {
      paymentMethodLoading.value = false
    }
  }

  /**
   * Create a new payment method
   * @param payload - CreatePaymentMethodPayload with name (required), notes, is_active
   * @returns The created payment method
   * @throws 422 if name already exists for this user
   */
  async function createPaymentMethod(payload: CreatePaymentMethodPayload) {
    try {
      const { data } = await axios.post<PaymentMethodResponse>('/user-payment-methods', payload)
      
      // Add to local state to avoid refetch
      if (data.data) {
        paymentMethods.value = [data.data, ...paymentMethods.value]
        if (meta.value) {
          meta.value = { count: meta.value.count + 1 }
        }
      }

      return data
    } catch (err: any) {
      console.error('Failed to create payment method:', err)
      throw err
    }
  }

  /**
   * Update an existing payment method
   * @param id - Payment method ID
   * @param payload - UpdatePaymentMethodPayload with optional name, notes, is_active
   * @returns The updated payment method
   */
  async function updatePaymentMethod(id: number | string, payload: UpdatePaymentMethodPayload) {
    try {
      const { data } = await axios.put<PaymentMethodResponse>(`/user-payment-methods/${id}`, payload)
      
      // Update local state to avoid refetch
      if (data.data) {
        const index = paymentMethods.value.findIndex((pm: UserPaymentMethod) => pm.id === Number(id))
        if (index !== -1) {
          paymentMethods.value[index] = data.data
        }
        // Also update single item state if it matches
        if (paymentMethod.value?.id === Number(id)) {
          paymentMethod.value = data.data
        }
      }

      return data
    } catch (err: any) {
      console.error('Failed to update payment method:', err)
      throw err
    }
  }

  /**
   * Archive (soft-delete) a payment method by setting is_active to false
   * This preserves historical data while hiding from dropdowns
   * @param id - Payment method ID
   */
  async function archivePaymentMethod(id: number | string) {
    return updatePaymentMethod(id, { isActive: false })
  }

  /**
   * Restore an archived payment method by setting is_active to true
   * @param id - Payment method ID
   */
  async function restorePaymentMethod(id: number | string) {
    return updatePaymentMethod(id, { isActive: true })
  }

  /**
   * Permanently delete a payment method
   * WARNING: This cannot be undone. Consider archivePaymentMethod instead.
   * @param id - Payment method ID
   */
  async function deletePaymentMethod(id: number | string) {
    try {
      const { data } = await axios.delete<DeleteResponse>(`/user-payment-methods/${id}`)
      
      // Remove from local state
      paymentMethods.value = paymentMethods.value.filter((pm: UserPaymentMethod) => pm.id !== Number(id))
      if (meta.value) {
        meta.value = { count: Math.max(0, meta.value.count - 1) }
      }
      // Clear single item state if it matches
      if (paymentMethod.value?.id === Number(id)) {
        paymentMethod.value = null
      }

      return data
    } catch (err: any) {
      console.error('Failed to delete payment method:', err)
      throw err
    }
  }

  /**
   * Clear all local state
   * Useful when logging out or switching users
   */
  function clearState() {
    paymentMethods.value = []
    meta.value = null
    isLoading.value = false
    error.value = null
    paymentMethod.value = null
    paymentMethodLoading.value = false
    paymentMethodError.value = null
  }

  return {
    // List state
    paymentMethods,
    meta,
    isLoading,
    error,
    
    // Single item state
    paymentMethod,
    paymentMethodLoading,
    paymentMethodError,
    
    // Computed getters
    activePaymentMethods,
    archivedPaymentMethods,
    
    // CRUD functions
    fetchPaymentMethods,
    fetchPaymentMethod,
    createPaymentMethod,
    updatePaymentMethod,
    archivePaymentMethod,
    restorePaymentMethod,
    deletePaymentMethod,
    
    // Utility
    clearState
  }
}
