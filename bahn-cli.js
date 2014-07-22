#!/usr/bin/env node

var FS = require("fs");
var Path = require("path");

var Request = require("request");
var UUID = require("node-uuid");
var Unzip = require("unzip");
var NPM = require("npm");
var Forever = require("forever-monitor");
var PackageJSONValidator = require('package-json-validator').PJV;

Array.prototype.diff = function(a) {
    return this.filter(function(i) {return !(a.indexOf(i) > -1);});
};

var package = require("./package.json");
if (!package.config) package.config = {};

var REPO = "oliver-moran/bahn";
var USER_AGENT = "bahn-cli " + package.version + "; " +
                 "node " + process.version + "; " +
                 "v8 " + process.versions.v8 + "; " +
                 "https://github.com/bahn-cli";

var HTTP_PROXY;
if (package.config.proxy) HTTP_PROXY = package.config.proxy;

// process the command line arguments
var argv = require("yargs")
    .usage("Installs and manages bahn applications")
    .example("bahn", "install/start a bahn application")
    .example("bahn --port 80", "install/start an application using port 80")
    .example("bahn --port 80 --forever", "install/start on port 80 and keep alive")
    .example("bahn ~/path/to/directory", "install/start in the given directory")
    .describe("create", "explicitly downloads and installs the latest bahn release")
    .describe("database", "a Boolean or the URL of a MongoDB server")
    .describe("logging", "a Boolean or the path to write HTTP logs")
    .describe("port", "the HTTP port at which to application listens")
    .describe("proxy", "the URL of a proxy server, if you are behind a proxy")
    .describe("start", "explicitly starts a bahn application")
    .describe("sockets", "a Boolean, if false WebSockets will be disabled")
    .describe("version", "print the version number of this CLI")
    .wrap(80)
    .boolean("help")
    .boolean("version")
    .boolean("create")
    .boolean("start")
    .boolean("forever")
    .requiresArg(["port", "database", "sockets", "logging", "proxy"])
    .check(function (argv, arr) {
        // must either install or create
        if (!argv.create && !argv.start && !argv.version && !argv.help) {
            var dir = (argv._[0]) ? Path.resolve(argv._[0]) : process.cwd();
            try {
                var package = require(Path.join(dir, "package.json"));
                argv.start = true;
                return;
            } catch (err) {
                // meh, probably does not exist
                argv.create = true;
                argv.start = true;
                return;
            }
        }
    })
    .argv;

if (argv.proxy) HTTP_PROXY = argv.proxy;
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
                        if (argv.start) start();
                    });
                });
            });
        });
}

function start() {
    var dir = (argv._[0]) ? Path.resolve(argv._[0]) : process.cwd();

    /* Error checking */
    try {
        var path = Path.join(dir, "package.json");
        var contents = FS.readFileSync(path).toString();
        var check = PackageJSONValidator.validate(contents);
        if (!check.valid) {
            console.log("Could not start bahn. Could not parse package.json: " + check.critical);
            return;
        }
        var package = JSON.parse(contents);
        if (package.name != "bahn") {
            console.log("Could not start bahn. Found the package " + package.name + ".");
            return;
        }
    } catch (err) {
        console.log("Could not start bahn. Could not parse package.json.");
        return;
    }
    
    var args = [];
    if (typeof argv.port != "undefined") 
        args.push("--port", argv.port);
    if (typeof argv.database != "undefined") 
        args.push("--database", argv.database);
    if (typeof argv.sockets != "undefined") 
        args.push("--sockets", argv.sockets);
    if (typeof argv.logging != "undefined") 
        args.push("--logging", argv.logging);

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
    var obj = {
        url: url,
        headers: { "User-Agent": USER_AGENT }
    };
    if (HTTP_PROXY) obj.proxy = HTTP_PROXY;
    return obj;
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