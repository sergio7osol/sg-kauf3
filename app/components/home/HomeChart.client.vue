<script setup lang="ts">
import {
  format,
  sub,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  differenceInCalendarDays,
  addDays,
  eachMonthOfInterval,
  addYears,
  startOfDay
} from 'date-fns';
import { VisXYContainer, VisLine, VisAxis, VisArea, VisCrosshair, VisTooltip } from '@unovis/vue';
import { usePurchaseChart, fetchPurchaseDateRange, type ChartDataPoint } from '~/composables/usePurchaseChart';
import type { ComponentPublicInstance } from 'vue';
import type { Period, Range } from '~/types';

const cardRef = useTemplateRef<HTMLElement | null>('cardRef');

const props = defineProps<{
  period: Period
  range: Range
}>();

const emit = defineEmits<{
  'update:range': [range: Range]
}>();

type DataRecord = ChartDataPoint;

// Quick period presets
interface PeriodPreset {
  label: string
  key: string
  getRange: () => Promise<Range> | Range
}

const isLoadingAllTime = ref(false);

const periodPresets: PeriodPreset[] = [
  {
    label: 'Week',
    key: '1w',
    // Full ISO week (Monday to Sunday)
    getRange: () => ({
      start: startOfWeek(new Date(), { weekStartsOn: 1 }),
      end: endOfWeek(new Date(), { weekStartsOn: 1 })
    })
  },
  {
    label: 'Month',
    key: '1m',
    // Full calendar month (1st to last day)
    getRange: () => ({
      start: startOfMonth(new Date()),
      end: endOfMonth(new Date())
    })
  },
  {
    label: '3 Months',
    key: '3m',
    // 3 complete calendar months (current month + 2 previous)
    getRange: () => ({
      start: startOfMonth(sub(new Date(), { months: 2 })),
      end: endOfMonth(new Date())
    })
  },
  {
    label: '6 Months',
    key: '6m',
    // 6 complete calendar months (current month + 5 previous)
    getRange: () => ({
      start: startOfMonth(sub(new Date(), { months: 5 })),
      end: endOfMonth(new Date())
    })
  },
  {
    label: 'Year',
    key: '1y',
    // Full calendar year (Jan 1 to Dec 31)
    getRange: () => ({
      start: startOfYear(new Date()),
      end: endOfYear(new Date())
    })
  },
  {
    label: 'All',
    key: 'all',
    getRange: async () => {
      isLoadingAllTime.value = true;
      try {
        const dateRange = await fetchPurchaseDateRange();
        if (dateRange?.earliestDate && dateRange?.latestDate) {
          return {
            start: new Date(dateRange.earliestDate),
            end: new Date(dateRange.latestDate)
          };
        }
      } finally {
        isLoadingAllTime.value = false;
      }
      // Fallback to current year if no data
      return { start: startOfYear(new Date()), end: endOfYear(new Date()) };
    }
  }
];

// Track which preset is currently active
const activePreset = ref<string>('1m'); // Default to 1 month

async function selectPreset(preset: PeriodPreset) {
  activePreset.value = preset.key;
  const newRange = await preset.getRange();
  emit('update:range', newRange);
}

const { width } = useElementSize(cardRef);

const { chartData, total, isLoading, error, fetchChartData } = usePurchaseChart();

// Watch for period/range changes and fetch real data
watch(
  [() => props.period, () => props.range],
  async () => {
    await fetchChartData(props.period, props.range);
  },
  { immediate: true }
);

const data = computed(() => chartData.value);

