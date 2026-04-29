<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js/lib/core'
import typescript from 'highlight.js/lib/languages/typescript'
import javascript from 'highlight.js/lib/languages/javascript'
import python from 'highlight.js/lib/languages/python'
import java from 'highlight.js/lib/languages/java'
import sql from 'highlight.js/lib/languages/sql'
import xml from 'highlight.js/lib/languages/xml'
import css from 'highlight.js/lib/languages/css'
import bash from 'highlight.js/lib/languages/bash'
import json from 'highlight.js/lib/languages/json'
import yaml from 'highlight.js/lib/languages/yaml'
import markdown from 'highlight.js/lib/languages/markdown'
import { knowledgeBaseApi, type KnowledgeBaseItem, type SortOption } from '../api/knowledgebase'
import { ragChatApi, type RagChatSessionListItem } from '../api/ragChat'
import { formatDateOnly } from '../utils/date'
import DeleteConfirmDialog from '../components/DeleteConfirmDialog.vue'
import {
  ChevronLeft,
  ChevronRight,
  Edit,
  MessageSquare,
  Pin,
  Plus,
  Trash2,
} from 'lucide-vue-next'

hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('python', python)
hljs.registerLanguage('java', java)
hljs.registerLanguage('sql', sql)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('html', xml)
hljs.registerLanguage('css', css)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('json', json)
hljs.registerLanguage('yaml', yaml)
hljs.registerLanguage('markdown', markdown)

const md = new MarkdownIt({
  html: false,
  breaks: true,
  linkify: true,
  highlight(str: string, lang: string): string {
    const language = lang && hljs.getLanguage(lang) ? lang : 'text'
    try {
      return hljs.highlight(str, { language }).value
    } catch {
      return md.utils.escapeHtml(str)
    }
  },
})

const router = useRouter()

