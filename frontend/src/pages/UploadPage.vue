<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { resumeApi } from '../api/resume'
import { getErrorMessage } from '../api/request'
import FileUploadCard from '../components/FileUploadCard.vue'

const router = useRouter()

const uploading = ref(false)
const error = ref('')

async function handleUpload(file: File) {
  uploading.value = true
  error.value = ''

  try {
    const data = await resumeApi.uploadAndAnalyze(file)

    if (!data.storage || !data.storage.resumeId) {
      throw new Error('上传失败，请重试')
    }

    // 异步模式：上传成功后跳转到简历库，让用户在列表中查看分析状态
    router.push({ path: '/history', state: { newResumeId: data.storage.resumeId } })
  } catch (err) {
    error.value = getErrorMessage(err)
    uploading.value = false
  }
}
</script>

<template>
  <FileUploadCard
    title="开始您的 AI 模拟面试"
    subtitle="上传 PDF 或 Word 简历，AI 将为您定制专属面试方案"
    accept=".pdf,.doc,.docx,.txt"
    format-hint="支持 PDF, DOCX, TXT"
    max-size-hint="最大 10MB"
    :uploading="uploading"
    upload-button-text="开始上传"
    select-button-text="选择简历文件"
    :error="error"
    @upload="handleUpload"
  />
</template>
