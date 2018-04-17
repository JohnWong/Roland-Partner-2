/**
 * Created by kako on 2017/08/02.
 */

var PP2_PLAYER = (function() {
    var currentRecordedSong = undefined;
    var sequencerTimer = undefined;
    var isLoading = false;
    var isPlaying = false;
    var tickPosition = 0; // milli seconds
    var tickDuration = 0;
    var midiMessages = [];
    var index = 0;
    var previousTime = 0;
    var timeScale = 1;
    var puMeasCount = 0;

    var loopMilliSeconds = 1;
    /**
     * [{onPlayStatusChanged: function(isPlaying) {...}, onPositionChanged: function(position) {...}, onUnloaded: function() {...}}]
     */
    var eventListeners = [];
    var callEvent = function(eventName, params) {
        _.forEach(eventListeners, function(eventListener) {
            if ('function' === typeof(eventListener[eventName])) {
                eventListener[eventName](params);
            }
        });
    };

    var __ = {
        getCurrentRecordedSong: function() {
            return currentRecordedSong;
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
        load: function(recordedSong, onReadyCallback, onErrorCallback) {
            if (undefined !== currentRecordedSong && currentRecordedSong.objectId === recordedSong.objectId) {
                onReadyCallback();
                return;
            }
            __.unload();
            isLoading = true;
            currentRecordedSong = recordedSong;
            var initMidiObject = function(data) {
                var parsedData = new MidiFile(data);

                var midiForDigiScore = new Midi.File({ticks: parsedData.header.ticksPerBeat});
                var writeTrack = new Midi.Track();
                midiForDigiScore.addTrack(writeTrack);

                var track0Events = parsedData.tracks[0];
                _.forEach(track0Events, function(event) {
                    tickDuration += event.deltaTime;
                    switch (event.subtype) {
                        case 'timeSignature':
                            writeTrack.addEvent(new Midi.MetaEvent({type: Midi.MetaEvent.TIME_SIG, data: [event.numerator, Math.sqrt(event.denominator), event.metronome, event.thirtyseconds], time: event.deltaTime}));
                            break;
                        case 'setTempo':
                            writeTrack.setTempo(Midi.Util.bpmFromMpqn(event.microsecondsPerBeat), event.deltaTime);
                            break;
                        case 'noteOn':
                            midiMessages.push([tickDuration, '9' + PP2_MIDI.paddedHex(event.channel, 1) + PP2_MIDI.paddedHex(event.noteNumber, 2) + PP2_MIDI.paddedHex(event.velocity, 2)]);
                            writeTrack.addEvent(new Midi.Event({type: Midi.Event.NOTE_ON, channel: 3, param1: event.noteNumber, param2: event.velocity, time: event.deltaTime}));
                            break;
                        case 'noteOff':
                            midiMessages.push([tickDuration, '8' + PP2_MIDI.paddedHex(event.channel, 1) + PP2_MIDI.paddedHex(event.noteNumber, 2) + PP2_MIDI.paddedHex(event.velocity, 2)]);
                            writeTrack.addEvent(new Midi.Event({type: Midi.Event.NOTE_OFF, channel: 3, param1: event.noteNumber, param2: event.velocity, time: event.deltaTime}));
                            break;
                        case 'noteAftertouch':
                            midiMessages.push([tickDuration, 'A' + PP2_MIDI.paddedHex(event.channel, 1) + PP2_MIDI.paddedHex(event.noteNumber, 2) + PP2_MIDI.paddedHex(event.amount, 2)]);
                            writeTrack.addEvent(new Midi.Event({type: Midi.Event.AFTER_TOUCH, channel: 3, param1: event.noteNumber, param2: event.amount, time: event.deltaTime}));
                            break;
                        case 'controller':
                            midiMessages.push([tickDuration, 'B' + PP2_MIDI.paddedHex(event.channel, 1) + PP2_MIDI.paddedHex(event.controllerType, 2) + PP2_MIDI.paddedHex(event.value, 2)]);
                            writeTrack.addEvent(new Midi.Event({type: Midi.Event.CONTROLLER, channel: 3, param1: event.controllerType, param2: event.value, time: event.deltaTime}));
                            break;
                        case 'programChange':
                            midiMessages.push([tickDuration, 'C' + PP2_MIDI.paddedHex(event.channel, 1) + PP2_MIDI.paddedHex(event.programNumber, 2)]);
                            writeTrack.addEvent(new Midi.Event({type: Midi.Event.PROGRAM_CHANGE, channel: 3, param1: event.param1, param2: undefined, time: event.deltaTime}));
                            break;
                        case 'channelAftertouch':
                            midiMessages.push([tickDuration, 'D' + PP2_MIDI.paddedHex(event.channel, 1) + PP2_MIDI.paddedHex(event.amount, 2)]);
                            writeTrack.addEvent(new Midi.Event({type: Midi.Event.CHANNEL_AFTERTOUCH, channel: 3, param1: event.param1, param2: undefined, time: event.deltaTime}));
                            break;
                        case 'pitchBend':
                            midiMessages.push([tickDuration, 'E' + PP2_MIDI.paddedHex(event.channel, 1) + PP2_MIDI.paddedHex(event.value % 128, 2) + PP2_MIDI.paddedHex(Math.ceil(event.value / 128), 2)]);
                            writeTrack.addEvent(new Midi.Event({type: Midi.Event.PITCH_BEND, channel: 3, param1: event.value % 128, param2: Math.floor(event.value / 128), time: event.deltaTime}));
                            break;
                        case 'endOfTrack':
                            writeTrack.addEvent(new Midi.MetaEvent({time: event.deltaTime, type: Midi.MetaEvent.END_OF_TRACK}));
                            break;
                    }
                });

                // HEX変換
                var bytes = midiForDigiScore.toBytes();
                var hexForDigiScore = '';
                for (var i = 0; i < bytes.length; i++) {
                    hexForDigiScore += ('00' + bytes.charCodeAt(i).toString(16)).substr(-2);
                }
                $native.fs.writeData(__.getMIDIFilePathForDigiScore(), hexForDigiScore.toUpperCase());

                onReadyCallback();
            };
            var loadByHex = function(hex) {
                var bytes = [];
                for (var i = 0; i < hex.length / 2; i++) {
                    bytes.push(String.fromCharCode(parseInt(hex.substr(i * 2, 2), 16)));
                }
                initMidiObject(bytes.join(''));

                PP2_DIGISCORE.scoutMeas1(__.getMIDIFilePathForDigiScore(), function(res) {
                    puMeasCount = res.result;
                });
            };

            $native.fs.readData(__.getMIDIFilePath(), function(res) {
                if (res instanceof Error) {
                    // サーバからデータ取得
                    PP2_AWS.requestMIDI(currentRecordedSong.objectId, function(hex) {
                        $native.fs.writeData(__.getMIDIFilePath(), hex);
                        loadByHex(hex);
                    }, function (err) {
                        PP2_FRONT.alert(err);
                    });
                } else {
                    loadByHex(res);
                }
            });
        },
        unload: function() {
            __.stop();
            currentRecordedSong = undefined;
            sequencerTimer = undefined;
            isLoading = false;
            isPlaying = false;
            callEvent('onPlayStatusChanged', isPlaying);
            tickPosition = 0; // milli seconds
            callEvent('onPositionChanged', __.getPosition());
            tickDuration = 0;
            midiMessages = [];
            index = 0;
            previousTime = 0;
            timeScale = 1;
            puMeasCount = 0;
            callEvent('onUnloaded');
        },
        play: function() {
            if (!__.isLoaded() || isPlaying) {
                return;
            }
            if (tickPosition >= tickDuration && timeScale === 1) {
                __.setPosition(0);
            }

            PP2_CORE.addNotSleepTag('pp2_player');
            isPlaying = true;
            previousTime = new Date().getTime();
            callEvent('onPlayStatusChanged', isPlaying);
            sequencerTimer = setInterval(function() {
                if (timeScale > 0) {
                    while (index < midiMessages.length) {
                        var message = midiMessages[index];
                        if (undefined === message) {
                            index++;
                        } else if (message[0] <= tickPosition) {
                            $native.midi.send(message[1]);
                            index++;
                        } else {
                            break;
                        }
                    }
                } else if (timeScale < 0) {
                    while (0 <= index) {
                        var message = midiMessages[index];
                        if (undefined === message) {
                            index--;
                        } else if (message[0] > tickPosition) {
                            if (message[1].substr(0, 1) === '9') {
                                // 巻き戻しの場合はnoteOnのみ使う
                                $native.midi.send(message[1]);
                                var stopMessage = '8' + message[1].substr(1);
                                setTimeout(function() {
                                    // 一定時間で音を止める
                                    $native.midi.send(stopMessage);
                                }, 100);
                            }
                            index--;
                        } else {
                            break;
                        }
                    }
                }
                if (tickPosition >= tickDuration && 0 < timeScale) {
                    __.pause();
                } else {
                    var time = new Date().getTime();
                    var timeDiff = time - previousTime;
                    tickPosition += timeDiff * PP2_RECORDER.ticksPerMilliSeconds() * timeScale;
                    if (tickPosition < 0) {
                        tickPosition = 0;
                    }
                    previousTime = time;
                }
                callEvent('onPositionChanged', __.getPosition());
            }, loopMilliSeconds);
        },
        stop: function() {
            __.pause();
            __.setPosition(0);
        },
        pause: function() {
            if (isPlaying) {
                isPlaying = false;
                __.sendResetToPiano();
            }
            callEvent('onPlayStatusChanged', isPlaying);
            clearInterval(sequencerTimer);
            PP2_CORE.removeNotSleepTag('pp2_player');
        },
        setTimeScale: function(newTimeScale) {
            timeScale = newTimeScale;
        },
        setPosition: function(newPosition) {
            var newTickPosition = Math.round(newPosition * PP2_RECORDER.ticksPerMilliSeconds());
            if (tickPosition < newTickPosition) {
                while (midiMessages.length > index) {
                    if (midiMessages[index][0] <= newTickPosition) {
                        index++;
                    } else {
                        break;
                    }
                }
            } else {
                while (0 < index) {
                    if (midiMessages.length <= index) {
                        index--;
                    } else if (midiMessages[index][0] > newTickPosition) {
                        index--;
                    } else {
                        break;
                    }
                }
            }
            tickPosition = newTickPosition;
            callEvent('onPositionChanged', __.getPosition());
        },
        isLoading: function() {
            return isLoading;
        },
        isLoaded: function() {
            return midiMessages.length > 0;
        },
        isPlaying: function () {
            return isPlaying;
        },
        getPosition: function() {
            return Math.round(tickPosition / PP2_RECORDER.ticksPerMilliSeconds());
        },
        getDuration: function() {
            return Math.round(tickDuration / PP2_RECORDER.ticksPerMilliSeconds());
        },
        getMeasure: function() {
            return Math.max(0, Math.ceil(__.getPosition() / 2000) - puMeasCount);
        },
        getMIDIFilePath: function() {
            return _.sprintf('%s%s.mid', PP2_CORE.systemData.storageDir, currentRecordedSong.objectId)
        },
        getMIDIFilePathForDigiScore: function() {
            return _.sprintf('%sfor_digiscore.mid', PP2_CORE.systemData.storageDir)
        },
        sendResetToPiano: function() {
            var headers = ['B0', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9', 'BA', 'BB', 'BC', 'BD', 'BE', 'BF'];
            _.forEach(headers, function (h) {
                $native.midi.send(h + '7B00');
            });
            _.forEach(headers, function (h) {
                $native.midi.send(h + '7900');
            });
        },
        initController: function(playButton, stepBackwardButton, backwardButton, forwardButton, positionSlider, playButtonClasses) {
            var previousIsPlaying = undefined;
            playButtonClasses = undefined === playButtonClasses ? ['glyphicon-play', 'glyphicon-pause'] : playButtonClasses;
            var playerEventListener = {
                onPlayStatusChanged: function(isPlaying) {
                    if (isPlaying) {
                        playButton.removeClass(playButtonClasses[0]).addClass(playButtonClasses[1]);
                    } else {
                        playButton.removeClass(playButtonClasses[1]).addClass(playButtonClasses[0]);
                    }
                },
                onPositionChanged: function(position) {
                    if (undefined !== positionSlider) {
                        positionSlider.setValue(position);
                    }
                }
            };
            __.addEventListener(playerEventListener);

            stepBackwardButton.on('click', function() {
                __.stop();
            });
            backwardButton.on('touchstart', function() {
                previousIsPlaying = __.isPlaying();
                __.setTimeScale(-5);
                __.play();
            }).on('touchend touchcancel', function () {
                __.setTimeScale(1);
                if (!previousIsPlaying) {
                    __.pause();
                }
            });
            playButton.on('click', function() {
                if (__.isPlaying()) {
                    __.pause();
                    playButton.removeClass(playButtonClasses[1]).addClass(playButtonClasses[0]);
                } else {
                    __.play();
                    playButton.removeClass(playButtonClasses[0]).addClass(playButtonClasses[1]);
                }
            });
            forwardButton.on('touchstart', function() {
                previousIsPlaying = __.isPlaying();
                __.setTimeScale(5);
                __.play();
            }).on('touchend touchcancel', function () {
                __.setTimeScale(1);
                if (!previousIsPlaying) {
                    __.pause();
                }
            });

            callEvent('onPlayStatusChanged', isPlaying);
            callEvent('onPositionChanged', __.getPosition());
        }
    };
    return __;
})();