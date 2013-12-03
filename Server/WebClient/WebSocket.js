"use strict";
importScripts('/socket.io/socket.io.js');
importScripts('/lib/c++filt.js');

self.onmessage = onWorkerMessage;

var dzSocket= (function()
{
	var socket;
	var connectionStatus;

	function initHandlers()
	{
		if(!socket) throw new Error("Socket is not initialized yet.");

		// Connection related handlers
		socket.on('messages', dzBuffer.push)
			.on('connecting', 			function(){reportConnectionStat('connecting');})
			.on('connect', 				function(){reportConnectionStat('connect');})
			.on('disconnect',			function(){reportConnectionStat('disconnect');})
			.on('connect_failed',		function(){reportConnectionStat('connect failed');})
			.on('error',				function(){reportConnectionStat('error');})
			.on('reconneect_failed',	function(){reportConnectionStat('reconnect failed');})
			.on('reconnect',			function(){reportConnectionStat('reconnect');})
			.on('reconnecting',			function(){reportConnectionStat('reconnecting');});

		socket.on('report-channels',reportChannels)
			.on('new-channel', reportNewChannel)
			.on('closed-channel', reportClosedChannel);

		return;
	}

	function reportConnectionStat(statusMsg)
	{
		connectionStatus = statusMsg;
		self.postMessage({'type': 'connection-report', 'status' : statusMsg});
	}

	function reportNewChannel(channel)
	{
		self.postMessage({type:'new-channel', 'channel': channel});
	}

	function reportClosedChannel(channel)
	{
		self.postMessage({type:'closed-channels', 'channel': channel});
	}

	function reportChannels(channels)
	{
		self.postMessage({type:'report-channels', 'channels': channels});
	}

	return {
		connect: function(addr){
			if(!socket) {
				socket = io.connect(addr);
				initHandlers();
			} else {
				var ssocket = socket.socket;
				if(ssocket.connected)
					throw new Error("socket is already connected.");
				else if(ssocket.connecting || ssocket.reconnecting)
					throw new Error("socket is trying to be connect.");
				else
					ssocket.reconnect();
			}
		},
		disconnect: function() {
			if(!socket) return;
			socket.disconnect();
		},
		requestChannels: function() {
			if(!socket) throw new Error("socket is not prepared yet.");
			socket.emit('request-channels');
		},
		subscribe: function(info) {
			if(!socket) throw new Error("socket is not prepared yet.");
			socket.emit('subscribe', info);
		},
		unsubscribe: function(info) {
			if(!socket) throw new Error("socket is not prepared yet.");
			socket.emit('unsubscribe', info);
		}
	};
})();

var dzFilter = (function()
{
	var filters = [];
	return {
		register: function(locationInfo){
			if(dzFilter.filtered(locationInfo)) return;
			filters.push(locationInfo);
		},
		filtered: function(locationInfo){
			for(var i=0, length=filters.length;i<length;++i){
				var filter = filters[i];
				if(filter.filename === locationInfo.filename && filter.line === locationInfo.line) return true;
			}
			return false;
		},
	}
})();

var dzBuffer= (function()
{

	function composeTimestamp(seed)
	{
		var date = new Date(seed);

		var tsHour = date.getHours();
		var tsMin = date.getMinutes();
		var tsSec = date.getSeconds();
		var tsMSec = date.getMilliseconds();

		if(tsHour<10) tsHour = '0' + tsHour;
		else if(tsHour<1) tsHour = '00';

		if(tsMin<10) tsMin = '0' + tsMin;
		else if(tsMin<1) tsMin = '00';

		if(tsSec<10) tsSec = '0' + tsSec;
		else if(tsSec<1) tsSec = '00';

		if(tsMSec<1) tsMSec = '000';
		else if(tsMSec<10) tsMSec = tsMSec.toString()+'00';
		else if(tsMSec<100) tsMSec = tsMSec.toString()+'0';

		return tsHour+':'+tsMin+':'+tsSec+':'+tsMSec;
	}

	return {
		push: function(msgs){
			var buffer = [];
			for(var i=0, length=msgs.length;i<length;++i) {
				var msg = msgs[i];

				var position = msg.position;
				if(dzFilter.filtered(position)) continue;

				buffer.push( (function(){
					var html = [];
					html.push('<tr class="type-'+msg.type+'">');
					html.push('<td class="timestamp">' + composeTimestamp(msg.timestamp) + '</td>');
					html.push('<td class="processname" title="'+msg.targetInfo.execName+'">' + msg.targetInfo.shortName+ '</td>');
					html.push('<td class="pid">' + msg.targetInfo.pid + '</td>');
					html.push('<td class="tid">' + msg.tid + '</td>');
					html.push('<td class="filename">' + position.filename + '</td>');
					html.push('<td class="line">' + position.line + '</td>');
					html.push('<td class="function" title="'+position.prettyfunction+'">' + position.function + '</td>');

					html.push('<td class="stackdepth">');
					var stackDepth = position.stackdepth;
					html.push('<div>'+(stackDepth)+'</div>');
					// Hidden table for stack information
					html.push('<table style="display:none">');
					html.push('<caption>['+msg.targetInfo.pid+']['+position.filename+']['+position.line+']</caption>');
					html.push('<thead><tr><th>Depth</th><th>Address</th><th>Base</th><th>Symbol</th><th>Offset</th></tr></thead>');
					html.push('<tbody>');
					var stack = position.stack;
//					var stackPattern = /^\[(0x[0-9a-fA-F]+)\]\s+(.*)/;
					var stackPattern = /^\[(0x[0-9a-fA-F]+)\]\s+([^(]+)\(([^\+]+)\+(0x[0-9a-fA-F]+)\)/;
					for(var si=0, slength=stack.length;si<slength;++si){
						var stackInfo = stackPattern.exec(stack[si]);
						html.push('<tr>');
						html.push('<td>'+(stackDepth-1-si)+'</td>');
						if(stackInfo) {
							html.push('<td>'+stackInfo[1]+'</td>');
							var baseInfo = stackInfo[2];
							var baseSeparator = stackInfo[2].lastIndexOf('/');
							var baseDir = baseInfo.substr(0,baseSeparator);
							var baseName = baseInfo.substr(baseSeparator+1);
							html.push('<td title="'+baseDir+'">'+baseName+'</td>');
							html.push('<td>'+demangle(stackInfo[3])+'</td>');
							html.push('<td>'+stackInfo[4]+'</td>');
						} else {
							html.push('<td colspan="3">'+stack[si]+'</td>');
						}
						html.push('</tr>')
					}
					html.push('</tbody>');
					html.push('</table>');
					html.push('</td>');

					html.push('<td class="message">' + msg.message + '</td>');
					html.push('</tr>');
					return html.join('');
				})());
			}

			self.postMessage({'type': 'diagMessages', 'data':buffer});
		},
	};
})();

function onWorkerMessage(evt){
	var data = evt.data;
	switch(data.req){
		case 'connect':
			dzSocket.connect();
			break;
		case 'disconnect':
			dzSocket.disconnect();
			break;
		case 'filter-register':
			dzFilter.register(data.filter);
			break;
		case 'request-channels':
			dzSocket.requestChannels();
			break;
		case 'subscribe':
			dzSocket.subscribe(data.info);
			break;
		case 'unsubscribe':
			dzSocket.unsubscribe(data.info);
			break;
		default:
			throw new Error('Unknown request is entered -> ' + data.req);
			break;
	}
};

