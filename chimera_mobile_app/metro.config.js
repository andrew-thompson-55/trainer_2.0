// Learn more: https://docs.expo.dev/guides/monorepos
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Ensure platform-specific extensions are resolved correctly
config.resolver.sourceExts = [...config.resolver.sourceExts, 'cjs'];
config.resolver.platforms = ['web', 'ios', 'android'];

module.exports = config;
