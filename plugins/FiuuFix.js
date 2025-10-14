const { withProjectBuildGradle, withAppBuildGradle } = require('@expo/config-plugins');

module.exports = function FiuuFix(config) {
  // Fix project-level build.gradle to set Kotlin version
  config = withProjectBuildGradle(config, (config) => {
    let contents = config.modResults.contents;
    
    // Force Kotlin 2.0.0 compatibility
    if (!contents.includes('kotlinVersion')) {
      contents = contents.replace(
        /ext\s*{/,
        `ext {
        kotlinVersion = "2.0.0"`
      );
    }
    
    // Ensure kotlin-gradle-plugin is present
    if (!contents.includes('kotlin-gradle-plugin')) {
      contents = contents.replace(
        /dependencies\s*{/,
        `dependencies {
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:2.0.0")`
      );
    }
    
    config.modResults.contents = contents;
    return config;
  });

  // Fix app-level build.gradle
  config = withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;
    
    // Ensure kotlin-android plugin is applied
    if (!contents.includes('kotlin-android')) {
      contents = contents.replace(
        /apply plugin: ["']com\.android\.application["']/,
        `apply plugin: "com.android.application"\napply plugin: "kotlin-android"`
      );
    }
    
    config.modResults.contents = contents;
    return config;
  });

  return config;
};