import { Command } from "../command.js";
import { dim, italic } from "@bearz/ansi/styles";
import { ZshCompletionsGenerator } from "./_zsh_completions_generator.js";
/** Generates zsh completions script. */
export class ZshCompletionsCommand extends Command {
    #cmd;
    constructor(cmd) {
        super();
        this.#cmd = cmd;
        return this
            .description(() => {
                const baseCmd = this.#cmd || this.getMainCommand();
                return `Generate shell completions for zsh.

To enable zsh completions for this program add following line to your ${dim(italic("~/.zshrc"))}:

    ${dim(italic(`source <(${baseCmd.getPath()} completions zsh)`))}`;
            })
            .noGlobals()
            .option("-n, --name <command-name>", "The name of the main command.", {
                default: () => this.getMainCommand().getName(),
            })
            .action(({ name }) => {
                const baseCmd = this.#cmd || this.getMainCommand();
                console.log(ZshCompletionsGenerator.generate(name, baseCmd));
            });
    }
}
