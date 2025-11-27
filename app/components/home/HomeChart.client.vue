<script setup lang="ts">
import { format } from 'date-fns'
import { VisXYContainer, VisLine, VisAxis, VisArea, VisCrosshair, VisTooltip } from '@unovis/vue'
import type { Period, Range } from '~/types'
import { usePurchaseChart, type ChartDataPoint } from '~/composables/usePurchaseChart'

const cardRef = useTemplateRef<HTMLElement | null>('cardRef')

const props = defineProps<{
  period: Period
  range: Range
}>()

type DataRecord = ChartDataPoint

const { width } = useElementSize(cardRef)

const { chartData, total, isLoading, error, fetchChartData } = usePurchaseChart()

// Watch for period/range changes and fetch real data
watch(
  [() => props.period, () => props.range],
  async () => {
    await fetchChartData(props.period, props.range)
  },
  { immediate: true }
)

const data = computed(() => chartData.value)

const x = (_: DataRecord, i: number) => i
const y = (d: DataRecord) => d.amount / 100 // Convert cents to euros for display

// Format currency in EUR
const formatNumber = (value: number) => {
  return new Intl.NumberFormat('de-DE', { 
    style: 'currency', 
    currency: 'EUR', 
    maximumFractionDigits: 2 
  }).format(value / 100) // Convert cents to euros
}

const formatDate = (date: Date): string => {
  return ({
    daily: format(date, 'd MMM'),
    weekly: format(date, 'd MMM'),
    monthly: format(date, 'MMM yyy')
  })[props.period]
}

const xTicks = (i: number) => {
  const dataArray = data.value
  if (i === 0 || i === dataArray.length - 1 || !dataArray[i]) {
    return ''
  }

  return formatDate(dataArray[i].date)
}

const template = (d: DataRecord) => `${formatDate(d.date)}: ${formatNumber(d.amount)}`
</script>

<template>
  <UCard ref="cardRef" :ui="{ root: 'overflow-visible', body: '!px-0 !pt-0 !pb-3' }">
    <template #header>
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs text-muted uppercase mb-1.5">
            Total Spending
          </p>
          <p class="text-3xl text-highlighted font-semibold" :class="{ 'animate-pulse': isLoading }">
            {{ formatNumber(total) }}
          </p>
        </div>
        <div v-if="isLoading" class="flex items-center gap-2 text-sm text-muted">
          <UIcon name="i-lucide-loader-2" class="animate-spin" />
          Loading...
        </div>
      </div>
    </template>

    <!-- Error State -->
    <div v-if="error" class="h-96 flex items-center justify-center">
      <UAlert
        color="error"
        variant="soft"
        icon="i-lucide-alert-circle"
        title="Error"
        :description="error"
      />
    </div>

    <!-- Empty State -->
    <div v-else-if="!isLoading && data.length === 0" class="h-96 flex items-center justify-center">
      <div class="text-center text-muted">
        <UIcon name="i-lucide-bar-chart-3" class="w-12 h-12 mb-2 opacity-50" />
        <p>No purchase data for this period</p>
      </div>
    </div>

    <!-- Chart -->
    <VisXYContainer
      v-else
      :data="data"
      :padding="{ top: 40 }"
      class="h-96"
      :width="width"
    >
      <VisLine
        :x="x"
        :y="y"
        color="var(--ui-primary)"
      />
      <VisArea
        :x="x"
        :y="y"
        color="var(--ui-primary)"
        :opacity="0.1"
      />

      <VisAxis
        type="x"
        :x="x"
        :tick-format="xTicks"
      />

      <VisCrosshair
        color="var(--ui-primary)"
        :template="template"
      />

      <VisTooltip />
    </VisXYContainer>
  </UCard>
</template>

<style scoped>
.unovis-xy-container {
  --vis-crosshair-line-stroke-color: var(--ui-primary);
  --vis-crosshair-circle-stroke-color: var(--ui-bg);

  --vis-axis-grid-color: var(--ui-border);
  --vis-axis-tick-color: var(--ui-border);
  --vis-axis-tick-label-color: var(--ui-text-dimmed);

  --vis-tooltip-background-color: var(--ui-bg);
  --vis-tooltip-border-color: var(--ui-border);
  --vis-tooltip-text-color: var(--ui-text-highlighted);
}
</style>
