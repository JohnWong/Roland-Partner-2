/**
 * Created by kako on 2016/03/16.
 */

var PP2_CONTENTS = (function() {
    var contentsDir = '';
    var songList;
    var toneList;
    var setupData;
    var previousCallbackKey;
    var isRequesting = false;
    var getBoolFromSetupData = function(key, defaultValue) {
        if (undefined === setupData || undefined === setupData[key]) {
            return !!defaultValue;
        }
        return !!setupData[key];
    };
    var getIntFromSetupData = function(key) {
        if (undefined === setupData || undefined === setupData[key]) {
            return -1;
        }
        var value = setupData[key];
        return 'number' === typeof(value) ? value : parseInt(value, 10);
    };
    var __ = {
        requestContents: function() {
            if (isRequesting) {
                return;
            }
            isRequesting = true;
            // コンテンツファイル名取得時の処理
            PP2_MIDI.removeCallback(previousCallbackKey);
            var timer = setTimeout(function() {
                PP2_MIDI.addConnectionLog('MIDI request timeout.');
                PP2_FRONT.showModal('error_connect_failed', 350);
                isRequesting = false;
                PP2_MIDI.disconnect();
            }, 5000);

            PP2_MIDI.addConnectionLog('MIDI requesting...');
            PP2_MIDI.requestModelId(function(params) {
                var modelId = params.value;
                PP2_MIDI.addConnectionLog(_.sprintf('Got modelId:%s', modelId));
                previousCallbackKey = PP2_MIDI.addCallback(p2addr.serverSetupFileName, function(params) {
                    clearTimeout(timer);
                    PP2_MIDI.addConnectionLog(_.sprintf('Got serverSetupFileName:%s', params.fileName));
                    PP2_MIDI.addConnectionLog('Contents download start.');
                    PP2_CORE.requestContentsFile(params.fileName, modelId, function(params) {
                        isRequesting = false;
                        if (undefined != params.error && params.error.length > 0) {
                            PP2_MIDI.addConnectionLog(_.sprintf('Contents download failed:%s', params.error));
                            // エラー処理
                            switch (params.error) {
                                case 'OFFLINE':
                                    PP2_FRONT.showModal('error_network_dialog', 350);
                                    break;
                                case 'DOWNLOAD_FAILED':
                                    PP2_FRONT.showModal('error_acquisition_dialog', 350, function (modal) {
                                        modal.find('lang.error-acquisition-message').attr('key', 'error_acquisition_message_download_failed');
                                        PP2_LANGUAGE.reload();
                                    });
                                    break;
                                case 'UNZIP_FAILED':
                                    PP2_FRONT.showModal('error_acquisition_dialog', 350, function (modal) {
                                        modal.find('lang.error-acquisition-message').attr('key', 'error_acquisition_message_unzip_failed');
                                        PP2_LANGUAGE.reload();
                                    });
                                    break;
                                default:
                                    PP2_FRONT.showModal('error_acquisition_dialog', 350, function (modal) {
                                        modal.find('lang.error-acquisition-message').attr('key', 'error_acquisition_message_unknown');
                                        PP2_LANGUAGE.reload();
                                    });
                                    break;
                            }
                            console.log(params.error);
                            PP2_MIDI.disconnect();
                            __.requestContentsFinishedCallback(params.error);
                        } else {
                            PP2_MIDI.addConnectionLog('Contents download finished.');
                            contentsDir = params.dir;

                            // SongList取得
                            PP2_CORE.call(PP2_CORE.nativeMethods.requestJSON, {path: contentsDir + '/SONG/song_list.json'}, function(params) {
                                if (params.error.length > 0) {
                                    console.log(params.error);
                                    songList = {};
                                } else {
                                    songList = params.json;
                                }
                            });
                            // ToneList取得
                            PP2_CORE.call(PP2_CORE.nativeMethods.requestJSON, {path: contentsDir + '/tone_list.json'}, function(params) {
                                if (params.error.length > 0) {
                                    console.log(params.error);
                                    toneList = {};
                                } else {
                                    toneList = params.json;
                                }
                            });
                            // Setupデータ取得
                            PP2_CORE.call(PP2_CORE.nativeMethods.requestJSON, {path: contentsDir + '/setup.json'}, function(params) {
                                if (params.error.length > 0) {
                                    console.log(params.error);
                                    setupData = {};
                                } else {
                                    setupData = params.json;
                                }
                            });
                            // 全てのデータが揃うまで待つ
                            var callbackIfNeededAction = function() {
                                if (undefined == songList || undefined == toneList || undefined == setupData) {
                                    setTimeout(callbackIfNeededAction, 100);
                                    return;
                                }
                                __.requestContentsFinishedCallback();
                            };
                            callbackIfNeededAction();
                        }
                    });
                });
                PP2_MIDI.request(p2addr.serverSetupFileName);
            });
        },
        clear: function() {
            contentsDir = '';
            songList = undefined;
            toneList = undefined;
            setupData = undefined;
        },
        isLoaded: function() {
            return undefined != contentsDir && contentsDir.length > 0;
        },
        getContentsDir: function() {
            return contentsDir;
        },
        getSongList: function() {
            return songList;
        },
        getToneList: function() {
            return toneList
        },
        getSetupData: function() {
            return setupData;
        },
        getSongFilePath: function(fileName) {
            return contentsDir + fileName;
        },
        isTwinPianoAvailable: function() {
            return getBoolFromSetupData('twin_piano_available');
        },
        isKeyboardSettingAvailable: function() {
            return getBoolFromSetupData('keyboard_setting_available');
        },
        isLanguageSettingAvailable: function() {
            return getBoolFromSetupData('language_setting_available');
        },
        isLeftShiftSettingAvailable: function() {
            return getBoolFromSetupData('left_shift_setting_available');
        },
        isTone2ShiftSettingAvailable: function() {
            return getBoolFromSetupData('tone2_shift_setting_available');
        },
        isSequencerPartSwitchAvailable: function() {
            return getBoolFromSetupData('sequencer_part_switch_available');
        },
        isKeepScoreRights: function() {
            return getBoolFromSetupData('keep_score_rights');
        },
        isHeadphonesConnectionAvailable: function() {
            return getBoolFromSetupData('headphones_connection_available');
        },
        isMasterVolumeAvailable: function() {
            return getBoolFromSetupData('master_volume_available');
        },
        isMasterVolumeLimitAvailable: function() {
            return getBoolFromSetupData('master_volume_limit_available');
        },
        isPartBalanceAvailable: function() {
            return getBoolFromSetupData('part_balance_available', true);
        },
        isRhythmStartByPedalAvailable: function() {
            return getBoolFromSetupData('rhythm_start_by_pedal_available', true);
        },
        isMasterTuningAvailable: function() {
            return getBoolFromSetupData('master_tuning_available');
        },
        isKeyTouchAvailable: function() {
            return getBoolFromSetupData('key_touch_available');
        },
        isAmbienceAvailable: function() {
            return getBoolFromSetupData('ambience_available');
        },
        isHeadphones3DAmbienceAvailable: function() {
            return getBoolFromSetupData('headphones_3d_ambience_available');
        },
        isBrillianceAvailable: function() {
            return getBoolFromSetupData('brilliance_available');
        },
        isTransposeAvailable: function() {
            return getBoolFromSetupData('transpose_available');
        },
        isMetronomeVolumeAvailable: function() {
            return getBoolFromSetupData('metronome_volume_available');
        },
        isMetronomeBeatAvailable: function() {
            return getBoolFromSetupData('metronome_beat_available');
        },
        isMetronomeDownBeatAvailable: function() {
            return getBoolFromSetupData('metronome_down_beat_available');
        },
        isMetronomePatternAvailable: function() {
            return getBoolFromSetupData('metronome_pattern_available');
        },
        isMetronomeToneAvailable: function() {
            return getBoolFromSetupData('metronome_tone_available');
        },
        isSequencerTempoExpansion: function() {
            return getBoolFromSetupData('sequencer_tempo_expansion');
        },
        isSequencerOneSongRepeatAvailable: function() {
            return getBoolFromSetupData('sequencer_one_song_repeat_available');
        },
        isRightShiftSettingAvailable: function () {
            return getBoolFromSetupData('right_shift_setting_available');
        },
        isTone1ShiftSettingAvailable: function () {
            return getBoolFromSetupData('tone1_shift_setting_available');
        },
        getKeyTouchTypeValue: function() {
            return getIntFromSetupData('key_touch_type_value');
        },
        getAmbienceNameValue: function() {
            return getIntFromSetupData('ambience_name_value');
        },
        getAmbienceMaxValue: function() {
            return getIntFromSetupData('ambience_max_value');
        },
        getBrillianceValue: function() {
            return getIntFromSetupData('brilliance_value');
        },
        getTransposeTypeValue: function() {
            return getIntFromSetupData('transpose_type_value');
        },
        getMetronomeVolumeTypeValue: function() {
            return getIntFromSetupData('metronome_volume_type_value');
        },
        getMetronomeBeatTypeValue: function() {
            return getIntFromSetupData('metronome_beat_type_value');
        },
        getMetronomeTempoTypeValue: function() {
            return getIntFromSetupData('metronome_tempo_type_value');
        },
        getPartShiftValue: function() {
            return getIntFromSetupData('part_shift_value');
        },
        licenses: {
            hasJASRAC: function() {
                return !!(undefined !== setupData && setupData.song_license_JASRAC);
            },
            hasJRC: function() {
                return !!(undefined !== setupData && setupData.song_license_JRC);
            },
            hasELicense: function() {
                return !!(undefined !== setupData && setupData['song_license_e-License']);
            },
            hasLEONARD: function() {
                return !!(undefined !== setupData && setupData.song_license_HAL_LEONARD);
            },
            getValue: function() {
                var value = '';
                if (undefined !== setupData && setupData.song_license_JASRAC_Number) {
                    value += setupData.song_license_JASRAC_Number + "\n";
                }
                if (undefined !== setupData && setupData.song_license_JRC_Number) {
                    value += setupData.song_license_JRC_Number + "\n";
                }
                if (undefined !== setupData && setupData['song_license_e-License_Number']) {
                    value += setupData['song_license_e-License_Number'] + "\n";
                }
                if (undefined !== setupData && setupData.song_license_HAL_LEONARD_Number) {
                    value += setupData.song_license_HAL_LEONARD_Number;
                }
                return value;
            }
        },
        requestContentsFinishedCallback: function(error) {
        },
        reset: function() {
            contentsDir = '';
            songList = undefined;
            toneList = undefined;
            setupData = undefined;
        }
    };
    return __;
})();