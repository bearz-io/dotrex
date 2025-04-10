import { type Option } from "@bearz/option";
import { ProxyMap } from "./proxy_map.js";
export declare class StringMap extends ProxyMap<string> {
  static fromObject(obj: Record<string, string>): StringMap;
  toObject(): Record<string, string>;
  boolean(key: string): Option<boolean>;
  int(key: string): Option<number>;
  bigint(key: string): Option<bigint>;
  number(key: string): Option<number>;
}
