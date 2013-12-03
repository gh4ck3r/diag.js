"use strict";

$(document).ready(function(){
	new DZMessageViewer('DiagZillaMessageViewer', 40000);
});

var uniqueId = (function(idCnt)
{
	return function(){return '__uniqId-' + idCnt++;};
})(0);

////////////////////////////////////////

var DZMessageViewer = (function()
{
	function DZMessageViewer(id, maxMessageCnt)
	{
		if(!(this instanceof DZMessageViewer))
			throw new Error('Constructor class is must invoked with "new" operator');

		var viewArea = $('#'+id);
		if(!viewArea.length)
			throw ReferenceError('"' + id + '" is not found on the document');

		this.constructor = DZMessageViewer;

		var self=this;

		if(maxMessageCnt) self.maxMessageCnt = maxMessageCnt;
		self.newMsgOnBufferTimerId = null;
		var dzMessageBuf = self.msgBuf = new DZMessageViewer.Buffer(self.maxMessageCnt)
			.onMessageReady(function() {
				self.newMsgOnBufferTimerId && clearTimeout(self.newMsgOnBufferTimerId);
				self.newMsgOnBufferTimerId = setTimeout(function(){
					// Pretty heavy DOM manipulation is coming with this trigger.
					viewer.trigger('NewMessage');
					self.newMsgOnBufferTimerId = null;
				});
			}).onMsgCountChanged(function(counterObj) {
				dzStatusBar.trigger('messageCounter', counterObj);
			});

		var dzStatusBar = new DiagZillaMessageStatus(dzMessageBuf)
			.on('messageCounter', function(evt, cntObj){
				dzStatusBar.setCounterStr(cntObj.message + '/' + cntObj.dropped + '/' + cntObj.max);
			});

		var controls = self.controller = new DZMessageViewer.Controls(this, dzMessageBuf)
			.on('clearView', function(e){
				dzMessageBuf.clear();
				viewer.updateLayout();
			}).on('clearSelectedMessages', function(e){
				dzMessageBuf.clearSelectedMessages();
				viewer.updateLayout();
			}).on('msgTypeToggle', function(e){
				viewer.updateLayout();
			});
			

		self.viewerNewMessageTimerId = null;
		var viewer = self.viewer = new DZMessageViewer.Viewer(this, dzMessageBuf, controls, dzStatusBar)
			.on('NewMessage', function(evt){
				self.viewerNewMessageTimerId && clearTimeout(self.viewerNewMessageTimerId);
				self.viewerNewMessageTimerId = setTimeout(function(){
					viewer.applyNewMessageLayout();
					self.viewerNewMessageTimerId = null;
				});
			});


		viewArea.append(controls)
			.append(viewer)
			.append(dzStatusBar);

		self.msgTypeFilterSelector = function(){
			return controls.enabledMsgTypeSelector();
		}

	}

	DZMessageViewer.prototype.maxMessageCnt = 20000;

	DZMessageViewer.prototype.msgTypeFilterSelector = function() {return '*';}

	DZMessageViewer.prototype.findCSSStyleDeclaration = function(selector)
	{
		var styleSheets = document.styleSheets;
		var styleSheetsIdx, styleSheetsLength;
		if(styleSheets.length) {
			for(styleSheetsIdx=0, styleSheetsLength=styleSheets.length;
					styleSheetsIdx<styleSheetsLength;++styleSheetsIdx){
				var styleSheet = styleSheets[styleSheetsIdx];
				var cssRules = styleSheet.cssRules;
				if(cssRules){
					var cssRulesIdx, cssRulesLength;
					for(cssRulesIdx=0, cssRulesLength=cssRules.length;
							cssRulesIdx<cssRulesLength;++cssRulesIdx){
						var cssRule = cssRules[cssRulesIdx];
						if(cssRule.selectorText === selector){
							return cssRule.style;
						}
					}
				}
			}
		}
	}

	return DZMessageViewer;
})();

