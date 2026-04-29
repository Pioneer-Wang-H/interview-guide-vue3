import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: () => import('../components/Layout.vue'),
      children: [
        { path: '', redirect: '/upload' },
        {
          path: 'upload',
          component: () => import('../pages/UploadPage.vue'),
        },
        {
          path: 'history',
          component: () => import('../pages/HistoryPage.vue'),
        },
        {
          path: 'history/:resumeId',
          component: () => import('../pages/ResumeDetailPage.vue'),
          props: (route) => ({ resumeId: Number(route.params.resumeId) }),
        },
        {
          path: 'interviews',
          component: () => import('../pages/InterviewHistoryPage.vue'),
        },
        {
          path: 'interview/:resumeId',
          component: () => import('../pages/InterviewPage.vue'),
          props: (route) => ({ resumeId: Number(route.params.resumeId) }),
        },
        {
          path: 'knowledge-base',
          component: () => import('../pages/KnowledgeBaseManagePage.vue'),
        },
        {
          path: 'knowledge-base/upload',
          component: () => import('../pages/KnowledgeBaseUploadPage.vue'),
        },
        {
          path: 'knowledge-base/query',
          component: () => import('../pages/KnowledgeBaseQueryPage.vue'),
        },
      ],
    },
  ],
})

export default router