const tickConfig = computed(() => {
  const config = generateTickConfig(props.range);
  const dateIndexMap = new Map<string, number>();
  data.value.forEach((record: DataRecord, index: number) => {
    dateIndexMap.set(normalizeDateKey(record.date), index);
  });

  const ticks: number[] = [];
  const labels = new Map<number, string>();

  config.dates.forEach((date) => {
    const key = normalizeDateKey(date);
    const index = dateIndexMap.get(key);
    if (index !== undefined) {
      ticks.push(index);
      labels.set(index, formatTickLabel(date, config.resolution));
    }
  });

  const uniqueTicks = new Set<number>(ticks);
  const dataLength = data.value.length;

  // Special handling: full calendar month should show grid lines for ALL days,
  // but only labels for the 1st, every 5th day (5, 10, 15, ...), and the last day
  if (dataLength >= 2 && isFullMonthRange(props.range)) {
    uniqueTicks.clear();
    labels.clear();

    // Add ALL day indices for grid lines
    for (let i = 0; i < dataLength; i++) {
      uniqueTicks.add(i);
    }

    // Only add labels for the 1st, every 5th day (5, 10, 15, ...), and the last day
    for (let i = 0; i < dataLength; i++) {
      const point = data.value[i];
      if (!point) {
        continue;
      }

      const dayOfMonth = point.date.getDate();
      const isFirstDay = i === 0;
      const isLastDay = i === dataLength - 1;
      const isEveryFifthDay = dayOfMonth % 5 === 0;

      if (isFirstDay || isEveryFifthDay || isLastDay) {
        labels.set(i, formatTickLabel(point.date, 'day'));
      }
    }
  } else if (dataLength > 2 && uniqueTicks.size <= 2) {
    const fallbackCount = Math.min(
      dataLength,
      Math.max(3, Math.min(7, Math.round(dataLength / 10) + 2))
    );

    if (fallbackCount > uniqueTicks.size) {
      const step = (dataLength - 1) / (fallbackCount - 1);
      const desiredResolution = config.resolution === 'week' ? 'day' : config.resolution;

      for (let i = 0; i < fallbackCount; i++) {
        const index = Math.round(i * step);
        if (!uniqueTicks.has(index)) {
          uniqueTicks.add(index);
          const point = data.value[index];
          if (point) {
            labels.set(index, formatTickLabel(point.date, desiredResolution));
          }
        }
      }
    }
  }

  const sortedTicks = Array.from(uniqueTicks).sort((a, b) => a - b);
  const majorTickIndices = new Set(labels.keys());

  return { ticks: sortedTicks, labels, majorTickIndices };
});

const axisTickValues = computed(() => tickConfig.value.ticks);

watch([axisTickValues, () => width.value], async () => {
  await nextTick();
  applyAxisTickStyles();
});

onMounted(() => {
  nextTick(applyAxisTickStyles);
});

const x = (_: DataRecord, i: number) => i;
const y = (d: DataRecord) => d.amount / 100; // Convert cents to euros for display

// Format currency in EUR
const formatNumber = (value: number) => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2
  }).format(value / 100); // Convert cents to euros
};

const formatDate = (date: Date): string => {
  return ({
    daily: format(date, 'd MMM'),
    weekly: format(date, 'd MMM'),
    monthly: format(date, 'MMM yyy')
  })[props.period];
};

const xTicks = (i: number) => {
  const record = data.value[i];
  if (!record) {
    return '';
  }

  return tickConfig.value.labels.get(i) ?? '';
};

const template = (d: DataRecord) => `${formatDate(d.date)}: ${formatNumber(d.amount)}`;

function resolveCardElement(): HTMLElement | null {
  const target = cardRef.value;
  if (!target) {
    return null;
  }

  if (target instanceof HTMLElement) {
    return target;
  }

  return (target as ComponentPublicInstance).$el ?? null;
}

function applyAxisTickStyles() {
  const cardEl = resolveCardElement();
  if (!cardEl) {
    return;
  }

  const axisEl = cardEl.querySelector('.vis-axis.vis-axis-x');
  if (!axisEl) {
    return;
  }

  const majorTickIndices = tickConfig.value.majorTickIndices;
  const tickElements = axisEl.querySelectorAll<SVGGElement>('.vis-axis-tick');
  tickElements.forEach((tickEl, idx) => {
    tickEl.classList.remove('axis-tick--major', 'axis-tick--minor');
    const tickIndex = axisTickValues.value[idx];
    if (tickIndex === undefined) {
      return;
    }

    const isMajor = majorTickIndices.has(tickIndex);
    tickEl.classList.add(isMajor ? 'axis-tick--major' : 'axis-tick--minor');
  });
}

// Check if a preset matches the current range (approximately)
function isPresetActive(presetKey: string): boolean {
  return activePreset.value === presetKey;
}

type TickResolution = 'day' | 'week' | 'month' | 'year';

interface TickConfig {
  dates: Date[]
  resolution: TickResolution
  majorTickIndices: Set<number>
}

function generateTickConfig(range: Range): TickConfig {
  const start = startOfDay(range.start);
  const end = startOfDay(range.end);
  const totalDays = differenceInCalendarDays(end, start) + 1;

  if (totalDays <= 8) {
    return {
      dates: generateDailyTicks(start, end),
      resolution: 'day',
      majorTickIndices: new Set<number>()
    };
  }

  if (totalDays <= 40) {
    return {
      dates: generateWeeklyTicks(start, end),
      resolution: 'week',
      majorTickIndices: new Set<number>()
    };
  }

  if (totalDays <= 400) {
    return {
      dates: eachMonthOfInterval({ start, end }).map(date => startOfMonth(date)),
      resolution: 'month',
      majorTickIndices: new Set<number>()
    };
  }

  return {
    dates: generateYearlyTicks(start, end),
    resolution: 'year',
    majorTickIndices: new Set<number>()
  };
}

