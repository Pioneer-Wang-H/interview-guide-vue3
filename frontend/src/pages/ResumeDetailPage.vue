<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { historyApi } from '../api/history'
import type { InterviewDetail, ResumeDetail } from '../api/history'
import AnalysisPanel from '../components/AnalysisPanel.vue'
import InterviewPanel from '../components/InterviewPanel.vue'
import InterviewDetailPanel from '../components/InterviewDetailPanel.vue'
import { formatDateOnly } from '../utils/date'
import { CheckSquare, ChevronLeft, Clock, Download, MessageSquare, Mic } from 'lucide-vue-next'

type TabType = 'analysis' | 'interview'
type DetailViewType = 'list' | 'interviewDetail'

const props = defineProps<{
  resumeId: number
}>()

const router = useRouter()

const resume = ref<ResumeDetail | null>(null)
const loading = ref(true)
const activeTab = ref<TabType>('analysis')
const exporting = ref<string | null>(null)
const detailView = ref<DetailViewType>('list')
const selectedInterview = ref<InterviewDetail | null>(null)
const loadingInterview = ref(false)
const reanalyzing = ref(false)

let pollingTimer: ReturnType<typeof setInterval> | null = null

async function loadResumeDetailSilent() {
  try {
    const data = await historyApi.getResumeDetail(props.resumeId)
    resume.value = data
  } catch (err) {
    console.error('加载简历详情失败', err)
  }
}

async function loadResumeDetail() {
  loading.value = true
  try {
    const data = await historyApi.getResumeDetail(props.resumeId)
    resume.value = data
  } catch (err) {
    console.error('加载简历详情失败', err)
  } finally {
    loading.value = false
  }
}

function startPolling() {
  stopPolling()
  pollingTimer = setInterval(loadResumeDetailSilent, 5000)
}

function stopPolling() {
  if (pollingTimer) {
    clearInterval(pollingTimer)
    pollingTimer = null
  }
}

onMounted(async () => {
  await loadResumeDetail()
})

watch(resume, (val) => {
  if (!val || loading.value) return
  const isProcessing =
    val.analyzeStatus === 'PENDING' ||
    val.analyzeStatus === 'PROCESSING' ||
    (val.analyzeStatus === undefined && (!val.analyses || val.analyses.length === 0))
  if (isProcessing) {
    startPolling()
  } else {
    stopPolling()
  }
})

onBeforeUnmount(() => stopPolling())

// 自动打开面试详情（从面试记录页跳转过来）
onMounted(() => {
  const viewInterview = (history.state as any)?.viewInterview
  if (viewInterview && resume.value) {
    activeTab.value = 'interview'
    loadAndViewInterview(viewInterview)
  }
})

async function loadAndViewInterview(sessionId: string) {
  loadingInterview.value = true
  try {
    const detail = await historyApi.getInterviewDetail(sessionId)
    selectedInterview.value = detail
    detailView.value = 'interviewDetail'
  } catch (err) {
    console.error('加载面试详情失败', err)
  } finally {
    loadingInterview.value = false
  }
}

async function handleReanalyze() {
  reanalyzing.value = true
  try {
    await historyApi.reanalyze(props.resumeId)
    await loadResumeDetailSilent()
  } catch (err) {
    console.error('重新分析失败', err)
  } finally {
    reanalyzing.value = false
  }
}

