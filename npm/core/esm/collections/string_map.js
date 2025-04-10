import { none, some } from "@bearz/option";
import { ProxyMap } from "./proxy_map.js";
import { equalFold } from "@bearz/strings/equal";
export class StringMap extends ProxyMap {
  static fromObject(obj) {
    const map = new StringMap();
    for (const [key, value] of Object.entries(obj)) {
      map.set(key, value);
    }
    return map;
  }
  toObject() {
    const obj = {};
    for (const [key, value] of this.entries()) {
      obj[key] = value;
    }
    return obj;
  }
  boolean(key) {
    const value = this.get(key);
    if (value === undefined || value === null) {
      return none();
    }
    return some(equalFold(value, "true") || equalFold(value, "1"));
  }
  int(key) {
    const value = this.get(key);
    if (value === undefined || value === null) {
      return none();
    }
    if (value === "") {
      return none();
    }
    const n = Number.parseInt(value);
    if (!Number.isNaN(n)) {
      return some(n);
    }
    return none();
  }
  bigint(key) {
    const value = this.get(key);
    if (value === undefined || value === null) {
      return none();
    }
    if (value === "") {
      return none();
    }
    if (value === "") {
      return none();
    }
    const n = Number.parseInt(value);
    if (isNaN(n)) {
      return none();
    }
    return some(BigInt(n));
  }
  number(key) {
    const value = this.get(key);
    if (value === undefined || value === null) {
      return none();
    }
    if (value === "") {
      return none();
    }
    const n = Number.parseFloat(value);
    if (!Number.isNaN(n)) {
      return some(n);
    }
    return none();
  }
}
