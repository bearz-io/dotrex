import { none, some } from "@bearz/option";
export class OrderedMap extends Map {
    #keys = [];
    // @ts-ignore TS2552
    keys() {
        return this.#keys[Symbol.iterator]();
    }
    // @ts-ignore TS2552
    values() {
        return this.#keys.map((key) => this.get(key))[Symbol.iterator]();
    }
    // @ts-ignore TS2552
    entries() {
        return this.#keys.map((key) => [key, this.get(key)])[Symbol.iterator]();
    }
    add(key, value) {
        if (!this.has(key)) {
            this.#keys.push(key);
            super.set(key, value);
            return true;
        }
        return false;
    }
    at(index) {
        const key = this.#keys[index];
        if (key === undefined) {
            return none();
        }
        const value = this.get(key);
        if (value === undefined) {
            return none();
        }
        return some([key, value]);
    }
    valueAt(index) {
        const key = this.#keys[index];
        if (key === undefined) {
            return none();
        }
        return some(this.get(key));
    }
    keyAt(index) {
        const key = this.#keys[index];
        if (key === undefined) {
            return none();
        }
        return some(key);
    }
    set(key, value) {
        if (!this.has(key)) {
            this.#keys.push(key);
        }
        return super.set(key, value);
    }
    delete(key) {
        const index = this.#keys.indexOf(key);
        if (index !== -1) {
            this.#keys.splice(index, 1);
        }
        return super.delete(key);
    }
    clear() {
        this.#keys = [];
        return super.clear();
    }
    toObject() {
        const obj = {};
        for (const key of this.#keys) {
            if (typeof key === "string") {
                obj[key] = this.get(key);
            }
            else if (typeof key === "symbol") {
                obj[key] = this.get(key);
            }
            else {
                const k = String(key);
                obj[k] = this.get(key);
            }
        }
        return obj;
    }
}