async function handleExportAnalysisPdf() {
  exporting.value = 'analysis'
  try {
    const blob = await historyApi.exportAnalysisPdf(props.resumeId)
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `简历分析报告_${resume.value?.filename || props.resumeId}.pdf`
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

async function handleExportInterviewPdf(sessionId: string) {
  exporting.value = sessionId
  try {
    const blob = await historyApi.exportInterviewPdf(sessionId)
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `面试报告_${sessionId}.pdf`
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

async function handleViewInterview(sessionId: string) {
  await loadAndViewInterview(sessionId)
}

function handleBackToInterviewList() {
  detailView.value = 'list'
  selectedInterview.value = null
}

async function handleDeleteInterview(sessionId: string) {
  await loadResumeDetail()
  if (selectedInterview.value?.sessionId === sessionId) {
    detailView.value = 'list'
    selectedInterview.value = null
  }
}

function handleTabChange(tab: TabType) {
  activeTab.value = tab
  detailView.value = 'list'
  selectedInterview.value = null
}

function handleStartInterview() {
  if (!resume.value) return
  router.push({ path: `/interview/${props.resumeId}`, state: { resumeText: resume.value.resumeText } })
}

function handleBack() {
  router.push('/history')
}

const latestAnalysis = computed(() => resume.value?.analyses?.[0])

const tabs = computed(() => [
  { id: 'analysis' as const, label: '简历分析', icon: CheckSquare },
  {
    id: 'interview' as const,
    label: '面试记录',
    icon: MessageSquare,
    count: resume.value?.interviews?.length || 0,
  },
])
</script>

<template>
  <!-- 加载态 -->
  <div v-if="loading" class="flex items-center justify-center h-96">
    <div class="w-12 h-12 border-4 border-slate-200 dark:border-slate-600 border-t-primary-500 rounded-full animate-spin" />
  </div>

  <!-- 错误态 -->
  <div v-else-if="!resume" class="text-center py-20">
    <p class="text-red-500 mb-4">加载失败，请返回重试</p>
    <button class="px-6 py-2 bg-primary-500 text-white rounded-lg" @click="handleBack">返回列表</button>
  </div>

  <!-- 内容 -->
  <div v-else class="w-full">
    <!-- 顶部导航栏 -->
    <div class="flex justify-between items-center mb-8 flex-wrap gap-4">
      <div class="flex items-center gap-4">
        <button
          class="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-300 transition-all shadow-sm"
          @click="detailView === 'interviewDetail' ? handleBackToInterviewList() : handleBack()"
        >
          <ChevronLeft class="w-5 h-5" />
        </button>
        <div>
          <h2 class="text-xl font-bold text-slate-900 dark:text-white">
            {{ detailView === 'interviewDetail' ? `面试详情 #${selectedInterview?.sessionId?.slice(-6) || ''}` : resume.filename }}
          </h2>
          <p class="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Clock class="w-4 h-4" />
            {{ detailView === 'interviewDetail'
              ? `完成于 ${formatDateOnly(selectedInterview?.completedAt || selectedInterview?.createdAt || '')}`
              : `上传于 ${formatDateOnly(resume.uploadedAt)}`
            }}
          </p>
        </div>
      </div>

      <div class="flex gap-3">
        <!-- 面试详情中的导出按钮 -->
        <template v-if="detailView === 'interviewDetail' && selectedInterview">
          <button
            :disabled="exporting === selectedInterview.sessionId"
            class="px-5 py-2.5 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 transition-all disabled:opacity-50 flex items-center gap-2"
            @click="handleExportInterviewPdf(selectedInterview.sessionId)"
          >
            <Download class="w-4 h-4" />
            {{ exporting === selectedInterview.sessionId ? '导出中...' : '导出 PDF' }}
          </button>
        </template>
        <!-- 主视图中的开始面试按钮 -->
        <template v-else>
          <button
            class="px-5 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-medium shadow-lg shadow-primary-500/30 hover:shadow-xl transition-all flex items-center gap-2"
            @click="handleStartInterview"
          >
            <Mic class="w-4 h-4" />
            开始模拟面试
          </button>
        </template>
      </div>
    </div>

    <!-- 标签页切换 -->
    <div v-if="detailView !== 'interviewDetail'" class="bg-white dark:bg-slate-800 rounded-2xl p-2 mb-6 inline-flex gap-1">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :class="[
          'relative px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-colors',
          activeTab === tab.id
            ? 'text-primary-600 dark:text-primary-400'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
        ]"
        @click="handleTabChange(tab.id)"
      >
        <div
          v-if="activeTab === tab.id"
          class="absolute inset-0 bg-primary-50 dark:bg-primary-900 rounded-xl"
        />
        <span class="relative z-10 flex items-center gap-2">
          <component :is="tab.icon" class="w-5 h-5" />
          {{ tab.label }}
          <span
            v-if="tab.count !== undefined && tab.count > 0"
            class="px-2 py-0.5 bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400 text-xs rounded-full"
          >
            {{ tab.count }}
          </span>
        </span>
      </button>
    </div>

    <!-- 内容区域 -->
    <div>
      <template v-if="detailView === 'interviewDetail' && selectedInterview">
        <InterviewDetailPanel :interview="selectedInterview" />
      </template>
      <Transition name="tab-slide" mode="out-in">
        <AnalysisPanel
          v-if="activeTab === 'analysis'"
          key="analysis"
          :analysis="latestAnalysis"
          :analyze-status="resume.analyzeStatus"
          :analyze-error="resume.analyzeError"
          :exporting="exporting === 'analysis'"
          :reanalyzing="reanalyzing"
          @export="handleExportAnalysisPdf"
          @reanalyze="handleReanalyze"
        />
        <InterviewPanel
          v-else
          key="interview"
          :interviews="resume.interviews || []"
          :exporting="exporting"
          :loading-interview="loadingInterview"
          @start-interview="handleStartInterview"
          @view-interview="handleViewInterview"
          @export-interview="handleExportInterviewPdf"
          @delete-interview="handleDeleteInterview"
        />
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.tab-slide-enter-active,
.tab-slide-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.tab-slide-enter-from {
  opacity: 0;
  transform: translateX(30px);
}
.tab-slide-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}
</style>
