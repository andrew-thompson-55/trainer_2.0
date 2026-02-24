/**
 * Package loader - static imports of trainer package JSON files.
 * Metro bundles these at build time via the watchFolders config.
 */

import meta from '../../../../packages/default/package.json';
import persona from '../../../../packages/default/persona.json';
import config from '../../../../packages/default/config.json';
import colors from '../../../../packages/default/colors.json';
import strings from '../../../../packages/default/strings.json';
import checkin from '../../../../packages/default/checkin.json';

export const pkg = {
  meta,
  persona,
  config,
  colors,
  strings,
  checkin,
} as const;

// Convenience re-exports for common access patterns
export type PackageStrings = typeof strings;
export type PackagePersona = typeof persona;
export type PackageConfig = typeof config;
export type PackageColors = typeof colors;
export type PackageCheckin = typeof checkin;
