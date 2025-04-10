import { Type } from "../type.js";
import { integer } from "@dotrex/flags";
/** Integer type. */
export class IntegerType extends Type {
  /** Parse integer type. */
  parse(type) {
    return integer(type);
  }
}
