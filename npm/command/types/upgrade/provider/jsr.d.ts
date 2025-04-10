import { Provider, type ProviderOptions, type Versions } from "../provider.js";
type Semver = `${number}.${number}.${number}` | `${number}.${number}.${number}-${string}`;
type Package = `@${string}/${string}`;
export type JsrProviderOptions =
    & ProviderOptions
    & ({
        package: Package;
    } | {
        scope: string;
        name?: string;
    });
export declare class JsrProvider extends Provider {
    name: string;
    private readonly repositoryUrl;
    private readonly packageName?;
    private readonly packageScope;
    constructor({ main, logger, ...options }: JsrProviderOptions);
    getVersions(name: string): Promise<Versions>;
    getRepositoryUrl(name: string, version?: Semver): string;
    getRegistryUrl(name: string, version: Semver): string;
}
export {};