DZMessageViewer.Buffer = (function()
{
	function DZBuffer(maxLength)
	{
		if(!(this instanceof DZBuffer))
			throw new SyntaxError('Constructor class is must invoked with "new" operator');
		this.constructor = DZBuffer;

		var self=this;

		// Keep message as property and array of handlers for each message as property value.
		self.eventMap = {};

		self.paused = false;
		if(maxLength) self.maxLength = maxLength;

		self.initBuffer();
		var triggerNewMessages = DZBuffer.prototype.triggerNewMessages;
		(self.webSocket = new DZMessageViewer.Buffer.WebSocketWorker('WebSocket.js'))
			.onDiagMessage(function(){
				triggerNewMessages.apply(self, arguments);
			});
	}
	DZBuffer.prototype.maxLength = 10000;
	DZBuffer.prototype.initBuffer = function()
	{
		this.buffer = [];
		this.counter= {
			new: 0,
			message: 0,
			dropped: 0,
			max: this.maxLength
		};
		this.trigger('MsgCountChanged', this.counter);
	}
	DZBuffer.prototype.bind = function(evt, handler)
	{
		if(!handler instanceof Function)
			throw new SyntaxError('handler for ' + evt + ' is not a function.');

		var eventMap = this.eventMap;
		if(!eventMap.hasOwnProperty(evt)) eventMap[evt]=[];

		var prevHandlers=eventMap[evt];
		if(!prevHandlers.some(function(h){return h==handler;}))
			prevHandlers.push(handler);

		return this;
	}
	DZBuffer.prototype.trigger = function(evt, data)
	{
		var self = this;
		var eventMap = self.eventMap;
		if(eventMap.hasOwnProperty(evt)){
			eventMap[evt].forEach(function(handler){
				handler.call(self, data);
			});
		}
		return self;
	}
	DZBuffer.prototype.onMessageReady = function(handler)
	{
		return this.bind('MessageReady', handler);
	}
	DZBuffer.prototype.onMsgCountChanged =  function(handler)
	{
		return this.bind('MsgCountChanged', handler);
	}
	DZBuffer.prototype.triggerNewMessages = function(messages)
	{
		var self = this;
		var buffer = self.buffer;
		var counter = self.counter;

		var newMsgLength = messages.length;

		counter.new += messages.length;
		var overCnt = buffer.length + newMsgLength - counter.max;
		if(overCnt > 0){
			counter.dropped += overCnt;
			buffer.splice(0, overCnt);
		}

		for(var i=0;i<newMsgLength;++i)
			buffer.push($(messages[i])[0]);		// Push as DOM element

		counter.message = buffer.length;
		this.trigger('MsgCountChanged', this.counter);

		if(!this.paused) this.trigger('MessageReady');
	};
	DZBuffer.prototype.newMessages = function()
	{
		var newMessages = this.buffer.slice(-this.counter.new);
		this.counter.new = 0;
		return newMessages;
	};
	DZBuffer.prototype.empty = function()
	{
		return this.buffer.length===0;
	};
	DZBuffer.prototype.toHTML = function()
	{
		return this.buffer.join('');
	};
	DZBuffer.prototype.clear = function()
	{
		delete this.buffer;
		this.initBuffer();
		return this;
	};
	DZBuffer.prototype.count = function()
	{
		var counter = this.counter;
		counter.message = this.buffer.length;
		return counter;
	}
	DZBuffer.prototype.begin = function()
	{
		this.webSocket.connect();
		return this;
	};
	DZBuffer.prototype.stop = function()
	{
		this.webSocket.disconnect();
		return this;
	};
	DZBuffer.prototype.pause = function()
	{
		this.paused = true;
		return this;
	};
	DZBuffer.prototype.resume = function()
	{
		this.paused = false;
		return this;
	};
	DZBuffer.prototype.getChannels = function(handler)
	{
		this.webSocket.getChannels(handler);
	};
	DZBuffer.prototype.subscribe = function(channel)
	{
		this.webSocket.subscribe(channel);
		return this;
	};
	DZBuffer.prototype.unsubscribe = function(channel)
	{
		this.webSocket.unsubscribe(channel);
		return this;
	};
	DZBuffer.prototype.registerFilter = function(filterInfo)
	{
		this.webSocket.registerFilter(filterInfo);
		return this;
	};
	DZBuffer.prototype.clearSelectedMessages = function()
	{
		var buffer = this.buffer;
		var oldLength = buffer.length;
		for(var i=0,length=oldLength;i<length;++i){
			if($(buffer[i]).hasClass('selected')){
				buffer.splice(i,1);
				--length;
				--i;
			}
		}
		if(oldLength!==buffer.length){
			this.counter.message = buffer.length;
			this.trigger('MsgCountChanged', this.counter);
		}
	}

	return DZBuffer;
})();

