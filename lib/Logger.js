function Logger(logLevel, logsRootDir, date) {
  if (!file.FolderExists(logsRootDir)) {
    file.CreateFolder(logsRootDir);
  }
  var logDir = logsRootDir + "\\"
      + Date.format("%Y-%m-%d %H:%M:%S", date, "0");
  if (!file.FolderExists(logDir)) {
    file.CreateFolder(logDir);
  }

  this.level = logLevel;
  // -1 stands for Unicode, use 0 for ASCII or -1 for default system setting
  this.backupDb = file.OpenTextFile(logDir + "\\debug.txt", 2, true, -1);
}

Logger.prototype.log = function(level, message) {
  this.backupDb.WriteLine(this.getLogItemInfo(level) + message);
  if (this.shouldBeLogged(level)) {
    WScript.echo(this.getLogItemInfo(level) + message);
  }
};

Logger.prototype.getLogItemInfo = function (level) {
  return level.padRight(6, " ")+ Date.format(
      "%Y-%m-%d %H:%M:%S", new Date(), "0")
      .toString().padRight(24, " ");
};

Logger.prototype.shouldBeLogged = function(level) {
  if (this.level == "DEBUG") return true;
  if (this.level == "INFO" && level != "DEBUG") return true;
  if (this.level == "ERROR" && level == "ERROR") return true;
  return false;
};
