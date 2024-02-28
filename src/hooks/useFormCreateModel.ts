import Serde from '@/model/Serde'
import { MaybeRefOrGetter } from 'vue'

export default function useFormCreateModel<T extends Serde>(model: MaybeRefOrGetter<T>) {
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
      _model.value = Serde.from(Reflect.getPrototypeOf(_model.value!).constructor, val!)
    }
  })
  return boundedModel
}
