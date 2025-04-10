import { boolean } from "@dotrex/flags";
import { Type } from "../type.js";
/** Boolean type with auto completion. Allows `true`, `false`, `0` and `1`. */
export class BooleanType extends Type {
    /** Parse boolean type. */
    parse(type) {
        return boolean(type);
    }
    /** Complete boolean type. */
    complete() {
        return ["true", "false"];
    }
}
