<script setup lang="ts">
import { computed, ref } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { formatDateOnly } from '../utils/date'
import { getScoreColor } from '../utils/score'
import type { InterviewItem } from '../api/history'
import { historyApi } from '../api/history'
import { Calendar, ChevronRight, Download, MessageSquare, Mic, Trash2, TrendingUp } from 'lucide-vue-next'
import ConfirmDialog from './ConfirmDialog.vue'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const props = defineProps<{
  interviews: InterviewItem[]
  exporting: string | null
  loadingInterview: boolean
}>()

const emit = defineEmits<{
  startInterview: []
  viewInterview: [sessionId: string]
  exportInterview: [sessionId: string]
  deleteInterview: [sessionId: string]
}>()

const deletingSessionId = ref<string | null>(null)
const deleteConfirm = ref<{ sessionId: string } | null>(null)

const isDark = typeof window !== 'undefined' && document.documentElement.classList.contains('dark')

const chartData = computed(() => {
  const filtered = props.interviews
    .filter((i) => i.overallScore !== null)
    .map((interview) => ({
      name: formatDateOnly(interview.createdAt),
      score: interview.overallScore || 0,
    }))
    .reverse()
  return {
    labels: filtered.map((d) => d.name),
    datasets: [
      {
        label: '得分',
        data: filtered.map((d) => d.score),
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        borderWidth: 3,
        pointBackgroundColor: '#6366f1',
        pointBorderColor: '#6366f1',
        pointRadius: 5,
        pointHoverRadius: 8,
        fill: true,
        tension: 0.3,
      },
    ],
  }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: {
      min: 0,
      max: 100,
      grid: { color: isDark ? '#334155' : '#e2e8f0' },
      ticks: { color: '#94a3b8', font: { size: 12 } },
    },
    x: {
      grid: { display: false },
      ticks: { color: '#94a3b8', font: { size: 12 } },
    },
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: isDark ? '#1e293b' : '#fff',
      titleColor: isDark ? '#f1f5f9' : '#1e293b',
      bodyColor: isDark ? '#cbd5e1' : '#475569',
      borderColor: isDark ? '#334155' : '#e2e8f0',
      borderWidth: 1,
      cornerRadius: 12,
      callbacks: {
        label: (ctx: any) => `${ctx.raw} 分`,
      },
    },
  },
}))

function handleDeleteClick(sessionId: string, e: MouseEvent) {
  e.stopPropagation()
  deleteConfirm.value = { sessionId }
}

async function handleDeleteConfirm() {
  if (!deleteConfirm.value) return
  const { sessionId } = deleteConfirm.value
  deletingSessionId.value = sessionId
  try {
    await historyApi.deleteInterview(sessionId)
    emit('deleteInterview', sessionId)
    deleteConfirm.value = null
  } catch (err) {
    alert(err instanceof Error ? err.message : '删除失败，请稍后重试')
  } finally {
    deletingSessionId.value = null
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- 空状态 -->
    <div v-if="interviews.length === 0" class="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center">
      <div class="w-16 h-16 mx-auto mb-6 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
        <Mic class="w-8 h-8 text-slate-400" />
      </div>
      <h3 class="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">暂无面试记录</h3>
      <p class="text-slate-500 dark:text-slate-400 mb-6">开始模拟面试，获取专业评估</p>
      <button
        class="px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-medium shadow-lg shadow-primary-500/30"
        @click="emit('startInterview')"
      >
        开始模拟面试
      </button>
    </div>

    <template v-else>
      <!-- 面试表现趋势图 -->
      <div v-if="chartData.labels.length > 0" class="bg-white dark:bg-slate-800 rounded-2xl p-6">
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center gap-2">
            <TrendingUp class="w-5 h-5 text-primary-500" />
            <span class="font-semibold text-slate-800 dark:text-white">面试表现趋势</span>
          </div>
          <span class="text-sm text-slate-500 dark:text-slate-400">共 {{ chartData.labels.length }} 场练习</span>
        </div>

        <div class="h-48">
          <Line :data="chartData" :options="chartOptions" />
        </div>
      </div>

      <!-- 历史面试场次 -->
      <div class="bg-white dark:bg-slate-800 rounded-2xl p-6">
        <div class="flex items-center justify-between mb-6">
          <span class="font-semibold text-slate-800 dark:text-white">历史面试场次</span>
        </div>

        <div class="space-y-4">
          <div
            v-for="(interview, index) in interviews"
            :key="interview.id"
            class="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors group"
            @click="emit('viewInterview', interview.sessionId)"
          >
            <!-- 得分 -->
            <div :class="[
              'w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg',
              interview.overallScore !== null
                ? getScoreColor(interview.overallScore, [85, 70])
                : 'bg-slate-100 dark:bg-slate-600 text-slate-400'
            ]">
              {{ interview.overallScore ?? '-' }}
            </div>

            <!-- 信息 -->
            <div class="flex-1 min-w-0">
              <p class="font-medium text-slate-800 dark:text-white truncate">
                模拟面试 #{{ interviews.length - index }}
              </p>
              <div class="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                <span class="flex items-center gap-1">
                  <Calendar class="w-4 h-4" />
                  {{ formatDateOnly(interview.createdAt) }}
                </span>
                <span class="flex items-center gap-1">
                  <MessageSquare class="w-4 h-4" />
                  {{ interview.totalQuestions }} 题
                </span>
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100">
              <button
                :disabled="exporting === interview.sessionId"
                class="px-3 py-2 text-slate-400 hover:text-primary-500 hover:bg-white dark:hover:bg-slate-600 rounded-lg transition-all"
                title="导出"
                @click.stop="emit('exportInterview', interview.sessionId)"
              >
                <Download class="w-5 h-5" />
              </button>
              <button
                :disabled="deletingSessionId === interview.sessionId"
                class="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="删除面试记录"
                @click="handleDeleteClick(interview.sessionId, $event)"
              >
                <div
                  v-if="deletingSessionId === interview.sessionId"
                  class="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin"
                />
                <Trash2 v-else class="w-5 h-5" />
              </button>
            </div>

            <ChevronRight class="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-primary-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
          </div>
        </div>

        <!-- 删除确认对话框 -->
        <ConfirmDialog
          :open="deleteConfirm !== null"
          title="删除面试记录"
          message="确定要删除这条面试记录吗？删除后无法恢复。"
          confirm-text="确定删除"
          cancel-text="取消"
          confirm-variant="danger"
          :loading="deletingSessionId !== null"
          @confirm="handleDeleteConfirm"
          @cancel="deleteConfirm = null"
        />

        <!-- 加载覆盖层 -->
        <Teleport to="body">
          <div v-if="loadingInterview" class="fixed inset-0 bg-black/20 dark:bg-black/50 flex items-center justify-center z-50">
            <div class="bg-white dark:bg-slate-800 rounded-2xl p-6 flex items-center gap-4">
              <div class="w-8 h-8 border-3 border-slate-200 dark:border-slate-600 border-t-primary-500 rounded-full animate-spin" />
              <span class="text-slate-600 dark:text-slate-300">加载面试详情...</span>
            </div>
          </div>
        </Teleport>
      </div>
    </template>
  </div>
</template>
