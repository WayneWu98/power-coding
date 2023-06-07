# Power Coding

[English](./README.md) | 中文简体

这个项目的目标是尝试寻找一种更加合理的方式去组织前端代码，正确处理 View、View Model、Entity 之间的逻辑关系，加强这几个部分之间的“逻辑耦合”，以 View Model 为中心，将 View 和 Entity 联系到一起，借助强大的装饰器和元编程，减少重复逻辑的同时，将命令式代码转换为声明式代码，提高代码的可读性和可维护性。

## 特性

1. 聚合 数据实体, 视图模型, 视图之间的逻辑代码，提高可维护性
2. 处理前后端数据转换问题
   1. 命名风格
   2. 数据类型
   3. 数据结构
3. 借助装饰器和元编程，将命令式代码转换为声明式代码
4. 通过装饰器进行行为注入，减少重复逻辑

## 项目结构

### src/decorator

这里包含了基本的装饰器，用来给 class 或 class 成员添加一些元信息以及扩展一些行为。

- Derive - 类装饰器，通过传入一个 Deriver，自动给类派生一些方法或者属性，目前只内置了一个 CRUDDeriver，自动给某个 Model 实现增删改查，可以在 `src/model/behavior/CRUD.ts` 中找到
- Field - 类成员装饰器，给类成员添加一些元信息，以控制一些逻辑行为，可以通过 `getField()` 方法获取某个类成员的元信息
- Model - 类装饰器，与 Field 类似，不过是给类添加元信息，可以通过 `getField()` 方法获取某个类成员的元信息
- Validator - 类成员装饰器，给类成员添加数据校验器，内置几个校验器可以在 `src/utils/validator.ts` 中找到，当配置了校验器，可以通过 `validate()` 方法对某个类成员或所有成员进行数据校验

### src/model

这里包含所有 Model 定义，其中只需要关注 `BaseModel` 以及 behavior 下的几个抽象类。

