<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { Send, User } from 'lucide-vue-next'
import type { InterviewQuestion, InterviewSession } from '../types/interview'

interface Message {
  type: 'interviewer' | 'user'
  content: string
  category?: string
  questionIndex?: number
}

const props = defineProps<{
  session: InterviewSession
  currentQuestion: InterviewQuestion | null
  messages: Message[]
  answer: string
  isSubmitting: boolean
  showCompleteConfirm: boolean
}>()

const emit = defineEmits<{
  'update:answer': [value: string]
  submit: []
  completeEarly: []
  'update:showCompleteConfirm': [value: boolean]
}>()

const chatContainerRef = ref<HTMLElement>()

const progress = computed(() => {
  if (!props.session || !props.currentQuestion) return 0
  return ((props.currentQuestion.questionIndex + 1) / props.session.totalQuestions) * 100
})

function scrollToBottom() {
  nextTick(() => {
    if (chatContainerRef.value) {
      chatContainerRef.value.scrollTop = chatContainerRef.value.scrollHeight
    }
  })
}

watch(
  () => props.messages.length,
  () => scrollToBottom(),
)

function handleKeyPress(e: KeyboardEvent) {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
    emit('submit')
  }
}
</script>

<template>
  <div class="flex flex-col h-[calc(100vh-200px)] max-w-4xl mx-auto">
    <!-- 进度条 -->
    <div class="bg-white dark:bg-slate-800 rounded-2xl p-6 mb-4 shadow-sm dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-700">
      <div class="flex items-center justify-between mb-3">
        <span class="text-sm font-semibold text-slate-700 dark:text-slate-300">
          题目 {{ currentQuestion ? currentQuestion.questionIndex + 1 : 0 }} / {{ session.totalQuestions }}
        </span>
        <span class="text-sm text-slate-500 dark:text-slate-400">{{ Math.round(progress) }}%</span>
      </div>
      <div class="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          class="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full"
          :style="{ width: `${progress}%`, transition: 'width 0.3s ease' }"
        />
      </div>
    </div>

    <!-- 聊天区域 -->
    <div class="flex-1 bg-white dark:bg-slate-800 rounded-2xl shadow-sm dark:shadow-slate-900/50 overflow-hidden flex flex-col min-h-0 border border-slate-100 dark:border-slate-700">
      <div
        ref="chatContainerRef"
        class="flex-1 overflow-y-auto"
      >
        <div
          v-for="(msg, idx) in messages"
          :key="idx"
          class="pb-4 px-6"
          :class="{ 'pt-6': idx === 0 }"
        >
          <!-- 面试官消息 -->
          <div v-if="msg.type === 'interviewer'" class="flex items-start gap-3">
            <div class="w-8 h-8 bg-primary-100 dark:bg-primary-900/50 rounded-full flex items-center justify-center flex-shrink-0">
              <User class="w-4 h-4 text-primary-600 dark:text-primary-400" />
            </div>
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-sm font-semibold text-slate-700 dark:text-slate-300">面试官</span>
                <span
                  v-if="msg.category"
                  class="px-2 py-0.5 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-xs rounded-full"
                >
                  {{ msg.category }}
                </span>
              </div>
              <div class="bg-slate-100 dark:bg-slate-700 rounded-2xl rounded-tl-none p-4 text-slate-800 dark:text-slate-200 leading-relaxed">
                {{ msg.content }}
              </div>
            </div>
          </div>

          <!-- 用户消息 -->
          <div v-else class="flex items-start gap-3 justify-end">
            <div class="flex-1 max-w-[80%]">
              <div class="bg-primary-500 text-white rounded-2xl rounded-tr-none p-4 leading-relaxed">
                {{ msg.content }}
              </div>
            </div>
            <div class="w-8 h-8 bg-slate-200 dark:bg-slate-600 rounded-full flex items-center justify-center flex-shrink-0">
              <svg class="w-4 h-4 text-slate-600 dark:text-slate-300" viewBox="0 0 24 24" fill="none">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- 输入区域 -->
      <div class="border-t border-slate-200 dark:border-slate-600 p-4 bg-slate-50 dark:bg-slate-700/50">
        <div class="flex gap-3">
          <textarea
            :value="answer"
            :disabled="isSubmitting"
            class="flex-1 px-4 py-3 border border-slate-300 dark:border-slate-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
            rows="3"
            placeholder="输入你的回答... (Ctrl/Cmd + Enter 提交)"
            @input="emit('update:answer', ($event.target as HTMLTextAreaElement).value)"
            @keydown="handleKeyPress"
          />
          <div class="flex flex-col gap-2">
            <button
              :disabled="!answer.trim() || isSubmitting"
              class="px-6 py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              @click="emit('submit')"
            >
              <template v-if="isSubmitting">
                <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                提交中
              </template>
              <template v-else>
                <Send class="w-4 h-4" />
                提交
              </template>
            </button>
            <button
              :disabled="isSubmitting"
              class="px-6 py-3 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-medium hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              @click="emit('update:showCompleteConfirm', true)"
            >
              提前交卷
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
