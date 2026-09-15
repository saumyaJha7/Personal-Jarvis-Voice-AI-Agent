const { withMainActivity } = require("@expo/config-plugins");

/**
 * Expo Config Plugin to prevent React Native 0.83+ NullPointerException crash
 * in ReactActivityDelegate.onUserLeaveHint when the activity goes into background.
 */
module.exports = function withSafeUserLeaveHint(config) {
  return withMainActivity(config, (config) => {
    let contents = config.modResults.contents;

    if (!contents.includes("onUserLeaveHint")) {
      const safeOverride = `
  override fun onUserLeaveHint() {
    try {
      super.onUserLeaveHint()
    } catch (e: NullPointerException) {
      // Ignore ReactActivityDelegate NullPointerException on app background transition
    }
  }
`;
      const lastBraceIndex = contents.lastIndexOf("}");
      if (lastBraceIndex !== -1) {
        contents =
          contents.slice(0, lastBraceIndex) +
          safeOverride +
          "\n" +
          contents.slice(lastBraceIndex);
      }
    }

    config.modResults.contents = contents;
    return config;
  });
};