DZMessageViewer.Buffer.WebSocketWorker = (function()
{
	function WebSocketWorker(socketJsFile)
	{
		if(!(this instanceof WebSocketWorker))
			throw new Error('Constructor class is must invoked with "new" operator');
		this.constructor = WebSocketWorker;

		var self=this;
		// Keep message as property and array of handlers for each message as property value.
		self.eventMap = {};
		var worker = self.worker = new Worker(socketJsFile);

		self.postMessage = function(){worker.postMessage.apply(worker, arguments);};
		worker.onmessage = function(){self.onWorkerMessage.apply(self, arguments);};
		worker.onerror	 = function(){self.onWorkerError.apply(self, arguments);};
	};
	function triggerDiagMessage(data)
	{
		var eventMap = this.eventMap;
		if(!eventMap.hasOwnProperty('DiagMessage')) return;

		var handlers = eventMap.DiagMessage;
		for(var i=0, length=handlers.length;i<length;++i){
			var handler = handlers[i];
			if(handler && handler instanceof Function)
				handler.call(this, data);
		}
	};
	WebSocketWorker.prototype.onDiagMessage = function(handler)
	{
		var eventMap = this.eventMap;
		if(!eventMap.hasOwnProperty('DiagMessage')) eventMap.DiagMessage=[];

		var prevHandlers = eventMap.DiagMessage;
		for(var i=0,length=prevHandlers.length;i<length;++i)
			if(prevHandlers[i]==handler) return;

		prevHandlers.push(handler);
		return this;
	};
	WebSocketWorker.prototype.onWorkerMessage = function(evt)
	{
		var msg = evt.data;
		switch(msg.type){
			case 'connection-report':
				console.log('Connection report : ' + msg.status);
				break;
			case 'diagMessages':
				triggerDiagMessage.call(this, msg.data);
				break;
			case 'report-channels':
				var worker = this.worker || {};
				if(worker.hasOwnProperty('reportChannelsHandler') && worker.reportChannelsHandler instanceof Function) {
					worker.reportChannelsHandler(msg.channels);
					delete worker.reportChannelsHandler;
				}
				break;
			case 'new-channel':
				this.subscribe(msg.channel);
				break;
			case 'closed-channel':
				this.unsubscribe(msg.channel);
				break;
		}
	};
	WebSocketWorker.prototype.onWorkerError = function(evt)
	{
		console.error('[Worker] : ' + evt.filename + '(' +  evt.lineno + ') : ' + evt.message);
	};
	WebSocketWorker.prototype.connect = function()
	{
		this.postMessage({req: 'connect'});
	};
	WebSocketWorker.prototype.disconnect = function()
	{
		this.postMessage({req: 'disconnect'});
	};
	WebSocketWorker.prototype.registerFilter = function(filterObj)
	{
		this.postMessage({req: 'filter-register', filter: filterObj});
	};
	WebSocketWorker.prototype.getChannels = function(handler)
	{
		this.worker.reportChannelsHandler = handler;
		this.postMessage({req: 'request-channels'});
	};
	WebSocketWorker.prototype.subscribe = function(info)
	{
		this.postMessage({req: 'subscribe', 'info':info});
	};
	WebSocketWorker.prototype.unsubscribe = function(info)
	{
		this.postMessage({req: 'unsubscribe', 'info':info});
	};

	return WebSocketWorker;
})();

DZMessageViewer.Controls = (function()
{
	var template = (function(){
		var html = [];
		html.push('<div class="dz-header">');
			html.push('<table class="dz-control">');
				html.push('<tbody>');
					html.push('<tr></tr>');
				html.push('</tbody>');
			html.push('</table>');
		html.push('</div>');
		return $(html.join(''));
	})();
	return function(dzViewer, dzBuffer){
		var self = DZMessageViewer.Controls;
		if(!(this instanceof self))
			throw new SyntaxError('Constructor class is must invoked with "new" operator');

		var instance = template.clone();

		instance.control = instance.find('table');

		instance.enabledMsgTypeSelector = function(){
			return msgTypeToggleBtns.enabledMsgTypeSelector();
		}

		instance.followNewMessage = function() {
			return screenControlBtns.followNewMessage();
		}

		instance.openBuffer = function() {
			dzBuffer.begin();
			return this;
		}

		instance.closeBuffer = function() {
			dzBuffer.stop();
			return this;
		}

		instance.pauseBuffer = function() {
			dzBuffer.pause();
			return this;
		}

		instance.resumeBuffer = function() {
			dzBuffer.resume();
			return this;
		}

		instance.getBufferChannels = function(handler) {
			dzBuffer.getChannels(handler);
			return this;
		}
		instance.subscribeBufferChannel = function(info) {
			dzBuffer.subscribe(info);
			return this;
		}
		instance.unsubscribeBufferChannel = function(info) {
			dzBuffer.unsubscribe(info);
			return this;
		}
		instance.registerFilter = function(filterInfo) {
			dzBuffer.registerFilter(filterInfo);
			return this;
		}
		instance.viewableType = function(type) {
			return msgTypeToggleBtns.typeTurnedOn(type);
		}

		var msgTypeToggleBtns = new self.MsgTypeToggleBtns()
			.on('toggle', function(e){
				instance.trigger('msgTypeToggle');
			});
		var screenControlBtns = new self.ScreenControlBtns()
			.on('clear', function(e){
				instance.trigger('clearView');
			});
		var connectionControlBtns = new self.ConnectionControlBtns(instance);
		var statusControls = new self.StatusControls(instance);

		instance.control.find('tr')
			.append(msgTypeToggleBtns)
			.append(screenControlBtns)
			.append(connectionControlBtns)
			.append(statusControls);

		return instance;
	};
})();

