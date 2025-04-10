import type { Result } from "@bearz/result";
import type { StringMap } from "./collections/string_map.ts";
import type { Outputs } from "./collections/outputs.ts";
import type { Inputs } from "./collections/inputs.ts";

/**
 * The service provider interface.
 */
export interface ServiceProvider extends AsyncDisposable, Disposable {
    /**
     * Enumerates all services of a given key.
     * @param key The key to get the service.
     */
    enumerate<T = unknown>(key: string): T[];

    /**
     * Creates a service of a given key. If multiple services are registered,
     * the first one will be returned.
     * @param key The key to get the service.
     * @returns The service or undefined if the service is not registered.
     */
    get<T = unknown>(key: string): T | undefined;

    /**
     * Creates a required service. The function returns a `Result<T>` that is either a Ok result or an Err result.
     *
     * @description
     * If the service is not registered, the function returns a NotFoundError. If an error occurs while creating the service,
     * the function returns the error. If there are no errors, the function returns an Ok result with the service which
     * can be obtained by calling `unwrap()` on the result.
     *
     * This design forces the caller to handle the error and makes it easier to test the code and force
     * the caller to make a decision on how to handle the error.
     *
     * @param key The key to get the service.
     * @returns A result that is Ok if the service is registered, otherwise an error.
     */
    require<T = unknown>(key: string): Result<T>;

    /**
     * Creates a new scope for the container. A scope is a child container
     * that inherits singleton instances from the parent container and creates new instances of scoped services
     * and transient services.
     *
     * When the child container is disposed, it will dispose of
     * all scoped instances that are disposable.
     */
    createScope(): ServiceProvider;
}

export interface TaskModel extends Record<string, unknown> {
    id: string;

    uses: string;

    name: string;

    description: string;

    inputs: Inputs;

    outputs: Outputs;

    force: boolean;

    timeout: number;

    if: boolean;

    env: StringMap;

    cwd: string;

    needs: string[];
}
