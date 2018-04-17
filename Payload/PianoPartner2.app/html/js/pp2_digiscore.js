/**
 * Created by kako on 2016/03/17.
 */

var PP2_DIGISCORE = (function() {
    return {
        loadSMF: function(fileName, callback) {
            PP2_CORE.call(PP2_CORE.nativeMethods.digiScore.loadSMF, {fileName: PP2_CONTENTS.getContentsDir() + '/SONG/' + fileName}, callback);
        },
        loadSMFWithFullPath: function(fullPath, callback) {
            PP2_CORE.call(PP2_CORE.nativeMethods.digiScore.loadSMF, {fileName: fullPath}, callback);
        },
        closeSMF: function() {
            PP2_CORE.call(PP2_CORE.nativeMethods.digiScore.closeSMF);
        },
        requestPageCount: function(callback) {
            PP2_CORE.call(PP2_CORE.nativeMethods.digiScore.requestPageCount, {}, callback);
        },
        requestBitmap: function(page, transpose, callback) {
            PP2_CORE.call(PP2_CORE.nativeMethods.digiScore.requestBitmap, {page: page, transpose: transpose}, callback);
        },
        requestMeas: function(callback) {
            PP2_CORE.call(PP2_CORE.nativeMethods.digiScore.requestMeas, {}, callback);
        },
        requestCurrentMeas: function(callback) {
            PP2_CORE.call(PP2_CORE.nativeMethods.digiScore.requestCurrentMeas, {time: new Date().getTime()}, callback);
        },
        measTimerStart: function() {
            PP2_CORE.call(PP2_CORE.nativeMethods.digiScore.measTimerStart, {time: new Date().getTime()});
        },
        measTimerStop: function() {
            PP2_CORE.call(PP2_CORE.nativeMethods.digiScore.measTimerStop, {time: new Date().getTime()});
        },
        measTimerSetTempo: function(tempo) {
            PP2_CORE.call(PP2_CORE.nativeMethods.digiScore.measTimerSetTempo, {time: new Date().getTime(), tempo: tempo * 1000000});
        },
        seekMeas: function(meas) {
            PP2_CORE.call(PP2_CORE.nativeMethods.digiScore.seekMeas, {time: new Date().getTime(), meas: meas});
        },
        setNotation: function(notation) {
            PP2_CORE.call(PP2_CORE.nativeMethods.digiScore.setNotation, {time: new Date().getTime(), notation: notation});
        },
        notifyButton: function(cmd, repeat) {
            PP2_CORE.call(PP2_CORE.nativeMethods.digiScore.notifyButton, {time: new Date().getTime(), cmd: cmd, repeat: repeat});
        },
        setOffsetInterval: function(value) {
            var measureProgressTimings = [];
            var pageTurnTimings = [];
            if (PP2_CORE.isAndroid()) {
                measureProgressTimings = [0, 306, 306, 306, 306, 306, 306, 306, 306, 306, 306];
                pageTurnTimings = [0, 120, 240, 360, 480, 600, 808, 1016, 1224, 1432, 1640];
            } else {
                measureProgressTimings = [0, 306, 306, 306, 306, 306, 306, 306, 306, 306, 306];
                pageTurnTimings = [0, 72, 144, 216, 288, 360, 568, 776, 984, 1192, 1400];
            }

            // Meas進行のタイミング
            PP2_CORE.call(PP2_CORE.nativeMethods.digiScore.setOffsetInterval, {kind: false, offsetTime: measureProgressTimings[value]});
            // ページめくりのタイミング
            PP2_CORE.call(PP2_CORE.nativeMethods.digiScore.setOffsetInterval, {kind: true, offsetTime: pageTurnTimings[value]});
        },
        scoutMeas1: function(fileName, callback) {
            PP2_CORE.call(PP2_CORE.nativeMethods.digiScore.scoutMeas1, {fileName: fileName}, callback);
        }
    };
})();