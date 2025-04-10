import { StringType } from "./string.js";
/** String type with auto completion of child command names. */
export class ChildCommandType extends StringType {
    #cmd;
    constructor(cmd) {
        super();
        this.#cmd = cmd;
    }
    /** Complete child command names. */
    complete(cmd) {
        return (this.#cmd ?? cmd)?.getCommands(false)
            .map((cmd) => cmd.getName()) || [];
    }
}
