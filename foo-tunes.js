var fileObject = new ActiveXObject("Scripting.FileSystemObject");
eval(fileObject.OpenTextFile("lib/jahashtable.js", 1).ReadAll());
eval(fileObject.OpenTextFile("lib/json2.js", 1).ReadAll());
eval(fileObject.OpenTextFile("lib/String.js", 1).ReadAll());
eval(fileObject.OpenTextFile("lib/Date.js", 1).ReadAll());
eval(fileObject.OpenTextFile("lib/Logger.js", 1).ReadAll());

// values are: DEBUG, INFO, ERROR 
var logLevel = "DEBUG";
// folder to be scanned for new music
var pathToMusic  = "D:\\music-iphone\\";
var allowedMusicTypes = new Hashtable();
allowedMusicTypes.put("mp3", "");
allowedMusicTypes.put("m4a", "");
var foobar2000 = "D:\\tools\\foobar2000\\foobar2000.exe";
var tagMappings = ""
  + 'FORMAT:ALBUMSORTORDER:"%ALBUM ARTIST% %DATE%";'
  + 'FORMAT:ITUNESCOMPILATION:"$if($stricmp($meta(album artist),various artists),1,)";'
;
/**
  This is command name that should be added to foobar2000 plugin named
  foo_texttools and whose pattern must be (excluding line break):

  {"Location": "%path%", "Rating": "%rating%", "PlayedCount": "%play_count%",
   "PlayedDate": "%last_played%", "DateAdded": "%added%"},
*/
var foobarCopyCommandName = "Copy: iTunesSync" 

// user definable variables end here


var logger = new Logger();
logger.level = logLevel;
var ITTrackKindFile	= 1;
var ITSourceKindIPod = 2;
var ITPlaylistKindLibrary = 1
var	iTunesApp = WScript.CreateObject("iTunes.Application");
var	deletedTracks = 0;
var library = iTunesApp.LibraryPlaylist;
var	tracks = library.Tracks;
var	i;
var iTracks = new Hashtable();
var fTracks = new Hashtable();
var clip = WScript.CreateObject("WshExtra.Clipboard");
var shell = WScript.CreateObject("WScript.Shell");

var result = "";
// used for log formatting
var maxLastIndexOfSlash = -1;

// iTunesApp.UpdateIPod();
logger.log("DEBUG", "sources count " + iTunesApp.Sources.Count)
var sources = iTunesApp.Sources;
var i = 1;
var iPod = null;
while (i <= sources.Count) {
  if (ITSourceKindIPod == sources.Item(i).Kind) {
    iPod = sources.Item(i);
    break;
  }
  i++;
}
if (iPod == null) {
  logger.log("ERROR", "iPod is not found - nothing to do");
  WScript.Quit(1);
}
logger.log("INFO", "iPod `" + iPod.Name + "` found, free space " + ((iPod.FreeSpace / iPod.Capacity) * 100).toString().substring(0, 2) + "%");
logger.log("DEBUG", "Playlists count " + iPod.Playlists.Count);
var cnt = iPod.Playlists.Count;
var iPodLibrary = null;
while (cnt != 0) {
  logger.log("DEBUG", "iPod playlist found "
      + iPod.Playlists.Item(cnt).Kind + " "
      + iPod.Playlists.Item(cnt).Name);
  if (ITPlaylistKindLibrary == iPod.Playlists.Item(cnt).Kind) {
    iPodLibrary = iPod.Playlists.Item(cnt);
  }
  cnt--;
}

// TODO: scan for dead entries in library

var newTracks = new Array();
cacheTracksFromLibrary();
addFreshFilesToITunes(newTracks, fileObject.GetFolder(pathToMusic));
// TODO: should find a way to cache tracks instantly, without doing second call to
cacheTracksFromLibrary();

logger.log("DEBUG", "new tracks count = " + newTracks.length);
if (iPodLibrary != null) {
  logger.log("DEBUG", "there were " + iPodLibrary.Tracks.Count + " track on " + iPod.Name + " before update");
  logger.log("INFO", "adding " + newTracks.length + " to iPod");
  for (var i = 0; i < newTracks.length; i++) {
    iPodLibrary.AddTrack(newTracks[i]);
  }
  if (newTracks.length > 0) {
    logger.log("INFO", "starting iPod update");
    iTunesApp.UpdateIPod();
  }
  logger.log("DEBUG", "there are " + iPodLibrary.Tracks.Count + " track on " + iPod.Name + " after update");
}

