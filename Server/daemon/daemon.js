"use strict";

var util=require('util');
var log = util.log;
var debug = util.debug;
debug=function(){};
var events=require('events');

exports.create = function(listenPort) {
	return new Daemon(listenPort);
}

function Daemon(listenPort) {
	var self = this;
	events.EventEmitter.call(this);

	this.server = require('net').createServer()
					.on('listen',function(){log('[daemon] listening on port ' + listenPort);})
					.on('connection', function(sock){self.onConnection(sock);})
					.listen(listenPort);

	this.diagChannels = require('./channel.js').create()
			.on('new-channel', function(info){self.emit('channel-info', 'new-channel', info);})
			.on('closed-channel', function(info){self.emit('channel-info', 'closed-channel', info);});

	this.diagMessageQueue = require('./messageQueue.js').create()
			.on('new-channel', function(targetInfo){self.diagChannels.register(targetInfo);})
			.on('messages', function(roomId, queue){self.emit('channel-msg', roomId, 'messages', queue);});
}

util.inherits(Daemon, events.EventEmitter);

Daemon.prototype.onConnection = function(sock) {
	var self=this;
	debug('[daemon] connected : ' + sock.remoteAddress + ':' + sock.remotePort);
	sock.targetInfo = {
		addr : sock.remoteAddress,
		port : sock.remotePort
	};

	sock.on('data', function(data){self.onClientData(sock, data);})
		.on('end', function(){self.onClientEnd(sock);})
		.on('close', function(){self.onClientClose(sock);});
}

Daemon.prototype.onClientData = function(sock, data) {
	var i = 0;

	var objstr;
	var objstrLen;
	var objBeginIdx;
	var objEndIdx;

	var queue = this.diagMessageQueue;

	/* restore */
	if(sock.lastObjstr){
		var lastObj = sock.lastObjstr;
		var written = lastObj.written;
		objstr = lastObj.buf;
		objEndIdx = objstr.length-written;
		data.copy(objstr, written, 0, objEndIdx);
		queue.push(sock.targetInfo, objstr);
		i = objEndIdx;
		delete sock.lastObjstr;
	}

	while(i < data.length) {
		objstrLen = data.readUInt32BE(i);
		objBeginIdx = i+4;
		objEndIdx = objBeginIdx+objstrLen;

		if(objEndIdx > data.length){
			/* backup */
			sock.lastObjstr = {
				written: data.length - objBeginIdx,
				buf : new Buffer(objstrLen)
			};
			data.copy(sock.lastObjstr.buf, 0, objBeginIdx);
			break;
		}

		objstr = data.slice(objBeginIdx, objEndIdx);
		queue.push(sock.targetInfo, objstr);
		i = objEndIdx;
	}

	queue.post(sock.targetInfo.key);
}

Daemon.prototype.onClientEnd = function(sock) {
	this.diagChannels.unregister(sock.targetInfo)
	debug('[daemon] client send FIN : ' + sock.targetInfo.addr + ':' + sock.targetInfo.port);
}

Daemon.prototype.onClientClose = function(sock) {
	var targetInfo = sock.targetInfo;
	var diagChannels = this.diagChannels;
	if(diagChannels.isRegistered(targetInfo))
		diagChannels.unregister(targetInfo)
	debug('[daemon] client closed : ' + targetInfo.addr+ ':' + targetInfo.port);
}

