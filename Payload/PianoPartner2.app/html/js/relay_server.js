//
//	relayserver.js (node.js + websocket.io)
//
//	Copyright 2015 Roland Corporation. All rights reserved.
//

/* relay for remote procedure call. */
var relayServer = require('websocket.io').listen(9001, function() {

	console.log('relay server running ...');

	var os = require('os');
	var ifaces = os.networkInterfaces();
	for (var dev in ifaces) {
		var alias = 0;
		ifaces[dev].forEach(function(details) {
			if (details.family=='IPv4') {
				console.log(dev + (alias ? ':' + alias :''), details.address);
				alias++;
			}
		});
	}
});

relayServer.on('connection', function(socket) {

	console.log('remote target connected.');

	var res = null;

	var http = require('http');
	var url = require('url');
	var xhr = http.createServer(function(req, s) {
		res = s;
		var args = decodeURIComponent(url.parse(req.url).pathname).substring(1);
		socket.send(args);
	}).listen(9000);

	socket.on('message', function(text) {
		if (res) {
			res.writeHead(200, 'OK', {
				'access-control-allow-origin': '*',
				'Content-Type': 'text/plain'
			});
			res.end(text);
			res = null;
		}
	});

	socket.on('close', function() {
		xhr.close();
		console.log('remote target disconnected.');
		return true;
	});
});
