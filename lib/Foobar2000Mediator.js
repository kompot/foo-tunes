function Foobar2000Mediator() {
  this.path = foobar2000Path;
  this.copyCommandName = copyCommandName;
  this.musicTrackedPath = musicTrackedPath;
  this.musicNotTrackedPath = musicNotTrackedPath;
  this.tagMappings = tagMappings;
  this.tracksByLocation = new Hashtable();
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
            + " \"music-file.m4a\" ", 0);
    WScript.Sleep(sleepTime);
    sleepTime *= 2;
    logger.log("DEBUG", "foobar answers " + clipboard.Paste());
  }
  logger.log("DEBUG", "last answer " + clipboard.Paste());
};

Foobar2000Mediator.prototype.preProcessTags = function (tracks, processed) {
  var res = "";
  if (processed == null) {
    processed = new Hashtable();
  }
  while (tracks.length > 0) {
    processed.put(tracks[0], file.GetFile(tracks[0]).DateLastModified);
    res += ' "' + tracks[0] + '" ';
    tracks.shift();
    if (res.length > 2000) {
      break;
    }
  }
  var command = this.path + ' /tag:' + this.tagMappings + res;
  logger.log("DEBUG", command);
  runCommand(command, 0);
  if (tracks.length > 0) {
    this.preProcessTags(tracks, processed);
  }
  while (processed.size() > 0) {
    logger.log("DEBUG", "Not all files having tags applied; still "
        + processed.size() + " left. Sleeping for 1 sec");
    WScript.Sleep(1000);
    var keyss = processed.keys();
    for (var i = 0; i < processed.size(); i++) {
      // TODO will files be modified if none tags are changed?
      if (file.GetFile(keyss[i]).DateLastModified > processed.get(keyss[i])) {
        processed.remove(keyss[i]);
      }
    }
  }
  logger.log("DEBUG", "processing tags finished; left = " + processed.size())
};

Foobar2000Mediator.prototype.loadPlaybackStats = function () {
  var command = this.path + ' /runcmd-files=\"' + this.copyCommandName + '\" '
      + ' ' + this.musicTrackedPath;
  logger.log("INFO", command);
  clipboard.SetClipboardText("error");
  runCommand(command, 0);
  // Maybe should check real data - do eval and check that
  // all locations are here
  while (!clipboard.GetClipboardText().startsWith("{\"Location")) {
    logger.log("DEBUG", "Still no info from foobar2000. Sleeping for 1 sec");
    WScript.Sleep(1000);
  }

  var paste = clipboard.GetClipboardText();
  var fr = paste.replace(/\\/g, "\\\\");

  var fooExport = eval('([ ' + fr.substring(0, fr.length - 1) + ' ])');
  logger.log("DEBUG", "playback stats from foobar2000 = " + fr);
  for (var i = 0; i < fooExport.length; i++) {
    if (fooExport[i]) {
      var fooRating = parseInt(fooExport[i].Rating);
      if (isNaN(fooRating)) {
        fooRating = 0;
      }
      fooExport[i].Rating = fooRating;

      var defaultDate = new Date(1961, 3, 12);
      var fd = fooExport[i].PlayedDate;
      var fooDate = null;
      if (fd.length < 4 || isNaN(parseInt(fd.substr(0, 4)))) {
        fooDate = defaultDate;
      } else {
        fooDate = new Date(fd.substr(0, 4), fd.substr(5, 2), fd.substr(8, 2),
            fd.substr(11, 2), fd.substr(14, 2), fd.substr(17, 2));
      }
      fooExport[i].PlayedDate = fooDate;

      this.tracksByLocation.put(fooExport[i].Location, fooExport[i]);
    }
  }
};