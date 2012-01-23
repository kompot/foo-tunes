function FooTunesDb(logsRootDir, date) {
  // TODO: same ~10 lines in Logger - do refactor
  if (!file.FolderExists(logsRootDir)) {
    file.CreateFolder(logsRootDir);
  }
  var logDir = logsRootDir + "\\"
      + Date.format("%Y-%m-%d %H:%M:%S", date, "0");
  if (!file.FolderExists(logDir)) {
    file.CreateFolder(logDir);
  }

  // -1 stands for Unicode, use 0 for ASCII or -1 for default system setting
  this.backupDb = file.OpenTextFile(logDir + "\\foo-tunes-db.txt", 2, true, -1);
  this.locationsById = new Hashtable();
  this.idsByLocation = new Hashtable();
}

FooTunesDb.prototype.readDb = function() {
  if (!file.FileExists("foo-tunes-db.txt")) {
    return;
  }
  this.mainDb = file.OpenTextFile("foo-tunes-db.txt", 1, false, -1);
  while (!this.mainDb.AtEndOfStream) {
    var line = this.mainDb.ReadLine();
    var parts = line.split("\t");
    this.locationsById.put(parts[0].toString(), parts[1].toString());
    this.idsByLocation.put(parts[1].toString(), parts[0].toString());
  }
  this.mainDb.Close();
};

FooTunesDb.prototype.removeTracksNotOnIPod = function() {
  var keys = this.locationsById.keys();
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var val = this.locationsById.get(key);
    if (!iTunes.iPodTracksById.containsKey(key)) {
      logger.log("DEBUG", "removing from db " + val + " not found on iPod");
      this.locationsById.remove(key);
      this.idsByLocation.remove(val);
    }
  }
};

FooTunesDb.prototype.dump = function() {
  this.dumpToLog(this.backupDb);
  this.mainDb = file.OpenTextFile("foo-tunes-db.txt", 2, true, -1);
  this.dumpToLog(this.mainDb);
  this.mainDb.Close();
};

FooTunesDb.prototype.dumpToLog = function(log) {
  for (var i = 0; i < this.locationsById.size(); i++) {
    var key = this.locationsById.keys()[i];
    var val = this.locationsById.get(key);
    log.WriteLine(key + "\t" + val);
  }
};