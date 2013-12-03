"use strict";

var util=require('util');
var events=require('events');

var log = util.log;
var error = util.error;
var inspect = function(obj){return util.inspect(obj, true, 1, true);};

exports.create = function(){
	return new DiagChannelInfo();
}

function DiagChannelInfo()
{
	events.EventEmitter.call(this);

	this.list = {};
}

util.inherits(DiagChannelInfo, events.EventEmitter);

DiagChannelInfo.prototype.register = function(info) {
	var pid = info.pid;
	var execName = info.execName;
	var execShortName = execName.substr(execName.lastIndexOf("/")+1)
	log('[daemon] channel register :: ' + '[pid : ' + info.pid + ', name : ' + execShortName + ' ]');
	var list = this.list;
	var key = info2key(info);
	if(this.isRegistered(info)){
		error('Duplicated diag channel tried to be registered.');
		error(" --> " + inspect(info));
	}

	info.key=key;
	list[key] = info;

	this.emit('new-channel', info);
}

DiagChannelInfo.prototype.unregister = function(info) {
	var pid = info.pid;
	var execName = info.execName;
	var execShortName = execName.substr(execName.lastIndexOf("/")+1)
	log('[daemon] channel unregister :: ' + '[pid : ' + info.pid + ', name : ' + execShortName + ' ]');
	var list = this.list;
	if(!this.isRegistered(info)){
		error('Unregistered diag channel tried to be unregistered.\n  --> ' + inspect(info));
		return;
	}

	delete list[info.key];
	this.emit('closed-channel', info);
}

DiagChannelInfo.prototype.isRegistered = function(info) {
	return (info2key(info) in this.list);
}


function info2key(info)
{
	return 'ch-' + info.addr + ':' + info.pid;
}
