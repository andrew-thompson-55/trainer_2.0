/**
 * Validate a trainer package has all required files and keys.
 * Run: npx ts-node scripts/validate-package.ts [path-to-package]
 */

import * as fs from 'fs';
import * as path from 'path';

const packageDir = process.argv[2] || path.resolve(__dirname, '../../packages/default');

const REQUIRED_FILES = [
  'package.json',
  'persona.json',
  'config.json',
  'colors.json',
  'strings.json',
  'checkin.json',
  'system-prompt.md',
];

const REQUIRED_KEYS: Record<string, string[]> = {
  'package.json': ['name', 'displayName', 'version'],
  'persona.json': [
    'coachName', 'coachDisplayName', 'coachGreeting', 'chatPlaceholder',
    'chatNoResponse', 'chatErrorMessage', 'chatProcessError', 'chatNetworkError',
    'agentReadyMessage', 'agentNoResponseError', 'agentFallbackMessage',
    'agentMaxIterationMessage', 'defaultUserName',
  ],
  'config.json': [
    'healthCheckMessage', 'defaultTimezone', 'storageKeyPrefix',
    'activityTypes', 'defaultActivityType', 'defaultWeightUnit',
    'notificationDefaults', 'stravaTypeMap', 'calendar',
  ],
  'colors.json': ['light', 'dark', 'activity', 'checkin', 'coach', 'login', 'dashboard'],
  'strings.json': [
    'login.title', 'login.subtitle', 'login.continueWithGoogle', 'login.disclaimer',
    'dashboard.greeting', 'dashboard.title',
    'tabs.home', 'tabs.plan', 'tabs.calendar', 'tabs.coach', 'tabs.checkIn', 'tabs.settings',
    'settings.title', 'plan.title',
  ],
  'checkin.json': ['metrics', 'rpeOptions', 'scaleColorKeys', 'rpeScaleColorKeys'],
};

let errors: string[] = [];

// Check files exist
for (const file of REQUIRED_FILES) {
  const filePath = path.join(packageDir, file);
  if (!fs.existsSync(filePath)) {
    errors.push(`Missing file: ${file}`);
  }
}

// Check required keys
for (const [file, keys] of Object.entries(REQUIRED_KEYS)) {
  const filePath = path.join(packageDir, file);
  if (!fs.existsSync(filePath)) continue;

  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const missing = keys.filter(k => !(k in data));
    if (missing.length > 0) {
      errors.push(`${file} missing keys: ${missing.join(', ')}`);
    }
  } catch (e: any) {
    errors.push(`${file} is not valid JSON: ${e.message}`);
  }
}

// Check system prompt placeholders
const promptPath = path.join(packageDir, 'system-prompt.md');
if (fs.existsSync(promptPath)) {
  const prompt = fs.readFileSync(promptPath, 'utf-8');
  if (!prompt.includes('{coachName}')) {
    errors.push('system-prompt.md missing {coachName} placeholder');
  }
  if (!prompt.includes('{contextText}')) {
    errors.push('system-prompt.md missing {contextText} placeholder');
  }
}

// Report
if (errors.length > 0) {
  console.error(`\nPackage validation FAILED (${packageDir}):\n`);
  errors.forEach(e => console.error(`  - ${e}`));
  process.exit(1);
} else {
  console.log(`\nPackage validation PASSED: ${packageDir}\n`);
}
