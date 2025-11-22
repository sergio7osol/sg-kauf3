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
