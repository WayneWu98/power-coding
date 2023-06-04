<template>
  <div class="bg-[#eee] w-full h-100vh flex items-center justify-center">
    <a-card class="min-w-500px shadow-gray-200 shadow-lg">
      <form-create :rule="rule" :option="options" v-model="userAuth" />
    </a-card>
  </div>
</template>

<script setup lang="ts">
import useFormCreateModel from '@/hooks/useFormCreateModel'
import { UserAuth } from '@/model/User'
import { adaptValidator } from '@/utils/validator'
import { Rule, Options } from '@form-create/ant-design-vue'
import useUserStore from '@/store/user'
import { message } from 'ant-design-vue'

const router = useRouter()
const userStore = useUserStore()
const userAuth = useFormCreateModel(UserAuth.default().merge({ email: 'admin@admin.com', password: '123456' }))

watch(
  () => userStore.user,
  (v) => {
    if (v) router.push({ path: '/', replace: true })
  },
  { immediate: true }
)

const rule: Rule[] = [
  {
    type: 'input',
    field: 'email',
    title: UserAuth.getField('email').name,
    validate: [
      {
        validator: adaptValidator(() => userAuth.value.validate('email'))
      }
    ]
  },
  {
    type: 'input',
    field: 'password',
    title: UserAuth.getField('password').name,
    validate: [{ validator: adaptValidator(() => userAuth.value.validate('password')) }]
  }
]
const options: Options = {
  onSubmit() {
    userAuth.value
      .login()
      .then(() => userStore.refreshUser())
      .then(() => message.success('登录成功'))
      .catch((err) => message.error(err?.message || '登录失败'))
  }
}
</script>
