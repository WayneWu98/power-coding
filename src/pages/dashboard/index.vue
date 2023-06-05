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
    >
      <template #customFilterDropdown="{ selectedKeys, setSelectedKeys, confirm, clearFilters, column }">
        <div>
          <a-input :value="selectedKeys[0]" @change="(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])" />
          <a-button type="primary" @click="search(selectedKeys, confirm, column)">search</a-button>
          <a-button @click="clearFilters()">reset</a-button>
        </div>
      </template>
    </model-table>
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
    .then(({ data }) => {
      state.users.merge(data, ['items', 'total'])
    })
    .finally(() => (state.loading = false))
}

const search = (selectedKeys: any, cconfirm: any, column: any) => {
  cconfirm()
  state.users.query.filters = { [column.dataIndex]: selectedKeys[0] }
  getData()
}

getData()
</script>