DZMessageViewer.Controls.MsgTypeToggleBtns = (function()
{
	var template = (function(){
		var html = [];
		html.push('<td class="msg-type">');
			html.push('<ul>');
				html.push('<li value="T"><input type="checkbox" checked="checked" value="T"/><label>T</label></li>');
				html.push('<li value="V"><input type="checkbox" checked="checked" value="V"/><label>V</label></li>');
				html.push('<li value="D"><input type="checkbox" checked="checked" value="D"/><label>D</label></li>');
				html.push('<li value="I"><input type="checkbox" checked="checked" value="I"/><label>I</label></li>');
				html.push('<li value="W"><input type="checkbox" checked="checked" value="W"/><label>W</label></li>');
				html.push('<li value="E"><input type="checkbox" checked="checked" value="E"/><label>E</label></li>');
				html.push('<li value="F"><input type="checkbox" checked="checked" value="F"/><label>F</label></li>');
				html.push('<li value="A"><input type="checkbox" checked="checked" value="A"/><label>A</label></li>');
			html.push('</ul>');
		html.push('</td>');
		return $(html.join(''));
	})();
	return function(){
		var self = DZMessageViewer.Controls.MsgTypeToggleBtns;
		if(!(this instanceof self))
			throw new SyntaxError('Constructor class is must invoked with "new" operator');
		var instance = template.clone();

		instance.msgTypes = {};

		var buttons = instance.find('ul>li>input');
		buttons.each(function(i, e){
			var btn= $(e);
			var label = btn.next('label');

			btn.attr('id', uniqueId());
			label.attr('for', btn.attr('id'));

			function update(btnElem){
				instance.msgTypes[btnElem.value] = btnElem.checked;
				instance.trigger('toggle');
			}
			update(btn[0]);
			btn.button().click(function(){update(this);});
		});

		instance.typeTurnedOn = function(type)
		{
			var msgTypes = this.msgTypes;

			if(!msgTypes.hasOwnProperty(type))
				return true;
			return msgTypes[type];
		}

		return instance;
	}
})();

DZMessageViewer.Controls.ScreenControlBtns = (function()
{
	var template = (function(){
		var html = [];
		html.push('<td class="screen">');
			html.push('<div>');
				html.push('<button class="clear">Clear</button>');
				html.push('<input class="follow" type="checkbox" checked="checked"/><label>Follow</label>');
			html.push('</div>');
		html.push('</td>');
		return $(html.join(''));
	})();
	return function(){
		var self = DZMessageViewer.Controls.ScreenControlBtns;
		if(!(this instanceof self))
			throw new SyntaxError('Constructor class is must invoked with "new" operator');
		var instance = template.clone();

		(function setClearButton(){
			instance.find('button.clear').button().click(function(){
				instance.trigger('clear');
			});
		})();

		var followButton = instance.find('input.follow');
		var followButtonLabel = followButton.next('label');
		followButton.attr('id', uniqueId());
		followButtonLabel.attr('for', followButton.attr('id'));
		followButton.button();

		instance.followNewMessage = function() {
			return followButton.attr('checked');
		}
		return instance;
	}
})();

