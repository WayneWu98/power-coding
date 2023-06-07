import BaseModel from '@/model/BaseModel'
import { MaybeRefOrGetter } from 'vue'

export default function useFormCreateModel<T extends BaseModel>(model: MaybeRefOrGetter<T>) {
  const _model = ref<T>()
  watch(
    () => toValue(model),
    (val) => (_model.value = val),
    { immediate: true }
  )
  const boundedModel = computed({
    get() {
      return _model.value!
    },
    set(val) {
      // @ts-ignore
      _model.value = Reflect.getPrototypeOf(_model.value!).constructor.from(val!)
    }
  })
  return boundedModel
}
