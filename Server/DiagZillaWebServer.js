"use strict";

var fs=require('fs');
var path=require('path');
var util=require('util');
var events=require('events');
var url=require('url');

var log = util.log;
var debug = util.debug;
var error = util.error;
var inspect = function(obj){return util.inspect(obj, true, 3, true);};

var WebContentsDir = './WebClient';
var DiagZillaInfoChannel='DiagZillaClient';


exports.create = function(listenPort){
	return new DiagZillaWebServer(listenPort);
}

function DiagZillaWebServer(listenPort) {
	events.EventEmitter.call(this);

	var self=this;

	this.http = require('http')
			.createServer(onHttpRequest)
			.listen(listenPort);
	this.ws = require('socket.io').listen(this.http);

	this.ws.configure('production', function(){
		var ws = self.ws;
		ws.enable('browser client minification');
		ws.enable('browser client etag');
		ws.enable('browser client gzip');
		ws.set('log level', 1);
		ws.set('transports', ['websocket', 'flashsocket', 'htmlfile', 'xhr-polling', 'jsonp-polling']);
	});
	this.sockets = this.ws.sockets;

	this.emptyChannelBackup = {};

	// socket events
	this.sockets.on('connection', function(socket){self.onWsConnection(socket);});
}
util.inherits(DiagZillaWebServer, events.EventEmitter);
DiagZillaWebServer.prototype.getJoinedRoomList = function(socket){
	return this.sockets.manager.roomClients[socket.id];
}

DiagZillaWebServer.prototype.onWsConnection = function(socket) {
	var self=this;

	var clientAddress=socket.handshake.address;
	log('[Websocket] connection from ' + clientAddress.address + ':' + clientAddress.port);

	// Socket events
	socket.join(DiagZillaInfoChannel)
	.on('disconnect', function(){
		var joinedRooms = self.getJoinedRoomList(socket);
		for(var i=0, length = joinedRooms.length;i<length;++i) {
			// TODO : unsubscribe from all subscribed channels
		}
		socket.leave(DiagZillaInfoChannel);
		log('[Websocket] disconnected : ' + clientAddress.address + ':' + clientAddress.port);
	});

	// Custom events
	socket.on('request-channels', function(){
		self.emit('request-channels', self.getJoinedRoomList(socket));
	}).on('subscribe', function(info){
		var channel = info.key;
		log('[WebServer] Subscribe to "' + channel + '"');
		socket.join(channel);
		var backupStorage = self.emptyChannelBackup;
		if(channel in backupStorage) {
			var backupChannel = backupStorage[channel];

			var i=0,length=backupChannel.length;
			log('[WebServer] Post ' + length + ' pending data on channel "' + channel + '"');
			for(;i<length;++i){
				self.broadcast(channel, backupChannel[i].evt, backupChannel[i].data);
			}

			delete backupStorage[channel];
		}
	}).on('unsubscribe', function(info){
		var channel = info.key;
		log('[WebServer] Unsubscribe from "' + channel + '"');
		socket.leave(channel);
	});
}

DiagZillaWebServer.prototype.broadcast = function(channel, evt, data) {
	var sockets = this.sockets;
	var clientCnt = sockets.clients(channel).length;
	var clients = sockets.in(channel);

	if(clientCnt !== 0){
		clients.emit(evt, data);
	} else if(channel!=DiagZillaInfoChannel){
		var self=this;
		var backupStorage = self.emptyChannelBackup
		if(!(channel in backupStorage)) backupStorage[channel] = [];
		var backupChannel = backupStorage[channel];
		backupChannel.push({'evt':evt, 'data':data});

		// Keep this for 3 seconds
		setTimeout(function(){
			if(channel in backupStorage)
				delete backupStorage[channel];
		}, 3000);
	}
}

DiagZillaWebServer.prototype.broadcastChannel = function(evt, data) {
	this.broadcast(DiagZillaInfoChannel, evt, data);
}

function onHttpRequest(req, res) {
	var decodedURI = decodeURI(req.url);
	var parsedURI = url.parse(req.url)
	var filePath = WebContentsDir + (parsedURI.pathname==='/'?"/index.html":parsedURI.pathname);

	function reportError(num) {
		res.writeHead(num);
		res.end();
	}

	if(parsedURI.search)
		log('URI search parameter : ' + inspect(parsedURI));
	if(parsedURI.query)
		log('URI query parameter : ' + inspect(parsedURI));

	fs.exists(filePath, function(exists) {
		if(exists) {
			fs.readFile(filePath, function(error, content){
				if(error){
					// 500 : Internal Server Error
					reportError(500);
				} else {
					res.writeHead(200, {
						'Cache-Control': 'no-cache',
						'Content-Type': mimetypeTable[path.extname(filePath).substr(1)]||'application/octet-stream'
						});
					res.end(content, 'utf-8');
				}
			});
		} else {
			// 404 : Not Found
			reportError(404);
			console.log('"' + filePath + '" is not found. 404 responsed.');
		}
	});
}

var mimetypeTable = {};
(function prepareMimetype()
{
	var mimetypeDescFile = '/etc/mime.types';
	fs.exists(mimetypeDescFile, function(exist) {
		if(exist){
			fs.readFile(mimetypeDescFile, 'utf-8', function(error, content){
				if(error){
					log('Error occured while read file "'+mimetypeDescFile+'".');
				} else {
					content.split(/\n+/).forEach(function(e, i){
						var mimetypeInfo = e.match(/^\s*([^#]\S+)\s+(.+)/);
						if(mimetypeInfo) {
							mimetypeInfo[2].split(/\s+/).forEach(function(ext, i){
								mimetypeTable[ext] = mimetypeInfo[1];
							});
						}
					});
				}
			});
		} else {
			log('Miemtype description is not found.');
			error('Filename : ' + mimetypeDescFile);
		}
	});
}());
