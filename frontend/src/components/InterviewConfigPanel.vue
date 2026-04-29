<script setup lang="ts">
import type { InterviewSession } from '../types/interview'

defineProps<{
  questionCount: number
  isCreating: boolean
  checkingUnfinished: boolean
  unfinishedSession: InterviewSession | null
  resumeText: string
  error?: string
}>()

const emit = defineEmits<{
  'update:questionCount': [count: number]
  start: []
  continueUnfinished: []
  startNew: []
  back: []
}>()

const questionCounts = [6, 8, 10, 12, 15]
</script>

<template>
  <div class="max-w-2xl mx-auto">
    <div class="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-sm dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-700">
      <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
        <div class="w-10 h-10 bg-primary-100 dark:bg-primary-900/50 rounded-xl flex items-center justify-center">
          <svg class="w-5 h-5 text-primary-600 dark:text-primary-400" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
            <circle cx="12" cy="12" r="6" stroke="currentColor" stroke-width="2"/>
            <circle cx="12" cy="12" r="2" fill="currentColor"/>
          </svg>
        </div>
        面试配置
      </h2>

      <!-- 未完成面试提示 -->
      <Transition name="slide-fade">
        <div
          v-if="checkingUnfinished"
          class="mb-6 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl text-blue-700 dark:text-blue-400 text-sm text-center"
        >
          <div class="flex items-center justify-center gap-2">
            <div class="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            正在检查是否有未完成的面试...
          </div>
        </div>

        <div
          v-else-if="unfinishedSession"
          class="mb-6 p-5 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 border-2 border-amber-200 dark:border-amber-800 rounded-xl"
        >
          <div class="flex items-start gap-3 mb-4">
            <div class="w-8 h-8 bg-amber-100 dark:bg-amber-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg class="w-5 h-5 text-amber-600 dark:text-amber-400" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div class="flex-1">
              <h3 class="font-semibold text-amber-900 dark:text-amber-300 mb-1">检测到未完成的模拟面试</h3>
              <p class="text-sm text-amber-700 dark:text-amber-400">
                已完成 {{ unfinishedSession.currentQuestionIndex }} / {{ unfinishedSession.totalQuestions }} 题
              </p>
            </div>
          </div>
          <div class="flex gap-3">
            <button
              class="flex-1 px-4 py-2.5 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors"
              @click="emit('continueUnfinished')"
            >
              继续完成
            </button>
            <button
              class="flex-1 px-4 py-2.5 bg-white dark:bg-slate-700 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 rounded-lg font-medium hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors"
              @click="emit('startNew')"
            >
              开始新的
            </button>
          </div>
        </div>
      </Transition>

      <div class="space-y-6">
        <div>
          <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">题目数量</label>
          <div class="grid grid-cols-5 gap-3">
            <button
              v-for="count in questionCounts"
              :key="count"
              :class="[
                'px-4 py-3 rounded-xl font-medium transition-all',
                questionCount === count
                  ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              ]"
              @click="emit('update:questionCount', count)"
            >
              {{ count }}
            </button>
          </div>
        </div>

        <div class="mb-6">
          <label class="block text-sm font-semibold text-slate-600 dark:text-slate-400 mb-3">简历预览（前500字）</label>
          <textarea
            :value="resumeText.substring(0, 500) + (resumeText.length > 500 ? '...' : '')"
            readonly
            class="w-full h-32 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-600 dark:text-slate-400 text-sm resize-none"
          />
        </div>

        <p class="text-sm text-slate-500 dark:text-slate-400 mb-6">
          题目分布：项目经历(20%) + MySQL(20%) + Redis(20%) + Java基础/集合/并发(30%) + Spring(10%)
        </p>

        <Transition name="slide-fade">
          <div
            v-if="error"
            class="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm"
          >
            ⚠️ {{ error }}
          </div>
        </Transition>

        <div class="flex justify-center gap-4">
          <button
            class="px-6 py-3 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
            @click="emit('back')"
          >
            ← 返回
          </button>
          <button
            :disabled="isCreating"
            class="px-8 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-semibold shadow-lg shadow-primary-500/30 hover:shadow-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
            @click="emit('start')"
          >
            <template v-if="isCreating">
              <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              正在生成题目...
            </template>
            <template v-else>
              开始面试 →
            </template>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.slide-fade-enter-from,
.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
