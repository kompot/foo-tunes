function Logger(logLevel) {
  this.level = logLevel;
}

Logger.prototype.log = function(level, message) {
  if (this.shouldBeLogged(level)) {
    WScript.echo(
      level.padRight(6, " ")
      + Date.format("%Y-%m-%d %H:%M:%S", new Date(), "0").toString().padRight(24, " ")
      + message
    );
  }
};

Logger.prototype.shouldBeLogged = function(level) {
  if (this.level == "DEBUG") return true;
  if (this.level == "INFO" && level != "DEBUG") return true;
  if (this.level == "ERROR" && level == "ERROR") return true;
  return false;
};
