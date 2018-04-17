/**
 * Created by kako on 2016/03/03.
 */

var PP2_DEBUG = (function() {
    var isDebugMode = false;
    var lang = "ja";
    var isAndroid = false;
    var settings = {
        master_volume_available: true,
        twin_piano_available: true,
        keyboard_setting_available: true,
        part_balance_available: false,
        left_shift_setting_available: true,
        rhythm_start_by_pedal_available: false,
        master_tuning_available: true,
        key_touch_available: true,
        key_touch_type_value: 2,
        ambience_available: true,
        ambience_name_value: 1,
        ambience_max_value: 4,
        brilliance_available: true,
        brilliance_value: 1,
        transpose_available: true,
        transpose_type_value: 3,
        sequencer_tempo_expansion: true,
        metronome_tempo_type_value: 0,
        metronome_tone_available: true,
        metronome_volume_available: true,
        metronome_volume_type_value: 1,
        metronome_down_beat_available: true,
        metronome_beat_available: true,
        metronome_beat_type_value: 3,
        metronome_pattern_available: true,
        headphones_3d_ambience_available: true,
        sequencer_one_song_repeat_available: true
    };
    var isBrowserDebugMode = false;
    if (typeof $$app === 'undefined' && navigator.userAgent.indexOf('roland.quattro') === -1) {
        PP2_CORE.logReceiver("console.log")('Start browser debug mode.');
        isBrowserDebugMode = true;
    }

    console.print = function () {};
    if (isDebugMode) {
        var printLog = function(name) {return function(log) {PP2_DEBUG.logOnBrowser(name + ': ' + log);}};
        if (!isBrowserDebugMode) {
            // ログレシーバーをブラウザにするやつ
            //PP2_CORE.logReceiver = printLog;

            // 実機デバッグ用
            console.print = printLog("console.print");
            console.log = PP2_CORE.logReceiver("console.log");
            console.debug = PP2_CORE.logReceiver("console.debug");
            console.info = PP2_CORE.logReceiver("console.info");
            console.warn = PP2_CORE.logReceiver("console.warn");
            console.error = PP2_CORE.logReceiver("console.error");
            window.onerror = function (errMsg, url, lineNumber) {
                PP2_CORE.logReceiver("window.onerror")(errMsg + ", file=" + url + ":" + lineNumber);
            };
        } else {
            // ブラウザデバッグ用
            console.log("Browser debug mode.");
            // 実機メモリシミュレータ
            var memorySimulator = (function() {
                var memory = {
                    '010000': '434C3036435F303030315F4558502020202020202020202020202020202020200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
                    '010001': '0140400000000103003D030202020200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
                    '010002': '00364040403B0100000007004D030000010000080400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
                    '010003': '00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000', // 書き込み専用領域
                    '010004': '00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000', // 書き込み専用領域
                    '010005': '00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000', // 書き込み専用領域
                    '010006': '00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000', // 書き込み専用領域
                    '010007': '000000030606060A0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
                    '010008': '01000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
                };

                var toggles = {};
                toggles[p2addr.sequencerPlayStopToggle] = p2addr.sequencerStatus;
                toggles[p2addr.sequencerAccompPartSwToggle] = p2addr.sequencerPartSwAccomp;
                toggles[p2addr.sequencerLeftPartSwToggle] = p2addr.sequencerPartSwLeft;
                toggles[p2addr.sequencerRightPartSwToggle] = p2addr.sequencerPartSwRight;
                toggles[p2addr.metronomeSwToggle] = p2addr.metronomeStatus;
                toggles[p2addr.sequencerPlayStopToggle] = p2addr.sequencerStatus;

                var incrementers = {};
                incrementers[p2addr.sequencerREW] = [p2addr.sequencerMeasure, -1, 0, 100];
                incrementers[p2addr.sequencerFF] = [p2addr.sequencerMeasure, 1, 0, 100];
                incrementers[p2addr.sequencerReset] = [p2addr.sequencerMeasure, -99999, 0, 100];
                incrementers[p2addr.sequencerTempoDown] = [p2addr.sequencerTempoRO, -1, 5, 300];
                incrementers[p2addr.sequencerTempoUp] = [p2addr.sequencerTempoRO, 1, 5, 300];

                var writers = {};
                writers[p2addr.keyTransposeWO] = p2addr.keyTransposeRO;
                writers[p2addr.songTransposeWO] = p2addr.songTransposeRO;
                writers[p2addr.sequencerTempoWO] = p2addr.sequencerTempoRO;

                var clamp = function(value, min, max) {
                    return Math.min(Math.max(min, value), max);
                };

                var __ = {
                    read: function(address, size) {
                        var addressPrefix = address.substr(0, 6);
                        var startAddrSuffixInt = parseInt(address.substr(-2), 16);
                        var data = memory[addressPrefix];
                        if (undefined === data) {
                            return undefined;
                        }
                        return data.substr(startAddrSuffixInt * 2, size * 2);
                    },
                    write: function(address, data, sendDT1Delay) {
                        var addressPrefix = address.substr(0, 6);
                        var startAddrSuffixInt = parseInt(address.substr(-2), 16);
                        if (undefined === memory[addressPrefix]) {
                            memory[addressPrefix] = Array(256 + 1).join('00');
                        }
                        if (undefined !== toggles[address]) {
                            __.write(toggles[address], __.read(toggles[address], 1) === '00' ? '01' : '00', 10);
                        } else if (undefined !== incrementers[address]) {
                            var incrementerInfo = incrementers[address];
                            var size = PP2_MIDI.getAddressSize(incrementerInfo[0]);
                            var value = Math.min(Math.max(parseInt(__.read(incrementerInfo[0], size), 16) + incrementerInfo[1], incrementerInfo[2]), incrementerInfo[3]);
                            __.write(incrementerInfo[0], PP2_MIDI.paddedHex(value, size * 2), 10);
                        } else if (undefined !== writers[address]) {
                            __.write(writers[address], data, 10);
                        } else {
                            var cache = memory[addressPrefix];
                            memory[addressPrefix] = cache.substr(0, startAddrSuffixInt * 2) + data + cache.slice(-(cache.length - startAddrSuffixInt * 2 - data.length));

                            var i = 0;
                            while (i < data.length / 2) {
                                var address = addressPrefix + PP2_MIDI.paddedHex(i + startAddrSuffixInt, 2);
                                var size = PP2_MIDI.getAddressSize(address);
                                i += size;
                            }

                            if (undefined !== sendDT1Delay) {
                                setTimeout(function () {
                                    PP2_MIDI.receiveMessage(PP2_MIDI.commands.DT1, address, data);
                                }, sendDT1Delay);
                            }
                        }
                    }
                };
                return __;
            })();

            /*
            setTimeout(function() {memorySimulator.write(p2addr.sequencerTempoNotation, '01', 0);}, 10000);
            setTimeout(function() {memorySimulator.write(p2addr.sequencerTempoNotation, '02', 0);}, 15000);
            setTimeout(function() {memorySimulator.write(p2addr.sequencerTempoNotation, '03', 0);}, 20000);
            setTimeout(function() {memorySimulator.write(p2addr.sequencerTempoNotation, '04', 0);}, 25000);
            setTimeout(function() {memorySimulator.write(p2addr.sequencerTempoNotation, '05', 0);}, 30000);
            setTimeout(function() {memorySimulator.write(p2addr.sequencerTempoNotation, '06', 0);}, 35000);
            setTimeout(function() {memorySimulator.write(p2addr.sequencerTempoNotation, '07', 0);}, 40000);
            setTimeout(function() {memorySimulator.write(p2addr.sequencerTempoNotation, '08', 0);}, 45000);
            setTimeout(function() {memorySimulator.write(p2addr.sequencerTempoNotation, '09', 0);}, 50000);
            */

            var rhythmStartStopPedalMode = 0;
            PP2_CORE.call = function (methodName, params, callback) {
                console.log('Native method ' + methodName + ' called.');
                switch (methodName) {
                    case PP2_CORE.nativeMethods.requestLanguage:
                        setTimeout(function () {
                            PP2_CORE.callback(PP2_CORE.nativeMethods.requestLanguage, lang);
                        }, 50);
                        break;
                    case PP2_CORE.nativeMethods.requestContentsFile:
                        console.log(params);
                        setTimeout(function () {
                            callback({taskId: params.taskId, dir: 'hoge/fuga', error: ''});
                        }, 300);
                        break;
                    case PP2_CORE.nativeMethods.arranger.requestFileList:
                        setTimeout(function () {
                            PP2_CORE.callback(PP2_CORE.nativeMethods.arranger.requestFileList, [
                                "hogehoge1",
                                "hogehoge2",
                                "hogehoge3",
                                "hogehoge4",
                                "hogehoge5",
                                "hogehoge6",
                                "hogehoge7",
                                "hogehoge8"
                            ]);
                        }, 50);
                        break;
                    case PP2_CORE.nativeMethods.arranger.requestCode:
                        setTimeout(function () {
                            PP2_CORE.callback(PP2_CORE.nativeMethods.arranger.requestCode, "CMaj7");
                        }, 50);
                        break;
                    case PP2_CORE.nativeMethods.arranger.requestRhythmStartStopPedalMode:
                        setTimeout(function () {
                            PP2_CORE.callback(PP2_CORE.nativeMethods.arranger.requestRhythmStartStopPedalMode, rhythmStartStopPedalMode);
                        }, 50);
                        break;
                    case PP2_CORE.nativeMethods.requestJSON:
                        setTimeout(function () {
                            if (params.path.substr(-14) == 'song_list.json') {
                                callback({
                                    json: JSON.parse('{"category":[{"name":"Listening","name_jp":"リスニング","song":[{"name_jp":"献呈","filename":"Listening\/Y0F01917.MID","composer":"Robert Alexander Schumann, Arranged by Franz Liszt","name":"Widmung  S.566  R.253","composer_jp":"シューマン、リスト編曲","copyright":false}]}]}'),
                                    error: ''
                                });
                            } else if (params.path.substr(-14) == 'tone_list.json') {
                                callback({
                                    json: JSON.parse('{"category":[{"name_jp":"ピアノ - グランド","tone":[{"number":1,"name":"Concert Piano","name_jp":"コンサートピアノ"},{"number":2,"name":"Ballad Piano","name_jp":"バラードピアノ"},{"number":3,"name":"Mellow Piano","name_jp":"メロウピアノ"},{"number":4,"name":"Bright Piano","name_jp":"ブライトピアノ"}],"icon":"piano","name":"Piano-Grand"}]}'),
                                    error: ''
                                });
                            } else if (params.path.substr(-10) == 'setup.json') {
                                callback({json: settings, error: ''});
                            }
                        }, 50);
                        break;
                    case PP2_CORE.nativeMethods.requestSystemData:
                        setTimeout(function () {
                            callback({
                                taskId: params.taskId,
                                data: {
                                    "encryptKey" : "TESTTESTTESTTEST",
                                    "awsRegion" : "ap-northeast-1",
                                    "awsUserPoolId" : "ap-northeast-1_F4lsfIOMM",
                                    "awsClientId" : "62qil2djtp5loj77ee26fkl18b",
                                    "awsApiUrl" : "https://dq9kx9h6dg.execute-api.ap-northeast-1.amazonaws.com/beta",
                                    "storageDir" : "path/to/dir/"
                                }
                            });
                        }, 50);
                        break;
                    case PP2_CORE.nativeMethods.arranger.setRhythmStartStopPedalMode:
                        rhythmStartStopPedalMode = params['mode'];
                        break;
                    case PP2_CORE.nativeMethods.db.requestUsers:
                        setTimeout(function() {
                            callback({
                                taskId: params.taskId, items: [
                                    {
                                        "isGuest": true,
                                        "lengthOfExperience": 0,
                                        "handleName": "Guest",
                                        "password": "te",
                                        "developmentMode": 0,
                                        "uploaded": false,
                                        "saveDataToServer": true,
                                        "lastLessonedAt": "2017-07-31T20:13:05.784+0900",
                                        "objectId": "Guest",
                                        "calendarType": 0,
                                        "country": "日本",
                                        "email": "kako@qnote.co.jp",
                                        "icon": "",
                                        "createdAt": "2017-07-31T19:46:33.753+0900"
                                    },
                                    {
                                        "lengthOfExperience": 0,
                                        "handleName": "Dummy User 1",
                                        "password": "47ea3d2187773a660c33b4599259ed6e5dc961022f268d748abeec45744f3422L2lgJ9nmZDq5+Y3MBjNWXA",
                                        "developmentMode": 0,
                                        "uploaded": false,
                                        "saveDataToServer": true,
                                        "lastLessonedAt": "2017-07-31T20:13:05.784+0900",
                                        "objectId": "DUMMY-USER-1",
                                        "calendarType": 0,
                                        "country": "日本",
                                        "email": "kako@qnote.co.jp",
                                        "icon": "",
                                        "createdAt": "2017-07-31T19:46:33.753+0900"
                                    },
                                    {
                                        "lengthOfExperience": 0,
                                        "instruments": 0,
                                        "handleName": "Dummy User 2",
                                        "sex": 0,
                                        "age": 0,
                                        "password": "6377362b5d51a7512bc9487cf8bd5f70086f8bd43d42275a160a83878841dfd62xaMA3ZRzzz4N89btzqVbw",
                                        "developmentMode": 0,
                                        "uploaded": false,
                                        "saveDataToServer": true,
                                        "lastLessonedAt": "2017-07-31T20:13:05.784+0900",
                                        "objectId": "DUMMY-USER-2",
                                        "calendarType": 0,
                                        "country": "日本",
                                        "email": "ijoru777@gmail.com",
                                        "icon": "",
                                        "createdAt": "2017-07-31T19:46:33.753+0900"
                                    }
                                ]
                            });
                        }, 100);
                        break;
                    case PP2_CORE.nativeMethods.db.requestActivitiesOnMonth:
                        setTimeout(function() {
                            callback({
                                taskId: params['taskId'], items: [
                                    {
                                        "userId": "DUMMY-USER-1",
                                        "countsPerTimePeriod": "{\"150150020\":[4,4,0,0,0]}",
                                        "uploaded": false,
                                        "endAt": "2017-07-31T20:23:33.028+0900",
                                        "objectId": "9DC419F5-E1FE-4315-9536-128340078F3E",
                                        "startAt": new Date(),
                                        "createdAt": "2017-07-31T19:52:16.419+0900",
                                        "countsOfEachKeys": "{\"64\":[1,1,0,0,0],\"65\":[1,1,0,0,0],\"66\":[1,0,0,0,0],\"67\":[1,0,0,0,0],\"69\":[0,1,0,0,0],\"72\":[0,1,0,0,0]}",
                                        "totalLessonTime": 22,
                                        "updatedAt": "2017-07-31T19:52:16.419+0900"
                                    }
                                ]
                            });
                        }, 100);
                        break;
                    case PP2_CORE.nativeMethods.db.requestRecordedSongsOnDay:
                    case PP2_CORE.nativeMethods.db.requestRecordedSongsOnRecorder:
                        setTimeout(function() {
                            callback({taskId: 'task_1501753279915_3125415', items: [
                                {
                                    "userId" : "DUMMY-USER-1",
                                    "uploaded" : false,
                                    "startAt" : "2017-08-03T18:31:23.066+09:00",
                                    "objectId" : "4011DA81-7D49-46BA-9F13-B26B08165CA4",
                                    "lengthOfTime" : 12,
                                    "createdAt" : "2017-08-03T18:31:35.723+09:00",
                                    "name" : "Singing Winds"
                                },
                                {
                                    "userId" : "DUMMY-USER-1",
                                    "uploaded" : false,
                                    "startAt" : "2017-08-03T18:31:08.661+09:00",
                                    "objectId" : "8397A929-ACE4-41BD-99F7-9CC16ADC586D",
                                    "lengthOfTime" : 4,
                                    "createdAt" : "2017-08-03T18:31:12.702+09:00",
                                    "name" : "Singing Winds"
                                },
                                {
                                    "userId" : "DUMMY-USER-1",
                                    "uploaded" : false,
                                    "startAt" : "2017-08-03T18:03:30.013+09:00",
                                    "objectId" : "AA405420-835C-4967-8754-D641981726E1",
                                    "lengthOfTime" : 2,
                                    "createdAt" : "2017-08-03T18:03:32.166+09:00",
                                    "name" : "2017\/08\/03 18:03:30"
                                }
                            ]});
                        }, 100);
                        break;
                    case PP2_CORE.nativeMethods.db.createOrUpdateUser:
                        setTimeout(function() {
                            console.log(params);
                            if (undefined === params.firstDayOfTheWeek) {
                                params.firstDayOfTheWeek = 0;
                            }
                            callback({
                                taskId: params['taskId'],
                                item: params
                            });
                        }, 100);
                        break;
                    default:
                        console.log("Called " + methodName + " but no stab.\n" + JSON.stringify(params));
                        break;
                }
            };
            PP2_CORE.isAndroid = function () {
                return isAndroid;
            };
            PP2_MIDI.send = function (commandId, address, data) {
                switch (commandId) {
                    case '11':
                        // RQ1（端末へのデータ要求）のシミュレーション
                        var delay = 100;
                        setTimeout(function () {
                            PP2_MIDI.receiveMessage(PP2_MIDI.commands.DT1, address, memorySimulator.read(address, parseInt(data, 16)));
                        }, delay);
                        break;
                    case '12':
                        // DT1（端末へのデータ書き込み）のシミュレーション
                        var delay = 100;
                        setTimeout(function () {
                            memorySimulator.write(address, data);
                        }, delay);
                        break;
                }
            };
            PP2_MIDI.requestModelId = function(callback) {
                setTimeout(function() {callback({value: '0000'});}, 100);
            };
            PP2_DB.paramsToTypedValuesIfNeeded = function(v) {
                return v;
            };
            var dummyEndpoint = [{
                MIDIDeviceNameKey: 'Roland Digital Piano',
                MIDIEntityNameKey: 'Roland Digital Piano',
                MIDIEndpointUIDKey: 'DummyUID',
                MIDIEndpointIndexKey: 'DummyIndex'
            }, {
                MIDIDeviceNameKey: 'Dummy LX-7',
                MIDIEntityNameKey: 'Bluetooth',
                MIDIEndpointUIDKey: 'DummyUID:BLE:',
                MIDIEndpointIndexKey: 'DummyIndex'
            }];
            $native.midi.input.endpoints = function (callback) {
                callback(dummyEndpoint);
            };
            $native.midi.output.endpoints = function (callback) {
                callback(dummyEndpoint);
            };
            $native.app.storage = function(value, callback) {
                if (undefined !== value) {
                    localStorage.setItem('storage', value);
                } else {
//                    var storagedValue = localStorage.getItem('storage');
                    var storagedValue = '{"lastDownloadedFiles":{},"digiScoreLite":{"pageTurn":false,"offsetInterval":5},"rhythm":{"pedalMode":0},"userIds":["3ynDKM7zJusOUFjG","JWdhzUSRWL2Ef0m4","PTwMj6VtjFpoFxXf"]}';
                    console.log(storagedValue);
                    callback(undefined === storagedValue ? '{}' : storagedValue);
                }
            };
        }
    }
    return {
        isDebugMode: isDebugMode,
        isBrowserDebugMode: isBrowserDebugMode,
        logOnBrowser: function(log) {
            var logContainer = $('#browser-log');
            if (!logContainer.length) {
                logContainer = $('<div class="scrollable" style="position: absolute;top: 100px;left: 100px;max-height: 300px;border: solid 1px;background-color: white;z-index: 10000;display: inline-block;" id="browser-log" onclick="$(this).css(\'display\', \'none\');"></div>');
                logContainer.appendTo($(document.body));
            }
            logContainer.css('display', 'block');
            $('<div style="display: block;padding: 2px 5px 2px 5px;border-bottom: dotted 1px;">' + log + '</div>').prependTo(logContainer);
        }
    };
})();