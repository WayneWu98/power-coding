<script setup lang="ts">
import useUserStore from '@/store/user'
const userStore = useUserStore()
userStore.refreshUser()
</script>
<template>
  <router-view />
</template>
