import axios from 'axios'
import { format, startOfDay, startOfWeek, startOfMonth, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from 'date-fns'
import type { Period, Range, Purchase } from '~/types'

export interface ChartDataPoint {
  date: Date
  amount: number // in cents
}

export interface PurchaseChartResult {
  data: ChartDataPoint[]
  total: number // in cents
  isLoading: boolean
  error: string | null
}

export interface DateRangeResponse {
  data: {
    earliestDate: string | null
    latestDate: string | null
    totalCount: number
  }
}

/**
 * Fetches the user's purchase date range (earliest and latest dates).
 * Used for "All Time" period selection.
 */
export async function fetchPurchaseDateRange(): Promise<DateRangeResponse['data'] | null> {
  try {
    const response = await axios.get<DateRangeResponse>('/purchases/date-range')
    return response.data.data
  } catch (err) {
    console.error('Failed to fetch purchase date range:', err)
    return null
  }
}

/**
 * Composable for fetching and aggregating purchase data for charts.
 * Aggregates purchases by period (daily/weekly/monthly) within a date range.
 */
export function usePurchaseChart() {
  const chartData = ref<ChartDataPoint[]>([])
  const total = ref(0)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Fetches purchases within date range and aggregates by period.
   * @param period - Aggregation period: 'daily', 'weekly', or 'monthly'
   * @param range - Date range with start and end dates
   */
  async function fetchChartData(period: Period, range: Range): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      // Format dates for API
      const dateFrom = format(range.start, 'yyyy-MM-dd')
      const dateTo = format(range.end, 'yyyy-MM-dd')

      // Fetch all purchases within the range (paginated)
      const allPurchases: Purchase[] = []
      let currentPage = 1
      let lastPage = 1

      do {
        const response = await axios.get<{ data: Purchase[]; meta?: { lastPage: number } }>('/purchases', {
          params: {
            dateFrom,
            dateTo,
            perPage: 100,
            page: currentPage,
            status: 'confirmed' // Only count confirmed purchases
          }
        })

        const purchases = response.data.data || []
        allPurchases.push(...purchases)

        if (currentPage === 1 && response.data.meta) {
          lastPage = response.data.meta.lastPage || 1
        }

        currentPage++
      } while (currentPage <= lastPage)

      // Create date buckets based on period
      const buckets = createDateBuckets(period, range)
      
      // Aggregate purchases into buckets
      const aggregated = aggregatePurchases(allPurchases, buckets, period)

      chartData.value = aggregated
      total.value = aggregated.reduce((sum, point) => sum + point.amount, 0)
    } catch (err) {
      console.error('Failed to fetch chart data:', err)
      error.value = 'Unable to load purchase data for chart.'
      chartData.value = []
      total.value = 0
    } finally {
      isLoading.value = false
    }
  }

  return {
    chartData,
    total,
    isLoading,
    error,
    fetchChartData
  }
}

/**
 * Creates date buckets for the given period and range.
 */
function createDateBuckets(period: Period, range: Range): Date[] {
  const intervalFn = {
    daily: eachDayOfInterval,
    weekly: eachWeekOfInterval,
    monthly: eachMonthOfInterval
  }[period]

  return intervalFn({ start: range.start, end: range.end })
}

/**
 * Aggregates purchases into date buckets.
 */
function aggregatePurchases(
  purchases: Purchase[],
  buckets: Date[],
  period: Period
): ChartDataPoint[] {
  // Initialize all buckets with 0
  const bucketMap = new Map<string, number>()
  buckets.forEach(date => {
    const key = getBucketKey(date, period)
    bucketMap.set(key, 0)
  })

  // Aggregate purchases into buckets
  purchases.forEach(purchase => {
    const { purchaseDate, totalAmount = 0 } = purchase
    if (!purchaseDate) return

    const date = new Date(purchaseDate)
    const key = getBucketKey(date, period)

    if (bucketMap.has(key)) {
      bucketMap.set(key, (bucketMap.get(key) || 0) + totalAmount)
    }
  })

  // Convert back to array
  return buckets.map(date => ({
    date,
    amount: bucketMap.get(getBucketKey(date, period)) || 0
  }))
}

/**
 * Gets the bucket key for a date based on period.
 */
function getBucketKey(date: Date, period: Period): string {
  const normalizers = {
    daily: startOfDay,
    weekly: (d: Date) => startOfWeek(d, { weekStartsOn: 1 }), // Monday start
    monthly: startOfMonth
  }

  return normalizers[period](date).toISOString()
}
