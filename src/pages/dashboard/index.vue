<template>
  <div>
    <model-table
      v-model:sorter="state.users.query.sorter"
      v-model:pagination="state.users.query.pagination"
      :model="User"
      :items="state.users.items"
      :total="state.users.total"
      :loading="state.loading"
      :properties="['id', 'name', 'email', 'age']"
      :rowSelection="{ selectedRowKeys: state.selectedRowKeys, onChange: (keys) => (state.selectedRowKeys = keys) }"
      @change="getData"
    />
  </div>
</template>

<script setup lang="ts">
import { Users, User } from '@/model/User'
import ModelTable from '@/components/ModelTable.vue'

const state = reactive({ loading: false, users: Users.default(), selectedRowKeys: [] as (string | number)[] })

const getData = () => {
  if (state.loading) return
  state.loading = true
  state.users
    .get()
    .then((data) => {
      state.users.merge(data, ['items', 'total'])
    })
    .finally(() => (state.loading = false))
}

getData()
</script>
