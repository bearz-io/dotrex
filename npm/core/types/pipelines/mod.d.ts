import type { Context } from "../context.js";
export type Next = () => Promise<void> | void;
export type RexMiddleware<C extends Context = Context> = <C>(ctx: C, next: Next) => void | Promise<void>;
export declare abstract class Pipeline<O = void, C extends Context = Context> {
    #private;
    constructor();
    use(middleware: (ctx: C, next: Next) => void | Promise<void>): this;
    abstract run(ctx: C): Promise<O>;
    protected pipe(ctx: C): Promise<C>;
}
