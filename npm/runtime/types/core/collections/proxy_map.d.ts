import { type Option } from "@bearz/option";
export interface ProxyObject extends Record<string, unknown> {
}
export declare class ProxyMap<V = unknown> extends Map<string, V> {
    #private;
    empty(): boolean;
    get proxy(): ProxyObject;
    exists(key: string): boolean;
    merge(obj: Record<string, V> | ProxyMap<V>): this;
    tryGet(key: string): Option<V>;
    query(path: string): Option<V>;
    toObject(): Record<string, V>;
}
