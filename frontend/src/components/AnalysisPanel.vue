<script setup lang="ts">
import { computed } from 'vue'
import RadarChart from './RadarChart.vue'
import ScoreProgressBar from './ScoreProgressBar.vue'
import { formatDateTime } from '../utils/date'
import { AlertCircle, CheckCircle2, Clock, Download, Loader2, RefreshCw, Target, TrendingUp } from 'lucide-vue-next'
import type { AnalyzeStatus } from '../api/history'

const props = defineProps<{
  analysis: any
  analyzeStatus?: AnalyzeStatus
  analyzeError?: string
  exporting: boolean
  reanalyzing?: boolean
}>()

const emit = defineEmits<{
  export: []
  reanalyze: []
}>()

const radarData = computed(() => {
  if (!props.analysis) return []

  const projectScore = props.analysis.projectScore || 0
  const skillMatchScore = props.analysis.skillMatchScore || 0
  const contentScore = props.analysis.contentScore || 0
  const structureScore = props.analysis.structureScore || 0
  const expressionScore = props.analysis.expressionScore || 0

  return [
    { subject: '表达专业性', score: expressionScore, fullMark: 10 },
    { subject: '技能匹配', score: skillMatchScore, fullMark: 20 },
    { subject: '内容完整性', score: contentScore, fullMark: 15 },
    { subject: '结构清晰度', score: structureScore, fullMark: 15 },
    { subject: '项目经验', score: projectScore, fullMark: 40 },
  ]
})

const suggestionsByPriority = computed(() => {
  if (!props.analysis?.suggestions) return { high: [], medium: [], low: [] }
  const suggestions = props.analysis.suggestions
  return {
    high: suggestions.filter((s: any) => s.priority === '高'),
    medium: suggestions.filter((s: any) => s.priority === '中'),
    low: suggestions.filter((s: any) => s.priority === '低'),
  }
})

const hasErrorKeywords = computed(() => {
  const summary = props.analysis?.summary
  return (
    summary &&
    (summary.includes('I/O error') ||
      summary.includes('分析过程中出现错误') ||
      summary.includes('简历分析失败') ||
      summary.includes('Remote host terminated') ||
      summary.includes('handshake'))
  )
})

const isAnalysisValid = computed(
  () =>
    props.analysis &&
    props.analysis.overallScore >= 10 &&
    props.analysis.summary &&
    !hasErrorKeywords.value,
)

const isProcessing = computed(
  () =>
    props.analyzeStatus === 'PENDING' ||
    props.analyzeStatus === 'PROCESSING' ||
    (props.analyzeStatus === undefined && !props.analysis),
)

const isExplicitProcessing = computed(() => props.analyzeStatus === 'PROCESSING')

function getPriorityColor(priority: string) {
  switch (priority) {
    case '高':
      return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
    case '中':
      return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400'
    case '低':
      return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400'
    default:
      return 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
  }
}

function getPriorityBadgeColor(priority: string) {
  switch (priority) {
    case '高': return 'bg-red-500 text-white'
    case '中': return 'bg-amber-500 text-white'
    case '低': return 'bg-blue-500 text-white'
    default: return 'bg-slate-500 text-white'
  }
}

function getCategoryColor(category: string) {
  const colors: Record<string, string> = {
    '项目': 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300',
    '技能': 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300',
    '内容': 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300',
    '格式': 'bg-pink-100 dark:bg-pink-900/50 text-pink-700 dark:text-pink-300',
    '结构': 'bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300',
    '表达': 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300',
  }
  return colors[category] || 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
}

const projectScore = computed(() => props.analysis?.projectScore || 0)
const skillMatchScore = computed(() => props.analysis?.skillMatchScore || 0)
const contentScore = computed(() => props.analysis?.contentScore || 0)
const structureScore = computed(() => props.analysis?.structureScore || 0)
const expressionScore = computed(() => props.analysis?.expressionScore || 0)
</script>

