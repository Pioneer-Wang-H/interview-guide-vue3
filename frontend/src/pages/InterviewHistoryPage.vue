<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  AlertCircle, CheckCircle, ChevronRight, Clock, Download,
  FileText, Loader2, PlayCircle, RefreshCw, Search,
  Trash2, TrendingUp, Users,
} from 'lucide-vue-next'
import { historyApi } from '../api/history'
import type { EvaluateStatus, InterviewItem } from '../api/history'
import { formatDate } from '../utils/date'
import DeleteConfirmDialog from '../components/DeleteConfirmDialog.vue'

interface InterviewWithResume extends InterviewItem {
  resumeId: number
  resumeFilename: string
  evaluateStatus?: EvaluateStatus
  evaluateError?: string
}

interface InterviewStats {
  totalCount: number
  completedCount: number
  averageScore: number
}

const router = useRouter()

const interviews = ref<InterviewWithResume[]>([])
const stats = ref<InterviewStats | null>(null)
const loading = ref(true)
const searchTerm = ref('')
const deletingSessionId = ref<string | null>(null)
const deleteItem = ref<InterviewWithResume | null>(null)
const exporting = ref<string | null>(null)
let pollingTimer: ReturnType<typeof setInterval> | null = null

function isCompletedStatus(status: string): boolean {
  return status === 'COMPLETED' || status === 'EVALUATED'
}

function isEvaluateCompleted(interview: InterviewWithResume): boolean {
  if (interview.evaluateStatus === 'COMPLETED') return true
  if (interview.status === 'EVALUATED') return true
  return false
}

function isEvaluating(interview: InterviewWithResume): boolean {
  return interview.evaluateStatus === 'PENDING' || interview.evaluateStatus === 'PROCESSING'
}

function isEvaluateFailed(interview: InterviewWithResume): boolean {
  return interview.evaluateStatus === 'FAILED'
}

function getStatusText(interview: InterviewWithResume): string {
  if (isEvaluateFailed(interview)) return '评估失败'
  if (isEvaluating(interview)) return interview.evaluateStatus === 'PROCESSING' ? '评估中' : '等待评估'
  if (isEvaluateCompleted(interview)) return '已完成'
  if (interview.status === 'IN_PROGRESS') return '进行中'
  if (isCompletedStatus(interview.status)) return '已提交'
  return '已创建'
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'bg-green-500'
  if (score >= 60) return 'bg-yellow-500'
  return 'bg-red-500'
}

async function loadAllInterviews(isPolling = false) {
  if (!isPolling) loading.value = true
  try {
    const resumes = await historyApi.getResumes()
    const allInterviews: InterviewWithResume[] = []

    for (const resume of resumes) {
      const detail = await historyApi.getResumeDetail(resume.id)
      if (detail.interviews && detail.interviews.length > 0) {
        detail.interviews.forEach((interview) => {
          allInterviews.push({
            ...interview,
            resumeId: resume.id,
            resumeFilename: resume.filename,
          })
        })
      }
    }

    allInterviews.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )

    interviews.value = allInterviews

    const evaluated = allInterviews.filter((i) => isEvaluateCompleted(i))
    const totalScore = evaluated.reduce((sum, i) => sum + (i.overallScore || 0), 0)
    stats.value = {
      totalCount: allInterviews.length,
      completedCount: evaluated.length,
      averageScore: evaluated.length > 0 ? Math.round(totalScore / evaluated.length) : 0,
    }
  } catch (err) {
    console.error('加载面试记录失败', err)
  } finally {
    if (!isPolling) loading.value = false
  }
}

function startPollingIfNeeded() {
  const hasEvaluating = interviews.value.some((i) => isEvaluating(i))
  if (hasEvaluating) {
    if (!pollingTimer) {
      pollingTimer = setInterval(() => loadAllInterviews(true), 3000)
    }
  } else {
    stopPolling()
  }
}

function stopPolling() {
  if (pollingTimer) {
    clearInterval(pollingTimer)
    pollingTimer = null
  }
}

onMounted(async () => {
  await loadAllInterviews()
  startPollingIfNeeded()
})

