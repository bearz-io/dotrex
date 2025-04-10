import { Provider } from "../provider.js";
export class NestLandProvider extends Provider {
    name = "nest.land";
    repositoryUrl = "https://nest.land/package/";
    registryUrl = "https://x.nest.land/";
    moduleName;
    constructor({ name, main, logger } = {}) {
        super({ main, logger });
        this.moduleName = name;
    }
    async getVersions(name) {
        const response = await fetch(`https://nest.land/api/package-client`, {
            method: "post",
            body: JSON.stringify({ data: { name: this.moduleName ?? name } }),
            headers: { "Content-Type": "application/json" },
        });
        if (!response.ok) {
            throw new Error("couldn't fetch the latest version - try again after sometime");
        }
        // deno-lint-ignore no-explicit-any
        const { body: { latestVersion, packageUploadNames } } = await response.json();
        const stripPackageName = (version) => {
            return version.replace(new RegExp(`^${this.moduleName ?? name}@`), "");
        };
        return {
            latest: stripPackageName(latestVersion),
            versions: packageUploadNames.map((version) => stripPackageName(version))
                .reverse(),
        };
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
