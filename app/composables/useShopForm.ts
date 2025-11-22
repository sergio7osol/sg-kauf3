import type { AxiosError } from 'axios'
import { z } from 'zod'
import type { ShopType, CountryCode } from '~/types'

export const SHOP_TYPES: ShopType[] = ['in_store', 'online', 'hybrid']
export const SHOP_COUNTRIES: CountryCode[] = ['Germany', 'Russia']

export const shopFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be 255 characters or less'),
  slug: z.string().max(255, 'Slug must be 255 characters or less').optional().or(z.literal('')),
  type: z.enum(['in_store', 'online', 'hybrid'], { message: 'Please select a valid shop type' }),
  country: z.enum(['Germany', 'Russia'], { message: 'Please select a valid country' }),
  isActive: z.boolean()
})

export interface ShopFormState {
  name: string
  slug: string
  type: ShopType | ''
  country: CountryCode | ''
  isActive: boolean
}

export const createShopFormState = (overrides: Partial<ShopFormState> = {}): ShopFormState => ({
  name: '',
  slug: '',
  type: '' as ShopType | '',
  country: '' as CountryCode | '',
  isActive: true,
  ...overrides
})

export const buildShopPayload = (state: ShopFormState) => ({
  name: state.name,
  type: state.type,
  country: state.country,
  isActive: state.isActive,
  ...(state.slug && state.slug.trim() !== '' ? { slug: state.slug } : {})
})

export type LaravelValidationErrors = Record<string, string[]>

export const extractValidationErrors = (
  error: AxiosError<{ message?: string; errors?: LaravelValidationErrors }>
): LaravelValidationErrors | null => {
  if (error.response?.status === 422 && error.response.data?.errors) {
    return error.response.data.errors
  }

  return null
}
