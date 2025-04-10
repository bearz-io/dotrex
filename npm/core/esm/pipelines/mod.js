export class Pipeline {
  #middlewares;
  constructor() {
    this.#middlewares = [];
  }
  use(middleware) {
    this.#middlewares.push(middleware);
    return this;
  }
  async pipe(ctx) {
    let prevIndex = -1;
    // the first one added should be the first one run
    // so we reverse the array
    const ordered = this.#middlewares.slice().reverse();
    const runner = async (index, context) => {
      if (index === prevIndex) {
        throw new Error("next() called multiple times");
      }
      prevIndex = index;
      const middleware = ordered[index];
      if (middleware) {
        await middleware(context, () => {
          return runner(index + 1, context);
        });
      }
    };
    await runner(0, ctx);
    return ctx;
  }
}
