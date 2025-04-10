import { fail, failAsError, ok } from "@bearz/result";
/**
 * The service container that manages the services.
 *
 * @description
 * A root container is created by default and can be accessed using the `getServices()` function.
 * A root container will dispose of all singleton instances and scoped instances when disposed. A
 * container with a parent will only dispose of the scoped instances.
 *
 * Dispose will call the [Symbol.dispose] method on instances/services that implement dispose.
 */
export class ServicesContainer {
    #resolvers = new Map();
    #singletonCache = new Map();
    #scopedCache = new Map();
    #root;
    /**
     * Creates a new ServicesContainer.
     * @param parent The parent services container to inherit from.
     */
    constructor(parent) {
        this.#root = true;
        if (parent) {
            // create a shallow clone of resolvers so that
            // it can be cleared and not reference the parent container.
            // and so that it can be modified without affecting the parent container.
            this.#resolvers = new Map(parent.#resolvers);
            this.#singletonCache = parent.#singletonCache;
            this.#scopedCache = new Map();
            this.#root = false;
        }
    }
    /**
     * Removes a registration for a given key.
     * @param key The key to remove the registration for.
     */
    removeRegistration(key) {
        this.#resolvers.delete(key);
    }
    /**
     * Registers a service descriptor.
     * @param descriptor The descriptor to register.
     */
    register(descriptor) {
        const desciptors = this.#resolvers.get(descriptor.key) ?? [];
        desciptors.push(descriptor);
        this.#resolvers.set(descriptor.key, desciptors);
    }
    /**
     * Sets a singleton value and makes it immediately available.
     * @param key The key to set.
     * @param value The singleton value to set.
     */
    set(key, value) {
        this.tryRegisterSingletonValue(key, value);
        const cache = this.#singletonCache.get(key) ?? [];
        cache[0] = value;
        this.#singletonCache.set(key, cache);
    }
    /**
     * Asynchronously registers a service descriptor.
     * @param key The key to register.
     * @param lifecycle The lifecycle of the service.
     * @param fn The async function that returns a service factory.
     */
    async registerAsync(key, lifecycle, fn) {
        this.register({
            key,
            factory: await fn(),
            lifecycle,
        });
    }
    /**
     * Registers a singleton value.
     * @param key The key to set.
     * @param value The singleton value to set.
     */
    registerSingletonValue(key, value) {
        this.register({
            key,
            factory: () => value,
            lifecycle: "singleton",
        });
    }
    /**
     * Registers a singleton factory which will be used to
     * create a new instance of the service only once globally.
     * @param key The key to set.
     * @param factory The singleton factory to set.
     */
    registerSingleton(key, factory) {
        this.register({
            key,
            factory,
            lifecycle: "singleton",
        });
    }
    /**
     * Registers a transient factory which will be used to
     * create a new instance of the service every time it is requested.
     * @param key The key to set.
     * @param factory The transient factory to set.
     */
    registerTransient(key, factory) {
        this.register({
            key,
            factory,
            lifecycle: "transient",
        });
    }
    /**
     * Registers a scoped factory which will be used to
     * create a new instance of the service once for each scope.
     * @param key The key to set.
     * @param factory The scoped factory to set.
     */
    registerScoped(key, factory) {
        this.register({
            key,
            factory,
            lifecycle: "scoped",
        });
    }
    /**
     * Only registers a service descriptor if the key is not already registered.
     * @param descriptor The descriptor to register.
     */
    tryRegister(descriptor) {
        if (!this.#resolvers.has(descriptor.key)) {
            this.register(descriptor);
            return true;
        }
        return false;
    }
    /**
     * Only registers a singleton factory if one is not already registered.
     * The singleton factory which will be used to create a new instance of the service
     * only once globally.
     * @param key The key to register.
     * @param factory The singleton factory to set.
     */
    tryRegisterSingleton(key, factory) {
        return this.tryRegister({
            key,
            factory,
            lifecycle: "singleton",
        });
    }
    /**
     * Only registers a singleton value if one is not already registered.
     * The singleton value which will be used to create a new instance of the service
     * only once globally.
     * @param key The key to register.
     * @param value The singleton value to set.
     */
    tryRegisterSingletonValue(key, value) {
        return this.tryRegister({
            key,
            factory: () => value,
            lifecycle: "singleton",
        });
    }
    /**
     * Only registers a transient factory if one is not already registered.
     * The transient factory which will be used to create a new instance of the service
     * every time it is requested.
     * @param key The key to register.
     * @param factory The transient factory to set.
     */
    tryRegisterTransient(key, factory) {
        return this.tryRegister({
            key,
            factory,
            lifecycle: "transient",
        });
    }
    /**
     * Only registers a scoped factory if one is not already registered.
     * The scoped factory which will be used to create a new instance of the service
     * once for each scope.
     * @param key The key to register.
     * @param factory The transient factory to set.
     */
    tryRegisterScoped(key, factory) {
        return this.tryRegister({
            key,
            factory,
            lifecycle: "scoped",
        });
    }
    /**
     * Enumerates all services of a given key.
     * @param key The key to get the service.
     * @returns An array of services for the given key.
     */
    enumerate(key) {
        const results = [];
        const descriptors = this.#resolvers.get(key) ?? [];
        let index = 0;
        for (const descriptor of descriptors) {
            switch (descriptor.lifecycle) {
                case "singleton":
                    results.push(this.resolveSingleton(descriptor, index));
                    break;
                case "transient":
                    results.push(descriptor.factory(this));
                    break;
                case "scoped":
                    results.push(this.resolveScoped(descriptor, index));
                    break;
            }
            index++;
        }
        return results;
    }
    /**
     * Resolves a service of a given key. If multiple services are registered,
     * the first one will be returned.
     *
     * @param key The key to get the service.
     * @returns A service of a given key.
     * @throws An error if there are issues during the creation of the service.
     */
    get(key) {
        const descriptors = this.#resolvers.get(key) ?? [];
        if (descriptors.length === 0) {
            return undefined;
        }
        const descriptor = descriptors[0];
        switch (descriptor.lifecycle) {
            case "singleton":
                return this.resolveSingleton(descriptor);
            case "transient":
                return descriptor.factory(this);
            case "scoped":
                return this.resolveScoped(descriptor);
        }
    }
    /**
     * Asynchronously resolves a service of a given key. If multiple services are registered,
     * the first one will be returned.
     *
     * @param key The key to get the service.
     * @returns The service of a given key.
     */
    async getAsync(key) {
        const value = this.get(key);
        if (value instanceof Promise) {
            return await value;
        }
        return value;
    }
    /**
     * Creates a required service. The function returns a `Result<T>` that is either a Ok result or an Err result.
     *
     * @description
     * If the service is not registered, the function returns a NotFoundError. If an error occurs while creating the service,
     * the function returns the error. If there are no errors, the function returns an Ok result with the service which
     * can be obtained by calling `unwrap()` on the result.
     *
     * This design forces the caller to make a decision on how to handle the error.
     *
     * @param key The key to get the service.
     * @returns A result that is Ok if the service is registered, otherwise an error.
     */
    require(key) {
        try {
            const result = this.get(key);
            if (result === undefined) {
                return fail(new Error(`Service not found: ${key}`));
            }
            return ok(result);
        }
        catch (e) {
            return failAsError(e);
        }
    }
    /**
     * Creates a new scope for the container. A scope is a child container that inherits from the parent container
     * which will have all the singleton instances of the parent container, but will create new instances of scoped services.
     *
     * @returns A scoped services container that can be used to create scoped instances.
     */
    createScope() {
        return new ServicesContainer(this);
    }
    /**
     * Builds the collection into a ServiceProvider.
     * @returns The ServiceProvider.
     */
    build() {
        // build is here as a placeholder for future functionality.
        return this;
    }
    /**
     * Resolves a scoped instance which is local to the container. If the instance is not already created,
     * it will create it and cache it once per scope.
     * @param descriptor The descriptor to resolve.
     * @returns The scoped instance of the service.
     */
    resolveScoped(descriptor, index = 0) {
        if (this.#scopedCache.has(descriptor.key)) {
            const cache = this.#scopedCache.get(descriptor.key) ?? [];
            if (index < cache.length) {
                return cache[index];
            }
        }
        const instance = descriptor.factory(this);
        const cache = this.#scopedCache.get(descriptor.key) ?? [];
        cache[index] = instance;
        this.#scopedCache.set(descriptor.key, cache);
        return instance;
    }
    /**
     * Resolves a singleton instance which is global. If the instance is not already created,
     * it will create it and cache it once globally.
     * @param descriptor The descriptor to resolve.
     * @returns The singleton instance of the service.
     */
    resolveSingleton(descriptor, index = 0) {
        if (this.#singletonCache.has(descriptor.key)) {
            const cache = this.#singletonCache.get(descriptor.key) ?? [];
            if (index < cache.length) {
                return cache[index];
            }
        }
        const instance = descriptor.factory(this);
        const cache = this.#singletonCache.get(descriptor.key) ?? [];
        cache[index] = instance;
        this.#singletonCache.set(descriptor.key, cache);
        return instance;
    }
    /**
     * Disposes of the container.
     * @description
     * If the container is a root container, it will dispose of all singleton instances and scoped instances.
     * If instances are disposable, it will call the [Symbol.dispose] method on them.
     */
    [Symbol.dispose]() {
        const scoped = Array.from(this.#scopedCache.values());
        for (const cache of scoped) {
            for (const instance of cache) {
                const disposable = instance;
                if (typeof disposable[Symbol.dispose] === "function") {
                    disposable[Symbol.dispose]();
                    continue;
                }
                const asyncDisposable = instance;
                if (typeof asyncDisposable[Symbol.asyncDispose] === "function") {
                    asyncDisposable[Symbol.asyncDispose]();
                }
            }
        }
        if (this.#root) {
            const global = Array.from(this.#singletonCache.values());
            for (const cache of global) {
                for (const instance of cache) {
                    const disposable = instance;
                    if (typeof disposable[Symbol.dispose] === "function") {
                        disposable[Symbol.dispose]();
                        continue;
                    }
                    const asyncDisposable = instance;
                    if (typeof asyncDisposable[Symbol.asyncDispose] === "function") {
                        asyncDisposable[Symbol.asyncDispose]();
                    }
                }
            }
            this.#singletonCache.clear();
        }
        this.#scopedCache.clear();
        // deferefence the singleton cache for the case
        // where it references the parent container.
        this.#singletonCache = new Map();
        this.#resolvers.clear();
    }
    /**
     * Disposes of the container asynchernously.
     * @description
     * If the container is a root container, it will dispose of all singleton instances and scoped instances.
     * If instances are disposable, it will call the [Symbol.dispose] method on them.
     */
    async [Symbol.asyncDispose]() {
        const scoped = Array.from(this.#scopedCache.values());
        for (const cache of scoped) {
            for (const instance of cache) {
                const disposable = instance;
                if (typeof disposable[Symbol.dispose] === "function") {
                    disposable[Symbol.dispose]();
                    continue;
                }
                const asyncDisposable = instance;
                if (typeof asyncDisposable[Symbol.asyncDispose] === "function") {
                    await asyncDisposable[Symbol.asyncDispose]();
                }
            }
        }
        if (this.#root) {
            const global = Array.from(this.#singletonCache.values());
            for (const cache of global) {
                for (const instance of cache) {
                    const disposable = instance;
                    if (typeof disposable[Symbol.dispose] === "function") {
                        disposable[Symbol.dispose]();
                        continue;
                    }
                    const asyncDisposable = instance;
                    if (typeof asyncDisposable[Symbol.asyncDispose] === "function") {
                        await asyncDisposable[Symbol.asyncDispose]();
                    }
                }
            }
            this.#singletonCache.clear();
        }
        this.#scopedCache.clear();
        // deferefence the singleton cache for the case
        // where it references the parent container.
        this.#singletonCache = new Map();
        this.#resolvers.clear();
    }
}
