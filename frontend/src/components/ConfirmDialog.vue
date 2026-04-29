<script setup lang="ts">
interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  confirmVariant?: 'danger' | 'primary' | 'warning'
  loading?: boolean
  customContent?: string
  hideButtons?: boolean
}

withDefaults(defineProps<ConfirmDialogProps>(), {
  confirmText: '确定',
  cancelText: '取消',
  confirmVariant: 'primary',
  loading: false,
  hideButtons: false,
})

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const variantStyles: Record<string, string> = {
  danger: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700',
  primary: 'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700',
  warning: 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600',
}
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="open" class="fixed inset-0 z-50">
        <!-- 背景遮罩 -->
        <div
          class="fixed inset-0 bg-black/50 backdrop-blur-sm"
          @click="emit('cancel')"
        />

        <!-- 对话框 -->
        <div class="fixed inset-0 flex items-center justify-center p-4">
          <div
            class="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6"
            @click.stop
          >
            <!-- 标题 -->
            <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-4">
              {{ title }}
            </h3>

            <!-- 内容 -->
            <div class="text-slate-600 dark:text-slate-300 mb-6">
              <p v-if="message" class="whitespace-pre-line">{{ message }}</p>
              <div v-if="customContent">{{ customContent }}</div>
            </div>

            <!-- 按钮 -->
            <div v-if="!hideButtons" class="flex gap-3 justify-end">
              <button
                :disabled="loading"
                class="px-5 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                @click="emit('cancel')"
              >
                {{ cancelText }}
              </button>
              <button
                :disabled="loading"
                :class="[
                  'px-5 py-2.5 text-white rounded-xl font-semibold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed',
                  variantStyles[confirmVariant!]
                ]"
                @click="emit('confirm')"
              >
                <span v-if="loading" class="flex items-center gap-2">
                  <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full inline-block animate-spin" />
                  处理中...
                </span>
                <template v-else>{{ confirmText }}</template>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.dialog-enter-active,
.dialog-leave-active {
  transition: opacity 0.2s ease;
}
.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}
</style>
