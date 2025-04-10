import { Provider, type ProviderOptions, type Versions } from "../provider.js";
export interface GithubProviderOptions extends ProviderOptions {
    repository: string;
    branches?: boolean;
    token?: string;
}
export interface GithubVersions extends Versions {
    tags: Array<string>;
    branches: Array<string>;
}
export declare class GithubProvider extends Provider {
    name: string;
    private readonly repositoryUrl;
    private readonly registryUrl;
    private readonly apiUrl;
    private readonly repositoryName;
    private readonly listBranches?;
    private readonly githubToken?;
    constructor({ repository, branches, token, main, logger }: GithubProviderOptions);
    getVersions(_name: string): Promise<GithubVersions>;
    getRepositoryUrl(_name: string, version?: string): string;
    getRegistryUrl(_name: string, version: string): string;
    listVersions(name: string, currentVersion?: string): Promise<void>;
    private getApiUrl;
    private gitFetch;
}
