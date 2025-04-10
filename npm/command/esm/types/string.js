import { string } from "@dotrex/flags";
import { Type } from "../type.js";
/** String type. Allows any value. */
export class StringType extends Type {
  /** Complete string type. */
  parse(type) {
    return string(type);
  }
}
