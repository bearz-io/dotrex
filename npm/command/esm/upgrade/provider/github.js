import { Provider } from "../provider.js";
import { bold, brightBlue } from "@bearz/ansi/styles";
export class GithubProvider extends Provider {
    name = "github";
    repositoryUrl = "https://github.com/";
    registryUrl = "https://raw.githubusercontent.com/";
    apiUrl = "https://api.github.com/repos/";
    repositoryName;
    listBranches;
    githubToken;
    constructor({ repository, branches = true, token, main, logger }) {
        super({ main, logger });
        this.repositoryName = repository;
        this.listBranches = branches;
        this.githubToken = token;
    }
    async getVersions(_name) {
        const [tags, branches] = await Promise.all([
            this.gitFetch("git/refs/tags"),
            this.gitFetch("branches"),
        ]);
        const tagNames = tags
            .map((tag) => tag.ref.replace(/^refs\/tags\//, ""))
            .reverse();
        const branchNames = branches
            .sort((a, b) => (a.protected === b.protected) ? 0 : (a.protected ? 1 : -1))
            .map((tag) => `${tag.name} ${tag.protected ? `(${bold("Protected")})` : ""}`)
            .reverse();
        return {
            versions: [
                ...tagNames,
                ...branchNames,
            ],
            latest: tagNames[0],
            tags: tagNames,
            branches: branchNames,
        };
    }
    getRepositoryUrl(_name, version) {
        return new URL(
            `${this.repositoryName}${version ? `/releases/tag/${version}` : ""}`,
            this.repositoryUrl,
        ).href;
    }
    getRegistryUrl(_name, version) {
        return new URL(`${this.repositoryName}/${version}`, this.registryUrl).href;
    }
    async listVersions(name, currentVersion) {
        const { tags, branches } = await this.getVersions(name);
        const showBranches = !!this.listBranches && branches.length > 0;
        const indent = showBranches ? 2 : 0;
        if (showBranches) {
            console.log("\n" + " ".repeat(indent) + bold(brightBlue("Tags:\n")));
        }
        super.printVersions(tags, currentVersion, { indent });
        if (showBranches) {
            console.log("\n" + " ".repeat(indent) + bold(brightBlue("Branches:\n")));
            super.printVersions(branches, currentVersion, { maxCols: 5, indent });
            console.log();
        }
    }
    getApiUrl(endpoint) {
        return new URL(`${this.repositoryName}/${endpoint}`, this.apiUrl).href;
    }
    async gitFetch(endpoint) {
        const headers = new Headers({ "Content-Type": "application/json" });
        if (this.githubToken) {
            headers.set("Authorization", this.githubToken ? `token ${this.githubToken}` : "");
        }
        const response = await fetch(this.getApiUrl(endpoint), {
            method: "GET",
            cache: "default",
            headers,
        });
        if (!response.status) {
            throw new Error("couldn't fetch versions - try again after sometime");
        }
        const data = await response.json();
        if (
            typeof data === "object" && "message" in data &&
            "documentation_url" in data
        ) {
            throw new Error(data.message + " " + data.documentation_url);
        }
        return data;
    }
}
