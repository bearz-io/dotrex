import { Provider } from "../provider.js";
export class NpmProvider extends Provider {
  name = "npm";
  repositoryUrl = "https://npmjs.org/";
  apiUrl = "https://registry.npmjs.org/";
  packageName;
  packageScope;
  constructor({ main, logger, ...options } = {}) {
    super({ main, logger });
    if ("package" in options) {
      if (options.package.startsWith("@")) {
        this.packageScope = options.package.split("/")[0].slice(1);
        this.packageName = options.package.split("/")[1];
      } else {
        this.packageName = options.package;
      }
    } else {
      this.packageScope = options.scope;
      this.packageName = options.name;
    }
  }
  async getVersions(name) {
    const response = await fetch(
      new URL(this.#getPackageName(name), this.apiUrl),
    );
    if (!response.ok) {
      throw new Error(
        "couldn't fetch the latest version - try again after sometime",
      );
    }
    const { "dist-tags": { latest }, versions } = await response
      .json();
    return {
      latest,
      versions: Object.keys(versions).reverse(),
    };
  }
  getRepositoryUrl(name, version) {
    return new URL(
      `package/${this.#getPackageName(name)}${version ? `/v/${version}` : ""}`,
      this.repositoryUrl,
    ).href;
  }
  getRegistryUrl(name, version) {
    return `npm:${this.#getPackageName(name)}@${version}`;
  }
  #getPackageName(name) {
    return `${this.packageScope ? `@${this.packageScope}/` : ""}${
      this.packageName ?? name
    }`;
  }
}
