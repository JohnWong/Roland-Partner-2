//
//	native.js
//
//	Copyright 2015 Roland Corporation. All rights reserved.
//
(function(window) {

	//var relayServer = 'localhost';

	var _ = function() {};
	var callbacks = {};

	var native = {

		app: {
			ready: function() { _(undefined, '$$app_ready'); },
			storage: function(data, callback) { if ('function' === typeof(data)) {callback = data;data = undefined;} if (data !== undefined) _(undefined, '$$app_storage', data); else _(callback, '$$app_storage'); },
			clipboard: function(data, callback) { if ('function' === typeof(data)) {callback = data;data = undefined;} if (data !== undefined) _(undefined, '$$app_clipboard', data); else _(callback, '$$app_clipboard'); },
			title: function(text) { _(undefined, '$$app_title', text) },
			exit: function() { _(undefined, '$$app_exit'); },

			event: {
				command: function(param1, param2) {}
			}
		},

		midi: {
			input: {
				endpoints: function(callback) { _(function(result) {callback(JSON.parse(result));}, '$$midi_inendpoints'); },
				connect: function(ep) { _(undefined, '$$midi_inconnect', (ep ? JSON.stringify(ep) : undefined)); },
				disconnect: function(ep) { _(undefined, '$$midi_indisconnect', (ep ? JSON.stringify(ep) : undefined)); }
			},
			output: {
				endpoints: function(callback) { _(function(result) {callback(JSON.parse(result));}, '$$midi_outendpoints'); },
				connect: function(ep) { _(undefined, '$$midi_outconnect', (ep ? JSON.stringify(ep) : undefined)); },
				disconnect: function(ep) { _(undefined, '$$midi_outdisconnect', (ep ? JSON.stringify(ep) : undefined)); }
			},
			send: function(msg) { _(undefined, '$$midi_send', msg); },
			panel: function() { _(undefined, '$$midi_panel'); },

			event: {
				message: function(msg, timestamp) {},
				changed: function() {},
				connectfailed: function(ep) {},
				error: function(code) {}
			}
		},

		thru: {
			input: {
				endpoints: function(callback) { _(function(result) {callback(JSON.parse(result));}, '$$thru_inendpoints'); },
				connect: function(ep) { _(undefined, '$$thru_inconnect', (ep ? JSON.stringify(ep) : undefined)); },
				disconnect: function(ep) { _(undefined, '$$thru_indisconnect', (ep ? JSON.stringify(ep) : undefined)); }
			},
			output: {
				endpoints: function(callback) { _(function(result) {callback(JSON.parse(result));}, '$$thru_outendpoints'); },
				connect: function(ep) { _(undefined, '$$thru_outconnect', (ep ? JSON.stringify(ep) : undefined)); },
				disconnect: function(ep) { _(undefined, '$$thru_outdisconnect', (ep ? JSON.stringify(ep) : undefined)); }
			},
			send: function(msg) { _(undefined, '$$thru_send', msg); },
			panel: function() { _(undefined, '$$thru_panel'); },

			event: {
				changed: function() {},
				connectfailed: function(ep) {},
				error: function(code) {}
			}
		},

		player: {
			open: function(file, callback) { _(callback, '$$player_open', file); },
			play: function() { _(undefined, '$$player_play'); },
			pause: function() { _(undefined, '$$player_pause'); },
			stop: function() { _(undefined, '$$player_stop'); },
			locate: function(time) { _(undefined, '$$player_locate', time * 1.0); },
			volume: function(gain, callback) { return _(callback, '$$player_volume', gain); },
			file: function(callback) { return _(callback, '$$player_file'); },
			status: function(callback) { return _(callback, '$$player_status'); },
			channels: function(callback) { return _(callback, '$$player_channels'); },
			peakpower: function(cahnnel, callback) { return _(callback, '$$player_peakpower', cahnnel); },
			time: function(callback) { return _(callback, '$$player_time'); },
			totaltime: function(callback) { return _(callback, '$$player_totaltime'); },

			event: {
				eof: function(file) {},
				stop: function(file) {},
				error: function(file) {}
			}
		},

		recorder: {
			create: function(file, format, callback) { return _(callback, '$$recorder_create', file, format * 1); },
			record: function() { _(undefined, '$$recorder_record'); },
			pause: function() { _(undefined, '$$recorder_pause'); },
			stop: function() { _(undefined, '$$recorder_stop'); },
			volume: function(gain, callback) { return _(callback, '$$recorder_volume', gain); },
			file: function(callback) { return _(callback, '$$recorder_file'); },
			status: function(callback) { return _(callback, '$$recorder_status'); },
			channels: function(callback) { return _(callback, '$$recorder_channels'); },
			peakpower: function(cahnnel, callback) { return _(callback, '$$recorder_peakpower', cahnnel); },
			time: function(callback) { return _(callback, '$$recorder_time'); },

			event: {
				stop: function(file) {},
				error: function(file) {}
			}
		},

		rwc: {
			discovery: function() { _(undefined, '$$rwc_discovery'); },
			connect: function(dev) { _(undefined, '$$rwc_connect', JSON.stringify(dev)); },
			disconnect: function() { _(undefined, '$$rwc_disconnect'); },
			device: function(callback) { _(function(result) {callback(result ? JSON.parse(result) : null);}, '$$rwc_device'); },
			send: function(msg) { _(undefined, '$$rwc_send', msg); },
			inputmode: function(mode) { _(undefined, '$$rwc_inputmode', mode); },
			timeout: function(sec, callback) { _(callback, '$$rwc_timeout', sec); },
			keepalive: function(sec, callback) { _(callback, '$$rwc_keepalive', sec); },

			event: {
				found: function(dev) {},
				connected: function(dev) {},
				connectfailed: function(dev) {},
				closed: function(dev) {},
				message: function(msg, timestamp) {},
				error: function(dev) {}
			}
		},

		http: {
			download: function(url, to, callback) { _(callback, '$$http_download', url, to); },
			cancel: function(id) { _(undefined, '$$http_cancel', id); },

			event: {
				progress: function(id, total, amount) {},
				download: function(id, file) {},
				error: function(id, url) {}
			}
		},

		fs: {
			separator: function(callback) { _(callback, '$$fs_separator'); },
			path: function(where, callback) { _(callback, '$$fs_path', where); },
			volumes: function(callback) { _(function(result) {callback(JSON.parse(result));}, '$$fs_volumes'); },
			contents: function(path, callback) { _(function(result) {callback(JSON.parse(result));}, '$$fs_contents', path); },
			stat: function(path, callback) { _(function(result) {callback(JSON.parse(result));}, '$$fs_stat', path); },
			exec: function(file) { _(undefined, '$$fs_exec', file); },
			mkdir: function(path) { _(undefined, '$$fs_mkdir', path); },
			unlink: function(path) { _(undefined, '$$fs_unlink', path); },
			copy: function(from, to) { _(undefined, '$$fs_copy', from, to); },
			move: function(from, to) { _(undefined, '$$fs_move', from, to); },
			unzip: function(zip, folder) { _(undefined, '$$fs_unzip', zip, folder); },
			readString: function(file, callback) { _(callback, '$$fs_readString', file); },
			readData: function(file, callback) { _(callback, '$$fs_readData', file); },
			writeString: function(file, text) { _(undefined, '$$fs_writeString', file, text); },
			writeData: function(file, data) { _(undefined, '$$fs_writeData', file, data); },
			appendString: function(file, text) { _(undefined, '$$fs_appendString', file, text); },
			appendData: function(file, data) { _(undefined, '$$fs_appendData', file, data); },
			openfilename: function(filter) { _(undefined, '$$fs_openfilename', (filter ? JSON.stringify(filter) : undefined)); },
			savefilename: function(name, ext)  { _(undefined, '$$fs_savefilename', name, ext); },
			unmount: function(path) { _(undefined, '$$fs_unmount', path); },

			event: {
				openfilename: function(file) {},
				savefilename: function(file) {},
				unmounted: function(path) {},
				unmountfailed: function(path, reason) {}
			}
		},

		stop: function() {},    /* for iOS, calling from applicationDidEnterBackground */
		restart: function() {}, /* for iOS, calling from applicationWillEnterForeground */

		exec: function(args) { return encode(_.apply(null, args)); } /* for target.html */

	};

	if (typeof relayServer !== 'undefined') {
		_ = function() {
			var args = [arguments[1]];
			if (typeof arguments[2] !== 'undefined')
				args.push(arguments[2]);
			if (typeof arguments[3] !== 'undefined')
				args.push(arguments[3]);
			var url = 'http://' + relayServer + ':9000/' + encodeURIComponent(JSON.stringify(args));
			var xhr = new XMLHttpRequest();
			xhr.open('GET', url, false);
			xhr.send(null);
			if ('function' === typeof(arguments[0])) {
				arguments[0](decode(xhr.responseText));
			}
		}
	}

	if (typeof window.$$app !== 'undefined') {
		// Android
		_ = function() {
			var callback = arguments[1] === '$$app_getevent' ? receiveEvent : arguments[0];
			var a = arguments[1].split('_');
			var o = a[0]; var f = a[1];
			var result = undefined;
			try {
				if (typeof arguments[3] !== 'undefined') {
					result = window[o][f](arguments[2], arguments[3]);
				} else if (typeof arguments[2] !== 'undefined') {
					result = window[o][f](arguments[2]);
				} else {
					result = window[o][f]();
				}
			} catch (e) {
				result = e;
			}
			if ('function' === typeof(callback)) {
				callback(result);
			}
		}
	} else if (navigator.userAgent.indexOf('roland.quattro') != -1) {
		// iOS
		_ = function() {
			var now = new Date();
			var uuid = arguments[1] + "_" + now.getTime() + now.getMilliseconds() + '_' + Math.random();
			var method = arguments[1];
			var params = {
				uuid: uuid,
				method: method
			};
			if (typeof arguments[2] !== 'undefined') {
				params['arg1'] = arguments[2];
			}
			if (typeof arguments[3] !== 'undefined') {
				params['arg2'] = arguments[3];
			}

			var callback = arguments[0];
			var syncTimer = function () {
				if (method === '$$app_getevent' || method === '$$midi_send') {
					// $$app_geteventと$$midi_sendはコールバック引数不要（前の処理の完了を待たない）
				} else {
					// その他のコールは前の処理が終わるのを待ってから実行する
					if (Object.keys(callbacks).length > 0) {
						setTimeout(syncTimer, 10);
						return;
					}
					callbacks[uuid] = callback;
				}
				webkit.messageHandlers.$$native.postMessage(JSON.stringify(params));
			};
			syncTimer();
		}
	}

	function getevent() {
		_(undefined, '$$app_getevent');
	}

	function receiveEvent(ev) {
		if (!ev) {
			return;
		}
		var items = ev.split('__s__');
		for (var i = 0; i < items.length; i++) {
			var args = items[i].split('\f');
			var prop = args.shift();
			var type = args.shift();
			if (native[prop] && native[prop].event[type]) {
				native[prop].event[type].apply(native, args);
			}
		}
	}

	function encode(x) {
		     if (typeof x === 'undefined') return 'v';
		else if (typeof x === 'boolean')   return 'b' + x;
		else if (typeof x === 'number')    return 'f' + x;
		else if (typeof x === 'string')    return 's' + x;
		/* other */ return 'v';
	}

	function decode(str) {
		var x = str.slice(1);
		switch (str.charAt(0)) {
			case 'b': return Boolean(x);
			case 'd': return parseInt(x);
			case 'f': return parseFloat(x);
			case 's': return x;
			case 'r': native.restart();
			case 'v': return undefined;
		}
		throw new Error(x);
	}

	window.$native = native; /* export window object */
	window.$nativeCallback = function(uuid, result) {
		var callback;
		if (uuid.indexOf('$$app_getevent') !== -1) {
			callback = receiveEvent
		} else {
			callback = callbacks[uuid];
			delete callbacks[uuid];
		}
		if ('function' === typeof(callback)) {
			try {
				callback(decode(result));
			} catch (e) {
				callback(e);
			}
		}
	};
	window.$event = { start: function(delay) { window.setInterval(getevent, delay ? delay : 50); } };

})(window);
