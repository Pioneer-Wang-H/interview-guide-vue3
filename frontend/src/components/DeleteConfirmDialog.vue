<script setup lang="ts">
import ConfirmDialog from './ConfirmDialog.vue'

export interface DeleteItem {
  id: number
  name?: string
  title?: string
  filename?: string
  [key: string]: any
}

interface DeleteConfirmDialogProps {
  open: boolean
  item: DeleteItem | null
  itemType: string
  loading?: boolean
  customMessage?: string
}

withDefaults(defineProps<DeleteConfirmDialogProps>(), {
  loading: false,
})

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

function getItemName(item: DeleteItem | null): string {
  if (!item) return ''
  return item.name || item.title || item.filename || item.sessionId || (item.id ? `ID: ${item.id}` : '')
}

function getDefaultMessage(item: DeleteItem | null, itemType: string): string {
  return item ? `确定要删除${itemType}"${getItemName(item)}"吗？删除后无法恢复。` : ''
}
</script>

<template>
  <ConfirmDialog
    :open="open"
    :title="`删除${itemType}`"
    :message="customMessage || getDefaultMessage(item, itemType)"
    confirm-text="确定删除"
    cancel-text="取消"
    confirm-variant="danger"
    :loading="loading"
    @confirm="emit('confirm')"
    @cancel="emit('cancel')"
  />
</template>
