import { Type } from "../type.js";
import { InvalidTypeError } from "@dotrex/flags";
/** Enum type. Allows only provided values. */
export class EnumType extends Type {
  allowedValues;
  constructor(values) {
    super();
    this.allowedValues = Array.isArray(values) ? values : Object.values(values);
  }
  parse(type) {
    for (const value of this.allowedValues) {
      if (value.toString() === type.value) {
        return value;
      }
    }
    throw new InvalidTypeError(type, this.allowedValues.slice());
  }
  values() {
    return this.allowedValues.slice();
  }
  complete() {
    return this.values();
  }
}
