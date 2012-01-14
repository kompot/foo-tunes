file = new ActiveXObject("Scripting.FileSystemObject");
eval(file.OpenTextFile("lib/all-libraries.js", 1).ReadAll());

// values are: DEBUG, INFO, ERROR
logLevel = "DEBUG";
foobar2000Path = "D:\\tools\\foobar2000\\foobar2000.exe";
musicTrackedPath  = "D:\\music-iphone\\";
musicNotTrackedPath  = "D:\\music-iphone-not-tracked\\";
copyCommandName = "Copy: iTunesSync";
allowedMusicTypes = new Hashtable();
allowedMusicTypes.put("mp3", "");
allowedMusicTypes.put("m4a", "");
tagMappings = ""
  + 'FORMAT:ALBUMSORTORDER:"%ALBUM ARTIST% %DATE%";'
  + 'FORMAT:ITUNESCOMPILATION:"$if($stricmp($meta(album artist),various artists),1,)";'
;

// -----------------------------------------------------------------------------
//
// User definable variables end here.
//
// -----------------------------------------------------------------------------

logger = new Logger(logLevel);
shell = WScript.CreateObject("WScript.Shell");
clipboard = WScript.CreateObject("WshExtra.Clipboard");

foobar2000 = new Foobar2000Mediator();
foobar2000.moveMusicToTrackedLocation();
//foobar2000.moveMusicToNotTrackedLocation();

// rescanning doesn't happen instantly but we have some time
// while iTunes is starting/scanning for new files
// and should never encounter situation when
// trying to synchronise libraries and there are still
// no tracks in foobar2000 library
foobar2000.rescanLibrary();


var iTracks = new Hashtable();
var fTracks = new Hashtable();
var maxLastIndexOfSlash = -1;

iTunes = new ITunesMediator();
iTunes.initIpod();
// TODO: scan for dead entries in library
iTunes.cacheTracksFromLibrary();
iTunes.addFreshFilesToITunes(file.GetFolder(musicTrackedPath));
// TODO: should find a way to cache tracks instantly, without doing second call
iTunes.cacheTracksFromLibrary();
iTunes.pushNewTracksToIPodAndSync();
// TODO: push tracks that were in iTunes library before (e. g. drag'n'dropeed)
// but somehow are not on iPod
// TODO: also delete tracks that were deleted from iTunes library

WScript.Quit(1);




var result = "";

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

function formatLocationName(fullName, maxLength) {
  if (fullName.startsWith(musicTrackedPath)) {
    fullName = fullName.substring(musicTrackedPath.length, maxLength);
  }
  return fullName;
}

/**
 * Runs a shell command
 * @param command
 * @param sleepTime if 0 then do not try to run again if exception caught
 */
function runCommand(command, sleepTime) {
    try {
      logger.log("DEBUG", "going to run command " + command);
      var retCode = shell.run(command, 0, true);
//      logger.log("DEBUG", "command returned " + retCode);
    } catch (e) {
      logger.log("ERROR", "command failed " + command);
      if (sleepTime == 0) return;
      sleepTime = sleepTime * 2;
      logger.log("INFO", "going to run again");
      WScript.Sleep(sleepTime);
      runCommand(command, sleepTime); 
    }
    WScript.Sleep(sleepTime);
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