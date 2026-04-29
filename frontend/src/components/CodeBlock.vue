<script setup lang="ts">
import { computed, ref } from 'vue'
import { Check, Copy } from 'lucide-vue-next'
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

const props = defineProps<{
  language?: string
  children: string
}>()

const copied = ref(false)
const codeRef = ref<HTMLElement>()

const code = computed(() => props.children?.trim() || '')
const showLineNumbers = computed(() => code.value.split('\n').length > 3)

function getHighlightedCode(): string {
  const lang = props.language && hljs.getLanguage(props.language) ? props.language : 'text'
  const result = hljs.highlight(code.value, { language: lang })
  return result.value
}

async function handleCopy() {
  try {
    await navigator.clipboard.writeText(code.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch (err) {
    console.error('复制失败:', err)
  }
}
</script>

<template>
  <div class="relative group my-3">
    <!-- 语言标签和复制按钮 -->
    <div class="flex items-center justify-between px-4 py-2 bg-slate-700 rounded-t-xl border-b border-slate-600">
      <span class="text-xs text-slate-400 font-mono">
        {{ language || 'code' }}
      </span>
      <button
        class="flex items-center gap-1.5 px-2 py-1 text-xs text-slate-400 hover:text-white hover:bg-slate-600 rounded transition-colors"
        title="复制代码"
        @click="handleCopy"
      >
        <template v-if="copied">
          <Check class="w-3.5 h-3.5 text-green-400" />
          <span class="text-green-400">已复制</span>
        </template>
        <template v-else>
          <Copy class="w-3.5 h-3.5" />
          <span>复制</span>
        </template>
      </button>
    </div>

    <!-- 代码内容 -->
    <div class="bg-[#282c34] rounded-b-xl text-sm leading-[1.5] overflow-x-auto">
      <pre class="!m-0 !rounded-b-xl !text-[0.875rem]"><code
        ref="codeRef"
        :class="showLineNumbers ? 'line-numbers' : ''"
        v-html="getHighlightedCode()"
      /></pre>
    </div>
  </div>
</template>

<style scoped>
pre {
  margin: 0;
  padding: 1rem;
  border-radius: 0 0 0.75rem 0.75rem;
  background: #282c34;
}
code {
  font-family: 'Fira Code', 'Consolas', monospace;
}
</style>