function generateDailyTicks(start: Date, end: Date): Date[] {
  const days = differenceInCalendarDays(end, start) + 1;
  return Array.from({ length: days }, (_, index) => addDays(start, index));
}

function generateWeeklyTicks(start: Date, end: Date): Date[] {
  const ticks: Date[] = [];
  let pointer = start;

  while (pointer <= end) {
    ticks.push(pointer);
    pointer = addDays(pointer, 7);
  }

  const lastTick = ticks[ticks.length - 1];
  if (ticks.length === 0 || !lastTick || lastTick.getTime() !== end.getTime()) {
    ticks.push(end);
  }

  return ticks;
}

function generateYearlyTicks(start: Date, end: Date): Date[] {
  const ticks: Date[] = [];
  let pointer = startOfYear(start);

  while (pointer <= end) {
    ticks.push(pointer);
    pointer = addYears(pointer, 1);
  }

  return ticks;
}

function normalizeDateKey(date: Date): string {
  return startOfDay(date).toISOString();
}

function formatTickLabel(date: Date, resolution: TickResolution): string {
  switch (resolution) {
    case 'day':
      return format(date, 'd MMM');
    case 'week':
      return format(date, 'd MMM');
    case 'month':
      return format(date, 'MMM');
    case 'year':
    default:
      return format(date, 'MMM yyyy');
  }
}

/**
 * Check if the range represents a full calendar month (1st to last day of same month)
 */
function isFullMonthRange(range: Range): boolean {
  const start = startOfDay(range.start);
  const end = startOfDay(range.end);

  // Check if start is the 1st of month and end is last day of same month
  const isFirstOfMonth = start.getDate() === 1;
  const expectedEnd = endOfMonth(start);
  const isLastOfMonth = end.getTime() === startOfDay(expectedEnd).getTime();

  return isFirstOfMonth && isLastOfMonth;
}
</script>

<template>
  <UCard
    ref="cardRef"
    :ui="{ root: 'overflow-visible', body: '!px-0 !pt-0 !pb-3' }"
  >
    <template #header>
      <div class="flex items-center justify-between gap-4">
        <div>
          <p class="text-xs text-muted uppercase mb-1.5">
            Total Spending
          </p>
          <p
            class="text-3xl font-semibold"
            :class="{ 'animate-pulse': isLoading }"
          >
            {{ formatNumber(total) }}
          </p>
        </div>

        <div class="flex items-center gap-2">
          <div class="flex items-center rounded-lg border border-default bg-elevated/50 p-0.5">
            <button
              v-for="preset in periodPresets"
              :key="preset.key"
              type="button"
              class="px-2.5 py-1 text-xs font-medium rounded-md transition-colors"
              :class="[
                isPresetActive(preset.key)
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted hover:text-default hover:bg-elevated'
              ]"
              :disabled="isLoading || isLoadingAllTime"
              @click="selectPreset(preset)"
            >
              <span
                v-if="preset.key === 'all' && isLoadingAllTime"
                class="flex items-center gap-1"
              >
                <UIcon
                  name="i-lucide-loader-2"
                  class="w-3 h-3 animate-spin"
                />
              </span>
              <span v-else>{{ preset.label }}</span>
            </button>
          </div>

          <div
            v-if="isLoading && !isLoadingAllTime"
            class="flex items-center gap-2 text-sm text-muted"
          >
            <UIcon
              name="i-lucide-loader-2"
              class="animate-spin"
            />
          </div>
        </div>
      </div>
    </template>

    <div
      v-if="error"
      class="h-96 flex items-center justify-center"
    >
      <UAlert
        color="error"
        variant="soft"
        icon="i-lucide-alert-circle"
        title="Error"
        :description="error"
      />
    </div>

    <!-- Empty State -->
    <div
      v-else-if="!isLoading && data.length === 0"
      class="h-96 flex items-center justify-center"
    >
      <div class="text-center text-muted">
        <UIcon
          name="i-lucide-bar-chart-3"
          class="w-12 h-12 mb-2 opacity-50"
        />
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
        :tick-values="axisTickValues"
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
