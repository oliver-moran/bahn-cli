#!/usr/bin/env node

var FS = require("fs");
var Path = require("path");

var Request = require("request");
var UUID = require("node-uuid");
var Unzip = require("unzip");
var NPM = require("npm");

Array.prototype.diff = function(a) {
    return this.filter(function(i) {return !(a.indexOf(i) > -1);});
};

var package = require("./package.json");

var REPO = "oliver-moran/bahn";
var USER_AGENT = "bahn-cli " + package.version + "; " +
                 "node " + process.version + "; " +
                 "v8 " + process.versions.v8 + "; " +
                 "https://github.com/bahn-cli";

Request(requestObject("https://api.github.com/repos/" + REPO + "/releases"), function (error, response, body) {
    if (!error && response.statusCode == 200) {
        var releases = JSON.parse(body);
        var latest = releases[0];
        downloadRelease(latest);
    } else {
        console.log(JSON.parse(body.message));
    }
});


function downloadRelease(release) {
    console.log("Installing release " + release.name + " of bahn.");
    
    var dir = process.cwd();
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
                installAndRun();
            });
        });
}

function installAndRun() {
    // NPM.config
    NPM.load({}, function (err) {
        NPM.on("log", function (message) { console.log(message); })
        NPM.commands.install([], function (er, data) {
            NPM.commands.start(function (er, data) {
            });
        });
    });
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