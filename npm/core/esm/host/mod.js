export const LogLevels = {
  None: 0,
  Critical: 1,
  Error: 2,
  Warning: 3,
  Info: 4,
  Debug: 5,
  Trace: 6,
  /**
   * Gets the names of the log levels.
   * @returns {string[]} Array of log level names
   */
  names: function () {
    return [
      "none",
      "critical",
      "error",
      "warning",
      "notice",
      "information",
      "debug",
      "trace",
    ];
  },
  /**
   * Gets the values of the log levels.
   * @returns {number[]} Array of log level values
   */
  values: function () {
    return [0, 2, 3, 4, 5, 6, 7, 8];
  },
  /**
   * Gets the numeric value of the log level.
   * @param name The name of the log level/
   * @returns The numeric value of the log level.
   */
  toValue: function (name) {
    switch (name) {
      case "none":
      case "None":
        return 0;
      case "critical":
      case "Critical":
      case "fatal":
      case "Fatal":
        return 2;
      case "error":
      case "Error":
        return 3;
      case "warn":
      case "Warn":
      case "warning":
      case "Warning":
        return 4;
      case "notice":
      case "Notice":
        return 5;
      case "info":
      case "Info":
      case "information":
      case "Information":
        return 6;
      case "debug":
      case "Debug":
        return 7;
      case "trace":
      case "Trace":
        return 8;
    }
    return 4;
  },
  /**
   * Gets the string representation of the log level.
   * @param value The numeric value of the log level.
   * @returns The string representation of the log level.
   */
  toString: function (value) {
    switch (value) {
      case 0:
        return "none";
      case 2:
        return "critical";
      case 3:
        return "error";
      case 4:
        return "warning";
      case 5:
        return "notice";
      case 6:
        return "information";
      case 7:
        return "debug";
      case 8:
        return "trace";
    }
    return "";
  },
};
