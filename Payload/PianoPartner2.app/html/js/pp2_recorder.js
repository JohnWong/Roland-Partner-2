/**
 * Created by kako on 2017/07/19.
 */

var PP2_RECORDER = (function() {
    var autoRecordingCallbackKeys = [];
    var autoRecordingTimer = undefined;
    var recordingFile = undefined;
    var recordStartTime = undefined;
    var timestampToRealtimeDiff = undefined;
    var lastNoteTimestamp = undefined;
    var recordingCallbackKeys = [];
    var isForceRecording = false;
    var recordingTimer = undefined;
    var activeChannels = [];

    var countsOfEachKeys = {};
    var countsPerTimePeriod = {};

    var ticks = 480;
    var tempo = 120;
    var ticksPerMilliSeconds = ticks * tempo / 60 / 1000;

    /**
     * [{
     *     onRecording: function(milliSeconds) {...},
     *     onRecordFinished: function() {}
     * }]
     */
    var eventListeners = [];
    var callEvent = function(eventName, params) {
        _.forEach(eventListeners, function(eventListener) {
            if ('function' === typeof(eventListener[eventName])) {
                eventListener[eventName](params);
            }
        });
    };

    var countUpEachKeys = function(number, velocity) {
        if (undefined === countsOfEachKeys[number]) {
            countsOfEachKeys[number] = [0,0,0,0,0];
        }
        var velocityStrength = Math.floor(velocity / (127.1 / 5));
        countsOfEachKeys[number][velocityStrength]++;
    };

    var countUpPerTimePeriod = function(number, velocity, timestamp) {
        var tenSecondsIndex = Math.floor((timestamp + timestampToRealtimeDiff) / 10000);
        if (undefined === countsPerTimePeriod[tenSecondsIndex]) {
            countsPerTimePeriod[tenSecondsIndex] = [0,0,0,0,0];
        }
        var velocityStrength = Math.floor(velocity / (127.1 / 5));
        countsPerTimePeriod[tenSecondsIndex][velocityStrength]++;
    };

    var updateActivity = function(startAt, lengthOfTime, countsOfEachKeys, countsPerTimePeriod) {
        PP2_DB.requestActivityOnToday(startAt, function (res) {
            var endAt = new Date(startAt.getTime() + lengthOfTime * 1000);
            var activity = res.item;
            activity.endAt = endAt;
            activity.totalLessonTime = activity.totalLessonTime + lengthOfTime;
            activity.countsOfEachKeys = JSON.stringify(margeCounts(undefined !== activity.countsOfEachKeys ? JSON.parse(activity.countsOfEachKeys) : {}, countsOfEachKeys));
            activity.countsPerTimePeriod = JSON.stringify(margeCounts(undefined !== activity.countsPerTimePeriod ? JSON.parse(activity.countsPerTimePeriod) : {}, countsPerTimePeriod));
            PP2_DB.createOrUpdateActivity(activity, function() {
                if (startAt.getDate() !== endAt.getDate()) {
                    countsOfEachKeys = {};
                    countsPerTimePeriod = {};
                }
            });
        });
    };

    var margeCounts = function(counts1, counts2) {
        _.forEach(counts2, function(v, k) {
            if (undefined !== counts1[k]) {
                _.forEach(counts2[k], function(count, index) {
                    counts1[k][index] += count;
                });
            } else {
                counts1[k] = v;
            }
        });
        return counts1;
    };

    var __ = {
        init: function() {
            __.stopAutoRecording();
            countsOfEachKeys = {};
            countsPerTimePeriod = {};
        },
        addEventListener: function(eventListener) {
            if (eventListeners.indexOf(eventListener) === -1) {
                eventListeners.push(eventListener);
            }
        },
        removeEventListener: function(eventListener) {
            var index = eventListeners.indexOf(eventListener);
            if (index !== -1) {
                eventListeners.splice(index, 1);
            }
        },
        removeAllEventListeners: function() {
            eventListeners = [];
        },
        startAutoRecording: function() {
            PP2_MIDI.removeCallbacks(autoRecordingCallbackKeys);
            autoRecordingCallbackKeys = [
                PP2_MIDI.addCallback(p2addr.noteOn, function(params) {
                    var res = __.startRecording();
                    if ('function' === typeof(res)) {
                        // 録音がスタートされた場合はキー情報の受け口が返ってくるので、情報を渡す（ここで最初に押されたキー情報を渡さないと取りこぼしてしまう）
                        res(params);
                    }
                    clearTimeout(autoRecordingTimer);
                    autoRecordingTimer = setTimeout(function() {
                        if (!isForceRecording) {
                            // 強制録音（手動録音）中でなければ一定時間手を止めると自動停止
                            __.stopRecording(new Date(lastNoteTimestamp + timestampToRealtimeDiff + 1000));
                        }
                    }, 15000);
                })
            ];
            PP2_MIDI.forceReceiveMessageFromCache(p2addr.songNumber);
        },
        stopAutoRecording: function() {
            clearTimeout(autoRecordingTimer);
            PP2_MIDI.removeCallbacks(autoRecordingCallbackKeys);
            __.stopRecording();
        },
        startRecording: function(newIsForceRecording) {
            if (undefined !== recordingFile) {
                return;
            }
            console.log('Start recording.');
            PP2_CORE.addNotSleepTag('pp2_recorder');
            if (isForceRecording !== !! newIsForceRecording) {
                // 強制録音開始時は録音中の処理を一旦停止する
                __.stopRecording();
            }

            isForceRecording = !!newIsForceRecording;
            PP2_MIDI.removeCallbacks(recordingCallbackKeys);
            recordingFile = new Midi.File({ticks: ticks});
            activeChannels = [];
            var track = new Midi.Track();
            track.addEvent(new Midi.MetaEvent({type: Midi.MetaEvent.TIME_SIG, data: [4, 2, 24, 8]}));
            track.setTempo(tempo);
            recordingFile.addTrack(track);
            recordStartTime = new Date().getTime();
            lastNoteTimestamp = undefined;
            timestampToRealtimeDiff = undefined;
            var noteOnCallback = function(params) {
                if (undefined === timestampToRealtimeDiff) {
                    timestampToRealtimeDiff = new Date().getTime() - params.timestamp;
                    lastNoteTimestamp = recordStartTime - timestampToRealtimeDiff;
                }

                var noteTime = params.timestamp;
                var timeDiff = noteTime - lastNoteTimestamp;
                lastNoteTimestamp = noteTime;

                if (!_.contains(activeChannels, params.channel)) {
                    track.addEvent(new Midi.Event({type: Midi.Event.CONTROLLER, channel: params.channel, param1: 7, param2: 127, time: Math.round(timeDiff * ticksPerMilliSeconds)}));
                    timeDiff = 0;
                    activeChannels.push(params.channel);
                }

                track.noteOn(params.channel, params.number, Math.round(timeDiff * ticksPerMilliSeconds), params.velocity);

                // 集計データの蓄積
                countUpEachKeys(params.number, params.velocity);
                countUpPerTimePeriod(params.number, params.velocity, params.timestamp);
            };
            var addressTypeMap = {};
            addressTypeMap[p2addr.noteOff] = Midi.Event.NOTE_OFF;
            addressTypeMap[p2addr.afterTouch] = Midi.Event.AFTER_TOUCH;
            addressTypeMap[p2addr.controlChange] = Midi.Event.CONTROLLER;
            addressTypeMap[p2addr.programChange] = Midi.Event.PROGRAM_CHANGE;
            addressTypeMap[p2addr.channelAfterTouch] = Midi.Event.CHANNEL_AFTERTOUCH;
            addressTypeMap[p2addr.pitchBend] = Midi.Event.PITCH_BEND;
            var midiEventAdderGenerator = function(address) {
                return function(params) {
                    var noteTime = params.timestamp;
                    var timeDiff = noteTime - lastNoteTimestamp;
                    lastNoteTimestamp = noteTime;
                    track.addEvent(new Midi.Event({
                        type: addressTypeMap[address],
                        channel: params.channel,
                        param1: params.number,
                        param2: params.velocity,
                        time: Math.round(timeDiff * ticksPerMilliSeconds)
                    }));
                };
            };
            recordingCallbackKeys = [
                PP2_MIDI.addCallback(p2addr.noteOn, noteOnCallback),
                PP2_MIDI.addCallback(p2addr.noteOff, midiEventAdderGenerator(p2addr.noteOff)),
                PP2_MIDI.addCallback(p2addr.afterTouch, midiEventAdderGenerator(p2addr.afterTouch)),
                PP2_MIDI.addCallback(p2addr.controlChange, midiEventAdderGenerator(p2addr.controlChange)),
                PP2_MIDI.addCallback(p2addr.programChange, midiEventAdderGenerator(p2addr.programChange)),
                PP2_MIDI.addCallback(p2addr.channelAfterTouch, midiEventAdderGenerator(p2addr.channelAfterTouch)),
                PP2_MIDI.addCallback(p2addr.pitchBend, midiEventAdderGenerator(p2addr.pitchBend))
            ];

            // 経過観察用タイマー
            recordingTimer = setInterval(function() {
                callEvent('onRecording', new Date().getTime() - recordStartTime);
            }, 100);

            return noteOnCallback;
        },
        stopRecording: function(endAt, onFinishedCallback) {
            if (undefined === recordingFile) {
                return;
            }
            if ('function' === typeof(endAt)) {
                onFinishedCallback = endAt;
                endAt = undefined;
            }
            if (undefined === endAt) {
                endAt = new Date();
            }
            console.log('Stop recording.');
            clearInterval(recordingTimer);
            PP2_MIDI.removeCallbacks(recordingCallbackKeys);

            if (undefined === lastNoteTimestamp) {
                // 1音も弾いていない場合は何もしない
            } else {
                recordingFile.tracks[0].addEvent(new Midi.MetaEvent({time: endAt.getTime() - timestampToRealtimeDiff - lastNoteTimestamp, type: Midi.MetaEvent.END_OF_TRACK}));
                // HEX変換
                var bytes = recordingFile.toBytes();
                var hex = '';
                for (var i = 0; i < bytes.length; i++) {
                    hex += ('00' + bytes.charCodeAt(i).toString(16)).substr(-2);
                }
                // ライブラリの不具合かEOFが2つ入るので、削る
                hex = hex.replace(/ff2f0000ff2f00$/g, '00ff2f00');

                var startAt = new Date(recordStartTime);

                var lengthOfTime = Math.floor((endAt.getTime() - recordStartTime) / 1000);
                PP2_DB.createOrUpdateRecordedSong({
                    userId: PP2_DB.currentUser.objectId,
                    name: fecha.format(startAt, 'YYYY/MM/DD HH:mm:ss'),
                    startAt: startAt,
                    lengthOfTime: lengthOfTime,
                    isAutoRecorded: !isForceRecording
                }, function(res) {
                    // {RecordedSong.objectId}.mid の名称でSMFファイルを保存
                    console.log('createOrUpdateRecordedSong finished.')
                    console.log('smf hex: ' + hex);
                    $native.fs.writeData(_.sprintf('%s%s.mid', PP2_CORE.systemData.storageDir, res.item.objectId), hex);

                    if ('function' === typeof(onFinishedCallback)) {
                        onFinishedCallback();
                    }
                });

                updateActivity(startAt, lengthOfTime, countsOfEachKeys, countsPerTimePeriod);
                PP2_DB.currentUser.lastLessonedAt = endAt;
                PP2_DB.createOrUpdateUser(PP2_DB.currentUser, function(res) {
                    PP2_DB.currentUser = res.item;
                    callEvent('onRecordFinished');
                });
            }

            recordingFile = undefined;
            isForceRecording = false;
            PP2_CORE.removeNotSleepTag('pp2_recorder');
        },
        isForceRecording: function() {
            return isForceRecording;
        },
        ticksPerMilliSeconds: function() {
            return ticksPerMilliSeconds;
        }
    };
    return __;
})();