DZMessageViewer.Controls.ConnectionControlBtns = (function()
{
	var template = (function(){
		var html = [];
		html.push('<td class="connection">');
			html.push('<div>');
				html.push('<input type="radio" name="connection" title="Stop"/><label>Stop</label>');
				html.push('<input type="radio" name="connection" title="Pause"/><label>Pause</label>');
				html.push('<input type="radio" name="connection" title="Play" checked="checked"/><label>Play</label>');
			html.push('</div>');
		html.push('</td>');
		return $(html.join(''));
	})();
	return function(controller){
		var self = DZMessageViewer.Controls.ConnectionControlBtns;
		if(!(this instanceof self))
			throw new SyntaxError('Constructor class is must invoked with "new" operator');
		var instance = template.clone();

		var controlBtnSet = instance.find('>div');
		var controlBtns = controlBtnSet.find('>input');

		controlBtns.each(function(i){
			var label = $(this).next('label');

			$(this).attr('id', uniqueId());
			label.attr('for', $(this).attr('id'));

			var targetFunc;
			switch($(this).attr('title')){
				case 'Play':
					targetFunc=controller.openBuffer;
					break;
				case 'Stop':
					targetFunc=controller.closeBuffer;
					break;
				case 'Pause':
					targetFunc=controller.pauseBuffer;
					break;
				default:
					throw new Error('Unknwon functionality on connection control buttons');
			}
			$(this).click(function(){targetFunc.apply(controller);});
			if($(this).is(':checked')) targetFunc.apply(controller);
		});
		controlBtnSet.buttonset();

		return instance;
	}
})();

DZMessageViewer.Controls.StatusControls = (function()
{
	var template = (function(){
		var html = [];
		html.push('<td class="status">');
			html.push('<button class="channels">Channels</button>');
			html.push('<button class="filter">Filter</button>');
		html.push('</td>');
		return $(html.join(''));
	})();
	return function(controller){
		var self = DZMessageViewer.Controls.StatusControls;
		if(!(this instanceof self))
			throw new SyntaxError('Constructor class is must invoked with "new" operator');
		var instance = template.clone();

		(function initChannelButton(){
			var btnChannels = instance.find('>.channels');
			var html = [];
			html.push('<div style="display:none">');
				html.push('<input type="checkbox" checked="checked" value="autoaccept"><label>Auto accept</label>');
				html.push('<table>');
					html.push('<thead>');
						html.push('<tr>');
							html.push('<td/>');
							html.push('<td>Process Name</td>');
							html.push('<td>PID</td>');
							html.push('<td>Address</td>');
						html.push('</tr>');
					html.push('</thead>');
					html.push('<tbody/>');
				html.push('</table>');
			html.push('</div>');
			var dlgChannels = $(html.join(''));

			var dlgChannelTableBody = dlgChannels.find('>table>tbody');
			dlgChannels.dialog({
				autoOpen : false,
				closeOnEscape: true,
				title: "Diagnostic Channels Available",
				open: function(evt){
					dlgChannelTableBody.html('');
					controller.getBufferChannels(function(channels){
						var html=[];
						for(var p=0 in channels) {
							var channel = channels[p];
							html.push('<tr>');
							html.push('<td><input type="checkbox" '+(channel.subscribed?'checked="checked" ':'')+'channelId=\''+p+'\'></td>');
							html.push('<td title="'+channel.execName+'">'+channel.shortName+'</td>');
							html.push('<td>'+channel.pid+'</td>');
							html.push('<td title="Port '+channel.port+'">'+channel.addr+'</td>');
							html.push('</tr>');
						}
						dlgChannelTableBody.html(html.join(''));
						dlgChannels.find('table td').css('border', '1px solid white');

						dlgChannelTableBody.find('input').click(function(evt){
							var target = $(evt.target);
							var id = target.attr('channelId');
							if(target.is(':checked'))
								controller.subscribeBufferChannel(channels[id]);
							else
								controller.unsubscribeBufferChannel(channels[id]);
						});
					});
				}
			});

			btnChannels.button().click(function(){
				if(dlgChannels.dialog('isOpen'))
					dlgChannels.dialog('close');
				else
					dlgChannels.dialog('open');
			});
		})();

		(function initFilterButton(){
			instance.find('>button.filter').button().click(function(){
				console.log('Filter button is clicked');
			});
		})();

		(function initTestButtons(){
			var style = DZMessageViewer.prototype.findCSSStyleDeclaration(dzViewer.ui.viewerBody.selector);
			instance.append($('<button class="test1">Test1</button>'));
			instance.find('.test1').button().click(function(){
				console.log('test1 button is clicked');
				style.setProperty('display', 'none');
			});
			instance.append($('<button class="test2">Test2</button>'));
			instance.find('.test2').button().click(function(){
				console.log('test2 button is clicked');
				style.removeProperty('display');
			});
		});//();	// XXX

		return instance;
	}
})();

