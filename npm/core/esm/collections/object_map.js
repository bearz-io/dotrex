import { ProxyMap } from "./proxy_map.js";
import { none, some } from "@bearz/option";
export class ObjectMap extends ProxyMap {
    array(key) {
        const value = this.get(key);
        if (value === undefined || value === null) {
            return none();
        }
        if (!Array.isArray(value)) {
            return none();
        }
        return some(value);
    }
    string(key) {
        const value = this.get(key);
        if (value === undefined || value === null) {
            return none();
        }
        if (typeof value !== "string") {
            return none();
        }
        return some(value);
    }
    boolean(key) {
        const value = this.get(key);
        if (value === undefined || value === null) {
            return none();
        }
        switch (typeof value) {
            case "boolean":
                return some(value);
            case "string":
                return some(value === "true" || value === "1");
            case "number":
                return some(value !== 0);
            case "bigint":
                return some(value !== 0n);
            default:
                return none();
        }
    }
    int(key) {
        const value = this.get(key);
        if (value === undefined || value === null) {
            return none();
        }
        switch (typeof value) {
            case "number": {
                if (!Number.isInteger(value)) {
                    return none();
                }
                return some(value);
            }
            case "boolean":
                return some(value ? 1 : 0);
            case "bigint": {
                const n = Number(value);
                if (!Number.isInteger(n)) {
                    return none();
                }
                return some(n);
            }
            case "string": {
                if (value === "") {
                    return none();
                }
                const n = Number.parseInt(value);
                if (!Number.isNaN(n)) {
                    return some(n);
                }
                return none();
            }
            default:
                return none();
        }
    }
    bigint(key) {
        const value = this.get(key);
        if (value === undefined || value === null) {
            return none();
        }
        switch (typeof value) {
            case "number":
                if (!Number.isInteger(value)) {
                    return none();
                }
                return some(BigInt(value));
            case "boolean":
                return some(value ? BigInt(1) : BigInt(0));
            case "bigint":
                return some(value);
            case "string": {
                if (value === "") {
                    return none();
                }
                const n = Number.parseInt(value);
                if (isNaN(n)) {
                    return none();
                }
                return some(BigInt(n));
            }
            default:
                return none();
        }
    }
    number(key) {
        const value = this.get(key);
        if (value === undefined || value === null) {
            return none();
        }
        switch (typeof value) {
            case "number":
                return some(value);
            case "boolean":
                return some(value ? 1 : 0);
            case "bigint":
                return some(Number(value));
            case "string": {
                if (value === "") {
                    return none();
                }
                const n = Number.parseFloat(value);
                if (!Number.isNaN(n)) {
                    return some(n);
                }
                return none();
            }
            default:
                return none();
        }
    }
}
