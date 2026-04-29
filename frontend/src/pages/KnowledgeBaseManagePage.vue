<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  AlertCircle,
  Check,
  CheckCircle,
  ChevronDown,
  Clock,
  Database,
  Download,
  Edit3,
  Eye,
  FileText,
  HardDrive,
  Loader2,
  MessageSquare,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-vue-next'
import { knowledgeBaseApi, type KnowledgeBaseItem, type KnowledgeBaseStats, type SortOption, type VectorStatus } from '../api/knowledgebase'
import DeleteConfirmDialog from '../components/DeleteConfirmDialog.vue'

const router = useRouter()

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getStatusText(status: VectorStatus): string {
  switch (status) {
    case 'COMPLETED': return '已完成'
    case 'PROCESSING': return '处理中'
    case 'PENDING': return '待处理'
    case 'FAILED': return '失败'
    default: return '未知'
  }
}

// State
const stats = ref<KnowledgeBaseStats | null>(null)
const knowledgeBases = ref<KnowledgeBaseItem[]>([])
const loading = ref(true)
const searchKeyword = ref('')
const sortBy = ref<SortOption>('time')
const selectedCategory = ref<string | null>(null)
const categories = ref<string[]>([])
const deleteItem = ref<KnowledgeBaseItem | null>(null)
const deleting = ref(false)

const editingCategoryId = ref<number | null>(null)
const editingCategoryValue = ref('')
const savingCategory = ref(false)
const categoryInputRef = ref<HTMLInputElement | null>(null)

const revectorizing = ref<number | null>(null)

let pollingTimer: ReturnType<typeof setInterval> | null = null

async function loadDataSilent() {
  try {
    const [statsData, kbList, categoryList] = await Promise.all([
      knowledgeBaseApi.getStatistics(),
      searchKeyword.value
        ? knowledgeBaseApi.search(searchKeyword.value)
        : selectedCategory.value
        ? knowledgeBaseApi.getByCategory(selectedCategory.value)
        : knowledgeBaseApi.getAllKnowledgeBases(sortBy.value),
      knowledgeBaseApi.getAllCategories(),
    ])
    stats.value = statsData
    knowledgeBases.value = kbList
    categories.value = categoryList
  } catch (error) {
    console.error('加载数据失败:', error)
  }
}

async function loadData() {
  loading.value = true
  try {
    await loadDataSilent()
  } finally {
    loading.value = false
  }
}

function startPolling() {
  stopPolling()
  pollingTimer = setInterval(loadDataSilent, 5000)
}

function stopPolling() {
  if (pollingTimer) {
    clearInterval(pollingTimer)
    pollingTimer = null
  }
}

onMounted(() => {
  loadData()
})

watch([knowledgeBases, loading], ([kbList, isLoading]) => {
  if (isLoading) return
  const hasPending = kbList.some(
    kb => kb.vectorStatus === 'PENDING' || kb.vectorStatus === 'PROCESSING'
  )
  if (hasPending) {
    startPolling()
  } else {
    stopPolling()
  }
})

onBeforeUnmount(() => stopPolling())

async function handleRevectorize(id: number) {
  revectorizing.value = id
  try {
    await knowledgeBaseApi.revectorize(id)
    await loadDataSilent()
  } catch (error) {
    console.error('重新向量化失败:', error)
  } finally {
    revectorizing.value = null
  }
}

async function handleDelete() {
  if (!deleteItem.value) return
  deleting.value = true
  try {
    await knowledgeBaseApi.deleteKnowledgeBase(deleteItem.value.id)
    deleteItem.value = null
    await loadData()
  } catch (error) {
    console.error('删除失败:', error)
  } finally {
    deleting.value = false
  }
}

async function handleDownload(kb: KnowledgeBaseItem) {
  try {
    const blob = await knowledgeBaseApi.downloadKnowledgeBase(kb.id)
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = kb.originalFilename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error('下载失败:', error)
  }
}

function handleStartEditCategory(kb: KnowledgeBaseItem) {
  editingCategoryId.value = kb.id
  editingCategoryValue.value = kb.category || ''
  nextTick(() => {
    categoryInputRef.value?.focus()
  })
}

function handleCancelEditCategory() {
  editingCategoryId.value = null
  editingCategoryValue.value = ''
}

async function handleSaveCategory(id: number) {
  savingCategory.value = true
  try {
    const categoryToSave = editingCategoryValue.value.trim() || null
    await knowledgeBaseApi.updateCategory(id, categoryToSave)
    editingCategoryId.value = null
    editingCategoryValue.value = ''
    await loadData()
  } catch (error) {
    console.error('更新分类失败:', error)
  } finally {
    savingCategory.value = false
  }
}

