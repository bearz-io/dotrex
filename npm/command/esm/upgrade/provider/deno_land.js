import { Provider } from "../provider.js";
export class DenoLandProvider extends Provider {
    name = "deno.land";
    repositoryUrl = "https://deno.land/x/";
    registryUrl = "https://deno.land/x/";
    moduleName;
    constructor({ name, main, logger } = {}) {
        super({ main, logger });
        this.moduleName = name;
    }
    async getVersions(name) {
        const response = await fetch(
            `https://cdn.deno.land/${this.moduleName ?? name}/meta/versions.json`,
        );
        if (!response.ok) {
            throw new Error("couldn't fetch the latest version - try again after sometime");
        }
        return await response.json();
    }
    getRepositoryUrl(name, version) {
        return new URL(
            `${this.moduleName ?? name}${version ? `@${version}` : ""}`,
            this.repositoryUrl,
        ).href;
    }
    getRegistryUrl(name, version) {
        return new URL(`${this.moduleName ?? name}@${version}`, this.registryUrl)
            .href;
    }
}