interface Message {
  id?: number
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface CategoryGroup {
  name: string
  items: KnowledgeBaseItem[]
  isExpanded: boolean
}

// Knowledge base state
const knowledgeBases = ref<KnowledgeBaseItem[]>([])
const selectedKbIds = ref<Set<number>>(new Set())
const loadingList = ref(true)

// Search and sort
const searchKeyword = ref('')
const sortBy = ref<SortOption>('time')
const expandedCategories = ref<Set<string>>(new Set(['未分类']))

// Right panel
const rightPanelOpen = ref(true)

// Session state
const sessions = ref<RagChatSessionListItem[]>([])
const currentSessionId = ref<number | null>(null)
const currentSessionTitle = ref('')
const loadingSessions = ref(false)
const sessionDeleteConfirm = ref<{ id: number; title: string } | null>(null)
const editingSessionTitle = ref<{ id: number; title: string } | null>(null)
const newSessionTitle = ref('')

// Message state
const question = ref('')
const messages = ref<Message[]>([])
const loading = ref(false)

// Chat scroll
const chatContainerRef = ref<HTMLElement | null>(null)

function scrollToBottom() {
  nextTick(() => {
    const el = chatContainerRef.value
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  })
}

// Load knowledge bases (only COMPLETED ones for query)
async function loadKnowledgeBases() {
  loadingList.value = true
  try {
    const list = await knowledgeBaseApi.getAllKnowledgeBases(sortBy.value, 'COMPLETED')
    knowledgeBases.value = list
  } catch (err) {
    console.error('加载知识库列表失败', err)
  } finally {
    loadingList.value = false
  }
}

async function handleSearch() {
  if (!searchKeyword.value.trim()) {
    loadKnowledgeBases()
    return
  }
  loadingList.value = true
  try {
    const list = await knowledgeBaseApi.search(searchKeyword.value.trim())
    knowledgeBases.value = list
  } catch (err) {
    console.error('搜索知识库失败', err)
  } finally {
    loadingList.value = false
  }
}

const groupedKnowledgeBases = computed((): CategoryGroup[] => {
  const groups: Map<string, KnowledgeBaseItem[]> = new Map()

  knowledgeBases.value.forEach(kb => {
    const category = kb.category || '未分类'
    if (!groups.has(category)) {
      groups.set(category, [])
    }
    groups.get(category)!.push(kb)
  })

  const result: CategoryGroup[] = []
  const sortedCategories = Array.from(groups.keys()).sort((a, b) => {
    if (a === '未分类') return 1
    if (b === '未分类') return -1
    return a.localeCompare(b)
  })

  sortedCategories.forEach(name => {
    result.push({
      name,
      items: groups.get(name)!,
      isExpanded: expandedCategories.value.has(name),
    })
  })

  return result
})

function toggleCategory(category: string) {
  const next = new Set(expandedCategories.value)
  if (next.has(category)) {
    next.delete(category)
  } else {
    next.add(category)
  }
  expandedCategories.value = next
}

async function loadSessions() {
  loadingSessions.value = true
  try {
    const list = await ragChatApi.listSessions()
    sessions.value = list
  } catch (err) {
    console.error('加载会话列表失败', err)
  } finally {
    loadingSessions.value = false
  }
}

function handleToggleKb(kbId: number) {
  const newSet = new Set(selectedKbIds.value)
  if (newSet.has(kbId)) {
    newSet.delete(kbId)
  } else {
    newSet.add(kbId)
  }
  if (newSet.size !== selectedKbIds.value.size && currentSessionId.value) {
    currentSessionId.value = null
    currentSessionTitle.value = ''
    messages.value = []
  }
  selectedKbIds.value = newSet
}

function handleNewSession() {
  currentSessionId.value = null
  currentSessionTitle.value = ''
  messages.value = []
}

async function handleLoadSession(sessionId: number) {
  try {
    const detail = await ragChatApi.getSessionDetail(sessionId)
    currentSessionId.value = detail.id
    currentSessionTitle.value = detail.title
    selectedKbIds.value = new Set(detail.knowledgeBases.map(kb => kb.id))
    messages.value = detail.messages.map(m => ({
      id: m.id,
      type: m.type,
      content: m.content,
      timestamp: new Date(m.createdAt),
    }))
    scrollToBottom()
  } catch (err) {
    console.error('加载会话失败', err)
  }
}

async function handleDeleteSession() {
  if (!sessionDeleteConfirm.value) return
  try {
    await ragChatApi.deleteSession(sessionDeleteConfirm.value.id)
    await loadSessions()
    if (currentSessionId.value === sessionDeleteConfirm.value.id) {
      handleNewSession()
    }
    sessionDeleteConfirm.value = null
  } catch (err) {
    console.error('删除会话失败', err)
  }
}

function handleEditSessionTitle(sessionId: number, currentTitle: string) {
  editingSessionTitle.value = { id: sessionId, title: currentTitle }
  newSessionTitle.value = currentTitle
}

async function handleSaveSessionTitle() {
  if (!editingSessionTitle.value || !newSessionTitle.value.trim()) return
  try {
    await ragChatApi.updateSessionTitle(editingSessionTitle.value.id, newSessionTitle.value.trim())
    await loadSessions()
    if (currentSessionId.value === editingSessionTitle.value.id) {
      currentSessionTitle.value = newSessionTitle.value.trim()
    }
    editingSessionTitle.value = null
    newSessionTitle.value = ''
  } catch (err) {
    console.error('更新会话标题失败', err)
  }
}

async function handleTogglePin(sessionId: number, e: Event) {
  e.stopPropagation()
  try {
    await ragChatApi.togglePin(sessionId)
    await loadSessions()
  } catch (err) {
    console.error('切换置顶状态失败', err)
  }
}

function formatMarkdown(text: string): string {
  if (!text) return ''
  return text
    .replace(/\\n/g, '\n')
    .replace(/^(#{1,6})([^\s#\n])/gm, '$1 $2')
    .replace(/^(\s*)(\d+)\.([^\s\n])/gm, '$1$2. $3')
    .replace(/^(\s*[-*])([^\s\n-])/gm, '$1 $2')
    .replace(/\n{3,}/g, '\n\n')
}

function renderMarkdown(content: string): string {
  return md.render(formatMarkdown(content))
}

async function handleSubmitQuestion() {
  if (!question.value.trim() || selectedKbIds.value.size === 0 || loading.value) return

  const userQuestion = question.value.trim()
  question.value = ''
  loading.value = true

  let sessionId = currentSessionId.value
  if (!sessionId) {
    try {
      const session = await ragChatApi.createSession(Array.from(selectedKbIds.value))
      sessionId = session.id
      currentSessionId.value = sessionId
      currentSessionTitle.value = session.title
    } catch (err) {
      console.error('创建会话失败', err)
      loading.value = false
      return
    }
  }

  const userMessage: Message = {
    type: 'user',
    content: userQuestion,
    timestamp: new Date(),
  }
  messages.value.push(userMessage)

  const assistantMessage: Message = {
    type: 'assistant',
    content: '',
    timestamp: new Date(),
  }
  messages.value.push(assistantMessage)

  const lastIndex = messages.value.length - 1
  let fullContent = ''

  try {
    await ragChatApi.sendMessageStream(
      sessionId,
      userQuestion,
      (chunk: string) => {
        fullContent += chunk
        messages.value[lastIndex] = {
          ...messages.value[lastIndex],
          content: fullContent,
        }
        scrollToBottom()
      },
      () => {
        loading.value = false
        loadSessions()
      },
      (error: Error) => {
        console.error('流式查询失败:', error)
        messages.value[lastIndex] = {
          ...messages.value[lastIndex],
          content: fullContent || error.message || '回答失败，请重试',
        }
        loading.value = false
      }
    )
  } catch (err) {
    console.error('发起流式查询失败:', err)
    messages.value[lastIndex] = {
      ...messages.value[lastIndex],
      content: err instanceof Error ? err.message : '回答失败，请重试',
    }
    loading.value = false
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  if (hours < 24) return `${hours} 小时前`
  if (days < 7) return `${days} 天前`
  return formatDateOnly(dateStr)
}

// Handle keyboard submit
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSubmitQuestion()
  }
}

onMounted(() => {
  loadKnowledgeBases()
  loadSessions()
})

watch(sortBy, () => {
  if (!searchKeyword.value) {
    loadKnowledgeBases()
  }
})
</script>

<template>
  <div class="max-w-7xl mx-auto pt-8 pb-10 px-4">
    <!-- 头部 -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-white mb-1">问答助手</h1>
        <p class="text-slate-500 dark:text-slate-400 text-sm">选择知识库，向 AI 提问</p>
      </div>
      <div class="flex gap-3">
        <button
          class="px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-sm"
          @click="router.push('/knowledge-base/upload')"
        >
          上传知识库
        </button>
        <button
          class="px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-sm"
          @click="router.push('/knowledge-base')"
        >
          返回
        </button>
      </div>
    </div>

    <div class="flex gap-4 h-[calc(100vh-10rem)]">
      <!-- 左侧：对话历史 -->
      <div class="w-64 flex-shrink-0">
        <div class="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm h-full flex flex-col border border-slate-100 dark:border-slate-700">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-base font-semibold text-slate-800 dark:text-white">对话历史</h2>
            <button
              :disabled="selectedKbIds.size === 0"
              class="p-1.5 text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="新建对话"
              @click="handleNewSession"
            >
              <Plus class="w-5 h-5" />
            </button>
          </div>

          <div class="flex-1 overflow-y-auto">
            <div v-if="loadingSessions" class="text-center py-6">
              <div class="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full mx-auto animate-spin" />
            </div>
            <div v-else-if="sessions.length === 0" class="text-center py-6 text-slate-400 dark:text-slate-500 text-sm">
              暂无对话历史
            </div>
            <div v-else class="space-y-2">
              <div
                v-for="session in sessions"
                :key="session.id"
                :class="[
                  'p-3 rounded-lg cursor-pointer transition-all group',
                  currentSessionId === session.id
                    ? 'bg-primary-50 dark:bg-primary-900/30 border border-primary-500'
                    : 'bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 border border-transparent',
                  session.isPinned ? 'border-l-4 border-l-primary-500' : '',
                ]"
                @click="handleLoadSession(session.id)"
              >
                <div class="flex items-start justify-between gap-2">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-1.5">
                      <Pin v-if="session.isPinned" class="w-3.5 h-3.5 text-primary-500 fill-primary-500 flex-shrink-0" />
                      <p class="font-medium text-slate-800 dark:text-white text-sm truncate">{{ session.title }}</p>
                    </div>
                    <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {{ session.messageCount }} 条消息 · {{ formatTimeAgo(session.updatedAt) }}
                    </p>
                  </div>
                  <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      :class="[
                        'p-1 rounded transition-colors',
                        session.isPinned ? 'text-primary-500 hover:text-primary-600' : 'text-slate-400 hover:text-primary-500',
                      ]"
                      :title="session.isPinned ? '取消置顶' : '置顶'"
                      @click="handleTogglePin(session.id, $event)"
                    >
                      <Pin :class="['w-4 h-4', session.isPinned ? 'fill-primary-500' : '']" />
                    </button>
                    <button
                      class="p-1 text-slate-400 hover:text-primary-500 rounded transition-colors"
                      title="编辑标题"
                      @click.stop="handleEditSessionTitle(session.id, session.title)"
                    >
                      <Edit class="w-4 h-4" />
                    </button>
                    <button
                      class="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
                      title="删除"
                      @click.stop="sessionDeleteConfirm = { id: session.id, title: session.title }"
                    >
                      <Trash2 class="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 中间：聊天区域 -->
      <div class="flex-1 min-w-0">
        <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex flex-col h-full border border-slate-100 dark:border-slate-700">
          <template v-if="selectedKbIds.size > 0">
            <!-- 会话信息 -->
            <div class="p-4 border-b border-slate-200 dark:border-slate-600">
              <h2 class="text-base font-semibold text-slate-800 dark:text-white">
                {{ currentSessionTitle || (selectedKbIds.size === 1
                  ? (knowledgeBases.find(kb => kb.id === Array.from(selectedKbIds)[0])?.name || '新对话')
                  : `${selectedKbIds.size} 个知识库 - 新对话`)
                }}
              </h2>
              <div class="flex flex-wrap gap-1.5 mt-2">
                <span
                  v-for="kbId in Array.from(selectedKbIds)"
                  :key="kbId"
                  class="px-2 py-0.5 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-xs rounded-full"
                >
                  {{ knowledgeBases.find(k => k.id === kbId)?.name || '' }}
                </span>
              </div>
            </div>

            <!-- 消息列表 -->
            <div ref="chatContainerRef" class="flex-1 min-h-0 overflow-y-auto dark:bg-slate-800">
              <div v-if="messages.length === 0" class="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500">
                <MessageSquare class="w-12 h-12 mb-3 opacity-50" />
                <p class="text-sm">开始提问吧！</p>
              </div>
              <div v-else class="pb-4">
                <div
                  v-for="(msg, index) in messages"
                  :key="index"
                  class="px-4 first:pt-4"
                >
                  <div :class="['flex', msg.type === 'user' ? 'justify-end' : 'justify-start']">
                    <div
                      :class="[
                        'max-w-[85%] rounded-2xl p-4 shadow-sm',
                        msg.type === 'user'
                          ? 'bg-primary-600 text-white'
                          : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-600 text-slate-800 dark:text-slate-100',
                      ]"
                    >
                      <template v-if="msg.type === 'user'">
                        <p class="whitespace-pre-wrap leading-relaxed text-sm">{{ msg.content }}</p>
                      </template>
                      <template v-else>
                        <div class="prose prose-slate dark:prose-invert prose-sm max-w-none" v-html="renderMarkdown(msg.content)" />
                        <span v-if="loading && index === messages.length - 1" class="inline-block w-0.5 h-5 bg-primary-500 ml-1 animate-pulse" />
                      </template>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 输入区域 -->
            <div class="p-4 border-t border-slate-200 dark:border-slate-600">
              <div class="flex gap-3">
                <input
                  v-model="question"
                  type="text"
                  placeholder="输入您的问题..."
                  class="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400"
                  :disabled="loading"
                  @keydown="handleKeydown"
                />
                <button
                  :disabled="!question.trim() || selectedKbIds.size === 0 || loading"
                  class="px-5 py-2.5 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  @click="handleSubmitQuestion"
                >
                  发送
                </button>
              </div>
            </div>
          </template>
          <template v-else>
            <div class="flex-1 flex items-center justify-center text-slate-400 dark:text-slate-500">
              <div class="text-center">
                <svg class="w-12 h-12 mx-auto mb-3 opacity-50" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
                <p class="text-sm">请先在右侧选择知识库</p>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- 右侧：知识库选择 -->
      <Transition name="slide-panel">
        <div v-if="rightPanelOpen" class="flex-shrink-0 overflow-hidden w-[280px]">
          <div class="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm h-full flex flex-col w-[280px] border border-slate-100 dark:border-slate-700">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-base font-semibold text-slate-800 dark:text-white">选择知识库</h2>
              <button class="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded" @click="rightPanelOpen = false">
                <ChevronLeft class="w-5 h-5" />
              </button>
            </div>

            <!-- 搜索框 -->
            <div class="flex gap-2 mb-3">
              <input
                v-model="searchKeyword"
                type="text"
                placeholder="搜索..."
                class="flex-1 px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400"
                @keydown.enter="handleSearch"
              />
              <button class="px-3 py-1.5 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600" @click="handleSearch">
                搜索
              </button>
            </div>

            <!-- 排序 -->
            <div class="mb-3">
              <select
                v-model="sortBy"
                class="w-full px-2 py-1 text-xs border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                @change="searchKeyword = ''"
              >
                <option value="time">时间排序</option>
                <option value="size">大小排序</option>
                <option value="access">访问排序</option>
                <option value="question">提问排序</option>
              </select>
            </div>

            <!-- 知识库列表 -->
            <div class="flex-1 overflow-y-auto">
              <div v-if="loadingList" class="text-center py-6">
                <div class="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full mx-auto animate-spin" />
              </div>
              <div v-else-if="knowledgeBases.length === 0" class="text-center py-6 text-slate-500 dark:text-slate-400">
                <p class="mb-2 text-sm">{{ searchKeyword ? '未找到' : '暂无知识库' }}</p>
                <button v-if="!searchKeyword" class="text-primary-500 hover:text-primary-600 font-medium text-sm" @click="router.push('/knowledge-base/upload')">
                  立即上传
                </button>
              </div>
              <div v-else class="space-y-2">
                <div
                  v-for="group in groupedKnowledgeBases"
                  :key="group.name"
                  class="border border-slate-100 dark:border-slate-700 rounded-lg overflow-hidden"
                >
                  <button
                    class="w-full flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    @click="toggleCategory(group.name)"
                  >
                    <div class="flex items-center gap-2">
                      <ChevronRight :class="['w-3.5 h-3.5 text-slate-400 transition-transform', { 'rotate-90': group.isExpanded }]" />
                      <span class="font-medium text-slate-700 dark:text-slate-300 text-sm">{{ group.name }}</span>
                    </div>
                    <span class="text-xs text-slate-400">{{ group.items.length }}</span>
                  </button>

                  <Transition name="expand">
                    <div v-if="group.isExpanded" class="overflow-hidden">
                      <div class="p-2 space-y-1">
                        <div
                          v-for="kb in group.items"
                          :key="kb.id"
                          :class="[
                            'p-2 rounded-lg cursor-pointer transition-all',
                            selectedKbIds.has(kb.id)
                              ? 'bg-primary-50 dark:bg-primary-900/30 border border-primary-500'
                              : 'bg-white dark:bg-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700 border border-transparent',
                          ]"
                          @click="handleToggleKb(kb.id)"
                        >
                          <div class="flex items-center gap-2">
                            <input
                              type="checkbox"
                              :checked="selectedKbIds.has(kb.id)"
                              class="w-3.5 h-3.5 text-primary-500 rounded focus:ring-primary-500"
                              @click.stop
                              @change="handleToggleKb(kb.id)"
                            />
                            <span class="font-medium text-slate-800 dark:text-white text-xs truncate flex-1">{{ kb.name }}</span>
                          </div>
                          <p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5 ml-5">{{ formatFileSize(kb.fileSize) }}</p>
                        </div>
                      </div>
                    </div>
                  </Transition>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>

      <!-- 收起状态下的展开按钮 -->
      <button
        v-if="!rightPanelOpen"
        class="flex-shrink-0 w-10 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        title="展开知识库面板"
        @click="rightPanelOpen = true"
      >
        <ChevronRight class="w-5 h-5 text-slate-400" />
      </button>
    </div>

    <!-- 删除会话确认弹窗 -->
    <DeleteConfirmDialog
      :open="!!sessionDeleteConfirm"
      :item="sessionDeleteConfirm ? { id: 0, title: sessionDeleteConfirm.title } : null"
      item-type="对话"
      @confirm="handleDeleteSession"
      @cancel="sessionDeleteConfirm = null"
    />

    <!-- 编辑会话标题弹窗 -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="editingSessionTitle" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="editingSessionTitle = null; newSessionTitle = ''" />
          <div class="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100 dark:border-slate-700">
            <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-4">编辑标题</h3>
            <input
              v-model="newSessionTitle"
              type="text"
              placeholder="请输入新标题"
              class="w-full px-4 py-3 text-sm border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 mb-4 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400"
              autofocus
              @keydown.enter="handleSaveSessionTitle"
            />
            <div class="flex justify-end gap-3">
              <button
                class="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                @click="editingSessionTitle = null; newSessionTitle = ''"
              >
                取消
              </button>
              <button
                :disabled="!newSessionTitle.trim()"
                class="px-4 py-2 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
                @click="handleSaveSessionTitle"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.slide-panel-enter-active,
.slide-panel-leave-active {
  transition: width 0.2s ease, opacity 0.2s ease;
  overflow: hidden;
}
.slide-panel-enter-from,
.slide-panel-leave-to {
  width: 0 !important;
  opacity: 0;
}

.expand-enter-active,
.expand-leave-active {
  transition: height 0.2s ease, opacity 0.2s ease;
  overflow: hidden;
}
.expand-enter-from,
.expand-leave-to {
  height: 0;
  opacity: 0;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-active > div:last-child,
.modal-leave-active > div:last-child {
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-leave-to > div:last-child {
  transform: scale(0.95) translateY(20px);
  opacity: 0;
}
</style>