function handleCategoryKeyDown(e: KeyboardEvent, id: number) {
  if (e.key === 'Enter') {
    e.preventDefault()
    handleSaveCategory(id)
  } else if (e.key === 'Escape') {
    handleCancelEditCategory()
  }
}

function handleSearch(e: Event) {
  e.preventDefault()
  loadData()
}

function handleSortChange(value: SortOption) {
  sortBy.value = value
  searchKeyword.value = ''
  selectedCategory.value = null
}

function handleCategoryFilter(value: string) {
  selectedCategory.value = value || null
  searchKeyword.value = ''
}

const statusIcons: Record<VectorStatus, any> = {
  COMPLETED: CheckCircle,
  PROCESSING: Loader2,
  PENDING: Clock,
  FAILED: AlertCircle,
}
</script>

<template>
  <div class="max-w-7xl mx-auto">
    <!-- 页面标题 -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
          <Database class="w-7 h-7 text-primary-500" />
          知识库管理
        </h1>
        <p class="text-slate-500 dark:text-slate-400 mt-1">管理您的知识库文件，查看使用统计</p>
      </div>
      <div class="flex gap-3">
        <button
          class="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          @click="router.push('/knowledge-base/upload')"
        >
          <Upload class="w-4 h-4" />
          上传知识库
        </button>
        <button
          class="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          @click="router.push('/knowledge-base/query')"
        >
          <MessageSquare class="w-4 h-4" />
          问答助手
        </button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div v-if="stats" class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div class="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
        <div class="flex items-center gap-4">
          <div class="p-3 rounded-lg bg-primary-500">
            <Database class="w-6 h-6 text-white" />
          </div>
          <div>
            <p class="text-sm text-slate-500 dark:text-slate-400">知识库总数</p>
            <p class="text-2xl font-bold text-slate-800 dark:text-white">{{ stats.totalCount.toLocaleString() }}</p>
          </div>
        </div>
      </div>
      <div class="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
        <div class="flex items-center gap-4">
          <div class="p-3 rounded-lg bg-indigo-500">
            <MessageSquare class="w-6 h-6 text-white" />
          </div>
          <div>
            <p class="text-sm text-slate-500 dark:text-slate-400">总提问次数</p>
            <p class="text-2xl font-bold text-slate-800 dark:text-white">{{ stats.totalQuestionCount.toLocaleString() }}</p>
          </div>
        </div>
      </div>
      <div class="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
        <div class="flex items-center gap-4">
          <div class="p-3 rounded-lg bg-emerald-500">
            <Eye class="w-6 h-6 text-white" />
          </div>
          <div>
            <p class="text-sm text-slate-500 dark:text-slate-400">总访问次数</p>
            <p class="text-2xl font-bold text-slate-800 dark:text-white">{{ stats.totalAccessCount.toLocaleString() }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 搜索和筛选栏 -->
    <div class="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 mb-6">
      <div class="flex flex-wrap items-center gap-4">
        <form @submit.prevent="handleSearch" class="flex-1 min-w-[200px]">
          <div class="relative">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              v-model="searchKeyword"
              type="text"
              placeholder="搜索知识库名称..."
              class="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            />
          </div>
        </form>

        <div class="relative">
          <select
            :value="sortBy"
            @change="handleSortChange(($event.target as HTMLSelectElement).value as SortOption)"
            class="appearance-none pl-4 pr-10 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white cursor-pointer"
          >
            <option value="time">按时间排序</option>
            <option value="size">按大小排序</option>
            <option value="access">按访问排序</option>
            <option value="question">按提问排序</option>
          </select>
          <ChevronDown class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>

        <div class="relative">
          <select
            :value="selectedCategory || ''"
            @change="handleCategoryFilter(($event.target as HTMLSelectElement).value)"
            class="appearance-none pl-4 pr-10 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white cursor-pointer"
          >
            <option value="">全部分类</option>
            <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
          </select>
          <ChevronDown class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>
    </div>

    <!-- 知识库列表 -->
    <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
      <div v-if="loading" class="flex items-center justify-center py-20">
        <Loader2 class="w-8 h-8 text-primary-500 animate-spin" />
      </div>

      <div v-else-if="knowledgeBases.length === 0" class="text-center py-20">
        <HardDrive class="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <p class="text-slate-500 dark:text-slate-400">暂无知识库</p>
        <button class="mt-4 text-primary-500 hover:text-primary-600" @click="router.push('/knowledge-base/upload')">
          上传第一个知识库
        </button>
      </div>

      <table v-else class="w-full">
        <thead class="bg-slate-50 dark:bg-slate-700 border-b border-slate-100 dark:border-slate-600">
          <tr>
            <th class="text-left px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-300">名称</th>
            <th class="text-left px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-300">分类</th>
            <th class="text-left px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-300">大小</th>
            <th class="text-left px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-300">状态</th>
            <th class="text-left px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-300">提问</th>
            <th class="text-left px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-300">上传时间</th>
            <th class="text-right px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-300">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(kb, index) in knowledgeBases"
            :key="kb.id"
            class="border-b border-slate-50 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            :style="{ animationDelay: `${index * 0.05}s` }"
          >
            <td class="px-6 py-4">
              <div class="flex items-center gap-3">
                <FileText class="w-5 h-5 text-slate-400" />
                <div>
                  <p class="font-medium text-slate-800 dark:text-white">{{ kb.name }}</p>
                  <p class="text-xs text-slate-400 dark:text-slate-500">{{ kb.originalFilename }}</p>
                </div>
              </div>
            </td>
            <td class="px-6 py-4">
              <Transition name="fade" mode="out-in">
                <div v-if="editingCategoryId === kb.id" key="editing" class="flex items-center gap-2">
                  <input
                    ref="categoryInputRef"
                    v-model="editingCategoryValue"
                    type="text"
                    placeholder="输入分类名称"
                    list="category-suggestions"
                    class="w-24 px-2 py-1 text-sm border border-primary-300 dark:border-primary-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    :disabled="savingCategory"
                    @keydown="handleCategoryKeyDown($event, kb.id)"
                  />
                  <datalist id="category-suggestions">
                    <option v-for="cat in categories" :key="cat" :value="cat" />
                  </datalist>
                  <button
                    :disabled="savingCategory"
                    class="p-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors disabled:opacity-50"
                    title="保存"
                    @click="handleSaveCategory(kb.id)"
                  >
                    <Loader2 v-if="savingCategory" class="w-4 h-4 animate-spin" />
                    <Check v-else class="w-4 h-4" />
                  </button>
                  <button
                    :disabled="savingCategory"
                    class="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 rounded transition-colors disabled:opacity-50"
                    title="取消"
                    @click="handleCancelEditCategory"
                  >
                    <X class="w-4 h-4" />
                  </button>
                </div>
                <div v-else key="display" class="flex items-center gap-2 group/category">
                  <span v-if="kb.category" class="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-sm">
                    {{ kb.category }}
                  </span>
                  <span v-else class="text-slate-400 dark:text-slate-500 text-sm">未分类</span>
                  <button
                    class="p-1 text-slate-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded opacity-0 group-hover/category:opacity-100 transition-all"
                    title="编辑分类"
                    @click="handleStartEditCategory(kb)"
                  >
                    <Edit3 class="w-3.5 h-3.5" />
                  </button>
                </div>
              </Transition>
            </td>
            <td class="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
              {{ formatFileSize(kb.fileSize) }}
            </td>
            <td class="px-6 py-4">
              <div class="flex items-center gap-2">
                <component :is="statusIcons[kb.vectorStatus] || CheckCircle" :class="[
                  'w-4 h-4',
                  kb.vectorStatus === 'COMPLETED' ? 'text-green-500' :
                  kb.vectorStatus === 'PROCESSING' ? 'text-blue-500 animate-spin' :
                  kb.vectorStatus === 'PENDING' ? 'text-yellow-500' :
                  kb.vectorStatus === 'FAILED' ? 'text-red-500' : 'text-green-500'
                ]" />
                <span class="text-sm text-slate-600 dark:text-slate-300">{{ getStatusText(kb.vectorStatus) }}</span>
              </div>
            </td>
            <td class="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
              {{ kb.questionCount }}
            </td>
            <td class="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
              {{ formatDate(kb.uploadedAt) }}
            </td>
            <td class="px-6 py-4 text-right">
              <div class="flex items-center justify-end gap-1">
                <button
                  class="p-2 text-slate-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg transition-colors"
                  title="下载"
                  @click="handleDownload(kb)"
                >
                  <Download class="w-4 h-4" />
                </button>
                <button
                  v-if="kb.vectorStatus === 'FAILED'"
                  :disabled="revectorizing === kb.id"
                  class="p-2 text-slate-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg transition-colors disabled:opacity-50"
                  title="重新向量化"
                  @click="handleRevectorize(kb.id)"
                >
                  <RefreshCw :class="['w-4 h-4', { 'animate-spin': revectorizing === kb.id }]" />
                </button>
                <button
                  class="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                  title="删除"
                  @click="deleteItem = kb"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 删除确认对话框 -->
    <DeleteConfirmDialog
      :open="deleteItem !== null"
      :item="deleteItem"
      item-type="知识库"
      :loading="deleting"
      @confirm="handleDelete"
      @cancel="deleteItem = null"
    />
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
