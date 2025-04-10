import { ObjectMap } from "./object_map.js";
export class Inputs extends ObjectMap {
  static fromObject(obj) {
    const map = new Inputs();
    for (const [key, value] of Object.entries(obj)) {
      map.set(key, value);
    }
    return map;
  }
}
