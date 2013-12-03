"use strict";

var util=require('util');
var events=require('events');

var log = util.log;
var error = util.error;
var inspect = function(obj){return util.inspect(obj, true, 2, true);};

exports.create = function() {
	return new DiagMessageQueue();
}

function DiagMessageQueue()
{
	events.EventEmitter.call(this);

	this.queue = [];
}

util.inherits(DiagMessageQueue, events.EventEmitter);

DiagMessageQueue.prototype.push = function(targetInfo, json){
	if(json[0]!==0x7b/* { */ || json[json.length-1]!==0x7d/* } */)
	{
		error("[daemon] Failed to parse json : " + json);
		return;
	}

	var msgobj = JSON.parse(json);
	if(msgobj.register){
		for(var p in msgobj) targetInfo[p]=msgobj[p];
		this.emit('new-channel', targetInfo);
	} else {
		// TODO : Check the room is empty or not.
		//   --> io.sockets.clients(roomId).length
		msgobj.targetInfo = targetInfo;
		this.queue.push(msgobj);
	}
}

DiagMessageQueue.prototype.post = function(roomId){
	var queue = this.queue;
	if(queue.length)
		this.emit('messages', roomId, queue.splice(0));
}

