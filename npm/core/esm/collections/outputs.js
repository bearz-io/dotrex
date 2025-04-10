import { ObjectMap } from "./object_map.js";
export class Outputs extends ObjectMap {
    static fromObject(obj) {
        const map = new Outputs();
        for (const [key, value] of Object.entries(obj)) {
            map.set(key, value);
        }
        return map;
    }
}