<template>
  <div class="space-y-6">
    <!-- 处理中状态 -->
    <div v-if="isProcessing" class="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center">
      <div class="w-16 h-16 mx-auto mb-6 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center">
        <Loader2 v-if="isExplicitProcessing" class="w-8 h-8 text-blue-500 dark:text-blue-400 animate-spin" />
        <Clock v-else class="w-8 h-8 text-yellow-500 dark:text-yellow-400" />
      </div>
      <h3 class="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
        {{ isExplicitProcessing ? 'AI 正在分析中...' : '等待分析' }}
      </h3>
      <p class="text-slate-500 dark:text-slate-400 mb-4">
        {{ isExplicitProcessing ? '请稍候，AI 正在对您的简历进行深度分析' : '简历已上传成功，即将开始 AI 分析' }}
      </p>
      <p class="text-sm text-slate-400 dark:text-slate-500">页面将自动刷新显示分析结果</p>
    </div>

    <!-- 分析失败状态 -->
    <div v-else-if="analyzeStatus === 'FAILED' || !isAnalysisValid" class="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center">
      <div class="w-16 h-16 mx-auto mb-6 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center">
        <AlertCircle class="w-8 h-8 text-red-500 dark:text-red-400" />
      </div>
      <h3 class="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">分析失败</h3>
      <p class="text-slate-500 dark:text-slate-400 mb-4">AI 服务暂时不可用，请稍后重试</p>
      <div
        v-if="analyzeError || analysis?.summary"
        class="mt-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-left mb-4"
      >
        <p class="text-sm text-red-600 dark:text-red-400">{{ analyzeError || analysis.summary }}</p>
      </div>
      <button
        v-if="emit('reanalyze') !== undefined"
        :disabled="reanalyzing"
        class="px-6 py-2.5 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center gap-2 mx-auto"
        @click="emit('reanalyze')"
      >
        <RefreshCw :class="['w-4 h-4', { 'animate-spin': reanalyzing }]" />
        {{ reanalyzing ? '重新分析中...' : '重新分析' }}
      </button>
    </div>

    <!-- 分析结果 -->
    <template v-else>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- 核心评价 -->
        <div class="bg-white dark:bg-slate-800 rounded-2xl p-6">
          <div class="flex items-center justify-between mb-6">
            <div class="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <TrendingUp class="w-5 h-5" />
              <span class="font-semibold">核心评价</span>
            </div>
            <button
              :disabled="exporting"
              class="px-4 py-2 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-600 transition-all disabled:opacity-50 flex items-center gap-2"
              @click="emit('export')"
            >
              <Download class="w-4 h-4" />
              {{ exporting ? '导出中...' : '导出分析报告' }}
            </button>
          </div>

          <div class="bg-gradient-to-br from-emerald-50 dark:from-emerald-900/30 to-green-50 dark:to-slate-800 rounded-xl p-6">
            <p class="text-lg text-slate-800 dark:text-white leading-relaxed mb-6">
              {{ analysis.summary || '候选人具备扎实的技术基础，有大型项目架构经验。' }}
            </p>

            <div class="grid grid-cols-2 gap-4 mb-4">
              <div class="bg-white dark:bg-slate-800 rounded-xl p-5">
                <span class="text-sm font-semibold text-emerald-600 dark:text-emerald-400 block mb-2">总分</span>
                <span class="text-4xl font-bold text-slate-900 dark:text-white">{{ analysis.overallScore || 0 }}</span>
                <span class="text-sm text-slate-500 dark:text-slate-400">/ 100</span>
              </div>
              <div class="bg-white dark:bg-slate-800 rounded-xl p-5">
                <span class="text-sm font-semibold text-emerald-600 dark:text-emerald-400 block mb-2">分析时间</span>
                <span class="text-sm text-slate-700 dark:text-slate-300">{{ formatDateTime(analysis.analyzedAt) }}</span>
              </div>
            </div>

            <div v-if="analysis.strengths && analysis.strengths.length > 0" class="bg-white dark:bg-slate-800 rounded-xl p-4">
              <span class="text-sm font-semibold text-emerald-600 dark:text-emerald-400 block mb-3">优势亮点</span>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="(s, i) in analysis.strengths"
                  :key="i"
                  class="px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-sm font-medium"
                >
                  {{ s }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- 多维度评分雷达图 -->
        <div class="bg-white dark:bg-slate-800 rounded-2xl p-6">
          <div class="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-6">
            <Target class="w-5 h-5" />
            <span class="font-semibold">多维度评分</span>
          </div>

          <RadarChart :data="radarData" :height="320" />

          <div class="mt-4 grid grid-cols-2 gap-3">
            <ScoreProgressBar label="项目经验" :score="projectScore" :max-score="40" color="bg-purple-500" :delay="0.3" class-name="col-span-2" />
            <ScoreProgressBar label="技能匹配" :score="skillMatchScore" :max-score="20" color="bg-blue-500" :delay="0.4" />
            <ScoreProgressBar label="内容完整性" :score="contentScore" :max-score="15" color="bg-emerald-500" :delay="0.5" />
            <ScoreProgressBar label="结构清晰度" :score="structureScore" :max-score="15" color="bg-cyan-500" :delay="0.6" />
            <ScoreProgressBar label="表达专业性" :score="expressionScore" :max-score="10" color="bg-orange-500" :delay="0.7" />
          </div>
        </div>
      </div>

      <!-- 改进建议 -->
      <div class="bg-white dark:bg-slate-800 rounded-2xl p-6">
        <div class="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-6">
          <CheckCircle2 class="w-5 h-5" />
          <span class="font-semibold">改进建议</span>
          <span class="text-sm text-slate-400 dark:text-slate-500">({{ analysis.suggestions?.length || 0 }} 条)</span>
        </div>

        <div class="space-y-6">
          <template v-for="priority in ['高', '中', '低']" :key="priority">
            <div v-if="suggestionsByPriority[priority === '高' ? 'high' : priority === '中' ? 'medium' : 'low'].length > 0">
              <div class="flex items-center gap-2 mb-4">
                <span
                  :class="[
                    'px-3 py-1 rounded-full text-sm font-semibold',
                    priority === '高' ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300' :
                    priority === '中' ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300' :
                    'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                  ]"
                >
                  {{ priority }}优先级 ({{ suggestionsByPriority[priority === '高' ? 'high' : priority === '中' ? 'medium' : 'low'].length }})
                </span>
                <div class="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
              </div>
              <div class="space-y-3">
                <div
                  v-for="(s, i) in suggestionsByPriority[priority === '高' ? 'high' : priority === '中' ? 'medium' : 'low']"
                  :key="i"
                  :class="['p-4 rounded-xl border-2', getPriorityColor(priority)]"
                >
                  <div class="flex items-start gap-3 mb-2">
                    <span :class="['px-2 py-0.5 rounded text-xs font-semibold', getPriorityBadgeColor(priority)]">
                      {{ priority }}
                    </span>
                    <span :class="['px-2 py-0.5 rounded text-xs font-medium', getCategoryColor(s.category || '其他')]">
                      {{ s.category || '其他' }}
                    </span>
                  </div>
                  <div class="mb-2">
                    <p class="font-semibold text-slate-900 dark:text-white mb-1">{{ s.issue || '问题描述' }}</p>
                    <p class="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{{ s.recommendation || s }}</p>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <div v-if="analysis.suggestions?.length === 0" class="text-center py-8 text-slate-500 dark:text-slate-400">
            暂无改进建议
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
