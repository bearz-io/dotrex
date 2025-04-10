import { number } from "@dotrex/flags";
import { Type } from "../type.js";
/** Number type. */
export class NumberType extends Type {
  /** Parse number type. */
  parse(type) {
    return number(type);
  }
}
