function Foobar2000Mediator() {
  this.path = foobar2000Path;
  this.copyCommandName = copyCommandName;
  this.musicTrackedPath = musicTrackedPath;
  this.musicNotTrackedPath = musicNotTrackedPath;
  this.tagMappings = tagMappings;
}

Foobar2000Mediator.prototype.moveMusicToTrackedLocation = function() {
  if (file.GetFolder(this.musicNotTrackedPath).SubFolders.Count > 0) {
    file.MoveFolder(this.musicNotTrackedPath + "\\*", this.musicTrackedPath);
  }
};

Foobar2000Mediator.prototype.moveMusicToNotTrackedLocation = function() {
  if (file.GetFolder(this.musicTrackedPath).SubFolders.Count > 0) {
    file.MoveFolder(this.musicTrackedPath + "\\*", this.musicNotTrackedPath);
  }
};

Foobar2000Mediator.prototype.rescanLibrary = function () {
  runCommand(this.path + " \"/command:Rescan Folders\"", 0);
};

/**
 * @deprecated
 * The only way I can think of - finding last `allowedMusicTypes` file
 * in the last (alphabetically) folder and waiting for it to appear in library.
 *
 * But it's an ambiguous solution. So not using this method until actual
 * problems arise.
 */
Foobar2000Mediator.prototype.makeSureFoobarIsTracking = function () {
  clipboard.Copy("error");
  var sleepTime = 100;
  while (clipboard.Paste() == "error") {
    runCommand(this.path
            + " /runcmd-files=\"" + this.copyCommandName + "\""
            + " \"D:/music-iphone/Deadmau5/2010 4x4=12/01 Some Chords.m4a\" ", 0);
    WScript.Sleep(sleepTime);
    sleepTime *= 2;
    logger.log("DEBUG", "foobar answers " + clipboard.Paste());
  }
  logger.log("DEBUG", "last answer " + clipboard.Paste());
};

Foobar2000Mediator.prototype.preProcessTags = function (tracks) {
  var res = "";
  while (tracks.length > 0) {
    res += ' "' + tracks[0] + '" ';
    tracks.shift();
    if (res.length > 1000) {
      break;
    }
  }
  var command = this.path + ' /tag:' + this.tagMappings + res;
  logger.log("DEBUG", command);
  runCommand(command, 0);
  if (tracks.length > 0) {
    this.preProcessTags(tracks);
  }
};