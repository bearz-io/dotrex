import { Provider } from "../provider.js";
export class JsrProvider extends Provider {
    name = "jsr";
    repositoryUrl = "https://jsr.io/";
    packageName;
    packageScope;
    constructor({ main, logger, ...options }) {
        super({ main, logger });
        this.packageScope = "package" in options
            ? options.package.split("/")[0].slice(1)
            : options.scope;
        this.packageName = "package" in options ? options.package.split("/")[1] : options.name;
    }
    async getVersions(name) {
        const response = await fetch(`${this.getRepositoryUrl(name)}/meta.json`);
        if (!response.ok) {
            throw new Error("couldn't fetch the latest version - try again after sometime");
        }
        const { latest, versions } = await response.json();
        return {
            latest,
            versions: Object.keys(versions),
        };
    }
    getRepositoryUrl(name, version) {
        return new URL(
            `@${this.packageScope}/${this.packageName ?? name}${version ? `@${version}` : ""}`,
            this.repositoryUrl,
        ).href;
    }
    getRegistryUrl(name, version) {
        return `jsr:@${this.packageScope}/${this.packageName ?? name}@${version}`;
    }
}
