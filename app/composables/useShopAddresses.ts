import axios from 'axios';
import type { ShopAddress } from '~/types';

export interface FetchShopAddressesParams {
  activeOnly?: boolean
}

export interface CreateShopAddressPayload {
  country?: string
  postalCode: string
  city: string
  street: string
  houseNumber: string
  isPrimary?: boolean
  displayOrder?: number
  isActive?: boolean
}

export interface UpdateShopAddressPayload {
  country?: string
  postalCode?: string
  city?: string
  street?: string
  houseNumber?: string
  isPrimary?: boolean
  displayOrder?: number
  isActive?: boolean
}

export interface ShopAddressesApiResponse {
  data: ShopAddress[]
  meta?: {
    count: number
    shopId: number
  }
}

export interface ShopAddressApiResponse {
  data: ShopAddress
  message?: string
}

export const useShopAddresses = (shopId: Ref<number | null>) => {
  const addresses = ref<ShopAddress[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const basePath = computed(() => {
    if (!shopId.value) return null;
    return `/shops/${shopId.value}/addresses`;
  });

  async function fetchAddresses(params: FetchShopAddressesParams = {}) {
    if (!basePath.value) {
      error.value = 'Shop ID is required';
      return;
    }

    isLoading.value = true;
    error.value = null;

    try {
      const { data } = await axios.get<ShopAddressesApiResponse>(basePath.value, { params });
      addresses.value = Array.isArray(data.data) ? data.data : [];
      return data;
    } catch (err) {
      error.value = 'Unable to load addresses. Please try again.';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function createAddress(payload: CreateShopAddressPayload): Promise<ShopAddress> {
    if (!basePath.value) {
      throw new Error('Shop ID is required');
    }

    const { data } = await axios.post<ShopAddressApiResponse>(basePath.value, payload);
    const created = data.data;

    // Add to local state
    addresses.value = [...addresses.value, created];

    return created;
  }

  async function updateAddress(addressId: number, payload: UpdateShopAddressPayload): Promise<ShopAddress> {
    if (!basePath.value) {
      throw new Error('Shop ID is required');
    }

    const { data } = await axios.patch<ShopAddressApiResponse>(`${basePath.value}/${addressId}`, payload);
    const updated = data.data;

    // Update local state
    addresses.value = addresses.value.map(addr =>
      addr.id === addressId ? updated : addr
    );

    // If this was set as primary, unset others locally
    if (updated.isPrimary) {
      addresses.value = addresses.value.map(addr =>
        addr.id !== addressId ? { ...addr, isPrimary: false } : addr
      );
    }

    return updated;
  }

  async function setPrimary(addressId: number): Promise<ShopAddress> {
    if (!basePath.value) {
      throw new Error('Shop ID is required');
    }

    const { data } = await axios.patch<ShopAddressApiResponse>(`${basePath.value}/${addressId}/set-primary`);
    const updated = data.data;

    // Update local state: set this as primary, unset others
    addresses.value = addresses.value.map(addr => ({
      ...addr,
      isPrimary: addr.id === addressId
    }));

    return updated;
  }

  async function toggleActive(addressId: number): Promise<ShopAddress> {
    if (!basePath.value) {
      throw new Error('Shop ID is required');
    }

    const { data } = await axios.patch<ShopAddressApiResponse>(`${basePath.value}/${addressId}/toggle-active`);
    const updated = data.data;

    // Update local state
    addresses.value = addresses.value.map(addr =>
      addr.id === addressId ? updated : addr
    );

    return updated;
  }

  function reset() {
    addresses.value = [];
    error.value = null;
  }

  return {
    addresses,
    isLoading,
    error,
    fetchAddresses,
    createAddress,
    updateAddress,
    setPrimary,
    toggleActive,
    reset
  };
};