watch(
  () => interviews.value.map((i) => i.evaluateStatus),
  () => startPollingIfNeeded(),
)

onBeforeUnmount(() => stopPolling())

const filteredInterviews = computed(() =>
  interviews.value.filter((i) =>
    i.resumeFilename.toLowerCase().includes(searchTerm.value.toLowerCase()),
  ),
)

async function handleDeleteConfirm() {
  if (!deleteItem.value) return
  deletingSessionId.value = deleteItem.value.sessionId
  try {
    await historyApi.deleteInterview(deleteItem.value.sessionId)
    await loadAllInterviews()
    deleteItem.value = null
  } catch (err) {
    alert(err instanceof Error ? err.message : '删除失败，请稍后重试')
  } finally {
    deletingSessionId.value = null
  }
}

async function handleExport(sessionId: string, e: MouseEvent) {
  e.stopPropagation()
  exporting.value = sessionId
  try {
    const blob = await historyApi.exportInterviewPdf(sessionId)
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `面试报告_${sessionId.slice(-8)}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  } catch (err) {
    alert('导出失败，请重试')
  } finally {
    exporting.value = null
  }
}

function handleViewInterview(sessionId: string, resumeId?: number) {
  if (resumeId) {
    router.push({ path: `/history/${resumeId}`, state: { viewInterview: sessionId } })
  } else {
    router.push('/history')
  }
}
</script>

<template>
  <div class="w-full">
    <!-- 头部 -->
    <div class="flex justify-between items-start mb-8 flex-wrap gap-6">
      <div>
        <h1 class="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
          <Users class="w-7 h-7 text-primary-500" />
          面试记录
        </h1>
        <p class="text-slate-500 dark:text-slate-400 mt-1">查看和管理所有模拟面试记录</p>
      </div>

      <div class="flex items-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 min-w-[280px] focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-100 dark:focus-within:ring-primary-900/30 transition-all">
        <Search class="w-5 h-5 text-slate-400" />
        <input
          v-model="searchTerm"
          type="text"
          placeholder="搜索简历名称..."
          class="flex-1 outline-none text-slate-700 dark:text-slate-200 placeholder:text-slate-400 bg-transparent"
        />
      </div>
    </div>

    <!-- 统计卡片 -->
    <div v-if="stats" class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div class="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
        <div class="flex items-center gap-4">
          <div class="p-3 rounded-lg bg-primary-500">
            <Users class="w-6 h-6 text-white" />
          </div>
          <div>
            <p class="text-sm text-slate-500 dark:text-slate-400">面试总数</p>
            <p class="text-2xl font-bold text-slate-800 dark:text-white">{{ stats.totalCount }}</p>
          </div>
        </div>
      </div>
      <div class="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
        <div class="flex items-center gap-4">
          <div class="p-3 rounded-lg bg-emerald-500">
            <CheckCircle class="w-6 h-6 text-white" />
          </div>
          <div>
            <p class="text-sm text-slate-500 dark:text-slate-400">已完成</p>
            <p class="text-2xl font-bold text-slate-800 dark:text-white">{{ stats.completedCount }}</p>
          </div>
        </div>
      </div>
      <div class="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
        <div class="flex items-center gap-4">
          <div class="p-3 rounded-lg bg-indigo-500">
            <TrendingUp class="w-6 h-6 text-white" />
          </div>
          <div>
            <p class="text-sm text-slate-500 dark:text-slate-400">平均分数</p>
            <p class="text-2xl font-bold text-slate-800 dark:text-white">{{ stats.averageScore }}<span class="text-base font-normal text-slate-400 dark:text-slate-500 ml-1">分</span></p>
          </div>
        </div>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <Loader2 class="w-8 h-8 text-primary-500 animate-spin" />
    </div>

    <!-- 空状态 -->
    <div
      v-else-if="filteredInterviews.length === 0"
      class="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700"
    >
      <Users class="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
      <h3 class="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">暂无面试记录</h3>
      <p class="text-slate-500 dark:text-slate-400">开始一次模拟面试后，记录将显示在这里</p>
    </div>

    <!-- 表格 -->
    <div
      v-else
      class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden"
    >
      <table class="w-full">
        <thead class="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-600">
          <tr>
            <th class="text-left px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-300">关联简历</th>
            <th class="text-left px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-300">题目数</th>
            <th class="text-left px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-300">状态</th>
            <th class="text-left px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-300">得分</th>
            <th class="text-left px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-300">创建时间</th>
            <th class="text-right px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-300">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="interview in filteredInterviews"
            :key="interview.sessionId"
            class="border-b border-slate-50 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors group"
            @click="handleViewInterview(interview.sessionId, interview.resumeId)"
          >
            <td class="px-6 py-4">
              <div class="flex items-center gap-3">
                <FileText class="w-5 h-5 text-slate-400" />
                <div>
                  <p class="font-medium text-slate-800 dark:text-white">{{ interview.resumeFilename }}</p>
                  <p class="text-xs text-slate-400 dark:text-slate-500">#{{ interview.sessionId.slice(-8) }}</p>
                </div>
              </div>
            </td>
            <td class="px-6 py-4">
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-sm">
                {{ interview.totalQuestions }} 题
              </span>
            </td>
            <td class="px-6 py-4">
              <div class="flex items-center gap-2">
                <AlertCircle v-if="isEvaluateFailed(interview)" class="w-4 h-4 text-red-500 dark:text-red-400" />
                <RefreshCw v-else-if="isEvaluating(interview)" class="w-4 h-4 text-blue-500 dark:text-blue-400 animate-spin" />
                <CheckCircle v-else-if="isEvaluateCompleted(interview)" class="w-4 h-4 text-green-500 dark:text-green-400" />
                <PlayCircle v-else-if="interview.status === 'IN_PROGRESS'" class="w-4 h-4 text-blue-500 dark:text-blue-400" />
                <Clock v-else class="w-4 h-4 text-yellow-500 dark:text-yellow-400" />
                <span class="text-sm text-slate-600 dark:text-slate-300">{{ getStatusText(interview) }}</span>
              </div>
            </td>
            <td class="px-6 py-4">
              <template v-if="isEvaluateCompleted(interview) && interview.overallScore !== null">
                <div class="flex items-center gap-3">
                  <div class="w-16 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      :class="['h-full rounded-full', getScoreColor(interview.overallScore)]"
                      :style="{ width: `${interview.overallScore}%`, transition: 'width 0.8s ease' }"
                    />
                  </div>
                  <span class="font-bold text-slate-800 dark:text-white">{{ interview.overallScore }}</span>
                </div>
              </template>
              <span v-else-if="isEvaluating(interview)" class="text-blue-500 dark:text-blue-400 text-sm">生成中...</span>
              <span v-else-if="isEvaluateFailed(interview)" class="text-red-500 dark:text-red-400 text-sm" :title="interview.evaluateError">失败</span>
              <span v-else class="text-slate-400 dark:text-slate-500">-</span>
            </td>
            <td class="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{{ formatDate(interview.createdAt) }}</td>
            <td class="px-6 py-4 text-right">
              <div class="flex items-center justify-end gap-1">
                <button
                  v-if="isEvaluateCompleted(interview)"
                  :disabled="exporting === interview.sessionId"
                  class="p-2 text-slate-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg transition-colors disabled:opacity-50"
                  title="导出PDF"
                  @click="handleExport(interview.sessionId, $event)"
                >
                  <Loader2 v-if="exporting === interview.sessionId" class="w-4 h-4 animate-spin" />
                  <Download v-else class="w-4 h-4" />
                </button>
                <button
                  :disabled="deletingSessionId === interview.sessionId"
                  class="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50"
                  title="删除"
                  @click="(e: MouseEvent) => { e.stopPropagation(); deleteItem = interview }"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
                <ChevronRight class="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 删除确认对话框 -->
    <DeleteConfirmDialog
      :open="deleteItem !== null"
      :item="deleteItem ? { id: deleteItem.id, sessionId: deleteItem.sessionId } : null"
      item-type="面试记录"
      :loading="deletingSessionId !== null"
      @confirm="handleDeleteConfirm"
      @cancel="deleteItem = null"
    />
  </div>
</template>
