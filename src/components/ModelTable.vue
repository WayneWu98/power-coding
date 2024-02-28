<template>
  <a-table
    :data-source="items"
    :columns="columns"
    :pagination="pagination"
    :expanded-row-keys="expandedRowKeys"
    :expanded-row-render="expandedRowRender"
    :expand-fixed="expandFixed"
    :expand-icon="expandIcon"
    :expand-row-by-click="expandRowByClick"
    :footer="footer"
    :indent-size="indentSize"
    :row-class-name="rowClassName"
    :row-expandable="rowExpandable"
    :row-key="rowKey"
    :size="size"
    :show-header="showHeader"
    :sticky="sticky"
    :loading="loading"
    :row-selection="rowSelection"
    @update:expanded-row-keys="$emit('update:expandedRowKeys', $event)"
    @change="onChange"
  >
    <template v-for="slot in slotNames" #[slot]="{ ...params }">
      <slot :name="slot" v-bind="{ ...params }"></slot>
    </template>
  </a-table>
</template>

<script setup lang="ts" generic="T extends SerdeableClass, P extends (keyof InstanceType<T>)[]">
import Serde, { SerdeableClass } from '@/model/Serde'
import Sorter from '@/model/Sorter'
import Pagination from '@/model/Pagination'
import { Table as ATable, TableColumnType, TableProps } from 'ant-design-vue'
import { FilterConfirmProps, FilterValue } from 'ant-design-vue/lib/table/interface'
import { Key } from 'ant-design-vue/lib/_util/type'

type Model = T
type ModelInstance = InstanceType<Model>
type Properties = P
type TableColumn = TableColumnType<ModelInstance>

type AcceptedTableProps = Pick<
  TableProps<ModelInstance>,
  | 'loading'
  | 'bordered'
  | 'defaultExpandAllRows'
  | 'defaultExpandedRowKeys'
  | 'expandedRowKeys'
  | 'expandedRowRender'
  | 'expandFixed'
  | 'expandIcon'
  | 'expandRowByClick'
  | 'footer'
  | 'indentSize'
  | 'rowClassName'
  | 'rowExpandable'
  | 'rowKey'
  | 'size'
  | 'showHeader'
  | 'sticky'
  | 'customHeaderRow'
  | 'onChange'
  | 'rowSelection'
>

interface Props extends AcceptedTableProps {
  model: Model
  properties: Properties
  items?: ModelInstance[]
  sorter?: Sorter
  total?: number
  pagination?: Pagination
  filters?: Record<Properties[number], FilterValue | null>
}

const props = withDefaults(defineProps<Props>(), { showHeader: true, size: 'middle', rowKey: 'id' })

interface ComponentEvent {
  (e: 'update:expandedRowKeys', keys: string[]): void
  (e: 'update:pagination', pagination: Pagination): void
  (e: 'paginate', pagination: Pagination): void
  (e: 'update:filters', filters: Record<Properties[number], FilterValue | null>): void
  (e: 'filter', filters: Record<Properties[number], FilterValue | null>): void
  (e: 'update:sorter', sorter?: Sorter): void
  (e: 'sort', sorter?: Sorter): void
  (e: 'change', ...params: Parameters<NonNullable<AcceptedTableProps['onChange']>>): void
}

const emit = defineEmits<ComponentEvent>()

interface Slot {
  title(props: any): void
  bodyCell(props: { text?: string; record: ModelInstance; index: number; column: TableColumn }): void
  emptyText(props: any): void
  expandedRowRender(props: { record: ModelInstance; index: number; indent: number; expanded: boolean }): void
  expandIcon(props: any): void
  footer(props: any): void
  headerCell(props: { title: string; column: TableColumn }): void
  summary(props: any): void
  customFilterDropdown(props: {
    prefixCls: string
    setSelectedKeys: (selectedKeys: Key[]) => void
    selectedKeys: Key[]
    confirm: (param?: FilterConfirmProps) => void
    clearFilters: () => void
    filters?: { text: string; value: string }[]
    visible: boolean
    column: TableColumn
  }): void
  customFilterIcon(props: { filtered: boolean; column: TableColumn }): void
}
const slots = defineSlots<Slot>()
const slotNames = computed(() => Object.keys(slots) as (keyof Slot)[])

const pagination = computed(() => {
  if (props.pagination) {
    return {
      pageSize: props.pagination.per,
      current: props.pagination.page,
      total: props.total
    }
  }
})

const columns = computed(() => {
  return props.properties.map((prop) => {
    const field = Serde.getField(props.model, prop) ?? {}
    const column = field.tableColumn ?? {}
    const sorter = props.sorter
    let sortOrder = null
    if (sorter?.orderBy === prop && sorter?.order) {
      sortOrder = sorter.order
    }
    return {
      title: field.name,
      dataIndex: prop as string,
      key: prop as string,
      filtered: !!props.filters?.[prop],
      sortOrder,
      ...column
    }
  })
})

const onChange: AcceptedTableProps['onChange'] = (pagination, filters, sorter, extra) => {
  if (Array.isArray(sorter)) sorter = sorter[0]
  const _sorter = Serde.default(Sorter).merge({ orderBy: sorter.order && sorter.columnKey, order: sorter.order })
  emit('update:sorter', _sorter)
  emit('sort', _sorter)

  const _pagination = Serde.default(Pagination).merge({ page: pagination.current, per: pagination.pageSize })
  emit('update:pagination', _pagination)
  emit('paginate', _pagination)

  emit('update:filters', filters as any)
  emit('filter', filters as any)

  emit('change', pagination, filters, sorter, extra)
}
</script>
@/model/Serde
