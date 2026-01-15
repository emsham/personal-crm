const { withDangerousMod, IOSConfig } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo config plugin to copy GoogleService-Info.plist to the iOS project.
 * The file gets auto-linked by React Native Firebase.
 */
const withFirebaseConfig = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const sourceFile = path.join(projectRoot, 'GoogleService-Info.plist');

      // Get the iOS app folder name
      const appName = IOSConfig.XcodeUtils.sanitizedName(config.name);
      const platformRoot = path.join(projectRoot, 'ios');
      const destFolder = path.join(platformRoot, appName);
      const destFile = path.join(destFolder, 'GoogleService-Info.plist');

      if (fs.existsSync(sourceFile)) {
        // Ensure destination folder exists
        if (!fs.existsSync(destFolder)) {
          fs.mkdirSync(destFolder, { recursive: true });
        }

        fs.copyFileSync(sourceFile, destFile);
        console.log(`✓ Copied GoogleService-Info.plist to ios/${appName}/`);
      } else {
        console.warn(`⚠ GoogleService-Info.plist not found in project root`);
        console.warn(`  Download it from Firebase Console and place it at: ${sourceFile}`);
      }

      return config;
    },
  ]);
};

module.exports = withFirebaseConfig;
