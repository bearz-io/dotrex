import { StringType } from "./string.js";
/** Completion list type. */
export class ActionListType extends StringType {
    cmd;
    constructor(cmd) {
        super();
        this.cmd = cmd;
    }
    /** Complete action names. */
    complete() {
        return this.cmd.getCompletions()
            .map((type) => type.name)
            // filter unique values
            .filter((value, index, self) => self.indexOf(value) === index);
    }
}