- BaseModel - 任何 Model 都需要继承这个类，它定义了一些基本的操作方法（如：`getField()`, `getModel()`, `validate()`, `from`），这些操作方法与上面的装饰器配合使用。
- behavior/* - 这里定义了一些抽象类，用来手动规范 Model 具有某些行为，如：
  - CRUD 规定 Model 需要实现数据的增删改查
  - Entity 规定 Model 是一个实体，它具有唯一标识符 ID
  - Query 规定 Model 具有一个查询参数 query

### src/components

这里具体封装了 Ant Design 的 Table 组件，使其可以与 Model 无缝结合，该组件与装饰器 `Field` 中的 `tableColumn` 属性结合使用，查看 `src/pages/dashboard/index.vue` 中的使用示例。

## 能力

### 序列化/反序列化

> 注意：这里的反序列化指 Plain Object -> Model，序列化指 Model -> Plain Object

通过 Model.from() 方法，可以将数据（string / plain object / other model）反序列化为 Model 实例，通过 Model.toPlain() 将 Model 实体进行序列化，这种转换有几件事情会发生：

1. 字段名称命名风格的自动转换，默认反序列化为 camel-case，序列化为 snake-case，可以通过 `src/config.ts` 中的配置进行修改，但 Model 装饰器中的 rename 有更高的优先级，当配置了 Field 装饰器的 fieldName 属性，命名转换就不会发生了，因为它指定了该成员与 fieldName 完全对应。
2. 数据类型转换，通过 Field 装饰器中的 type 属性，可以指定某个字段的数据类型，如不指定 tsc 会自动推导为标注对应的类型构造函数，更为自定义的转换逻辑可以通过 Field 装饰器中的 transform 属性进行控制，此时需要处理序列化/反序列化等情况，同时字段名称风格的自动转换将不会发生，这需要自己去控制
3. Field 装饰器的 ignore 属性控制了某个字段是否参与序列化/反序列化，这在一些特殊场景下很有用，如：某个字段只在前端使用，不需要传递给后端，或者某个字段只在后端使用，不需要传递给前端
4. Field 装饰器的 flatOnSerialize 控制了序列化时该数据会展平到父对象中：如：`{ nested: { a: 1, b: 2 } }` 会被展平为 `{ b: 1 }`（其中 nested 属性配置了flatOnSerialize ）。
5. Field 装饰器的 nestOnDeserialize 控制了反序列化时该数据来源为父对象中：如：`{ a: 1, b: 2 }` 会被嵌套到 `{ nested: { b: 1 } }` 中（其中 nested 属性配置了 nestOnDeserialize）。

> 注意
>
> flatOnSerialize 和 nestOnDeserialize 是全量复制，不会进行检测有哪些成员才是需要的，因为目前来说，对于单纯只是用 interface 和 type 进行类型标注的情况，很难获取到成员的类型信息，所以只能全量复制，如果需要更精确的控制，可以通过 transform 属性。

## 数据校验

通过 Validator 装饰器，将需要的校验函数定义在类成员上，然后通过 validate() 方法进行校验，这里内置了几个校验函数，可以在 `src/utils/validator.ts` 中找到。

## Model 操作

BaseModel 还定义了几个方法：

1. clone - 克隆一个 Model 实例
2. merge - 将一个目标对象合并到当前 Model 实例中，可以指定合并哪些字段
3. mix - 与 merge 类似，但会返回一个新的实例，原实例的属性不会变更

这些方法在有些场景会非常有用：假如想修改当前个用户的信息（一个 `User` Model 作为全局状态），可以 clone 出一个新的实例，新实例双向绑定到表单组件，修改完成且更新请求成功后，将这个实例 merge 到原实例中，这样就可以实现修改用户信息的功能。

## 增删改查

`src/model/behavior/CRUD.ts` 规定了 Model 需要实现的增删改查方法，这里只是定义了接口，具体的实现需要在 Model 中自行实现。但一般后端对于一个实体的CRUD的接口设计基本都遵守一样的规范，所以在`src/model/behavior/CRUD.ts`中提供了一个 `CRUDDeriver`，搭配 `Derive` 装饰器使用，可以自动实现这些方法，具体使用方法可以参考 `src/model/behavior/CRUD.ts` 中的注释。

需要注意的是，当使用 `Derive` 装饰器去派生 CRUD 时，需要手动添加类型标注以确保 class 的类型正确：

```ts
@Model()
@Derive(CRUDDeriver('user'))
interface User extends BaseModel {
  // ...
}

// 需要手动增加下面这一行
interface User extends CRUD<User> {}
```

除此之外，behavior 下的几个抽象类也和 CRUD 有关，Query 规定 Model 上需要有一个 query 成员，该成员在 derive 出的 CRUD 方法中会被用到，它会被序列化作为 params 请求参数。而 Entity 规定 Model 需要有一个 id 成员，该成员在 derive 出的 CRUD 方法作为请求url判断的依据。

> 事实上，CRUDDeriver 只要求 Model 实例上有 query 和 id 成员，并不知道 Model 是否手动使用 implements 进行了类约束，但即便这样，仍然推荐添加 implements 代码，防止 query 和 id 意义不明确。

```ts
// bad
@Model()
class User extends BaseModel {
  id: number
  query: Record<string, any>
}

// good
@Model()
class User extends BaseModel implements Entity, Query {
  id: number
  // query only for serialization as request params
  @Field({ ignore: { onDeserialize: true } })
  query: Record<string, any>
}
```

## 注意

类如Vue、React的前端框架中，MVVM 本就是 Model 与 View 相互对应，但对于后端数据 Entity 来说，我们一般都单独建一个 api 文件夹来进行操作，使用 interface 进行类型约束，而该项目的本质目标就是为了提高 View 和 Entity 的逻辑耦合，以 Model 为中心去连接 View 和 Entity，因此不是所有视图需要的数据模型都需要去单独建一个 Model，如果只是纯粹的视图逻辑，应该尽可能将这些代码放在组件中，交由框架本身去管理，防止矫枉过正。