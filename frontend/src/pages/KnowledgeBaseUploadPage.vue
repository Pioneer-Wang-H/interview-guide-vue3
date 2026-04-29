<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { knowledgeBaseApi } from '../api/knowledgebase'
import FileUploadCard from '../components/FileUploadCard.vue'

const router = useRouter()

const uploading = ref(false)
const error = ref('')

async function handleUpload(file: File, name?: string) {
  uploading.value = true
  error.value = ''

  try {
    await knowledgeBaseApi.uploadKnowledgeBase(file, name)
    // 上传完成后返回管理页面
    router.push('/knowledgebase')
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : '上传失败，请重试'
    error.value = errorMessage
    uploading.value = false
  }
}

function handleBack() {
  router.push('/knowledgebase')
}
</script>

<template>
  <FileUploadCard
    title="上传知识库"
    subtitle="上传文档，AI 将基于知识库内容回答您的问题"
    accept=".pdf,.doc,.docx,.txt,.md"
    format-hint="支持 PDF、DOCX、DOC、TXT、MD"
    max-size-hint="最大 50MB"
    :uploading="uploading"
    upload-button-text="开始上传"
    select-button-text="选择文件"
    :show-name-input="true"
    name-label="知识库名称（可选）"
    name-placeholder="留空则使用文件名"
    :error="error"
    :on-back="handleBack"
    @upload="handleUpload"
  />
</template>
