/**
 * Created by kako on 2016/03/03.
 */

// underscore.js & underscore.string.jsの併用設定
_.mixin(s.exports());

var PP2_CORE = (function() {
    var applicationModes = {
        None: -1,
        Top: 0,
        Songs: 1,
        DigiScoreLite: 2,
        Rhythm: 3,
        FlashCard: 4,
        Recorder: 5,
        Diary: 6,
        RemoteController: 7
    };
    var countTargets = {
        DiaryPhraseButton: 101,
        DiaryHoursButton: 102,
        DiaryKeysButton: 103,
        DiaryShareButton: 104,
        DiaryPlayButton: 105,
        RecorderPlayButton: 106
    };
    var nativeMethods = {
        initialize: "initialize",
        countUpUseCount: "countUpUseCount",
        requestLanguage: "requestLanguage",
        requestAppVersion: "requestAppVersion",
        requestContentsFile: "requestContentsFile",
        requestJSON: "requestJSON",
        requestSystemData: "requestSystemData",
        initializeData: "initializeData",
        openInBrowser: "openInBrowser",
        clearCache: "clearCache",
        setMIDIDeviceName: "setMIDIDeviceName",
        setUptime: "setUptime",
        share: "share",
        sleepable: "sleepable",
        showImagePicker: "showImagePicker",
        arranger: {
            requestFileList: "arrangerRequestFileList",
            requestTempo: "arrangerRequestTempo",
            requestCode: "arrangerRequestCode",
            requestRhythmStartStopPedalMode: "arrangerRequestRhythmStartStopPedalMode",
            requestPlayStatus: "arrangerRequestPlayStatus",
            requestDivision: "arrangerRequestDivision",
            requestBassInversion: "arrangerRequestBassInversion",
            requestOnlyDrums: "arrangerRequestOnlyDrums",
            setFile: "arrangerSetFile",
            setTempo: "arrangerSetTempo",
            setVariation: "arrangerSetVariation",
            setSyncStart: "arrangerSetSyncStart",
            setAutoFill: "arrangerSetAutoFill",
            setRhythmStartStopPedalMode: "arrangerSetRhythmStartStopPedalMode",
            start: "arrangerStart",
            stop: "arrangerStop",
            goToIntro: "arrangerGoToIntro",
            goToEnding: "arrangerGoToEnding",
            setTypeStandard: "arrangerSetTypeStandard",
            setTypeIntel: "arrangerSetTypeIntel",
            setTypePiano: "arrangerSetTypePiano",
            setBassInversion: "arrangerSetBassInversion",
            setOnlyDrums: "arrangerSetOnlyDrums",
            toggleOnlyDrums: "arrangerToggleOnlyDrums",
            sendStyleLog: "arrangerSendStyleLog"
        },
        digiScore: {
            loadSMF: 'digiScoreLoadSMF',
            closeSMF: 'digiScoreCloseSMF',
            requestPageCount: 'digiScoreRequestPageCount',
            requestBitmap: 'digiScoreRequestBitmap',
            requestMeas: 'digiScoreRequestMeas',
            requestCurrentMeas: 'digiScoreRequestCurrentMeas',
            measTimerStart: 'digiScoreMeasTimerStart',
            measTimerStop: 'digiScoreMeasTimerStop',
            measTimerSetTempo: 'digiScoreMeasTimerSetTempo',
            seekMeas: 'digiScoreSeekMeas',
            setNotation: 'digiScoreSetNotation',
            notifyButton: 'digiScoreNotifyButton',
            setOffsetInterval: 'digiScoreSetOffsetInterval',
            scoutMeas1: 'digiScoreScoutMeas1'
        },
        flashCard: {
            playSound: 'flashCardPlaySound',
            playTone: 'flashCardPlayTone'
        },
        db: {
            createOrUpdateUser: 'dbCreateOrUpdateUser',
            createOrUpdateActivity: 'dbCreateOrUpdateActivity',
            createOrUpdateRecordedSong: 'dbCreateOrUpdateRecordedSong',
            createActionLog: 'dbCreateActionLog',
            requestUsers: 'dbRequestUsers',
            requestActivitiesOnMonth: 'dbRequestActivitiesOnMonth',
            requestActivityOnToday: 'dbRequestActivityOnToday',
            requestRecordedSongsOnRecorder: 'dbRequestRecordedSongsOnRecorder',
            requestRecordedSongsOnDay: 'dbRequestRecordedSongsOnDay',
            requestBackupData: 'dbRequestBackupData',
            backupCompleted: 'dbBackupCompleted',
            deleteOldData: 'dbDeleteOldData',
            sendToNCMB: 'dbSendToNCMB'
        },
        getDeviceFreeSize: "getDeviceFreeSize"
    };

    var currentApplicationMode = applicationModes.None;
    var callbackObjectsWithTaskId = {};
    var generateTaskId = function() {
        var date = new Date();
        return 'task_' + date.getTime() + '_' + Math.floor(Math.random() * 9999999);
    };
    var watchConnectionState = false;
    var notSleepTags = {};

    var __ = {
        // アプリケーションモード
        applicationModes: applicationModes,
        // カウントターゲット
        countTargets: countTargets,
        // ネイティブメソッド定義
        nativeMethods: nativeMethods,
        // システムデータ
        systemData: undefined,
        // イニシャライズします
        init: function(applicationMode) {
            currentApplicationMode = applicationMode;

            // 画面通知
            sendApplicationMode(1);
            PP2_LANGUAGE.requestLanguage();

            // FastClick反映
            FastClick.attach(document.body);
        },
        getCurrentApplicationMode: function() {
            return currentApplicationMode;
        },
        call: function(methodName, params, callbackWithTaskId, callbackTimeout) {
            // 期限切れコールバックの除去
            _.forEach(callbackObjectsWithTaskId, function(v, k) {
                if (v.timeLimit < new Date().getTime()) {
                    delete(callbackObjectsWithTaskId[k]);
                }
            });
            if (undefined == callbackTimeout) {
                callbackTimeout = 30;
            }
            params = undefined == params ? {} : params;
            if (typeof(callbackWithTaskId) == 'function') {
                params.taskId = generateTaskId();
                callbackObjectsWithTaskId[params.taskId] = {
                    timeLimit: new Date().getTime() + callbackTimeout * 1000,
                    callback: callbackWithTaskId
                };
            }
            callNative("pp2-script://" + methodName + "?" + $.param(params));
        },
        logReceiver: function(logName) {
            return function(log) {
                callNative("pp2-log://" + encodeURIComponent(logName + ":" + JSON.stringify(log)));
            };
        },
        // ネイティブからのコールバック受け取り口
        callback: function(methodName, params) {
            if (undefined != params.taskId && params.taskId.length > 0) {
                // タスクIDがセットされている場合
                var callbackObject = callbackObjectsWithTaskId[params.taskId];
                if (undefined != callbackObject) {
                    callbackObject.callback(params);
                    delete(callbackObjectsWithTaskId[params.taskId]);
                } else {
                    console.log('TaskId base native callback called bat callback function is not defined. ' + params.taskId);
                }
            } else {
                var callback = this.nativeCallbacks[methodName];
                if (typeof(callback) == 'function') {
                    callback(params);
                }
            }
        },
        // ネイティブコールバック群
        nativeCallbacks: {
            /* サンプル
             PP2_CORE.nativeMethods.arranger.requestFileList: function(params) {
             something to do...
             }
             */
        },
        // 標準ブラウザで開きます
        openInBrowser: function(url) {
            this.call(nativeMethods.openInBrowser, {url: url});
        },
        // WebViewのキャッシュをクリアします
        clearCache: function() {
            this.call(nativeMethods.clearCache);
        },
        // ログ保存用の接続中MIDIデバイス名をセットします
        setMIDIDeviceName: function(value) {
            this.call(nativeMethods.setMIDIDeviceName, {value: value});
        },
        // ログ保存用のMIDIデバイスuptimeをセットします
        setUptime: function(value) {
            this.call(nativeMethods.setUptime, {value: value});
        },
        initialize: function() {
            this.call(nativeMethods.initialize);
        },
        countUpUseCount: function(useApp) {
            this.call(nativeMethods.countUpUseCount, {useApp: useApp});
        },
        initializeData: function(callback) {
            this.call(nativeMethods.initializeData, {}, callback);
        },
        requestAppVersion: function(callback) {
            this.call(nativeMethods.requestAppVersion, {}, callback);
        },
        requestContentsFile: function(fileName, modelId, callback) {
            this.call(nativeMethods.requestContentsFile, {fileName: fileName, modelId: modelId}, callback);
        },
        requestJSON: function(path, callback) {
            this.call(nativeMethods.requestJSON, {path: path}, callback);
        },
        share: function(text) {
            this.call(nativeMethods.share, {text: text});
        },
        addNotSleepTag: function(tag) {
            notSleepTags[tag] = true;
            __.sleepable(false);
        },
        removeNotSleepTag: function(tag) {
            delete notSleepTags[tag];
            if (Object.keys(notSleepTags).length === 0) {
                __.sleepable(true);
            }
        },
        sleepable: function(value) {
            this.call(nativeMethods.sleepable, {value: value});
        },
        showImagePicker: function(callback) {
            this.call(nativeMethods.showImagePicker, {}, callback);
        },
        isAndroid: function() {
            return navigator.userAgent.indexOf('roland.quattro') == -1;
        },
        noteToCode: function(note) {
            var codes = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
            var position = note - 60;
            return codes[note % 12] + (Math.floor((4 * codes.length + position) / codes.length));
        },
        valueToBalance: function(value) {
            var balances = ['9:1','9:2','9:3','9:4','9:5','9:6','9:7','9:8','9:9','8:9','7:9','6:9','5:9','4:9','3:9','2:9','1:9'];
            var position = value + 8;
            return balances[position];
        },
        reset: function() {
            sendApplicationMode(0);

            // 各種コールバック初期化
            this.nativeCallbacks = {};
            __.clearCache();
        },
        generateUUID: function() {
            var d = new Date().getTime();
            var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = (d + Math.random()*16)%16 | 0;
                d = Math.floor(d/16);
                return (c=='x' ? r : (r&0x3|0x8)).toString(16);
            });
            return uuid.toUpperCase();
        },
        onReceiveWatchConnectionState: function(state) {
            watchConnectionState = state;
            console.log("watchConnectionState go to " + (state ? 'TRUE' : 'FALSE'));
        },
        isReady: function() {
            return undefined !== __.systemData;
        },
        getDeviceFreeSize: function (callback) {
            return this.call(nativeMethods.getDeviceFreeSize, undefined, callback);
        }
    };

    function sendApplicationMode(status) {
        switch (currentApplicationMode) {
            case applicationModes.None:
                // 上記モードの場合は送信しない
                break;
            case applicationModes.Recorder:
            case applicationModes.Diary:
                // ピアノ側に Top 画面と同じ動作を要求する
                PP2_MIDI.sendApplicationMode(applicationModes.Top, status);
                break;
            default:
                PP2_MIDI.sendApplicationMode(currentApplicationMode, status);
                break;
        }
    }

    function callNative(src) {
        var iframe = document.createElement("IFRAME");
        iframe.setAttribute("src", src);
        document.documentElement.appendChild(iframe);
        iframe.parentNode.removeChild(iframe);
        iframe = null;
    }

    // ロード時の処理
    $(function() {
        // アプリバックグラウンド/フォアグラウンド時のコールバック
        $native.stop = function() {
            console.log("App go to background.");
            if (!watchConnectionState) {
                console.log("Send ApplicationMode 0.");
                sendApplicationMode(0);
            } else {
                console.log("Not send ApplicationMode.");
            }
            PP2_FRONT.onApplicationStop();
        };
        $native.restart = function() {
            console.log("App back to foreground.");
            if (!__.isAndroid()) {
                // iOSだとアプリバックグラウンド中のchangedは検知されないため、ここで強制実行
                $native.midi.event.changed();
            }
            sendApplicationMode(1);
            PP2_FRONT.onApplicationRestart();
            PP2_LANGUAGE.requestLanguage();
        };

        // 画面Unload時の処理
        window.onbeforeunload = __.reset;
        /* for iOS Safari */
        window.onpagehide = window.onbeforeunload;

        $event.start();

        __.call(nativeMethods.requestSystemData, {}, function(res) {
            __.systemData = res.data;
        })
    });

    return __;
})();
