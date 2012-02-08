file = new ActiveXObject("Scripting.FileSystemObject");
eval(file.OpenTextFile("lib/libraries.js", 1).ReadAll());
eval(file.OpenTextFile("inc/includes.js", 1).ReadAll());

foobar2000Path = "D:\\tools\\foobar2000\\foobar2000.exe";
musicTrackedPath  = "D:\\music-iphone\\";
musicNotTrackedPath  = "D:\\music-iphone-not-tracked\\";
copyCommandName = "Copy: iTunesSync";
allowedMusicTypes = new Hashtable();
allowedMusicTypes.put("mp3", "");
allowedMusicTypes.put("m4a", "");
tagMappings = ""
  // to be correctly sorted within artist view and within album view
  + '"FORMAT:ALBUMSORTORDER:%album artist% %date% %album%";'
  // for compilations to appear in `compilations` section
  + '"FORMAT:ITUNESCOMPILATION:$if($stricmp($meta(album artist),various artists),1,)";'
;

// -----------------------------------------------------------------------------
//
// User definable variables end here.
//
// -----------------------------------------------------------------------------

var defaultDate = new Date(1961, 3, 12);
var logDate = new Date();
// possible values are: DEBUG, INFO, ERROR
logger = new Logger("INFO", "logs", logDate);
fooTunesDb = new FooTunesDb("logs", logDate);
shell = WScript.CreateObject("WScript.Shell");
clipboard = WScript.CreateObject("ClipboardHelper.ClipBoard");

fooTunesDb.readDb();
foobar2000 = new Foobar2000Mediator();
foobar2000.moveMusicToTrackedLocation();

// rescanning doesn't happen instantly but we have some time
// while iTunes is starting/scanning for new files
// and should never encounter situation when
// trying to synchronise libraries and there are still
// no tracks in foobar2000 library
foobar2000.rescanLibrary();

iTunes = new ITunesMediator();
try {
  iTunes.initIpod();
  // this will sync ratings/play counts from iPod to iTunes
  iTunes.iTunesApp.UpdateIPod();
  iTunes.cacheTracks();
  // TODO should we delete files from disk here? probably yes - if they were in DB
  fooTunesDb.removeTracksNotOnIPod();
  foobar2000.loadPlaybackStats();
  iTunes.addFreshFilesToITunes();
  iTunes.removeTracksNotOnDisk();
  foobar2000.syncPlaybackStats();
  // TODO: option to eject iPod?
} catch (e) {
  logger.log("ERROR", "Error occured. Exiting. " + e.message);
}
fooTunesDb.dump();
foobar2000.moveMusicToNotTrackedLocation();

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