#!/usr/bin/env node

var FS = require("fs");
var Path = require("path");

var Request = require("request");
var UUID = require("node-uuid");
var Unzip = require("unzip");
var NPM = require("npm");
var Forever = require("forever-monitor");

Array.prototype.diff = function(a) {
    return this.filter(function(i) {return !(a.indexOf(i) > -1);});
};

var package = require("./package.json");

var REPO = "oliver-moran/bahn";
var USER_AGENT = "bahn-cli " + package.version + "; " +
                 "node " + process.version + "; " +
                 "v8 " + process.versions.v8 + "; " +
                 "https://github.com/bahn-cli";

// process the command line arguments
var argv = require("yargs")
    .usage("Creates and manages a bahn application: $0")
    .example("bahn --create ~/bahn", "install an application in ~/bahn")
    .example("bahn --start ~/bahn", "start the application in ~/bahn")
    .example("bahn --port 8080 --forever", "start on port 8080 and auto-restart if it dies")
    .describe("create", "downloads and installs the latest bahn release")
    .describe("database", "sets whether to start a databse with the application")
    .describe("help", "show this help text")
    .describe("port", "sets the port the application run at")
    .describe("start", "starts a bahn application")
    .describe("sockets", "sets whether to start WebSockets with the application")
    .describe("version", "print the current version number of this CLI application")
    .wrap(80)
    .boolean("help")
    .boolean("version")
    .boolean("create")
    .boolean("start")
    .boolean("forever")
    .requiresArg(["port", "database", "sockets"])
    .check(function (argv, arr) {
        // must either install or create
        if (!argv.create && !argv.version && !argv.help) {
            argv.start = true;
        }
    })
    .argv;

if (argv.help) console.log(require("yargs").help());
if (argv.version) console.log("bahn-cli " + package.version);
if (argv.create) downloadReleaseURL();
else if (argv.start) start();

function downloadReleaseURL() {
    Request(requestObject("https://api.github.com/repos/" + REPO + "/releases"), function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var releases = JSON.parse(body);
            var latest = releases[0];
            downloadAndInstall(latest);
        } else {
            console.log(JSON.parse(body.message));
        }
    });
}

function downloadAndInstall(release) {
    console.log("Installing release " + release.name + " of bahn.");

    var dir = (argv._[0]) ? Path.resolve(argv._[0]) : process.cwd();
    var tmp = Path.join(dir, UUID.v4());
    var zip = Path.join(tmp, UUID.v4() + ".zip");
    
    FS.mkdirSync(tmp);
    
    Request(requestObject(release.zipball_url))
        .pipe(FS.createWriteStream(zip))
        .on("close", function () {
            FS.createReadStream(zip)
            .pipe(Unzip.Extract({ path: tmp }))
            .on("close", function () {
                FS.unlink(zip);
                getDirectories(tmp).forEach(function (package) {
                    // should only every be one
                    var package_dir = Path.join(tmp, package);
                    moveContentsOfDirectory(package_dir, dir);
                    FS.rmdirSync(package_dir);
                });
                FS.rmdirSync(tmp);
                var cwd = process.cwd();
                process.chdir(dir); // need to change directory to where it should install
                NPM.load({}, function (err) {
                    NPM.on("log", function (message) { console.log(message); })
                    NPM.commands.install([dir], function (er, data) {
                        process.chdir(cwd); // change back to original cwd for pity's sake
                        if (arv.start) start();
                    });
                });
            });
        });
}

function start() {
    var dir = (argv._[0]) ? Path.resolve(argv._[0]) : process.cwd();

    var args = [];
    if (typeof argv.port != "undefined") 
        args.push("--port", argv.port);
    if (typeof argv.database != "undefined") 
        args.push("--database", argv.database);
    if (typeof argv.sockets != "undefined") 
        args.push("--sockets", argv.sockets);

    var n = (argv.forever) ? Infinity : 1;
    
    var child = new (Forever.Monitor)("bahn.js", {
        max: n,
        sourceDir: dir,
        cwd: dir,
        silent: false,
        options: args
    });

    child.on("restart", function() {
        console.error("Restarting bahn: " + child.times + " (" + dir + ")");
    });

    child.start();
}

function requestObject(url) {
    return {
        url: url,
        headers: { "User-Agent": USER_AGENT }
    };
}

function getDirectories(dir) {
    return FS.readdirSync(dir).filter(function (file) {
        return FS.statSync(Path.join(dir, file)).isDirectory();
    });
}

function moveContentsOfDirectory(from, to) {
    var files = FS.readdirSync(from);
    files.forEach(function (file, i, files) {
        FS.renameSync(Path.join(from, file), Path.join(to, file));
    });
}