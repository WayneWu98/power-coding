import { defineStore } from 'pinia'
import { readonly, ref } from 'vue'
import { User } from '@/model/User'
import * as storage from '@/utils/storage'
import { useRouter } from 'vue-router'

export default defineStore('user', () => {
  const router = useRouter()
  const user = ref<User>()
  const getMyUser = () => User.getMyUser()
  const refreshUser = () => getMyUser().then(({ data }) => (user.value = data))
  const logout = () => {
    storage.removeItem('token')
    user.value = undefined
    router.push('/login')
  }
  return {
    user: readonly(user),
    getMyUser,
    refreshUser,
    logout
  }
})
