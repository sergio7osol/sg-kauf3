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
  currentPage: number
  from: number | null
  lastPage: number
  perPage: number
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
export type CountryCode = 'Germany' | 'Russia' | 'DE' | 'RU'

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

export interface UserPaymentMethod {
  id: number
  userId: number
  paymentMethodId?: number | null
  name: string
  notes?: string | null
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

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
  userPaymentMethodId?: number | null
  purchaseDate: string
  purchaseTime?: string | null
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
  userPaymentMethod?: UserPaymentMethod
  lines?: PurchaseLine[]
}

export interface CreatePurchasePayload {
  shopId: number
  shopAddressId: number
  userPaymentMethodId?: number | null
  purchaseDate: string
  purchaseTime?: string | null
  currency: string
  status?: PurchaseStatus
  notes?: string | null
  receiptNumber?: string | null
  lines: Array<{
    lineNumber?: number
    productId?: number | null
    description: string
    quantity: number
    unitPrice: number
    taxRate: number
    discountPercent?: number | null
    discountAmount?: number | null
    notes?: string | null
  }>
}

// Receipt Parsing Types
export type ReceiptConfidence = 'high' | 'medium' | 'low'

export interface ParsedReceiptItem {
  name: string
  quantity: number
  unit: string
  unitPrice: number
  totalPrice: number
  isDiscount: boolean
  confidence: ReceiptConfidence
  warning: string | null
  /** Price in cents to submit (0 for discount lines) */
  submitUnitPrice: number
  /** Discount amount in cents to submit (actual discount for discount lines, 0 for regular items) */
  submitDiscountAmount: number
}

export interface ParsedReceiptShop {
  name: string
  id: number | null
}

export interface ParsedReceiptAddress {
  display: string
  id: number | null
}

export interface ParsedReceiptData {
  shop: ParsedReceiptShop
  address: ParsedReceiptAddress
  purchaseDate: string
  purchaseTime: string | null
  currency: string
  subtotal: number
  total: number
  items: ParsedReceiptItem[]
}

export interface ReceiptParseResponse {
  success: boolean
  data: ParsedReceiptData | null
  warnings: string[]
  confidence: ReceiptConfidence
  error?: string
  debug?: {
    eventSummary: Record<string, number>
    events: unknown[]
  }
}

export interface SupportedShopsResponse {
  data: string[]
}
