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

  async getReleases(): Promise<GitHubRelease[]> {
    const response = await fetch(
      `https://api.github.com/repos/${this.owner}/${this.repo}/releases?per_page=20`,
      {
        headers: {
          "User-Agent": "clipboard-sync-update-server",
          Accept: "application/vnd.github.v3+json",
        },
        cf: {
          cacheTtl: 60,
          cacheEverything: true,
        },
      },
    );

    if (!response.ok) {
      throw new Error(
        `GitHub API request failed with status ${response.status}: ${response.statusText}`,
      );
    }

    return response.json<GitHubRelease[]>();
  }

  async resolveUpdateUrl(
    channel: UpdateServerChannel,
  ): Promise<GitHubResolvedUpdateUrl | null> {
    const releases = await this.getReleases();

    for (const release of releases) {
      if (release.draft) {
        continue;
      }

      if (channel === "release" && release.prerelease) {
        continue;
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
    }

    return null;
  }
}
