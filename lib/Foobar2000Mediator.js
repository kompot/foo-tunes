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

Foobar2000Mediator.prototype.importStatisticsFromFileTags = function (location) {
  runCommand(this.path + " \"/runcmd-files=Import statistics\" " +
      " \"" + location + "\"", 0);
};

Foobar2000Mediator.prototype.updateRating = function (location, rating) {
  runCommand(this.path + " \"/runcmd-files=Rating/" + rating + "\" " +
      " \"" + location + "\"", 0);
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

Foobar2000Mediator.prototype.preProcessTags = function (tracks, tagMappings,
                                                        processed) {
  var res = "";
  if (processed == null) {
    processed = new Hashtable();
  }
  while (tracks.length > 0) {
    processed.put(tracks[0], file.GetFile(tracks[0]).DateLastModified);
    res += ' "' + tracks[0] + '" ';
    tracks.shift();
    if (res.length > 1000) {
      break;
    }
  }
  var command = this.path + ' /tag:' + tagMappings + res;
  logger.log("DEBUG", command);
  runCommand(command, 0);
  if (tracks.length > 0) {
    this.preProcessTags(tracks, tagMappings, processed);
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

      var fd = fooExport[i].PlayedDate;
      var fooDate = null;
      if (fd.length < 4 || isNaN(parseInt(fd.substr(0, 4)))) {
        fooDate = defaultDate;
      } else {
        fooDate = new Date(fd.substr(0, 4),
            parseInt(fd.substr(5, 2).replace(/^[0]+/g,"")) - 1, fd.substr(8, 2),
            fd.substr(11, 2), fd.substr(14, 2), fd.substr(17, 2));
        // as foobar2000 gives us local time and iTunes uses
        // UTC we will convert foobar2000 date to UTC
        fooDate = new Date(fooDate.getTime() + fooDate.getTimezoneOffset() * 60000);
      }
      fooExport[i].PlayedDate = fooDate;

      this.tracksByLocation.put(fooExport[i].Location, fooExport[i]);
    }
  }
};

Foobar2000Mediator.prototype.syncPlaybackStats = function () {
  var keys = iTunes.iPodTracksById.keys();
  for (var i = 0; i < iTunes.iPodTracksById.size(); i++) {
    var trackIPod = iTunes.iPodTracksById.get(keys[i]);
    var location = fooTunesDb.locationsById.get(keys[i]);
    var trackFoobar = this.tracksByLocation.get(location);

    if (trackFoobar == null) {
      logger.log("ERROR", "No track found in foobar stats by location "
          + location + ". Unexpected behaviour.");
      continue;
    }
    var iPodRating = parseInt(trackIPod.Rating) / 20;
    var iPodPlayedDate = new Date(trackIPod.PlayedDate);
    if (iPodPlayedDate.getYear() < 1901) {
      iPodPlayedDate = defaultDate;
    } else {
      iPodPlayedDate = new Date(iPodPlayedDate.getTime() + iPodPlayedDate.getTimezoneOffset() * 60000);
    }

    var fooPlayedDateMillis = new Date(trackFoobar.PlayedDate).getTime();
    var iPodPlayedDateMillis = new Date(iPodPlayedDate).getTime();
    if (fooPlayedDateMillis != iPodPlayedDateMillis) {
      // now we should compare last played dates in both DBs and the one with
      // the date more close to now is taking precedence
//    logger.log("INFO", new Date(iPodPlayedDate).getTime());
//    logger.log("INFO", new Date(trackFoobar.PlayedDate).getTime());
      logger.log("INFO", Date.format("%Y-%m-%d %H:%M:%S", iPodPlayedDate, "0").toString().padLeft(24, " "));
      logger.log("INFO", Date.format("%Y-%m-%d %H:%M:%S", trackFoobar.PlayedDate, "0").toString().padLeft(24, " "));
//      logger.log("INFO", iPodPlayedDate.toLocaleString());
//      logger.log("INFO", trackFoobar.PlayedDate.toLocaleString());
      logger.log("INFO", "Track " + location + " has been played since "
          + "last sync - will be updating playback stats.");
      if (fooPlayedDateMillis > iPodPlayedDate) {
        // overwrite stats on iPod
        // TODO: the same code is in ITunesMediator - refactor
        logger.log("INFO", "Pushing to iPod rating " + trackFoobar.Rating
            + ", play count " + trackFoobar.PlayedCount + " and played date "
            + Date.format("%Y-%m-%d %H:%M:%S", trackFoobar.PlayedDate, "0"));
        trackIPod.Rating = 20 * trackFoobar.Rating;
        trackIPod.PlayedCount = trackFoobar.PlayedCount;
        trackIPod.PlayedDate =  Date.format(
            "%Y-%m-%d %H:%M:%S",
            trackFoobar.PlayedDate,
            "0"
        );
      } else {
        logger.log("INFO", "Pushing to foobar2000 rating " + iPodRating
                    + ", play count " + trackIPod.PlayedCount + " and played date "
                    + Date.format("%Y-%m-%d %H:%M:%S", iPodPlayedDate, "0"));
        // overwrite stats in foobar2000
        this.updateFoobarTrackStats(location, iPodRating, trackIPod.PlayedCount,
            iPodPlayedDate);
      }
    } else {
      // TODO: there is a probability of setting rating without play date change
      // in this case we should probably use higher rating
    }
  }
};

Foobar2000Mediator.prototype.updateFoobarTrackStats = function(location, rating,
                                                               playedCount,
                                                               playedDate) {
  playedDate = new Date(playedDate.getTime() - playedDate.getTimezoneOffset() * 60000);
  var statsToWriteToTags = ""
    + '"PLAY_COUNT=' + playedCount + '";'
    + '"LAST_PLAYED=' + Date.format("%Y-%m-%d %H:%M:%S", playedDate, "0") + '";'
    // this rating value is not used actually - see comment below
    + '"RATING=' + rating + '";'
  ;
  var track = new Array();
  track.push(location);
  this.preProcessTags(track, statsToWriteToTags);
  // TODO: consider mass import after all tracks have stats written into tags
  this.importStatisticsFromFileTags(location);
  // TODO: seems like there is a bug in playback statistics - ratings are not
  // imported from file tags on the first import, but second import sometimes (?)
  // does help; some approximation seems to work inside playback statistics
  // component; so we will update rating in a separate command
  this.updateRating(location, rating);
};