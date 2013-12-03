"use strict";

var util=require('util');

var log = util.log;
var error = util.error;
var inspect = function(obj){return util.inspect(obj, true, 1, true);};

function channelBroadcaster(channel, evt, data)
{
	WebServer.broadcast(channel, evt, data);
}

function channelInfoBroadcaster(evt, data)
{
	WebServer.broadcastChannel(evt, data);
}

var DaemonPort = 7040;
var WebServerPort = 8000;

var Daemon = require('./daemon/daemon.js').create(DaemonPort)
	.on('channel-info', channelInfoBroadcaster)
	.on('channel-msg', channelBroadcaster);

var WebServer = require('./DiagZillaWebServer.js').create(WebServerPort)
	.on('request-channels', function(joinedRoomList){
		var channelList = {};
		var channelsOnDaemon = Daemon.diagChannels.list;
		for(var key in channelsOnDaemon){
			channelList[key] = channelsOnDaemon[key];
			channelList[key].subscribed = joinedRoomList['/'+key];
		}
		channelInfoBroadcaster('report-channels', channelList);
	});