DZMessageViewer.Viewer = (function()
{
	var template = (function(){
		return $('<div class="dz-body"/>');
	})();
	return function(dzViewer, dzBuffer, controller, dzStatusbar){
		var self = DZMessageViewer.Viewer;
		if(!(this instanceof self))
			throw new SyntaxError('Constructor class is must invoked with "new" operator');

		var instance = template.clone();
		var table;

		(function initialize(){
			var html = [];
			html.push('<div class="div-header">');
				html.push('<table class="dz-msg-tbl">');
					html.push('<thead>');
						html.push('<tr class="header-fields">');
							html.push('<th class="timestamp"><div>Timestamp<div class="separator"/></div></th>');
							html.push('<th class="processname"><div>Process Name<div class="separator"/></div></th>');
							html.push('<th class="pid"><div>PID<div class="separator"/></div></th>');
							html.push('<th class="tid"><div>TID<div class="separator"/></div></th>');
							html.push('<th class="filename"><div>File<div class="separator"/></div></th>');
							html.push('<th class="line"><div>Line<div class="separator"/></div></th>');
							html.push('<th class="function"><div>Function<div class="separator"/></div></th>');
							html.push('<th class="stackdepth"><div>SD<div class="separator"/></div></th>');
							html.push('<th class="message"><div>Message<div></th>');
							html.push('<th class="filter"><button><div/></button></th>');
						html.push('</tr>');
					html.push('</thead>');
				html.push('</table>');
			html.push('</div>');
			instance.header = $(html.join(''));
			instance.append(instance.header);

			instance.container = $('<div class="div-body"/>');
			instance.append(instance.container);

			instance.container.attr('tabindex', '0')
				.keydown(function(e){
					if(e.keyCode == 46){	// Delete
						controller.trigger('clearSelectedMessages');
					}
				});

			instance.container.scrollPadding = $('<div class="scroll-padding"/>');
			instance.container.append(instance.container.scrollPadding);

			html = [];
			html.push('<table class="dz-msg-tbl">');
				html.push('<tbody class="body-fields"/>');
			html.push('</table>');
			instance.container.scrollPadding.append($(html.join('')));

			table = instance.table	= instance.find('.div-header .dz-msg-tbl');

			table.header			= table.find('.header-fields');
			table.header.filterBtn	= table.header.find('.filter');
			table.header.separator	= table.header.find('.separator');

			table.body				= instance.container.find('.dz-msg-tbl');
			table.bodyFields		= instance.find('.body-fields');
			table.info				= {
				rowHeight:0,
				visibleMaxRowCnt:0
			};
		})();

		instance.gatherTableInfo = function(){
			var tableInfo = table.info;

			var rowHeight = tableInfo.rowHeight || (function(){
				var dummyRow = $('<tr style="visibility: hidden" class="type-V"><td class="timestamp">00:00:00:000</td><td class="processname" title="full/path">process name</td><td class="pid">0000</td><td class="tid">0000</td><td class="filename">filename.cpp</td><td class="line">0000</td><td class="function" title="void CLASS::FUNCTION(argument list)">function_name</td><td class="stackdepth">00</td><td class="message">message</td></tr>');
				var tableBodyFields = table.bodyFields;
				var height = tableBodyFields.append(dummyRow).children('tr').last().height();
				tableBodyFields.children().last().remove();
				return (tableInfo.rowHeight = height);
			})();

			tableInfo.visibleMaxRowCnt = (instance.container.height() / tableInfo.rowHeight);
		};

		instance.updateLayout = function(){
			var container = this.container;

			var buffer = dzBuffer.buffer;
			var newHeight = 0;

			newHeight = dzBuffer.buffer.length * table.info.rowHeight;
			// Performance problem.
//			newHeight = this.getTypeFilteredMessages().length * table.info.rowHeight;

			// XXX
			container.scrollPadding.height(newHeight);
			if(container.height()>=newHeight)
				this.updateMessageView();
			else if(controller.followNewMessage())
				container.trigger('jumpToBottom');
		}

		instance.getTypeFilteredMessages = function() {
			var top = parseInt(table.body.css('top'));
			var totalHeight = instance.container.scrollPadding.height();
			var percentage = top/totalHeight || 0;
			var targetIdx = Math.round(dzBuffer.count().message * percentage);

			var rowCnt = instance.table.info.visibleMaxRowCnt;
			var messages = dzBuffer.buffer;
			var childElems = $();
			for(var i=targetIdx, length=messages.length;i<length&&rowCnt;++i){
				var message = messages[i];
				var type = message.className;
				type=type[type.length-1];
				if(controller.viewableType(type)){
					--rowCnt;
					childElems.push(message);
				}
			}
			return childElems;
		}

		instance.updateMessageView = function(){
			var viewerBody = table.bodyFields;

			var childElems = this.getTypeFilteredMessages();

			var docFrag = document.createDocumentFragment();
			childElems.each(function(i){
				docFrag.appendChild(this);
			});
			// FIXME : Performance!!!
			viewerBody.children().detach().end().append(docFrag);
		}

		instance.applyNewMessageLayout = function(){
			var newMessages = dzBuffer.newMessages();
			if(!newMessages.length) throw new Error('New Message is empty.');

			this.updateLayout();

			return;
		};

		(function setHeaderFieldToggle(){
			var viewTable = instance.table;
			var filter = viewTable.header.filterBtn;
			var button = filter.find('button');
			var dlg = button.find('div');
			var dlgWidth = 250;

			filter.ready(function(){// Postpone to calculate scrollbar width
				filter.css('width', (viewTable.header.width()-viewTable.bodyFields.width())+'px');
				button.button({
					icons: {primary: 'ui-icon-wrench'},
					text: false,
					label:'Header Field Filter'
				}).click(function(){
					if(dlg.dialog('isOpen')){
						dlg.dialog('close');
					} else {
						var position = $(this).position();
						var left = position.left-dlgWidth-10/*FIXME*/;
						var top = position.top+viewTable.header.height();

						dlg.dialog('option', {position:[left, top]}).dialog('open');
					}
				});

				var filterListHTML = [];
				filterListHTML.push('<ul>');
				viewTable.header.find('th:[class!=filter][class!=message]').each(function(i){
					var targetClass = $(this).attr('class');
					var text = $(this).find('div:first-child').text();
					filterListHTML.push('<li style="list-style-type:none;">');
					filterListHTML.push('<input type="checkbox" checked="checked" targetClass="'+targetClass+'"> '+text+'</input>');
					filterListHTML.push('</li>');
				});
				filterListHTML.push('</ul>');

				dlg.html(filterListHTML.join(''));
				dlg.find('input').click(function(evt){
					var style = DZMessageViewer.prototype.findCSSStyleDeclaration('.dz-msg-tbl .'+$(this).attr('targetClass'));
					if(style){
						if($(this).is(':checked')){
							style.removeProperty('display');
						} else {
							style.setProperty('display', 'none');
						}
					}
				});
				dlg.dialog({
					autoOpen: false,
					title: "Check fields to show",
					disabled: true,
					closeOnEscape: true,
					draggable: false,
					width: dlgWidth, // FIXME
					hide: {effect: 'drop', direction: 'up'},
					show: {effect: 'drop', direction: 'up'},
					resizable: false
				});
			});
		})();

		(function setColumnWidthControl(){
			var separator = table.header.separator;
			var separatorWidth = separator.width();

			separator.ready(function(){
				separatorWidth = separator.width()<<1;
				separator.mousedown(beginTracking);
			});

			function beginTracking(evt) {
				controller.pauseBuffer();
				evt.stopPropagation();
				var target = $('.dz-msg-tbl .'+$(this).parent().parent().attr('class'));
				var data = {
					'target' : target,
					'offset' : target.prop('offsetLeft')+target.outerWidth()-target.width(),
					'style'  : DZMessageViewer.prototype.findCSSStyleDeclaration(target.selector)
				}
				$(document.body).mousemove(data, handleTracking)
					.mouseup(data, clearTracking);
			}

			function handleTracking(evt) {
				var data = evt.data;
				var width = evt.pageX - data.offset;
				if(width<separatorWidth) width=separatorWidth;
				data.style.setProperty('width', width+'px');
				evt.stopPropagation();
			}

			function clearTracking(evt) {
				handleTracking(evt);
				$(document.body).unbind('mousemove', handleTracking)
					.unbind('mouseup', clearTracking);
				controller.resumeBuffer();
			}
		})();

		(function setBodyFieldSelector(){
			var lastSelected;
			var viewerBody = table.bodyFields;

			viewerBody.mousedown(beginSelection)
				.bind('contextmenu', function(evt){
					evt.preventDefault();
					console.log('contextmenu is prevented.');
				});

			function handleSelection(target, block, clear) {
				var theClass = 'selected';
				var targets=target;

				if(lastSelected && block) {
					var range = [lastSelected.index(), target.index()].sort(function(a,b){return a-b;});
					var rangeSelector='';
					for(var i=range[0];i<=range[1];++i){
						rangeSelector+='tr:eq('+i+'),';
					}
					targets=viewerBody.find(rangeSelector.slice(0, -1));
				} else if(!clear) {
					viewerBody.find('.'+theClass).removeClass(theClass);
				}

				lastSelected=target;
				if(target.hasClass(theClass))
					target.removeClass(theClass);
				else
					target.addClass(theClass);
			}

			function beginSelection(evt){
				if($(evt.target).parent().hasClass('stackdepth')){
					// Stack information dialog
					evt.target.dialog = evt.target.dialog || (function(){
						var table = $(evt.target).parent().children('table')
							.css('font', '12px dejavu sans mono, arial, sans-serif');
						return table.dialog({
								autoOpen: false,
								closeOnEscape: true,
								width:'80%',
								title: table.find('caption').detach().text()
							});
					})();
					evt.target.dialog.dialog('open');
					return;
				}
				var selectedRow = $(evt.target).parents('tr');

				switch(evt.button){
					case 0:	// left
						controller.pauseBuffer();
						evt.stopPropagation();
						handleSelection(selectedRow, evt.shiftKey, evt.ctrlKey);
						viewerBody.mouseover(trackSelection).mouseup(endSelection);
						break;
					case 2: // right
						evt.stopPropagation();
						controller.pauseBuffer();
						var filename = selectedRow.find('>td[class=filename]').contents()[0].data;
						var line = parseInt(selectedRow.find('>td[class=line]').contents()[0].data);
						console.log('register filter : ' + filename + ' : ' + line);
						controller.registerFilter({
							'filename': filename,
							'line': line
						}).resumeBuffer();
						break;
					default:
						break;
				}
			}

			function trackSelection(evt){
				evt.stopPropagation();
				var target = $(evt.target).parent('tr');
				handleSelection(target, true, evt.ctrlKey);
			}

			function endSelection(evt){
				evt.stopPropagation();
				viewerBody.unbind('mouseover', trackSelection)
						.unbind('mouseup', endSelection);
				controller.resumeBuffer();
			}
		})();

		(function setResizeTable(){
			$(document).ready(function(){
				var documentMargin = parseInt($(document.body).css('margin-top')) + parseInt($(document.body).css('margin-bottom'));
				var bodyMargin = instance.outerHeight() - instance.height();
				var totalMargin = documentMargin + bodyMargin;

				doResize.apply(window);
				$(window).resize(doResize);

				instance.resizeTimerId = null;
				function doResize(){
					instance.css('height', $(this).height() - totalMargin - controller.outerHeight() - dzStatusbar.outerHeight());
					instance.container.css('height', instance.outerHeight()-instance.header.outerHeight());
					instance.resizeTimerId && clearTimeout(instance.resizeTimerId);
					instance.resizeTimerId = setTimeout(function(){instance.updateLayout();});
					instance.gatherTableInfo();
				}
			});
		})();

		(function setScrollHandler(){
			var container = instance.container;
			container.ready(function(){
				instance.gatherTableInfo();
				container.scroll(function(evt){
					evt.stopPropagation();
					evt.preventDefault();
					table.body.css('top', $(this).prop('scrollTop'));
					instance.updateMessageView();
				}).on('jumpToBottom', function(evt){
					var target = $(this);
					evt.stopPropagation();
					evt.preventDefault();
					var scrollHeightProp = target.prop('scrollHeight');
					if(target.scrollTop()+target.height() === scrollHeightProp)
						instance.updateMessageView();
					else
						target.scrollTop(scrollHeightProp);
				});
			});
		})();

		return instance;
	};
})();

