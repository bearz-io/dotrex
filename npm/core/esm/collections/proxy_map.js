import { none, some } from "@bearz/option";
function proxy(map) {
  return new Proxy({}, {
    get(_, key) {
      if (typeof key === "string" && key !== "") {
        return map.get(key);
      }
      return undefined;
    },
    deleteProperty(_, key) {
      if (typeof key !== "string") {
        return false;
      }
      return map.delete(key);
    },
    has(_, key) {
      if (typeof key !== "string") {
        return false;
      }
      return map.has(key);
    },
    ownKeys(_) {
      return Array.from(map.keys());
    },
    set(_, key, value) {
      if (typeof key !== "string") {
        return false;
      }
      map.set(key, value);
      return true;
    },
  });
}
export class ProxyMap extends Map {
  #proxy;
  empty() {
    return this.size === 0;
  }
  get proxy() {
    if (!this.#proxy) {
      this.#proxy = proxy(this);
    }
    return this.#proxy;
  }
  exists(key) {
    const value = this.get(key);
    return value !== undefined && value !== null;
  }
  merge(obj) {
    if (obj instanceof ProxyMap) {
      obj = obj.toObject();
    }
    for (const [key, value] of Object.entries(obj)) {
      this.set(key, value);
    }
    return this;
  }
  tryGet(key) {
    const value = this.get(key);
    if (value === undefined || value === null) {
      return none();
    }
    return some(value);
  }
  query(path) {
    const keys = path.split(".");
    let value = this;
    for (const key of keys) {
      if (value === null || value === undefined) {
        return none();
      }
      if (Array.isArray(value)) {
        const index = Number.parseInt(key);
        if (Number.isNaN(index)) {
          return none();
        }
        value = value[index];
        continue;
      }
      if (value instanceof ProxyMap) {
        if (!value.has(key)) {
          return none();
        }
        value = value.get(key);
        continue;
      }
      if (typeof value === "object" && value !== null) {
        value = value[key];
        continue;
      }
      return none();
    }
    return some(value);
  }
  toObject() {
    return Object.fromEntries(this.entries());
  }
}
