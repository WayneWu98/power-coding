import { createApp } from 'vue'
import store from '@/store'
import router from '@/router'
import * as AntdComponents from '@/components/antd'
import formCreate from '@form-create/ant-design-vue'
import install from '@form-create/ant-design-vue/auto-import'

import App from './App.vue'

import 'ant-design-vue/dist/antd.less'
import 'virtual:windi.css'

const app = createApp(App)
app.use(store)
app.use(router)
formCreate.use(install)
app.use(formCreate)
// register ant-design-vue components as global components
for (const component of Object.values(AntdComponents)) {
  app.use(component)
}

app.mount('#app')
