import { Provider, type ProviderOptions, type Versions } from "../provider.js";
export interface NestLandProviderOptions extends ProviderOptions {
  name?: string;
}
export declare class NestLandProvider extends Provider {
  name: string;
  private readonly repositoryUrl;
  private readonly registryUrl;
  private readonly moduleName?;
  constructor({ name, main, logger }?: NestLandProviderOptions);
  getVersions(name: string): Promise<Versions>;
  getRepositoryUrl(name: string, version?: string): string;
  getRegistryUrl(name: string, version: string): string;
}
