<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { interviewApi } from '../api/interview'
import { historyApi } from '../api/history'
import InterviewConfigPanel from '../components/InterviewConfigPanel.vue'
import InterviewChatPanel from '../components/InterviewChatPanel.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import type { InterviewQuestion, InterviewSession } from '../types/interview'

type InterviewStage = 'config' | 'interview'

interface Message {
  type: 'interviewer' | 'user'
  content: string
  category?: string
  questionIndex?: number
}

const props = defineProps<{
  resumeId: number
}>()

const route = useRoute()
const router = useRouter()

const resumeText = ref('')
const loading = ref(true)

const stage = ref<InterviewStage>('config')
const questionCount = ref(8)
const session = ref<InterviewSession | null>(null)
const currentQuestion = ref<InterviewQuestion | null>(null)
const messages = ref<Message[]>([])
const answer = ref('')
const isSubmitting = ref(false)
const error = ref('')
const isCreating = ref(false)
const checkingUnfinished = ref(false)
const unfinishedSession = ref<InterviewSession | null>(null)
const showCompleteConfirm = ref(false)
const forceCreateNew = ref(false)

async function loadResumeText() {
  const stateText = (route as any).state?.resumeText || (history.state as any)?.resumeText
  if (stateText) {
    resumeText.value = stateText
    loading.value = false
    return
  }
  try {
    const resume = await historyApi.getResumeDetail(props.resumeId)
    resumeText.value = resume.resumeText
  } catch (err) {
    console.error('获取简历文本失败', err)
  } finally {
    loading.value = false
  }
}

async function checkUnfinishedSession() {
  checkingUnfinished.value = true
  try {
    const foundSession = await interviewApi.findUnfinishedSession(props.resumeId)
    if (foundSession) {
      unfinishedSession.value = foundSession
    }
  } catch (err) {
    console.error('检查未完成面试失败', err)
  } finally {
    checkingUnfinished.value = false
  }
}

function restoreSession(sessionToRestore: InterviewSession) {
  session.value = sessionToRestore
  const currentQ = sessionToRestore.questions[sessionToRestore.currentQuestionIndex]
  if (currentQ) {
    currentQuestion.value = currentQ
    if (currentQ.userAnswer) {
      answer.value = currentQ.userAnswer
    }
    const restoredMessages: Message[] = []
    for (let i = 0; i <= sessionToRestore.currentQuestionIndex; i++) {
      const q = sessionToRestore.questions[i]
      restoredMessages.push({
        type: 'interviewer',
        content: q.question,
        category: q.category,
        questionIndex: i,
      })
      if (q.userAnswer) {
        restoredMessages.push({ type: 'user', content: q.userAnswer })
      }
    }
    messages.value = restoredMessages
  }
  stage.value = 'interview'
}

function handleContinueUnfinished() {
  if (!unfinishedSession.value) return
  forceCreateNew.value = false
  restoreSession(unfinishedSession.value)
  unfinishedSession.value = null
}

function handleStartNew() {
  unfinishedSession.value = null
  forceCreateNew.value = true
}

async function startInterview() {
  isCreating.value = true
  error.value = ''
  try {
    const newSession = await interviewApi.createSession({
      resumeText: resumeText.value,
      questionCount: questionCount.value,
      resumeId: props.resumeId,
      forceCreate: forceCreateNew.value,
    })
    forceCreateNew.value = false

    const hasProgress =
      newSession.currentQuestionIndex > 0 ||
      newSession.questions.some((q) => q.userAnswer) ||
      newSession.status === 'IN_PROGRESS'

    if (hasProgress) {
      restoreSession(newSession)
    } else {
      session.value = newSession
      if (newSession.questions.length > 0) {
        const firstQuestion = newSession.questions[0]
        currentQuestion.value = firstQuestion
        messages.value = [
          {
            type: 'interviewer',
            content: firstQuestion.question,
            category: firstQuestion.category,
            questionIndex: 0,
          },
        ]
      }
      stage.value = 'interview'
    }
  } catch (err) {
    error.value = '创建面试失败，请重试'
    console.error(err)
    forceCreateNew.value = false
  } finally {
    isCreating.value = false
  }
}

