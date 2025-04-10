import { DefaultPipelineWriter } from "@bearz/ci-env/writer";
import { CI_DRIVER } from "@bearz/ci-env/driver";
import { gray, magenta, reset, rgb24 } from "@bearz/ansi/styles";
import { AnsiModes } from "@bearz/ansi/enums";
export const groupSymbol =
    "\x1b[38;2;60;0;255m❯\x1b[39m\x1b[38;2;90;0;255m❯\x1b[39m\x1b[38;2;121;0;255m❯\x1b[39m\x1b[38;2;151;0;255m❯\x1b[39m\x1b[38;2;182;0;255m❯\x1b[39m";
export const jobSymbol =
    "\x1b[38;2;255;0;0m❯\x1b[39m\x1b[38;2;208;0;35m❯\x1b[39m\x1b[38;2;160;0;70m❯\x1b[39m\x1b[38;2;113;0;105m❯\x1b[39m\x1b[38;2;65;0;140m❯\x1b[39m";
export const deploySymbol =
    "\x1b[38;2;60;0;255m❯\x1b[39m\x1b[38;2;54;51;204m❯\x1b[39m\x1b[38;2;48;102;153m❯\x1b[39m\x1b[38;2;42;153;102m❯\x1b[39m\x1b[38;2;36;204;51m❯\x1b[39m";
export class DefaultHostWriter extends DefaultPipelineWriter {
    setLogLevel(level) {
        super.level = level;
        return this;
    }
    skipGroup(name) {
        switch (CI_DRIVER) {
            case "azdo":
                this.writeLine(`##[group]${name} (Skipped)`);
                this.endGroup();
                return this;
            case "github":
                this.writeLine(`::group::${name} (Skipped)`);
                this.endGroup();
                return this;
            default:
                if (this.settings.stdout === true) {
                    if (this.settings.mode === AnsiModes.TwentyFourBit) {
                        this.write(groupSymbol).write(reset(" "));
                        this.write(`${rgb24(name, 0xb400ff)} (Skipped)`).writeLine();
                        this.endGroup();
                        return this;
                    }
                    this.writeLine(magenta(`❯❯❯❯❯ ${name} `) + gray("(Skipped)"));
                    this.endGroup();
                    return this;
                }
                this.writeLine(`❯❯❯❯❯ ${name} (Skipped)`);
                this.endGroup();
                return this;
        }
    }
}
/**
 * The default host writer.
 */
export const writer = new DefaultHostWriter();
