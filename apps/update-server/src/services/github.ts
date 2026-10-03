import type { UpdateServerChannel } from "@clipboard-sync/shared/schemas/update-server";

export type GitHubAsset = {
  name: string;
  browser_download_url: string;
};

export type GitHubRelease = {
  tag_name: string;
  name: string | null;
  draft: boolean;
  prerelease: boolean;
  assets: GitHubAsset[];
};

export type GitHubResolvedUpdateUrl = {
  url: string;
  tag: string;
};

export class GitHubService {
  readonly owner: string;
  readonly repo: string;

  constructor(owner: string, repo: string) {
    this.owner = owner;
    this.repo = repo;
  }

  async getLatestRelease(
    channel: UpdateServerChannel,
  ): Promise<GitHubRelease | null> {
    const url =
      channel === "release"
        ? `https://api.github.com/repos/${this.owner}/${this.repo}/releases/latest`
        : `https://api.github.com/repos/${this.owner}/${this.repo}/releases?per_page=1`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "clipboard-sync-update-server",
        Accept: "application/vnd.github.v3+json",
      },
      cf: {
        cacheTtl: 60,
        cacheEverything: true,
      },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(
        `GitHub API request failed with status ${response.status}: ${response.statusText}`,
      );
    }

    if (channel === "release") {
      return response.json<GitHubRelease>();
    }

    const releases = await response.json<GitHubRelease[]>();

    return releases[0] ?? null;
  }

  async resolveUpdateUrl(
    channel: UpdateServerChannel,
  ): Promise<GitHubResolvedUpdateUrl | null> {
    const release = await this.getLatestRelease(channel);

    if (!release || release.draft) {
      return null;
    }

    if (channel === "release" && release.prerelease) {
      return null;
    }

    const latestJsonAsset = release.assets.find(
      (asset) => asset.name === "latest.json",
    );

    if (latestJsonAsset) {
      return {
        url: latestJsonAsset.browser_download_url,
        tag: release.tag_name,
      };
    }

    return null;
  }
}