for (var i = 0; i < keys.length; i++) {
//  var lastPlayed = parseDate(iTracks.get(keys[i]).PlayedDate.toString());
  logger.log("DEBUG", 
    formatLocationName(iTracks.get(keys[i]).Location, maxLastIndexOfSlash + 15)
        .padRight(maxLastIndexOfSlash, " ")
      + iTracks.get(keys[i]).Rating.toString().padLeft(5, " ")
      + iTracks.get(keys[i]).PlayedCount.toString().padLeft(8, " ")
      + iTracks.get(keys[i]).PlayedDate
//.format("%Y-%m-%d %H:%M:%S", "0").padLeft(25, " ")
//      + Date.format("%Y-%m-%d %H:%M:%S", iTracks.get(keys[i]).DateAdded, "0").padLeft(25, " ")
  );
}

// shell.run(foobar2000 + " \"/runcmd-files=" + foobarCopyCommandName
//    + "\" \"D:/music-iphone/Deadmau5/2010 4x4=12/01 Some Chords.m4a\" \"D:/music-iphone/Deadmau5/2010 4x4=12/03 A City In Florida.m4a\"");

//logger.log("DEBUG", clip.Paste());
//var tracks = eval('([' + '{"Location": "D:\\music-iphone\\Deadmau5\\2010 4x4=12\\01 Some Chords.m4a", "Rating": "4"},{"Location": "D:\\music-iphone\\Deadmau5\\2010 4x4=12\\03 A City In Florida.m4a", "Rating": "?"}' + '])');

/**
var tracks = eval('([' + clip.Paste().replace(/\\/g, "\\\\") + '])');
logger.log("DEBUG", "size = " + tracks.length);
for (var i = 0; i < tracks.length; i++) {
  if (tracks[i] !== undefined) {
    fTracks.put(tracks[i].Location, tracks[i]);
    logger.log("DEBUG", "--" + fTracks.get(tracks[i].Location).Rating);
  }
}
*/

// Here were have iTracks and fTracks filled with iTunes and foobar2000 tracked
// filled in. Then we should compare them and decide what should be updated.






function formatLocationName(fullName, maxLength) {
  if (fullName.startsWith(pathToMusic)) {
    fullName = fullName.substring(pathToMusic.length, maxLength);
  }
  return fullName;
}

function addFreshFilesToITunes(newTracks, folder) {
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
    preProcessTags(allTracksInDir.slice(0));
    var addedTracks = library.AddFiles(allTracksInDir).Tracks;
    for (var i = 1; i <= addedTracks.Count; i++) {
      newTracks.push(addedTracks.Item(i));
    }
  }
  for (var folder = new Enumerator(folder.SubFolders); !folder.atEnd(); folder.moveNext()) {
    addFreshFilesToITunes(newTracks, folder.item());
  }  
}

function preProcessTags(tracks) {
  var res = "";
  while (tracks.length > 0) {
    res += ' "' + tracks[0] + '" ';
    tracks.shift();
    if (res.length > 1000) {
      break;
    }
  }
  var command = foobar2000 + ' /tag:' + tagMappings + res;
  logger.log("DEBUG", command);
  runCommand(command, 0);
  if (tracks.length > 0) {
    preProcessTags(tracks);
  }
}

function runCommand(command, sleepTime) {
//  var success = false;
//  while (!success) {
    try {
      var retCode = shell.run(command, 1, true);
      logger.log("DEBUG", "!!! returned " + retCode);
  //    success = true;
    } catch (e) {
      logger.log("DEBUG", "!!!!!!!!!!!!!!!!!!!!!! command failed, trying again ");
      sleepTime = sleepTime * 2;
      WScript.Sleep(sleepTime);
      runCommand(command, sleepTime); 
    }
    WScript.Sleep(sleepTime);
//  }
}

function cacheTracksFromLibrary() {
  var	numTracks = tracks.Count;
  while (numTracks != 0) {
	  var	currTrack = tracks.Item(numTracks);
	  if (currTrack.Kind == ITTrackKindFile) {
      iTracks.put(currTrack.Location, currTrack);
      lastIndexOfSlash = currTrack.Location.lastIndexOf("\\");
      if (lastIndexOfSlash > maxLastIndexOfSlash) {
        maxLastIndexOfSlash = lastIndexOfSlash;
      }
      addAlbumArtIfMissing(currTrack);
	  }
	  numTracks--;
  }
}

function addAlbumArtIfMissing(currTrack) {
  if (currTrack.Artwork.Count == 0) {
    var trackDir = currTrack.Location.substring(0, currTrack.Location.lastIndexOf("\\"))
    logger.log("DEBUG", "trying to add artwork for " + currTrack.Location);
    if (fileObject.FileExists(trackDir + "\\front.jpg")) {
      currTrack.AddArtworkFromFile(trackDir + "\\front.jpg");
    } else if (fileObject.FileExists(trackDir + "\\cover.jpg")) {
      currTrack.AddArtworkFromFile(trackDir + "\\cover.jpg");
    } else if (fileObject.FileExists(trackDir + "\\folder.jpg")) {
      currTrack.AddArtworkFromFile(trackDir + "\\folder.jpg");
    }
  }
}
