import { type Option } from "@bearz/option";
export declare class OrderedMap<K, V> extends Map<K, V> {
  #private;
  keys(): MapIterator<K>;
  values(): MapIterator<V>;
  entries(): MapIterator<[K, V]>;
  add(key: K, value: V): boolean;
  at(index: number): Option<[K, V]>;
  valueAt(index: number): Option<V>;
  keyAt(index: number): Option<K>;
  set(key: K, value: V): this;
  delete(key: K): boolean;
  clear(): void;
  toObject(): Record<string | symbol, V>;
}
