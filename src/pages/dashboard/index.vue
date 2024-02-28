<template>
  <div class="px-52px">
    <h1 class="text-center">Pageable List</h1>
    <model-table
      v-model:sorter="pageableUsers.query.sorter"
      v-model:pagination="pageableUsers.query.pagination"
      v-model:filters="pageableUsers.query.filters"
      :model="User"
      :items="pageableUsers.items"
      :total="pageableUsers.total"
      :loading="pageableUsers.loading"
      :properties="['id', 'name', 'email', 'age']"
      :row-selection="{ selectedRowKeys: selectedRowKeys, onChange: (keys) => (selectedRowKeys = keys) }"
      @change="gePageableUsersData"
    >
      <template #customFilterDropdown="{ selectedKeys, setSelectedKeys, confirm, clearFilters }">
        <div>
          <a-input :value="selectedKeys[0]" @change="(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])" />
          <a-button type="primary" @click="() => confirm()">search</a-button>
          <a-button @click="clearFilters()">reset</a-button>
        </div>
      </template>
    </model-table>
  </div>
  <div class="px-52px">
    <h1 class="text-center">Scrollable List</h1>
    <a-list :data-source="scrollableUsers.items">
      <template #loadMore>
        <a-button :loading="scrollableUsers.loading" @click="getScrollableUsersData">load more</a-button>
      </template>
      <template #renderItem="{ item }">
        <a-list-item>
          <a-list-item-meta :title="item.name" :description="item.email" />
        </a-list-item>
      </template>
    </a-list>
  </div>
</template>

<script setup lang="ts">
import { PageableUsers, ScrollableUsers, User } from '@/model/User'
import ModelTable from '@/components/ModelTable.vue'
import Serde from '@/model/BaseModel'

const selectedRowKeys = ref([] as (string | number)[])
const pageableUsers = ref(Serde.default(PageableUsers))
const gePageableUsersData = () => pageableUsers.value.reload()
pageableUsers.value.refresh()

const scrollableUsers = ref(Serde.default(ScrollableUsers))
const getScrollableUsersData = () => scrollableUsers.value.loadMore()
scrollableUsers.value.refresh()
</script>
@/model/Serde
