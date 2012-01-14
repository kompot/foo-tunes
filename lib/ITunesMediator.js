function ITunesMediator() {
  this.ITTrackKindFile	= 1;
  this.ITSourceKindIPod = 2;
  this.ITPlaylistKindLibrary = 1;
  this.iTunesApp = WScript.CreateObject("iTunes.Application");
  this.library = this.iTunesApp.LibraryPlaylist;
  this.tracks = this.library.Tracks;
  this.newTracks = new Array();
  this.iPod = null;
  this.iPodLibrary = null;
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

ITunesMediator.prototype.cacheTracksFromLibrary = function() {
  var	numTracks = this.tracks.Count;
  while (numTracks != 0) {
    var	currTrack = this.tracks.Item(numTracks);
    if (currTrack.Kind == this.ITTrackKindFile) {
      iTracks.put(currTrack.Location, currTrack);
      var lastIndexOfSlash = currTrack.Location.lastIndexOf("\\");
      if (lastIndexOfSlash > maxLastIndexOfSlash) {
        maxLastIndexOfSlash = lastIndexOfSlash;
      }
      this.addAlbumArtIfMissing(currTrack);
    }
    numTracks--;
  }
};

ITunesMediator.prototype.addFreshFilesToITunes = function (folder) {
  var allTracksInDir = new Array();
  for (var file = new Enumerator(folder.Files); !file.atEnd(); file.moveNext()) {
    var name = file.item().path;
    var extension = name.substring(name.lastIndexOf(".") + 1);

    if (allowedMusicTypes.containsKey(extension) && !iTracks.containsKey(name)) {
      logger.log("DEBUG", "adding track to library " + name);
      allTracksInDir.push(name);
    }
  }
  if (allTracksInDir.length > 0) {
    // adding files by folder - may be should switch to adding all at once
    foobar2000.preProcessTags(allTracksInDir.slice(0));
    var addedTracks = this.library.AddFiles(allTracksInDir).Tracks;
    for (var i = 1; i <= addedTracks.Count; i++) {
      this.newTracks.push(addedTracks.Item(i));
    }
  }
  for (var folder = new Enumerator(folder.SubFolders); !folder.atEnd(); folder.moveNext()) {
    this.addFreshFilesToITunes(folder.item());
  }
};

ITunesMediator.prototype.pushNewTracksToIPodAndSync = function () {
  logger.log("DEBUG", "new tracks count = " + this.newTracks.length);
  if (this.iPodLibrary != null) {
    logger.log("DEBUG", "there were " + this.iPodLibrary.Tracks.Count
        + " track on " + this.iPod.Name + " before update");
    logger.log("INFO", "adding " + this.newTracks.length + " to iPod");
    for (var i = 0; i < this.newTracks.length; i++) {
      // TODO: check whether the same file exists; something like trackID may be
      this.iPodLibrary.AddTrack(this.newTracks[i]);
    }
    if (this.newTracks.length > 0) {
      logger.log("INFO", "starting iPod update");
      this.iTunesApp.UpdateIPod();
    }
    logger.log("DEBUG", "there are " + this.iPodLibrary.Tracks.Count
        + " track on " + this.iPod.Name + " after update");
  }
};

ITunesMediator.prototype.addAlbumArtIfMissing = function(currTrack) {
  if (currTrack.Artwork.Count == 0) {
    var trackDir = currTrack.Location.substring(0, currTrack.Location.lastIndexOf("\\"));
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