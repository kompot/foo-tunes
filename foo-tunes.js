file = new ActiveXObject("Scripting.FileSystemObject");
eval(file.OpenTextFile("lib/all-libraries.js", 1).ReadAll());

// values are: DEBUG, INFO, ERROR
logLevel = "INFO";
foobar2000Path = "D:\\tools\\foobar2000\\foobar2000.exe";
musicTrackedPath  = "D:\\music-iphone\\";
musicNotTrackedPath  = "D:\\music-iphone-not-tracked\\";
copyCommandName = "Copy: iTunesSync";
allowedMusicTypes = new Hashtable();
allowedMusicTypes.put("mp3", "");
allowedMusicTypes.put("m4a", "");
tagMappings = ""
  // to be correctly sorted within artist view and within album view
  + '"FORMAT:ALBUMSORTORDER:%album artist% %date%";'
  // for compilations to appear in `compilations` section
  + '"FORMAT:ITUNESCOMPILATION:$if($stricmp($meta(album artist),various artists),1,)";'
;
/**
 * @deprecated
 */
deleteTracksFromITunesNotFoundOnDisk = true;
/**                                                                   v
 * @deprecated
 */
deleteTracksFromIPodNotFoundInITunes = true;

// -----------------------------------------------------------------------------
//
// User definable variables end here.
//
// -----------------------------------------------------------------------------

var defaultDate = new Date(1961, 3, 12);
var date = new Date();
logger = new Logger(logLevel, "logs", date);
fooTunesDb = new FooTunesDb("logs", date);
shell = WScript.CreateObject("WScript.Shell");
clipboard = WScript.CreateObject("ClipboardHelper.ClipBoard");

fooTunesDb.readDb();
foobar2000 = new Foobar2000Mediator();
foobar2000.moveMusicToTrackedLocation();
// TODO: move when sync is over
//foobar2000.moveMusicToNotTrackedLocation();

// rescanning doesn't happen instantly but we have some time
// while iTunes is starting/scanning for new files
// and should never encounter situation when
// trying to synchronise libraries and there are still
// no tracks in foobar2000 library
foobar2000.rescanLibrary();


var maxLastIndexOfSlash = -1;

iTunes = new ITunesMediator();
iTunes.initIpod();
iTunes.cacheTracks();
// TODO should we delete files from disk here? probably yes - if they were in db
fooTunesDb.removeTracksNotOnIPod();
foobar2000.loadPlaybackStats();



iTunes.addFreshFilesToITunes();
iTunes.removeTracksNotOnDisk();


fooTunesDb.dump();

// TODO: should run UpdateIpod method as stats is not updated within iTunes
foobar2000.syncPlaybackStats();

WScript.Quit(1);

// TODO: should find a way to cache tracks instantly, without doing second call

var keys = iTunes.tracksByLocation.keys();
//var locations = new Array();
//for (var i = 0; i < iTunes.tracksByLocation.size(); i++) {
//  locations.push(keys[i]);
//}


for (var i = 0; i < iTunes.tracksByLocation.size(); i++) {
  var defaultDate = new Date(1961, 3, 12);
  var fd = foobar2000.tracksByLocation.get(keys[i]).PlayedDate;
  var fooDate = new Date(fd.substr(0, 4), fd.substr(5, 2), fd.substr(8, 2), fd.substr(11, 2), fd.substr(14, 2), fd.substr(17, 2));
  if (isNaN(parseInt(fd.substr(0, 4)))) {
    fooDate = defaultDate;
  }
  var iDate = new Date(iTunes.tracksByLocation.get(keys[i]).PlayedDate);
  if (iDate.getYear() < 1901) {
    iDate = defaultDate;
  }
  //WScript.Echo(Date.format("%Y_%m_%d %H:%M:%S", new Date(2011, 12, 15, 10, 12, 12), "0").toString().padRight(24, " "));
  var fooRating = parseInt(foobar2000.tracksByLocation.get(keys[i]).Rating);
  if (isNaN(fooRating)) {
    fooRating = 0;
  }
  var iTunesRating = parseInt(iTunes.tracksByLocation.get(keys[i]).Rating.toString()) / 20;
  if (fooRating > iTunesRating) {
    iTunes.iPodTracksById.get(iTunes.iTunesApp.ITObjectPersistentIDHigh(iTunes.tracksByLocation.get(keys[i]))).Rating = fooRating * 20;
    logger.log("DEBUG", "setting track rating to " + fooRating);
  }
  logger.log("DEBUG",
    formatLocationName(iTunes.tracksByLocation.get(keys[i]).Location, maxLastIndexOfSlash + 15)
        .padRight(maxLastIndexOfSlash, " ")
      + fooRating.toString().padLeft(3, " ")
      + iTunesRating.toString().padLeft(3, " ")
      + foobar2000.tracksByLocation.get(keys[i]).PlayedCount.padLeft(4, " ")
      + iTunes.tracksByLocation.get(keys[i]).PlayedCount.toString().padLeft(4, " ")
      + Date.format("%Y-%m-%d %H:%M:%S", fooDate, "0").toString().padLeft(24, " ")
      + Date.format("%Y-%m-%d %H:%M:%S", iDate, "0").toString().padLeft(24, " ")
//      + "ppp " + foobar2000.tracksByLocation.get(keys[i])

//      + iTunes.tracksByLocation.get(keys[i]).PlayedDate
//.format("%Y-%m-%d %H:%M:%S", "0").padLeft(25, " ")
//      + Date.format("%Y-%m-%d %H:%M:%S", iTracks.get(keys[i]).DateAdded, "0").padLeft(25, " ")
  );
}

//iTunes.pushNewTracksToIPodAndSync();
//iTunes.findOrphanedTracksToDeleteFromIPod();







WScript.Quit(1);





var result = "";

var keys = iTTracks.size();

for (var i = 0; i < keys.length; i++) {
//  var lastPlayed = parseDate(iTracks.get(keys[i]).PlayedDate.toString());
  logger.log("DEBUG", 
    formatLocationName(iPTracks.get(keys[i]).Location, maxLastIndexOfSlash + 15)
        .padRight(maxLastIndexOfSlash, " ")
      + iTTracks.get(keys[i]).Rating.toString().padLeft(5, " ")
      + iTTracks.get(keys[i]).PlayedCount.toString().padLeft(8, " ")
      + iTTracks.get(keys[i]).PlayedDate
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