/**
 * Centralized storage keys derived from the trainer package prefix.
 * All AsyncStorage / SecureStore / localStorage keys go through here.
 */
import { pkg } from '@infra/package';

const PREFIX = pkg.config.storageKeyPrefix;

export const STORAGE_KEYS = {
  TOKEN: `${PREFIX}_token`,
  USER_INFO: `${PREFIX}_user_info`,
  ACTIVE_DATE: `${PREFIX}_active_date`,
  WEIGHT_UNIT: `${PREFIX}_weight_unit`,
  STATS_VIEW_PREF: `${PREFIX}_stats_view_pref`,
  DEFAULT_ROUTE: `${PREFIX}_default_route`,
  USE_GRAPH_VIEW: `${PREFIX}_use_graph_view`,
  CACHE_WORKOUTS: `${PREFIX}_cache_workouts`,
  CACHE_DASHBOARD: `${PREFIX}_cache_dashboard`,
  THEME_MODE: `${PREFIX}_theme_mode`,
} as const;
