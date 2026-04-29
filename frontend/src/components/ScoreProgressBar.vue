<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { calculatePercentage } from '../utils/score'

const props = withDefaults(defineProps<{
  label: string
  score: number
  maxScore: number
  color?: string
  delay?: number
  className?: string
}>(), {
  color: 'bg-primary-500',
  delay: 0,
  className: '',
})

const percentage = computed(() => calculatePercentage(props.score, props.maxScore))
const width = ref('0%')

onMounted(() => {
  setTimeout(() => {
    width.value = `${percentage.value}%`
  }, props.delay * 1000)
})
</script>

<template>
  <div :class="['bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3', className]">
    <div class="text-xs text-slate-500 dark:text-slate-400 mb-1">{{ label }}</div>
    <div class="flex items-center gap-2">
      <div class="flex-1 h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
        <div
          :class="['h-full rounded-full', color]"
          :style="{ width, transition: 'width 0.8s ease' }"
        />
      </div>
      <span class="text-sm font-semibold text-slate-700 dark:text-slate-300 w-8 text-right">
        {{ score }}/{{ maxScore }}
      </span>
    </div>
  </div>
</template>
