import { ProxyMap } from "./proxy_map.js";
import { type Option } from "@bearz/option";
export declare class ObjectMap extends ProxyMap<unknown> {
    array<T = unknown>(key: string): Option<T[]>;
    string(key: string): Option<string>;
    boolean(key: string): Option<boolean>;
    int(key: string): Option<number>;
    bigint(key: string): Option<bigint>;
    number(key: string): Option<number>;
}
