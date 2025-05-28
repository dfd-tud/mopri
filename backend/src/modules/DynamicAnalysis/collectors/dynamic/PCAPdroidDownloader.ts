// SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import globalCacheDir from 'global-cache-dir'
import { downloadRelease } from "@terascope/fetch-github-release";

import {
  GithubRelease,
  GithubReleaseAsset,
} from "@terascope/fetch-github-release/dist/src/interfaces.js";

export class PCAPdroidDownloader {
  private user = "emanuele-f";
  private repo = "PCAPdroid";

  constructor(
    private version: string = "latest",
    private outputdir?: string,
  ) {}

  private filterRelease(): (release: GithubRelease) => boolean {
    return (release: GithubRelease) =>
      this.version === "latest" || release.tag_name.includes(this.version);
  }

  private filterAsset(asset: GithubReleaseAsset): boolean {
    const regex = /^PCAPdroid(_v\d+(\.\d+)*\.apk)?$/;
    return regex.test(asset.name);
  }

  public async retrieveApk(): Promise<string> {
    if (!this.outputdir){
      this.outputdir = await globalCacheDir('mopri'); 
    }
    const paths: string[] = await downloadRelease(
      this.user,
      this.repo,
      this.outputdir,
      this.filterRelease(),
      this.filterAsset,
      true,
      false,
    );

    if (paths.length === 1) {
      return paths[0];
    } else if (paths.length >= 1) {
      throw Error("Multiple packages with that version found");
    } else {
      throw Error("No releases found");
    }
  }
}
