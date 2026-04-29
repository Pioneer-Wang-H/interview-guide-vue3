<script setup lang="ts">
import { ref } from 'vue'
import { AlertCircle, FileText, Loader2, Upload, X } from 'lucide-vue-next'

interface FileUploadCardProps {
  title: string
  subtitle: string
  accept: string
  formatHint: string
  maxSizeHint: string
  uploading?: boolean
  uploadButtonText?: string
  selectButtonText?: string
  showNameInput?: boolean
  namePlaceholder?: string
  nameLabel?: string
  error?: string
  onBack?: () => void
}

withDefaults(defineProps<FileUploadCardProps>(), {
  uploading: false,
  uploadButtonText: '开始上传',
  selectButtonText: '选择文件',
  showNameInput: false,
  namePlaceholder: '留空则使用文件名',
  nameLabel: '名称（可选）',
})

const emit = defineEmits<{
  'file-select': [file: File]
  upload: [file: File, name?: string]
}>()

const selectedFile = ref<File | null>(null)
const dragOver = ref(false)
const name = ref('')

function handleDragOver(e: DragEvent) {
  e.preventDefault()
  dragOver.value = true
}

function handleDragLeave(e: DragEvent) {
  e.preventDefault()
  dragOver.value = false
}

function handleDrop(e: DragEvent) {
  e.preventDefault()
  dragOver.value = false
  const files = e.dataTransfer?.files
  if (files && files.length > 0) {
    selectedFile.value = files[0]
    emit('file-select', files[0])
  }
}

function handleFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  const files = target.files
  if (files && files.length > 0) {
    selectedFile.value = files[0]
    emit('file-select', files[0])
  }
}

function handleUpload() {
  if (!selectedFile.value) return
  emit('upload', selectedFile.value, name.value.trim() || undefined)
}

function removeFile(e: Event) {
  e.stopPropagation()
  selectedFile.value = null
}

function triggerFileInput(e: Event) {
  e.stopPropagation()
  document.getElementById('file-upload-input')?.click()
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}
</script>

<template>
  <div class="max-w-3xl mx-auto pt-16">
    <!-- 标题 -->
    <div class="text-center mb-12">
      <h1 class="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight">
        {{ title }}
      </h1>
      <p class="text-lg text-slate-500 dark:text-slate-400">
        {{ subtitle }}
      </p>
    </div>

    <!-- 上传区域 -->
    <div
      :class="[
        'relative bg-white dark:bg-slate-800 rounded-2xl p-12 cursor-pointer transition-all duration-300',
        dragOver ? 'scale-[1.02] shadow-xl' : 'shadow-lg hover:shadow-xl dark:shadow-slate-900/50'
      ]"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
      @click="triggerFileInput"
    >
      <!-- 渐变边框效果 -->
      <div
        :class="[
          'absolute inset-0 rounded-2xl p-[2px] bg-gradient-to-r -z-10',
          dragOver ? 'from-indigo-400 via-purple-400 to-indigo-400' : 'from-indigo-200 via-purple-200 to-indigo-200'
        ]"
      >
        <div class="w-full h-full bg-white dark:bg-slate-800 rounded-2xl" />
      </div>

      <input
        type="file"
        id="file-upload-input"
        class="hidden"
        :accept="accept"
        :disabled="uploading"
        @change="handleFileChange"
      />

      <div class="text-center">
        <Transition name="fade" mode="out-in">
          <div v-if="selectedFile" key="file-selected" class="space-y-4">
            <div class="w-20 h-20 mx-auto bg-primary-100 dark:bg-primary-900/50 rounded-full flex items-center justify-center">
              <FileText class="w-10 h-10 text-primary-600 dark:text-primary-400" />
            </div>
            <div class="flex items-center justify-center gap-4 bg-slate-50 dark:bg-slate-700/50 px-6 py-4 rounded-xl max-w-md mx-auto">
              <div class="text-left flex-1 min-w-0">
                <p class="font-semibold text-slate-900 dark:text-white truncate">{{ selectedFile.name }}</p>
                <p class="text-sm text-slate-500 dark:text-slate-400">{{ formatFileSize(selectedFile.size) }}</p>
              </div>
              <button
                class="w-8 h-8 bg-red-100 dark:bg-red-900/50 text-red-500 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/70 transition-colors flex items-center justify-center"
                @click="removeFile"
              >
                <X class="w-4 h-4" />
              </button>
            </div>
          </div>
          <div v-else key="no-file" class="space-y-4">
            <div
              :class="[
                'w-20 h-20 mx-auto rounded-2xl flex items-center justify-center transition-colors',
                dragOver ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
              ]"
            >
              <Upload class="w-10 h-10" />
            </div>
            <div>
              <h3 class="text-xl font-semibold text-slate-900 dark:text-white mb-2">点击或拖拽文件至此处</h3>
              <p class="text-slate-400 dark:text-slate-500 mb-4">
                {{ formatHint }}（{{ maxSizeHint }}）
              </p>
            </div>
            <button
              class="bg-gradient-to-r from-primary-500 to-primary-600 text-white px-8 py-3.5 rounded-xl font-semibold shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 transition-all"
              @click="triggerFileInput"
            >
              {{ selectButtonText }}
            </button>
          </div>
        </Transition>
      </div>
    </div>

    <!-- 名称输入框 -->
    <Transition name="slide-fade">
      <div
        v-if="showNameInput && selectedFile"
        class="mt-6 bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg dark:shadow-slate-900/50"
      >
        <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">{{ nameLabel }}</label>
        <input
          v-model="name"
          type="text"
          :placeholder="namePlaceholder"
          :disabled="uploading"
          class="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
          @click.stop
        />
      </div>
    </Transition>

    <!-- 错误提示 -->
    <Transition name="slide-fade">
      <div
        v-if="error"
        class="mt-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-center flex items-center justify-center gap-2"
      >
        <AlertCircle class="w-5 h-5" />
        {{ error }}
      </div>
    </Transition>

    <!-- 操作按钮 -->
    <div class="mt-8 flex gap-4 justify-center">
      <button
        v-if="$props.onBack"
        class="px-6 py-3 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
        @click="$props.onBack"
      >
        返回
      </button>
      <button
        v-if="selectedFile"
        :disabled="uploading"
        class="px-8 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-semibold shadow-lg shadow-emerald-500/30 hover:shadow-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
        @click="handleUpload"
      >
        <template v-if="uploading">
          <Loader2 class="w-5 h-5 animate-spin" />
          处理中...
        </template>
        <template v-else>{{ uploadButtonText }}</template>
      </button>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.slide-fade-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}
.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
