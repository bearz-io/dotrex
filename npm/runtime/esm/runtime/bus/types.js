export var LogLevel;
(function (LogLevel) {
  LogLevel[LogLevel["Trace"] = 7] = "Trace";
  LogLevel[LogLevel["Debug"] = 6] = "Debug";
  LogLevel[LogLevel["Info"] = 5] = "Info";
  LogLevel[LogLevel["Warn"] = 4] = "Warn";
  LogLevel[LogLevel["Error"] = 3] = "Error";
  LogLevel[LogLevel["Fatal"] = 2] = "Fatal";
})(LogLevel || (LogLevel = {}));