async function handleSubmitAnswer() {
  if (!answer.value.trim() || !session.value || !currentQuestion.value) return
  isSubmitting.value = true

  messages.value.push({ type: 'user', content: answer.value })

  try {
    const response = await interviewApi.submitAnswer({
      sessionId: session.value.sessionId,
      questionIndex: currentQuestion.value.questionIndex,
      answer: answer.value.trim(),
    })

    answer.value = ''

    if (response.hasNextQuestion && response.nextQuestion) {
      currentQuestion.value = response.nextQuestion
      messages.value.push({
        type: 'interviewer',
        content: response.nextQuestion!.question,
        category: response.nextQuestion!.category,
        questionIndex: response.nextQuestion!.questionIndex,
      })
    } else {
      router.push('/interviews')
    }
  } catch (err) {
    error.value = '提交答案失败，请重试'
    console.error(err)
  } finally {
    isSubmitting.value = false
  }
}

async function handleCompleteEarly() {
  if (!session.value) return
  isSubmitting.value = true
  try {
    await interviewApi.completeInterview(session.value.sessionId)
    showCompleteConfirm.value = false
    router.push('/interviews')
  } catch (err) {
    error.value = '提前交卷失败，请重试'
    console.error(err)
  } finally {
    isSubmitting.value = false
  }
}

function handleBack() {
  router.push(`/history/${props.resumeId}`)
}

onMounted(async () => {
  await loadResumeText()
  checkUnfinishedSession()
})

watch(() => props.resumeId, () => {
  checkUnfinishedSession()
})

const stageSubtitles: Record<InterviewStage, string> = {
  config: '配置您的面试参数',
  interview: '认真回答每个问题，展示您的实力',
}
</script>

<template>
  <div v-if="loading" class="flex items-center justify-center min-h-screen">
    <div class="text-center">
      <div class="w-10 h-10 border-3 border-slate-200 border-t-primary-500 rounded-full mx-auto mb-4 animate-spin" />
      <p class="text-slate-500">加载中...</p>
    </div>
  </div>

  <div v-else class="pb-10">
    <!-- 页面头部 -->
    <div class="text-center mb-10">
      <h1 class="text-3xl font-bold text-slate-900 dark:text-white mb-2 flex items-center justify-center gap-3">
        <div class="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
          <svg class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <line x1="8" y1="23" x2="16" y2="23" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        模拟面试
      </h1>
      <p class="text-slate-500 dark:text-slate-400">{{ stageSubtitles[stage] }}</p>
    </div>

    <Transition name="stage" mode="out-in">
      <div v-if="stage === 'config'" key="config">
        <InterviewConfigPanel
          :question-count="questionCount"
          :is-creating="isCreating"
          :checking-unfinished="checkingUnfinished"
          :unfinished-session="unfinishedSession"
          :resume-text="resumeText"
          :error="error"
          @update:question-count="questionCount = $event"
          @start="startInterview"
          @continue-unfinished="handleContinueUnfinished"
          @start-new="handleStartNew"
          @back="handleBack"
        />
      </div>
      <div v-else-if="stage === 'interview' && session && currentQuestion" key="interview">
        <InterviewChatPanel
          :session="session"
          :current-question="currentQuestion"
          :messages="messages"
          :answer="answer"
          :is-submitting="isSubmitting"
          :show-complete-confirm="showCompleteConfirm"
          @update:answer="answer = $event"
          @submit="handleSubmitAnswer"
          @complete-early="handleCompleteEarly"
          @update:show-complete-confirm="showCompleteConfirm = $event"
        />
      </div>
    </Transition>

    <!-- 提前交卷确认对话框 -->
    <ConfirmDialog
      :open="showCompleteConfirm"
      title="提前交卷"
      message="确定要提前交卷吗？未回答的问题将按0分计算。"
      confirm-text="确定交卷"
      cancel-text="取消"
      confirm-variant="warning"
      :loading="isSubmitting"
      @confirm="handleCompleteEarly"
      @cancel="showCompleteConfirm = false"
    />
  </div>
</template>

<style scoped>
.stage-enter-active,
.stage-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.stage-enter-from {
  opacity: 0;
  transform: translateY(20px);
}
.stage-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}
</style>
