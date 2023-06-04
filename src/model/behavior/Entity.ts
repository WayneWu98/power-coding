/**
 * every entity should have an id as unique identifier
 */
export default abstract class Entity<T extends number | string = number> {
  id: T
}
