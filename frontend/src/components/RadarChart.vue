<script setup lang="ts">
import { computed, ref } from 'vue'
import { Radar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js'
import { normalizeScore } from '../utils/score'

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

const props = withDefaults(defineProps<{
  data: Array<{ subject: string; score: number; fullMark: number }>
  height?: number
  className?: string
}>(), {
  height: 320,
  className: '',
})

const chartRef = ref()

const isDark = typeof window !== 'undefined' && document.documentElement.classList.contains('dark')

const gridColor = isDark ? '#334155' : '#e2e8f0'
const tickColor = isDark ? '#94a3b8' : '#64748b'

const chartData = computed(() => {
  if (!props.data || props.data.length === 0) return { labels: [], datasets: [] }

  const maxFullMark = Math.max(...props.data.map((item) => item.fullMark))

  const labels = props.data.map((item) => item.subject)
  const scores = props.data.map((item) => normalizeScore(item.score, item.fullMark, maxFullMark))

  return {
    labels,
    datasets: [
      {
        label: '得分',
        data: scores,
        backgroundColor: 'rgba(99, 102, 241, 0.6)',
        borderColor: '#6366f1',
        borderWidth: 2,
        pointBackgroundColor: '#6366f1',
      },
    ],
  }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    r: {
      beginAtZero: true,
      max: (() => {
        if (!props.data || props.data.length === 0) return 40
        const maxFullMark = Math.max(...props.data.map((item) => item.fullMark))
        const normalizedScores = props.data.map((item) =>
          normalizeScore(item.score, item.fullMark, maxFullMark),
        )
        return Math.max(maxFullMark, ...normalizedScores)
      })(),
      grid: {
        color: gridColor,
      },
      angleLines: {
        color: gridColor,
      },
      pointLabels: {
        color: tickColor,
        font: { size: 12 } as any,
      },
      ticks: {
        color: tickColor,
        font: { size: 10 },
        backdropColor: 'transparent',
        stepSize: 10,
      },
    },
  },
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      backgroundColor: isDark ? '#1e293b' : '#fff',
      titleColor: isDark ? '#f1f5f9' : '#1e293b',
      bodyColor: isDark ? '#cbd5e1' : '#475569',
      borderColor: isDark ? '#334155' : '#e2e8f0',
      borderWidth: 1,
      cornerRadius: 12,
      callbacks: {
        label: (context: any) => {
          const index = context.dataIndex
          const item = props.data[index]
          if (!item) return ''
          const percentage =
            item.fullMark > 0 ? Math.round((item.score / item.fullMark) * 100) : 0
          return `${item.score}/${item.fullMark} (${percentage}%)`
        },
      },
    },
  },
}))
</script>

<template>
  <div :class="className" :style="{ height: `${height}px` }">
    <Radar ref="chartRef" :data="chartData" :options="chartOptions" />
  </div>
</template>
