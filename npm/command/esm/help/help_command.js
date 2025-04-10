import { UnknownCommandError } from "../_errors.js";
import { exit } from "@bearz/process";
import { Command } from "../command.js";
import { CommandType } from "../types/command.js";
import { checkVersion } from "../upgrade/_check_version.js";
/** Generates well formatted and colored help output for specified command. */
export class HelpCommand extends Command {
  constructor(cmd) {
    super();
    return this
      .type("command", new CommandType())
      .arguments("[command:command]")
      .description("Show this help or the help of a sub-command.")
      .noGlobals()
      .action(async (_, name) => {
        if (!cmd) {
          cmd = name
            ? this.getGlobalParent()?.getBaseCommand(name)
            : this.getGlobalParent();
        }
        if (!cmd) {
          const cmds = this.getGlobalParent()?.getCommands();
          throw new UnknownCommandError(name ?? "", cmds ?? [], [
            this.getName(),
            ...this.getAliases(),
          ]);
        }
        await checkVersion(cmd);
        cmd.showHelp();
        if (this.shouldExit()) {
          exit(0);
        }
      });
  }
}
