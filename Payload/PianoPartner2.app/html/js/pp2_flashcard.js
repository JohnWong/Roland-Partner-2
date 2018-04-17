/**
 * Created by inoue on 2016/03/29.
 */

var PP2_FLASHCARD = (function() {
    var preloadImages = {};
    var isPreloadFinished = false;
    var toneTimers = {};

    $(function() {
        var preloadTargets = ['card_front', 'card_back', 'clef_treble', 'clef_bass', 'sharp', 'flat', 'note', 'note_reverse'];
        _.forEach(preloadTargets, function(v) {
            var image = new Image();
            image.src = _.sprintf('./images/fc_%s.png?%s', v, new Date().getTime());
            image.onload = function() {
                preloadImages[v] = image;
                if (_.size(preloadImages) >= preloadTargets.length) {
                    isPreloadFinished = true;
                }
            };
        });
    });

    return {
        soundEffects: {
            correct: 0,
            incorrect: 1,
            drumRoll: 2,
            clap: 3
        },
        isPreloadFinished: function() {
            return isPreloadFinished;
        },
        getPreloadImages: function() {
            return preloadImages;
        },
        playSound: function(soundEffect) {
            if (PP2_MIDI.isConnected()) {
                PP2_MIDI.sendSoundEffectPlay(soundEffect, 64);
                setTimeout(function() {PP2_MIDI.sendSoundEffectStop(soundEffect);}, 3000);
            } else {
                PP2_CORE.call(PP2_CORE.nativeMethods.flashCard.playSound, {soundNo: soundEffect});
            }
        },
        playTone: function(toneNo, duration) {
            if (!duration) {
                duration = 500;
            }
            if (PP2_MIDI.isConnected()) {
                if (undefined != toneTimers[toneNo]) {
                    clearTimeout(toneTimers[toneNo]);
                    delete toneTimers[toneNo];
                }
                var midi = $native.midi;
                midi.send('90' + toneNo + '40');
                toneTimers[toneNo] = setTimeout(function() {
                    midi.send('80' + toneNo + '40');
                    delete toneTimers[toneNo];
                }, duration);
            } else {
                PP2_CORE.call(PP2_CORE.nativeMethods.flashCard.playTone, {toneNo: toneNo});
            }
        }
    };
})();

var p2se = PP2_FLASHCARD.soundEffects;
