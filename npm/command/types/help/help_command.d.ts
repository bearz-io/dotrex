import { Command } from "../command.js";
import { CommandType } from "../types/command.js";
/** Generates well formatted and colored help output for specified command. */
export declare class HelpCommand extends Command<void, void, void, [commandName?: CommandType]> {
    constructor(cmd?: Command);
}
