import type { AxiosError } from 'axios';
import { z } from 'zod';

const COUNTRY_CODES = ['Germany', 'Russia', 'DE', 'RU'] as const;
const COUNTRY_LABELS: Record<string, string> = {
  DE: 'Germany',
  Germany: 'Germany',
  RU: 'Russia',
  Russia: 'Russia'
};

export const ADDRESS_COUNTRY_OPTIONS = [
  { label: 'Germany', value: 'Germany' },
  { label: 'Russia', value: 'Russia' }
] as const;

export type AddressCountryValue = 'Germany' | 'Russia';

export const normalizeCountryCode = (value: string): AddressCountryValue => {
  if (value === 'Russia' || value === 'RU') return 'Russia';
  if (value === 'Germany' || value === 'DE') return 'Germany';
  return 'Germany'; // fallback
};

export const getCountryLabel = (value: string): string => COUNTRY_LABELS[value] ?? value;

export const shopAddressFormSchema = z.object({
  country: z.enum(COUNTRY_CODES, { message: 'Country is required' }),
  postalCode: z.string().min(1, 'Postal code is required').max(20, 'Postal code must be 20 characters or less'),
  city: z.string().min(1, 'City is required').max(120, 'City must be 120 characters or less'),
  street: z.string().min(1, 'Street is required').max(150, 'Street must be 150 characters or less'),
  houseNumber: z.string().min(1, 'House number is required').max(25, 'House number must be 25 characters or less'),
  isPrimary: z.boolean(),
  isActive: z.boolean()
});

export interface ShopAddressFormState {
  country: AddressCountryValue
  postalCode: string
  city: string
  street: string
  houseNumber: string
  isPrimary: boolean
  isActive: boolean
}

export type ValidatedShopAddressFormState = z.output<typeof shopAddressFormSchema>;

export const createShopAddressFormState = (
  overrides: Partial<ShopAddressFormState> = {}
): ShopAddressFormState => {
  const base: ShopAddressFormState = {
    country: 'Germany',
    postalCode: '',
    city: '',
    street: '',
    houseNumber: '',
    isPrimary: false,
    isActive: true
  };

  return {
    ...base,
    ...overrides,
    country: normalizeCountryCode(overrides.country ?? base.country)
  };
};

export const buildShopAddressPayload = (state: ShopAddressFormState | ValidatedShopAddressFormState) => ({
  country: normalizeCountryCode(state.country),
  postalCode: state.postalCode,
  city: state.city,
  street: state.street,
  houseNumber: state.houseNumber,
  isPrimary: state.isPrimary,
  isActive: state.isActive
});

export type LaravelValidationErrors = Record<string, string[]>;

export const extractAddressValidationErrors = (
  error: AxiosError<{ message?: string, errors?: LaravelValidationErrors }>
): LaravelValidationErrors | null => {
  if (error.response?.status === 422 && error.response.data?.errors) {
    return error.response.data.errors;
  }

  return null;
};

export const formatValidationError = (errors: LaravelValidationErrors): string => {
  const firstError = Object.values(errors)[0]?.[0];
  return firstError ?? 'Validation error';
};
