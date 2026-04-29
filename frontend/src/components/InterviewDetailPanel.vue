<script setup lang="ts">
import { computed, reactive } from 'vue'
import type { InterviewDetail } from '../api/history'

const props = defineProps<{
  interview: InterviewDetail
}>()

const allIndices = new Set<number>()
if (props.interview.answers) {
  props.interview.answers.forEach((_, idx) => allIndices.add(idx))
}
const expandedQuestions = reactive(new Set(allIndices))

function toggleQuestion(index: number) {
  if (expandedQuestions.has(index)) {
    expandedQuestions.delete(index)
  } else {
    expandedQuestions.add(index)
  }
}

const circumference = 2 * Math.PI * 54
const scorePercent = computed(() =>
  props.interview.overallScore !== null ? (props.interview.overallScore / 100) * 100 : 0,
)
const strokeDashoffset = computed(() => {
  const percent = scorePercent.value
  return circumference - (percent / 100) * circumference
})

function scoreColor(score: number): string {
  if (score >= 80) return 'text-green-600 dark:text-green-400'
  if (score >= 60) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-red-600 dark:text-red-400'
}
</script>

<template>
  <div class="space-y-6">
    <!-- 评分卡片 -->
    <div class="bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 rounded-2xl p-8 text-white">
      <div class="flex flex-col items-center text-center">
        <div class="relative w-32 h-32 mb-6">
          <svg class="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r="54"
              stroke="rgba(255,255,255,0.2)"
              stroke-width="8"
              fill="none"
            />
            <circle
              cx="60"
              cy="60"
              r="54"
              stroke="white"
              stroke-width="8"
              fill="none"
              stroke-linecap="round"
              :stroke-dasharray="circumference"
              :stroke-dashoffset="strokeDashoffset"
              style="transition: stroke-dashoffset 1.5s ease-out"
            />
          </svg>
          <div class="absolute inset-0 flex flex-col items-center justify-center">
            <span class="text-4xl font-bold">{{ interview.overallScore ?? '-' }}</span>
            <span class="text-sm text-white/70">总分</span>
          </div>
        </div>

        <h3 class="text-2xl font-bold mb-3">面试评估</h3>
        <p class="text-white/90 max-w-2xl leading-relaxed">
          {{ interview.overallFeedback || '表现良好，展示了扎实的技术基础。' }}
        </p>
      </div>
    </div>

    <!-- 表现优势 -->
    <div
      v-if="interview.strengths && interview.strengths.length > 0"
      class="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm"
    >
      <h4 class="font-semibold text-emerald-600 dark:text-emerald-400 mb-4 flex items-center gap-2">
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <polyline points="22,4 12,14.01 9,11.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        表现优势
      </h4>
      <ul class="space-y-3">
        <li v-for="(s, i) in interview.strengths" :key="i" class="text-slate-700 dark:text-slate-300 flex items-start gap-3">
          <span class="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0" />
          <span>{{ s }}</span>
        </li>
      </ul>
    </div>

    <!-- 改进建议 -->
    <div
      v-if="interview.improvements && interview.improvements.length > 0"
      class="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm"
    >
      <h4 class="font-semibold text-amber-600 dark:text-amber-400 mb-4 flex items-center gap-2">
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
          <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        改进建议
      </h4>
      <ul class="space-y-3">
        <li v-for="(s, i) in interview.improvements" :key="i" class="text-slate-700 dark:text-slate-300 flex items-start gap-3">
          <span class="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0" />
          <span>{{ s }}</span>
        </li>
      </ul>
    </div>

    <!-- 问答记录详情 -->
    <div>
      <h4 class="font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
        <svg class="w-5 h-5 text-primary-500" viewBox="0 0 24 24" fill="none">
          <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        问答记录详情
      </h4>

      <div class="space-y-4">
        <div
          v-for="(answer, idx) in (interview.answers || [])"
          :key="idx"
          class="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden"
        >
          <!-- 问题头部 -->
          <div
            class="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            @click="toggleQuestion(idx)"
          >
            <div class="flex items-center gap-3">
              <span class="w-8 h-8 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg flex items-center justify-center text-sm font-semibold">
                {{ answer.questionIndex + 1 }}
              </span>
              <span class="px-3 py-1 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-xs font-medium rounded-full">
                {{ answer.category || '综合' }}
              </span>
              <span :class="['font-semibold', scoreColor(answer.score)]">
                得分: {{ answer.score }}
              </span>
            </div>
            <svg
              class="w-5 h-5 text-slate-400 transition-transform duration-200"
              :class="{ 'rotate-180': expandedQuestions.has(idx) }"
              viewBox="0 0 24 24"
              fill="none"
            >
              <polyline points="6,9 12,15 18,9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>

          <!-- 问题内容 -->
          <div class="px-5 pb-2">
            <p class="text-slate-800 dark:text-white font-medium leading-relaxed">{{ answer.question }}</p>
          </div>

          <!-- 展开内容 -->
          <Transition name="expand">
            <div v-if="expandedQuestions.has(idx)" class="overflow-hidden">
              <div class="px-5 pb-5 space-y-4">
                <div class="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
                  <p class="text-sm text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1">
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    你的回答
                  </p>
                  <p :class="[
                    'leading-relaxed',
                    (!answer.userAnswer || answer.userAnswer === '不知道')
                      ? 'text-red-500 font-medium'
                      : 'text-slate-700 dark:text-slate-300'
                  ]">
                    "{{ answer.userAnswer || '(未回答)' }}"
                  </p>
                </div>

                <div v-if="answer.feedback">
                  <p class="text-sm text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-2 font-medium">
                    <svg class="w-4 h-4 text-primary-500" viewBox="0 0 24 24" fill="none">
                      <path d="M3 3V21H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      <path d="M18 9L12 15L9 12L3 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    AI 深度评价
                  </p>
                  <p class="text-slate-700 dark:text-slate-300 leading-relaxed pl-6">{{ answer.feedback }}</p>
                </div>

                <div v-if="answer.referenceAnswer" class="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 border border-slate-100 dark:border-slate-600">
                  <p class="text-sm text-slate-600 dark:text-slate-400 mb-3 flex items-center gap-2 font-medium">
                    <svg class="w-4 h-4 text-primary-500" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
                      <path d="M9 12H15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                      <path d="M12 9V15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    参考答案
                  </p>
                  <div class="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">{{ answer.referenceAnswer }}</div>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.expand-enter-active,
.expand-leave-active {
  transition: height 0.3s ease, opacity 0.3s ease;
  overflow: hidden;
}
.expand-enter-from,
.expand-leave-to {
  height: 0;
  opacity: 0;
}
</style>
