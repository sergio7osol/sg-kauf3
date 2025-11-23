import type { AvatarProps } from '@nuxt/ui'

export type UserStatus = 'subscribed' | 'unsubscribed' | 'bounced'
export type SaleStatus = 'paid' | 'failed' | 'refunded'

export interface User {
  id: number
  name: string
  email: string
  avatar?: AvatarProps
  status: UserStatus
  location: string
}

export interface PaginationMeta {
  current_page: number
  from: number | null
  last_page: number
  per_page: number
  to: number | null
  total: number
}

export interface Mail {
  id: number
  unread?: boolean
  from: User
  subject: string
  body: string
  date: string
}

export interface Member {
  name: string
  username: string
  role: 'member' | 'owner'
  avatar: AvatarProps
}

export interface Stat {
  title: string
  icon: string
  value: number | string
  variation: number
  formatter?: (value: number) => string
}

export interface Sale {
  id: string
  date: string
  status: SaleStatus
  email: string
  amount: number
}

export interface Notification {
  id: number
  unread?: boolean
  sender: User
  body: string
  date: string
}

export type Period = 'daily' | 'weekly' | 'monthly'

export interface Range {
  start: Date
  end: Date
}

export type ShopType = 'in_store' | 'online' | 'hybrid'
export type CountryCode = 'Germany' | 'Russia'

export interface ShopAddress {
  id: number
  shopId: number
  country: CountryCode
  postalCode: string
  city: string
  street: string
  houseNumber: string
  isPrimary: boolean
  displayOrder: number
  isActive: boolean
}

export interface Shop {
  id: number
  name: string
  slug: string
  type: ShopType
  country: CountryCode
  displayOrder: number
  isActive: boolean
  addresses?: ShopAddress[]
}

export type PurchaseStatus = 'draft' | 'confirmed' | 'cancelled'

export interface PurchaseLine {
  id: number
  purchaseId: number
  lineNumber: number
  productId?: number | null
  description: string
  quantity: number
  unitPrice: number
  lineAmount: number
  taxRate: number
  taxAmount: number
  discountPercent?: number | null
  discountAmount?: number | null
  notes?: string | null
}

export interface Purchase {
  id: number
  userId: number
  shopId: number
  shopAddressId: number
  purchaseDate: string
  currency: string
  status: PurchaseStatus
  subtotal: number
  taxAmount: number
  totalAmount: number
  notes?: string | null
  receiptNumber?: string | null
  createdAt: string
  updatedAt: string
  shop?: Shop
  shopAddress?: ShopAddress
  lines?: PurchaseLine[]
}

export interface CreatePurchasePayload {
  shop_id: number
  shop_address_id: number
  purchase_date: string
  currency: string
  status?: PurchaseStatus
  notes?: string | null
  receipt_number?: string | null
  lines: Array<{
    line_number?: number
    product_id?: number | null
    description: string
    quantity: number
    unit_price: number
    tax_rate: number
    discount_percent?: number | null
    notes?: string | null
  }>
}
