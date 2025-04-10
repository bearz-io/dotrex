import type { ServiceProvider } from "@dotrex/core/types";
import { type Result } from "@bearz/result";
/**
 * The service factory type that creates a service.
 */
export type ServiceFactory = (s: ServiceProvider) => unknown;
/**
 * The lifecycle of a service.
 * * singleton: A single instance is created and shared across the application.
 * * transient: A new instance is created every time the service is requested.
 * * scoped: A new instance is created for each scope.
 */
export type Lifecycle = "singleton" | "transient" | "scoped";
/**
 * The descriptor for a service.
 */
export interface Descriptor {
    /**
     * The key of the service.
     */
    key: string;
    /**
     * The factory function that creates the service.
     */
    factory: ServiceFactory;
    /**
     * The lifecycle of the service.
     */
    lifecycle: Lifecycle;
}
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
export declare class ServicesContainer implements ServiceProvider {
    #private;
    /**
     * Creates a new ServicesContainer.
     * @param parent The parent services container to inherit from.
     */
    constructor(parent?: ServicesContainer);
    /**
     * Removes a registration for a given key.
     * @param key The key to remove the registration for.
     */
    removeRegistration(key: string): void;
    /**
     * Registers a service descriptor.
     * @param descriptor The descriptor to register.
     */
    register(descriptor: Descriptor): void;
    /**
     * Sets a singleton value and makes it immediately available.
     * @param key The key to set.
     * @param value The singleton value to set.
     */
    set(key: string, value: unknown): void;
    /**
     * Asynchronously registers a service descriptor.
     * @param key The key to register.
     * @param lifecycle The lifecycle of the service.
     * @param fn The async function that returns a service factory.
     */
    registerAsync(key: string, lifecycle: Lifecycle, fn: () => Promise<ServiceFactory> | ServiceFactory): Promise<void>;
    /**
     * Registers a singleton value.
     * @param key The key to set.
     * @param value The singleton value to set.
     */
    registerSingletonValue(key: string, value: unknown): void;
    /**
     * Registers a singleton factory which will be used to
     * create a new instance of the service only once globally.
     * @param key The key to set.
     * @param factory The singleton factory to set.
     */
    registerSingleton(key: string, factory: ServiceFactory): void;
    /**
     * Registers a transient factory which will be used to
     * create a new instance of the service every time it is requested.
     * @param key The key to set.
     * @param factory The transient factory to set.
     */
    registerTransient(key: string, factory: ServiceFactory): void;
    /**
     * Registers a scoped factory which will be used to
     * create a new instance of the service once for each scope.
     * @param key The key to set.
     * @param factory The scoped factory to set.
     */
    registerScoped(key: string, factory: ServiceFactory): void;
    /**
     * Only registers a service descriptor if the key is not already registered.
     * @param descriptor The descriptor to register.
     */
    tryRegister(descriptor: Descriptor): boolean;
    /**
     * Only registers a singleton factory if one is not already registered.
     * The singleton factory which will be used to create a new instance of the service
     * only once globally.
     * @param key The key to register.
     * @param factory The singleton factory to set.
     */
    tryRegisterSingleton(key: string, factory: ServiceFactory): boolean;
    /**
     * Only registers a singleton value if one is not already registered.
     * The singleton value which will be used to create a new instance of the service
     * only once globally.
     * @param key The key to register.
     * @param value The singleton value to set.
     */
    tryRegisterSingletonValue(key: string, value: unknown): boolean;
    /**
     * Only registers a transient factory if one is not already registered.
     * The transient factory which will be used to create a new instance of the service
     * every time it is requested.
     * @param key The key to register.
     * @param factory The transient factory to set.
     */
    tryRegisterTransient(key: string, factory: ServiceFactory): boolean;
    /**
     * Only registers a scoped factory if one is not already registered.
     * The scoped factory which will be used to create a new instance of the service
     * once for each scope.
     * @param key The key to register.
     * @param factory The transient factory to set.
     */
    tryRegisterScoped(key: string, factory: ServiceFactory): boolean;
    /**
     * Enumerates all services of a given key.
     * @param key The key to get the service.
     * @returns An array of services for the given key.
     */
    enumerate<T = unknown>(key: string): T[];
    /**
     * Resolves a service of a given key. If multiple services are registered,
     * the first one will be returned.
     *
     * @param key The key to get the service.
     * @returns A service of a given key.
     * @throws An error if there are issues during the creation of the service.
     */
    get<T = unknown>(key: string): T | undefined;
    /**
     * Asynchronously resolves a service of a given key. If multiple services are registered,
     * the first one will be returned.
     *
     * @param key The key to get the service.
     * @returns The service of a given key.
     */
    getAsync<T = unknown>(key: string): Promise<T | undefined>;
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
    require<T = unknown>(key: string): Result<T>;
    /**
     * Creates a new scope for the container. A scope is a child container that inherits from the parent container
     * which will have all the singleton instances of the parent container, but will create new instances of scoped services.
     *
     * @returns A scoped services container that can be used to create scoped instances.
     */
    createScope(): ServicesContainer;
    /**
     * Builds the collection into a ServiceProvider.
     * @returns The ServiceProvider.
     */
    build(): ServiceProvider;
    /**
     * Resolves a scoped instance which is local to the container. If the instance is not already created,
     * it will create it and cache it once per scope.
     * @param descriptor The descriptor to resolve.
     * @returns The scoped instance of the service.
     */
    private resolveScoped;
    /**
     * Resolves a singleton instance which is global. If the instance is not already created,
     * it will create it and cache it once globally.
     * @param descriptor The descriptor to resolve.
     * @returns The singleton instance of the service.
     */
    private resolveSingleton;
    /**
     * Disposes of the container.
     * @description
     * If the container is a root container, it will dispose of all singleton instances and scoped instances.
     * If instances are disposable, it will call the [Symbol.dispose] method on them.
     */
    [Symbol.dispose](): void;
    /**
     * Disposes of the container asynchernously.
     * @description
     * If the container is a root container, it will dispose of all singleton instances and scoped instances.
     * If instances are disposable, it will call the [Symbol.dispose] method on them.
     */
    [Symbol.asyncDispose](): Promise<void>;
}
