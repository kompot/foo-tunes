function ITunesMediator() {
  this.ITTrackKindFile	= 1;
  this.ITSourceKindIPod = 2;
  this.ITPlaylistKindLibrary = 1;
  this.iTunesApp = WScript.CreateObject("iTunes.Application");
  this.iPod = null;
  this.iPodLibrary = null;
  this.iPodTracksById = new Hashtable();
}

ITunesMediator.prototype.initIpod = function () {
  logger.log("DEBUG", "sources count " + this.iTunesApp.Sources.Count);
  var sources = this.iTunesApp.Sources;
  var i = 1;
  while (i <= sources.Count) {
    if (this.ITSourceKindIPod == sources.Item(i).Kind) {
      this.iPod = sources.Item(i);
      break;
    }
    i++;
  }
  if (this.iPod == null) {
    logger.log("ERROR", "iPod is not found - nothing to do");
    WScript.Quit(1);
  }
  logger.log("INFO", "iPod `" + this.iPod.Name + "` found, free space "
      + ((this.iPod.FreeSpace / this.iPod.Capacity) * 100).toString().substring(0, 2) + "%");
  logger.log("DEBUG", "Playlists count " + this.iPod.Playlists.Count);
  var cnt = this.iPod.Playlists.Count;
  while (cnt != 0) {
    logger.log("DEBUG", "iPod playlist found "
        + this.iPod.Playlists.Item(cnt).Kind + " "
        + this.iPod.Playlists.Item(cnt).Name);
    if (this.ITPlaylistKindLibrary == this.iPod.Playlists.Item(cnt).Kind) {
      this.iPodLibrary = this.iPod.Playlists.Item(cnt);
    }
    cnt--;
  }
};

ITunesMediator.prototype.id = function(track) {
  // TODO: Is it OK to use PersistentIDHigh? Maybe
  // should combine with e. g. ITObjectPersistentIDLow?
  return this.iTunesApp.ITObjectPersistentIDHigh(track).toString();
};

ITunesMediator.prototype.cacheTracks = function () {
  logger.log("DEBUG", "caching tracks from iPod library");
  var	cnt = this.iPodLibrary.Tracks.Count;
  while (cnt != 0) {
    var	track = this.iPodLibrary.Tracks.Item(cnt);
    // TODO: not a very definite check ("audio file") not to interfere with podcasts etc
    if (track.Kind == this.ITTrackKindFile && track.KindAsString.endsWith("audio file")) {
      this.iPodTracksById.put(this.id(track), track);
    }
    cnt--;
  }
};

ITunesMediator.prototype.addFreshFilesToITunes = function (folder) {
  if (folder == null) {
    folder = file.GetFolder(foobar2000.musicTrackedPath);
  }
  var allTracksInDir = new Array();
  for (var f = new Enumerator(folder.Files); !f.atEnd(); f.moveNext()) {
    var name = f.item().path;
    var extension = name.substring(name.lastIndexOf(".") + 1).toLowerCase();

    if (allowedMusicTypes.containsKey(extension)
        && !fooTunesDb.idsByLocation.containsKey(name)) {
      logger.log("INFO", "adding track to library " + name);
      allTracksInDir.push(name);
    }
  }
  if (allTracksInDir.length > 0) {
    if (foobar2000.tagMappings != null && foobar2000.tagMappings != "") {
      foobar2000.preProcessTags(allTracksInDir.slice(0), foobar2000.tagMappings);
    }
    // later on we count on iTunes to return added tracks in the same order
    // we passed files names, but it is not stated directly
    // in iTunes COM interface description; if it's not so - we'll be adding
    // tracks one by one
    var adding = this.iPodLibrary.AddFiles(allTracksInDir);
    logger.log("DEBUG", "Adding status " + adding.InProgress);
    while (adding.InProgress) {
      logger.log("DEBUG", "Still adding " + allTracksInDir.length + " files");
      WScript.Sleep(1000);
    }
    logger.log("DEBUG", "Adding status " + adding.InProgress);
    var addedTracks = adding.Tracks;
    for (var i = 1; i <= addedTracks.Count; i++) {
      var track = addedTracks.Item(i);
      var id = this.id(track);
      var location = allTracksInDir[i - 1];
      fooTunesDb.locationsById.put(id, location);
      fooTunesDb.idsByLocation.put(location, id);
      var error = true;
      while (error) {
        try {
          // if iTunes is busy we'll wait for 1 sec
          track.Rating = 20 * foobar2000.tracksByLocation.get(location).Rating;
          track.PlayedCount = foobar2000.tracksByLocation.get(location).PlayedCount;
          track.PlayedDate =  Date.format(
              "%Y-%m-%d %H:%M:%S",
              foobar2000.tracksByLocation.get(location).PlayedDate,
              "0"
          );
          this.addAlbumArtIfMissing(track, location);
          error = false;
        } catch (e) {
          logger.log("DEBUG", "error " + e.message);
          WScript.Sleep(1000);
        }
      }
      // TODO: may by here we should dump DB to disk, so that if process is
      // is interrupted we do not start from the very beginning
    }
  }
  for (var folder = new Enumerator(folder.SubFolders); !folder.atEnd(); folder.moveNext()) {
    this.addFreshFilesToITunes(folder.item());
  }
};

ITunesMediator.prototype.removeTracksNotOnDisk = function () {
  var keys = this.iPodTracksById.keys();
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var location = fooTunesDb.locationsById.get(key);
    if (!file.FileExists(location)) {
      logger.log("DEBUG", "Track at location " + location + " is no longer " +
          "on disk. Removing it from iPod and from DB.");
      this.iPodTracksById.get(key).Delete();
      fooTunesDb.locationsById.remove(key);
      fooTunesDb.idsByLocation.remove(location);
    }
  }
};

ITunesMediator.prototype.addAlbumArtIfMissing = function(currTrack, path) {
  if (currTrack.Artwork.Count == 0) {
    var trackDir = path.substring(0, path.lastIndexOf("\\"));
    logger.log("DEBUG", "searching artwork for " + currTrack.Location);
    // TODO: refactor these spaghetti
    if (file.FileExists(trackDir + "\\front.jpg")) {
      logger.log("DEBUG", "adding artwork from front.jpg");
      currTrack.AddArtworkFromFile(trackDir + "\\front.jpg");
    } else if (file.FileExists(trackDir + "\\cover.jpg")) {
      logger.log("DEBUG", "adding artwork from cover.jpg");
      currTrack.AddArtworkFromFile(trackDir + "\\cover.jpg");
    } else if (file.FileExists(trackDir + "\\folder.jpg")) {
      logger.log("DEBUG", "adding artwork from folder.jpg");
      currTrack.AddArtworkFromFile(trackDir + "\\folder.jpg");
    } else {
      for (var f = new Enumerator(file.GetFolder(trackDir).Files); !f.atEnd(); f.moveNext()) {
        var name = f.item().path;
        var extension = name.substring(name.lastIndexOf(".") + 1);
        if (extension == "jpg" || extension == "png" || extension == "gif") {
          currTrack.AddArtworkFromFile(name);
          logger.log("DEBUG", "adding artwork from "
              + name.substring(name.lastIndexOf("\\") + 1));
        }
      }
    }
  }
};