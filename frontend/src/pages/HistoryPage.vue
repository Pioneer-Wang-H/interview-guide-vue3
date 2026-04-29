<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { historyApi } from '../api/history'
import type { ResumeListItem } from '../api/history'
import DeleteConfirmDialog from '../components/DeleteConfirmDialog.vue'
import { formatDateOnly } from '../utils/date'
import { getScoreProgressColor } from '../utils/score'

const router = useRouter()

const resumes = ref<ResumeListItem[]>([])
const loading = ref(true)
const searchTerm = ref('')
const deletingId = ref<number | null>(null)
const deleteConfirm = ref<{ id: number; filename: string } | null>(null)
let pollingTimer: ReturnType<typeof setInterval> | null = null

async function loadResumes() {
  loading.value = true
  try {
    const data = await historyApi.getResumes()
    resumes.value = data
  } catch (err) {
    console.error('加载历史记录失败', err)
  } finally {
    loading.value = false
  }
}

async function loadResumesSilent() {
  try {
    const data = await historyApi.getResumes()
    resumes.value = data
  } catch (err) {
    console.error('刷新历史记录失败', err)
  }
}

function checkHasPending(): boolean {
  return resumes.value.some(
    (r) => r.latestScore === undefined || r.latestScore === null,
  )
}

function startPollingIfNeeded() {
  if (checkHasPending()) {
    if (!pollingTimer) {
      pollingTimer = setInterval(loadResumesSilent, 5000)
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
  await loadResumes()
  startPollingIfNeeded()
})

watch(resumes, () => {
  startPollingIfNeeded()
}, { deep: true })

onBeforeUnmount(() => {
  stopPolling()
})

const deleteMessage = computed(() =>
  deleteConfirm.value
    ? `确定要删除简历 "${deleteConfirm.value.filename}" 吗？删除后将同时删除：简历评价记录、所有模拟面试记录。此操作不可恢复！`
    : '',
)

const filteredResumes = computed(() =>
  resumes.value.filter((r) =>
    r.filename.toLowerCase().includes(searchTerm.value.toLowerCase()),
  ),
)

function handleSelectResume(id: number) {
  router.push(`/history/${id}`)
}

function handleDeleteClick(id: number, filename: string, e: MouseEvent) {
  e.stopPropagation()
  deleteConfirm.value = { id, filename }
}

async function handleDeleteConfirm() {
  if (!deleteConfirm.value) return

  const { id } = deleteConfirm.value
  deletingId.value = id
  try {
    await historyApi.deleteResume(id)
    await loadResumes()
    deleteConfirm.value = null
  } catch (err) {
    alert(err instanceof Error ? err.message : '删除失败，请稍后重试')
  } finally {
    deletingId.value = null
  }
}
</script>

<template>
  <div class="w-full">
    <!-- 头部 -->
    <div class="flex justify-between items-start mb-10 flex-wrap gap-6">
      <div>
        <h1 class="text-4xl font-bold text-slate-900 dark:text-white mb-2">简历库</h1>
        <p class="text-slate-500 dark:text-slate-400">管理您已分析过的所有简历及面试记录</p>
      </div>

      <div class="flex items-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 min-w-[280px] focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-100 transition-all">
        <svg class="w-5 h-5 text-slate-400" viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <input
          v-model="searchTerm"
          type="text"
          placeholder="搜索简历..."
          class="flex-1 outline-none text-slate-700 dark:text-slate-200 placeholder:text-slate-400 bg-transparent"
        />
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="text-center py-20">
      <div class="w-10 h-10 border-3 border-slate-200 border-t-primary-500 rounded-full mx-auto mb-4 animate-spin" />
      <p class="text-slate-500 dark:text-slate-400">加载中...</p>
    </div>

    <!-- 空状态 -->
    <div
      v-else-if="filteredResumes.length === 0"
      class="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl"
    >
      <div class="text-6xl mb-6">📄</div>
      <h3 class="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">暂无简历记录</h3>
      <p class="text-slate-500 dark:text-slate-400">上传简历开始您的第一次 AI 面试分析</p>
    </div>

    <!-- 表格 -->
    <div
      v-else
      class="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden"
    >
      <table class="w-full">
        <thead>
          <tr class="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-600">
            <th class="text-left px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">简历名称</th>
            <th class="text-left px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">上传日期</th>
            <th class="text-left px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">AI 评分</th>
            <th class="text-left px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">面试状态</th>
            <th class="w-20" />
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(resume, index) in filteredResumes"
            :key="resume.id"
            class="border-b border-slate-100 dark:border-slate-700 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors group"
            :style="{ animationDelay: `${index * 0.05}s` }"
            @click="handleSelectResume(resume.id)"
          >
            <td class="px-6 py-5">
              <div class="flex items-center gap-4">
                <div class="w-10 h-10 bg-primary-50 dark:bg-primary-900/30 rounded-xl flex items-center justify-center text-primary-500 dark:text-primary-400">
                  <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
                <span class="font-medium text-slate-800 dark:text-white">{{ resume.filename }}</span>
              </div>
            </td>
            <td class="px-6 py-5 text-slate-500 dark:text-slate-400">{{ formatDateOnly(resume.uploadedAt) }}</td>
            <td class="px-6 py-5">
              <template v-if="resume.latestScore !== undefined">
                <div class="flex items-center gap-3">
                  <div class="w-20 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      :class="['h-full rounded-full', getScoreProgressColor(resume.latestScore)]"
                      :style="{ width: `${resume.latestScore}%`, transition: 'width 0.8s ease' }"
                    />
                  </div>
                  <span class="font-bold text-slate-800 dark:text-white">{{ resume.latestScore }}</span>
                </div>
              </template>
              <span v-else class="text-slate-400 dark:text-slate-500">-</span>
            </td>
            <td class="px-6 py-5">
              <span
                v-if="resume.interviewCount > 0"
                class="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-900 text-emerald-600 rounded-full text-sm font-medium"
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                  <polyline points="9,12 11,14 15,10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                已完成
              </span>
              <span v-else class="inline-flex px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-full text-sm">待面试</span>
            </td>
            <td class="px-4">
              <div class="flex items-center gap-2">
                <button
                  :disabled="deletingId === resume.id"
                  class="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="删除简历"
                  @click="handleDeleteClick(resume.id, resume.filename, $event)"
                >
                  <div
                    v-if="deletingId === resume.id"
                    class="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin"
                  />
                  <svg v-else class="w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <path d="M3 6H5H21M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M10 11V17M14 11V17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
                <svg class="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" viewBox="0 0 24 24" fill="none">
                  <polyline points="9,18 15,12 9,6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 删除确认对话框 -->
    <DeleteConfirmDialog
      :open="deleteConfirm !== null"
      :item="deleteConfirm"
      item-type="简历"
      :loading="deletingId !== null"
      :custom-message="deleteMessage"
      @confirm="handleDeleteConfirm"
      @cancel="deleteConfirm = null"
    />
  </div>
</template>
