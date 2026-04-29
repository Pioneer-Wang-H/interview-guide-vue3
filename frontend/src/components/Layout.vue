<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  ChevronRight, Database, FileStack, MessageSquare, Moon,
  Sparkles, Sun, Upload, Users,
} from 'lucide-vue-next'
import { useTheme } from '../composables/useTheme'

interface NavItem {
  id: string
  path: string
  label: string
  icon: any
  description?: string
}

interface NavGroup {
  id: string
  title: string
  items: NavItem[]
}

const route = useRoute()
const currentPath = computed(() => route.path)
const { theme, toggleTheme } = useTheme()

const navGroups: NavGroup[] = [
  {
    id: 'career',
    title: '简历与面试',
    items: [
      { id: 'upload', path: '/upload', label: '上传简历', icon: Upload, description: 'AI 分析简历' },
      { id: 'resumes', path: '/history', label: '简历库', icon: FileStack, description: '管理所有简历' },
      { id: 'interviews', path: '/interviews', label: '面试记录', icon: Users, description: '查看面试历史' },
    ],
  },
  {
    id: 'knowledge',
    title: '知识库',
    items: [
      { id: 'kb-manage', path: '/knowledge-base', label: '知识库管理', icon: Database, description: '管理知识文档' },
      { id: 'chat', path: '/knowledge-base/query', label: '问答助手', icon: MessageSquare, description: '基于知识库问答' },
    ],
  },
]

function isActive(path: string) {
  if (path === '/upload') {
    return currentPath.value === '/upload' || currentPath.value === '/'
  }
  if (path === '/knowledge-base') {
    return currentPath.value === '/knowledge-base' || currentPath.value === '/knowledge-base/upload'
  }
  return currentPath.value.startsWith(path)
}
</script>

<template>
  <div class="flex min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800">
    <!-- 左侧边栏 -->
    <aside class="w-64 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-700 fixed h-screen left-0 top-0 z-50 flex flex-col">
      <!-- Logo -->
      <div class="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
        <router-link to="/upload" class="flex items-center gap-3">
          <div class="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary-500/30">
            <Sparkles class="w-5 h-5" />
          </div>
          <div>
            <span class="text-lg font-bold text-slate-800 dark:text-white tracking-tight block">AI Interview</span>
            <span class="text-xs text-slate-400 dark:text-slate-500">智能面试助手</span>
          </div>
        </router-link>
      </div>

      <!-- 主题切换按钮 -->
      <div class="px-4 pb-2">
        <button
          @click="toggleTheme"
          class="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          <template v-if="theme === 'dark'">
            <Sun class="w-4 h-4" />
            <span class="text-sm font-medium">浅色模式</span>
          </template>
          <template v-else>
            <Moon class="w-4 h-4" />
            <span class="text-sm font-medium">深色模式</span>
          </template>
        </button>
      </div>

      <!-- 导航菜单 -->
      <nav class="flex-1 p-4 overflow-y-auto">
        <div class="space-y-6">
          <div v-for="group in navGroups" :key="group.id">
            <div class="px-3 mb-2">
              <span class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                {{ group.title }}
              </span>
            </div>
            <div class="space-y-1">
              <router-link
                v-for="item in group.items"
                :key="item.id"
                :to="item.path"
                :class="[
                  'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200',
                  isActive(item.path)
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                ]"
              >
                <div :class="[
                  'w-9 h-9 rounded-lg flex items-center justify-center transition-colors',
                  isActive(item.path)
                    ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700 group-hover:text-slate-700 dark:group-hover:text-white'
                ]">
                  <component :is="item.icon" class="w-5 h-5" />
                </div>
                <div class="flex-1 min-w-0">
                  <span class="text-sm block" :class="isActive(item.path) ? 'font-semibold' : 'font-medium'">
                    {{ item.label }}
                  </span>
                  <span v-if="item.description" class="text-xs text-slate-400 dark:text-slate-500 truncate block">
                    {{ item.description }}
                  </span>
                </div>
                <ChevronRight v-if="isActive(item.path)" class="w-4 h-4 text-primary-400" />
              </router-link>
            </div>
          </div>
        </div>
      </nav>

      <!-- 底部信息 -->
      <div class="p-4 border-t border-slate-100 dark:border-slate-700">
        <div class="px-3 py-2 bg-gradient-to-r from-primary-50 to-indigo-50 dark:from-primary-900/30 dark:to-slate-800 rounded-xl">
          <p class="text-xs text-primary-600 dark:text-primary-400 font-medium">AI 面试助手 v1.0</p>
          <p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Powered by AI</p>
        </div>
      </div>
    </aside>

    <!-- 主内容区 -->
    <main class="flex-1 ml-64 p-10 min-h-screen overflow-y-auto">
      <router-view v-slot="{ Component, route: childRoute }">
        <transition name="page" mode="out-in">
          <component :is="Component" :key="childRoute.path" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<style scoped>
.page-enter-active,
.page-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.page-enter-from {
  opacity: 0;
  transform: translateY(20px);
}
.page-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}
</style>
