/**
 * Created by kako on 2016/03/08.
 */

var PP2_ARRANGER = (function() {
    var chordRecongnitionType = {
        standard: 0,
        intelligent: 1,
        pianist: 2
    };
    var __ = {
        chordRecongnitionType: chordRecongnitionType,
        currentChordRecongnitionTypes: {
            split: chordRecongnitionType.intelligent,
            other: chordRecongnitionType.pianist
        },
        currentKeyboardMode: 0,
        requestFileList: function() {
            PP2_CORE.call(PP2_CORE.nativeMethods.arranger.requestFileList);
        },
        requestTempo: function() {
            PP2_CORE.call(PP2_CORE.nativeMethods.arranger.requestTempo);
        },
        requestCode: function() {
            PP2_CORE.call(PP2_CORE.nativeMethods.arranger.requestCode);
        },
        requestRhythmStartStopPedalMode: function() {
            PP2_CORE.call(PP2_CORE.nativeMethods.arranger.requestRhythmStartStopPedalMode);
        },
        requestPlayStatus: function() {
            PP2_CORE.call(PP2_CORE.nativeMethods.arranger.requestPlayStatus);
        },
        requestDivision: function() {
            PP2_CORE.call(PP2_CORE.nativeMethods.arranger.requestDivision);
        },
        requestBassInversion: function() {
            PP2_CORE.call(PP2_CORE.nativeMethods.arranger.requestBassInversion);
        },
        requestOnlyDrums: function() {
            PP2_CORE.call(PP2_CORE.nativeMethods.arranger.requestOnlyDrums);
        },
        setFile: function(file) {
            PP2_CORE.call(PP2_CORE.nativeMethods.arranger.setFile, {file: file});
        },
        setTempo: function(tempo) {
            PP2_CORE.call(PP2_CORE.nativeMethods.arranger.setTempo, {tempo: tempo});
        },
        setVariation: function(variation) {
            PP2_CORE.call(PP2_CORE.nativeMethods.arranger.setVariation, {variation: variation});
        },
        setSyncStart: function(onOrOff) {
            PP2_CORE.call(PP2_CORE.nativeMethods.arranger.setSyncStart, {onOrOff: onOrOff});
        },
        setAutoFill: function(onOrOff) {
            PP2_CORE.call(PP2_CORE.nativeMethods.arranger.setAutoFill, {onOrOff: onOrOff});
        },
        // mode 0:OFF 1:LEFT PEDAL 2:CENTER PEDAL
        setRhythmStartStopPedalMode: function(mode) {
            PP2_CORE.call(PP2_CORE.nativeMethods.arranger.setRhythmStartStopPedalMode, {mode: mode});
        },
        start: function()
        {
            PP2_CORE.call(PP2_CORE.nativeMethods.arranger.start);
        },
        stop: function() {
            PP2_CORE.call(PP2_CORE.nativeMethods.arranger.stop);
        },
        goToIntro: function()
        {
            PP2_CORE.call(PP2_CORE.nativeMethods.arranger.goToIntro);
        },
        goToEnding: function() {
            PP2_CORE.call(PP2_CORE.nativeMethods.arranger.goToEnding);
        },
        setTypeStandard: function() {
            PP2_CORE.call(PP2_CORE.nativeMethods.arranger.setTypeStandard);
        },
        setTypeIntel: function() {
            PP2_CORE.call(PP2_CORE.nativeMethods.arranger.setTypeIntel);
        },
        setTypePiano: function() {
            PP2_CORE.call(PP2_CORE.nativeMethods.arranger.setTypePiano);
        },
        setBassInversion: function(value) {
            PP2_CORE.call(PP2_CORE.nativeMethods.arranger.setBassInversion, {value: value});
        },
        setOnlyDrums: function(value) {
            PP2_CORE.call(PP2_CORE.nativeMethods.arranger.setOnlyDrums, {value: value});
        },
        toggleOnlyDrums: function(value) {
            PP2_CORE.call(PP2_CORE.nativeMethods.arranger.toggleOnlyDrums);
        },
        sendStyleLog: function(styleName) {
            PP2_CORE.call(PP2_CORE.nativeMethods.arranger.sendStyleLog, {styleName: styleName});
        },
        setChordRecognitionType: function(type, keyBoardMode) {
            switch (type) {
                case PP2_ARRANGER.chordRecongnitionType.standard:
                    PP2_ARRANGER.setTypeStandard();
                    break;
                case PP2_ARRANGER.chordRecongnitionType.intelligent:
                    PP2_ARRANGER.setTypeIntel();
                    break;
                case PP2_ARRANGER.chordRecongnitionType.pianist:
                    PP2_ARRANGER.setTypePiano();
                    break;
            }
            if (keyBoardMode == 1) {
                __.currentChordRecongnitionTypes.split = type;
            } else {
                __.currentChordRecongnitionTypes.other = type;
            }
        },
        resetChordRecognitionType: function(keyBoardMode) {
            var type = keyBoardMode == 1 ? __.currentChordRecongnitionTypes.split : __.currentChordRecongnitionTypes.other;
            __.setChordRecognitionType(type, keyBoardMode);
        }
    };
    return __;
})();
