# Trainer Package Template

This folder is a starting point for creating a new trainer package (white-label skin).

## Quick Start

1. Copy this folder: `cp -r packages/_template packages/my-trainer`
2. Edit each JSON file to match your brand
3. Replace assets in `assets/` with your icons
4. Write your AI system prompt in `system-prompt.md`
5. Set the env var: `TRAINER_PACKAGE=../packages/my-trainer` (backend)
6. Update the import path in `chimera_mobile_app/src/infrastructure/package/index.ts`

## File Reference

| File | Purpose |
|------|---------|
| `package.json` | Package metadata (name, version) |
| `persona.json` | Coach personality, greetings, error messages |
| `config.json` | Activity types, defaults, Strava mapping, calendar config |
| `colors.json` | Light/dark theme colors, activity colors, screen-specific themes |
| `strings.json` | All UI text (login, dashboard, settings, tabs, etc.) |
| `checkin.json` | Daily check-in metric definitions and RPE scale |
| `system-prompt.md` | AI system prompt template (use `{coachName}` and `{contextText}` placeholders) |
| `assets/` | App icon, splash screen, favicon |

## Storage Keys

The `storageKeyPrefix` in `config.json` is used to namespace all local storage keys.
Changing this prefix will cause existing users to lose their cached preferences.
For new packages, use a unique prefix. For migrations, keep the same prefix.

## Colors Structure

The `colors.json` file has these sections:
- `light` / `dark` - Base theme colors (backgrounds, text, borders)
- `activity` - Per-activity-type colors (used in calendar dots, badges)
- `checkin` - Check-in scale colors (worst to best)
- `coach.light` / `coach.dark` - Coach chat screen colors
- `login.light` / `login.dark` - Login screen colors
- `dashboard` - Dashboard menu item colors
