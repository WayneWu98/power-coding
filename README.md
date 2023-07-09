# Power Coding

English | [中文简体](./README.zh_CN.md)

The goal of this project is to looking for a way to improve the efficiency of coding, and handle the logic between View, ViewModel and Entity in concise way, to strengthen the coupling of logic. Bring View and Entity together by centering on ViewModel. Under the power decorator and meta-coding, write declarative code, and make code more readable and maintainable.

## Features

1. Aggregate the logic of View and Entity in ViewModel, and make the logic more concise and clear.
2. Handle data conversion between front-end and back-end:
   1. naming-case conversion
   2. data type conversion
   3. data structure
3. write declarative code with the help of decorator and meta-coding
4. avoid writing repetitive code

## Project Structure

### src/decorator

This folder contains base decorators for inject metadata and extend behaviors for class or class-members.

- Derive - class decorator, call it and pass some Derivers to extending extra logic for class, now we provide CRUDDeriver for generating CRUD methods, PageableListDeriver for generating pageable list methods and ScrollableListDeriver for generating scrollable list methods, explore `src/model/behavior` for more details
- Field - class-member decorator, call it and pass some FieldOptions to inject metadata for class-member, and call `getField()` to get these metadata
- Model - class decorator, call it and pass some ModelOptions to inject metadata for class, and call `getModel()` to get these metadata
- Validator - class-member decorator for adding data-validator for class-members, call it and pass some validators, and call `validate()` or `validate('someField')` validate whether is valid or not

### src/model

Here are some base models, you just need to focus on `BaseModel` and some abstract class in `src/model/behavior/`.

- BaseModel - every model should extends it, it provides some basic model operation methods such as `getField()`, `getModel()`, `validate()`, `from`, these methods use with decorators above
- behavior/* - here are some abstract class for constraint model behavior:
  - CRUD - model can be created, read, updated and deleted
  - PageableList - model can be load by page
  - ScrollableList - model can be load by scroll
  - Entity - mark model is a entity, it should have a unique id
  - Query - mark model has a query property

### src/components

Here are some components highly integrated with Model, such as `TableModel`, it is a table component for displaying model item, look at `src/pages/dashboard/index.vue` for more details.

## Abilities

### Serialization / Deserialization

> by the beginning, we appoint that: serialization means convert data from class-instance to pure js object, deserialization means convert data from pure js object to class-instance.

By calling Model.from(), we can deserialize data from pure js object to class-instance, and by calling Model.to() to serialize data from class-instance to pure js object. And something happened when we call these methods:

1. naming-case of field will be converted automatically, by the default, serializing to snake-case and deserializing to camel-case, you can change it at `src/config.ts`. or this behavior would be override when specify rename option in Model decorator or specify fieldName option in Field decorator.
2. data type of field will be transformed automatically, we can control transforming behavior by specify type option or transform option in Field decorator. pay attention that, type and transform are kindly different, and you should take care about the conversion ofr naming case, because naming-case conversion will not be executed when you specify transform option.
3. the option ignore of Field decorator can be used to control whether should be ignore when serializing or deserializing. it is useful because some fields are not necessary in back-end.
4. the option flagOnSerialize of Field decorator control an object will be flatted when serialize, for example: `{ nested: { a: 1, b: 2 } }` will be flatted to `{ b: 1 }` (nested was set to be flagOnSerialize).
5. the option nestOnDeserialize control some fields will be nest as a new object. for example: `{ a: 1, b: 2 }` will be nested as `{ nested: { b: 1 } }` (nested was set to be nestOnDeserialize).

### Data Validation

Decorate some field with Validator decorator, and pass some validators to it, then call validate() or validate('someField') to validate data. there are some built-in validators, you can find them at `src/utils/validator.ts`.

### Model Operations

Model provides some basic operations for model:

1. clone - clone a new model instance
2. merge - merge data from another model instance to current
3. mix - mix data from another model instance and current instance to be a new

TODO...