var DiagZillaMessageStatus = (function()
{
	var template = (function(){
		var html=[];
		html.push('<div class="status-bar">');
			html.push('<table>');
				html.push('<tbody>');
					html.push('<tr/>');
				html.push('</tbody>');
			html.push('</table>');
		html.push('</div>');
		return $(html.join(''));
	})();
	return function(dzBuffer){
		var self = DiagZillaMessageStatus;
		if(!(this instanceof self))
			throw new SyntaxError('Constructor class is must invoked with "new" operator');

		var instance = template.clone();
		(function initalize(){
			instance.css({
				'border'		: '1px solid black',
				'background'	: '#D3D3D3',
				'text-align'	: 'center',
				'white-space'	: 'nowrap',
				'height'		: '1.5em',
				'overflow'		: 'hidden',
				'font'			: '12px dejavu sans mono, arial, sans-serif'
			});
		})();


		var counter = new self.counter();

		instance.setCounterStr = function(str){
			counter.text(str);
		}

		instance.find('tr').append(counter);

		return instance;
	};
})();

DiagZillaMessageStatus.counter = (function()
{
	var template = (function() {
		var html=[];
		html.push('<td>0/0/0</td>');
		return $(html.join(''));
	})();
	return function() {
		var self = DiagZillaMessageStatus.counter;
		if(!(this instanceof self))
			throw new SyntaxError('Constructor class is must invoked with "new" operator');
		var instance = template.clone();

		return instance;
	}
})();
