bahn-cli
========

bahn is a ready-for-road HTML5 application stack combining [Bootstrap](http://getbootstrap.com), [AngularJS](https://angularjs.org/), [H5BP](http://html5boilerplate.com/), and [Node.js](http://nodejs.org/) (BAHN).

bahn comes pre-rolled a NoSQL database ([NeDB](https://github.com/louischatriot/nedb) or [MongoDB](http://www.mongodb.org/)), a HTTP application server ([Express](http://expressjs.com/)), and [WebSocket](http://www.html5rocks.com/en/tutorials/websockets/basics/) support for dynamic applications ([Socket.io](http://socket.io/)).

Apart from bundling all of these together, the philosophy is otherwise agnostic. Use one, use all, use some. But have fun!

## Installation ##

To install the bahn command-line interface type:

    npm install bahn -g

You must have [Node.js installed](http://nodejs.org/download/) before installing. To use a MongoDB database, you must have [MongoDB installed](http://www.mongodb.org/downloads) or access to a MongoDB server.

After installing the bahn command-line interface, navigate to an empty directory and type:

    bahn

This will download and install the latest release of bahn. When it's done, visit [http://127.0.0.1:8080/](http://127.0.0.1:8080/) in a web browser. A seed TODO application that puts the stack through through its paces is included in the default release.

Have a look in the `application/` directory to see how the default application works. It is intended that you will modify this application to create your own.

## Using the line interface ##

To install and run a bahn application application server, navigate to a (preferably) empty directory and type:

    bahn
    
If you are behind a corporate proxy, you may have to pass the address of your proxy server in order you can install bahn:

    bahn --proxy http://proxy:8080/
    
By default the application server will run on port 8080. To run it on a port 80, try:

    bahn --port 80

To run the application server on port 80 and set it to auto-restart after a crash, try:

    bahn --port 80 --forever

To do all of the above and use a MongoDB database (as opposed to the default NeDB database), try:

    bahn --port 80 --database "mongodb://admin:password@127.0.0.1:27017/bahn" --forever

To install/run a bahn application server in a different directory, on port 80, with auto-restart, try:

    bahn --port 80 --forever ~/path/to/directory/

For a full list of options, see:

    bahn --help

## License ##

All of the software distributed in this stack is released under the [MIT license](http://opensource.org/licenses/MIT). Node.js ([see license](https://raw.githubusercontent.com/joyent/node/v0.10.29/LICENSE)) and MongoDB ([see license](http://www.mongodb.org/about/licensing/)) are distributed separately under different open source licenses.