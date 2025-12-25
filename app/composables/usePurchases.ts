import axios from 'axios';
import type { Purchase, PurchaseStatus, CreatePurchasePayload, PaginationMeta } from '~/types';

export interface FetchPurchasesParams {
  shopId?: number | null
  dateFrom?: string | null
  dateTo?: string | null
  status?: PurchaseStatus | null
  includeLines?: boolean
  perPage?: number
  page?: number
}

/**
 * Build query params object, filtering out null/undefined/empty values.
 * Boolean values are converted to 1/0 for API compatibility.
 */
function buildQueryParams(params: FetchPurchasesParams): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      result[key] = typeof value === 'boolean' ? Number(value) : value;
    }
  }

  return result;
}

export const usePurchases = () => {
  const purchases = useState<Purchase[]>('purchases', () => []);
  const meta = useState<PaginationMeta | null>('purchasesMeta', () => null);
  const isLoading = useState('purchasesLoading', () => false);
  const error = useState<string | null>('purchasesError', () => null);

  // Single purchase state
  const purchase = useState<Purchase | null>('purchase', () => null);
  const purchaseLoading = useState('purchaseLoading', () => false);
  const purchaseError = useState<string | null>('purchaseError', () => null);

  async function fetchPurchases(params: FetchPurchasesParams = {}) {
    isLoading.value = true;
    error.value = null;
    purchases.value = []; // Clear stale data before fetch
    const queryParams = buildQueryParams(params);

    try {
      const { data } = await axios.get<{ data: Purchase[], meta?: PaginationMeta }>('/purchases', {
        params: queryParams
      });

      purchases.value = Array.isArray(data.data) ? data.data : [];
      meta.value = data.meta ?? null;

      return data;
    } catch (err: unknown) {
      error.value = 'Unable to load purchases. Please try again.';
      console.error('Failed to fetch purchases:', err);
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchPurchase(id: number | string) {
    purchaseLoading.value = true;
    purchaseError.value = null;
    purchase.value = null;

    try {
      const { data } = await axios.get<{ data: Purchase }>(`/purchases/${id}`);
      purchase.value = data.data;
      return data;
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        purchaseError.value = 'Purchase not found.';
      } else {
        purchaseError.value = 'Unable to load purchase details. Please try again.';
      }
      console.error('Failed to fetch purchase:', err);
      throw err;
    } finally {
      purchaseLoading.value = false;
    }
  }

  async function createPurchase(payload: CreatePurchasePayload | FormData) {
    const config = payload instanceof FormData
      ? { headers: { 'Content-Type': 'multipart/form-data' } }
      : undefined;

    try {
      const { data } = await axios.post<{ data: Purchase }>('/purchases', payload, config);
      return data;
    } catch (err: unknown) {
      console.error('Failed to create purchase:', err);
      throw err;
    }
  }

  async function updatePurchase(id: number, payload: Partial<CreatePurchasePayload> | FormData) {
    const config = payload instanceof FormData
      ? { headers: { 'Content-Type': 'multipart/form-data' } }
      : undefined;

    try {
      const { data } = await axios.put<{ data: Purchase }>(`/purchases/${id}`, payload, config);
      // Update single purchase state if it matches
      if (purchase.value?.id === id) {
        purchase.value = data.data;
      }
      return data;
    } catch (err: unknown) {
      console.error('Failed to update purchase:', err);
      throw err;
    }
  }

  async function deletePurchase(id: number) {
    try {
      const { data } = await axios.delete<{ message: string }>(`/purchases/${id}`);
      // Clear single purchase state if it matches
      if (purchase.value?.id === id) {
        purchase.value = null;
      }
      return data;
    } catch (err: unknown) {
      console.error('Failed to delete purchase:', err);
      throw err;
    }
  }

  async function deleteAttachment(purchaseId: number, attachmentId: number) {
    try {
      const { data } = await axios.delete<{ message: string }>(`/purchases/${purchaseId}/attachments/${attachmentId}`);
      // Refresh purchase data if currently viewing this purchase
      if (purchase.value?.id === purchaseId) {
        await fetchPurchase(purchaseId);
      }
      return data;
    } catch (err: unknown) {
      console.error('Failed to delete attachment:', err);
      throw err;
    }
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
    deletePurchase,
    deleteAttachment
  };
};
