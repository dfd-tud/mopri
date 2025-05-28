// SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import {
  EnrichedPermission,
  EnrichedPermissions,
  ProtectionLevel,
} from "@mopri/schema";
import { IStaticEnricher } from "./IStaticEnricher.js";
import { AndroidPermissions } from "./dependencies/AndroidPermissions.js";

export class PermissionsEnricher
  implements IStaticEnricher<string[], EnrichedPermissions>
{
  private AndroidPermissionTag: string = "android.permission.";
  private androidPermissions = AndroidPermissions;
  private removePrefix(permission: string): string {
    const prefix = permission.startsWith(this.AndroidPermissionTag);
    if (prefix) {
      return permission.slice(this.AndroidPermissionTag.length);
    }
    return permission;
  }

  private createEnrichedPermission(
    name: string,
    permissionData: string[],
  ): EnrichedPermission {
    return {
      name,
      protectionLevel: permissionData[0] as ProtectionLevel | undefined,
      summary: permissionData[1],
      description: permissionData[2],
    };
  }

  async enrich(rawData: string[]): Promise<EnrichedPermissions> {
    const systemPermissions: EnrichedPermission[] = [];
    const specialPermissions: EnrichedPermission[] = [];
    const customPermissions: string[] = [];

    rawData.forEach((p) => {
      const prefixRemoved = this.removePrefix(p);
      if (prefixRemoved in this.androidPermissions.MANIFEST_PERMISSION) {
        systemPermissions.push(
          this.createEnrichedPermission(
            prefixRemoved,
            this.androidPermissions.MANIFEST_PERMISSION[prefixRemoved],
          ),
        );
      } else if (prefixRemoved in this.androidPermissions.SPECIAL_PERMISSIONS) {
        specialPermissions.push(
          this.createEnrichedPermission(
            prefixRemoved,
            this.androidPermissions.SPECIAL_PERMISSIONS[prefixRemoved],
          ),
        );
      } else {
        customPermissions.push(p);
      }
    });
    return {
      systemPermissions,
      specialPermissions,
      customPermissions,
    };
  }
}
