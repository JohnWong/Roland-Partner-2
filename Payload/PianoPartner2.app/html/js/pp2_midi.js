/**
 * Created by kako on 2016/03/02.
 */

var PP2_MIDI = (function() {
    var midi = $native.midi;

    var commands = {
        unknown: "unknown",
        RQ1: "RQ1",
        DT1: "DT1",
        NoteOff: "NoteOff",
        NoteOn: "NoteOn",
        AfterTouch: "AfterTouch",
        ControlChange: "ControlChange",
        ProgramChange: "ProgramChange",
        ChannelAfterTouch: "ChannelAfterTouch",
        PitchBend: "PitchBend",
        ModelId: "ModelId"
    };

    var addresses = {
        // 010000xx
        serverSetupFileName:            "01000000",
        // 010001xx
        songToneLanguage:               "01000100",
        keyTransposeRO:                 "01000101",
        songTransposeRO:                "01000102",
        sequencerStatus:                "01000103",
        sequencerMeasure:               "01000105",
        sequencerTempoNotation:         "01000107",
        sequencerTempoRO:               "01000108",
        sequencerBeatNumerator:         "0100010A",
        sequencerBeatDenominator:       "0100010B",
        sequencerPartSwAccomp:          "0100010C",
        sequencerPartSwLeft:            "0100010D",
        sequencerPartSwRight:           "0100010E",
        metronomeStatus:                "0100010F",
        headphonesConnection:           "01000110",
        // 010002xx
        keyBoardMode:                   "01000200",
        splitPoint:                     "01000201",
        splitOctaveShift:               "01000202",
        splitBalance:                   "01000203",
        dualOctaveShift:                "01000204",
        dualBalance:                    "01000205",
        twinPianoMode:                  "01000206",
        toneForSingle:                  "01000207",
        toneForSplit:                   "0100020A",
        toneForDual:                    "0100020D",
        songNumber:                     "01000210",
        masterVolume:                   "01000213",
        masterVolumeLimit:              "01000214",
        allSongPlayMode:                "01000215",
        splitRightOctaveShift:          "01000216",
        dualTone1OctaveShift:           "01000217",
        masterTuning:                   "01000218",
        ambience:                       "0100021A",
        headphones3DAmbience:           "0100021B",
        brilliance:                     "0100021C",
        keyTouch:                       "0100021D",
        transposeMode:                  "0100021E",
        metronomeBeat:                  "0100021F",
        metronomePattern:               "01000220",
        metronomeVolume:                "01000221",
        metronomeTone:                  "01000222",
        metronomeDownBeat:              "01000223",
        // 010003xx
        applicationMode:                "01000300",
        scorePageTurn:                  "01000302",
        arrangerPedalFunction:          "01000303",
        arrangerBalance:                "01000305",
        connection:                     "01000306",
        keyTransposeWO:                 "01000307",
        songTransposeWO:                "01000308",
        sequencerTempoWO:               "01000309",
        tempoReset:                     "0100030B",
        // 010004xx
        soundEffect:                    "01000400",
        soundEffectStopAll:             "01000402",
        // 010005xx
        sequencerREW:                   "01000500",
        sequencerFF:                    "01000501",
        sequencerReset:                 "01000502",
        sequencerTempoDown:             "01000503",
        sequencerTempoUp:               "01000504",
        sequencerPlayStopToggle:        "01000505",
        sequencerAccompPartSwToggle:    "01000506",
        sequencerLeftPartSwToggle:      "01000507",
        sequencerRightPartSwToggle:     "01000508",
        metronomeSwToggle:              "01000509",
        sequencerPreviousSong:          "0100050A",
        sequencerNextSong:              "0100050B",
        // 010006xx
        pageTurnPreviousPage:           "01000600",
        pageTurnNextPage:               "01000601",
        // 010007xx
        uptime:                         "01000700",
        // 010008xx
        addressMapVersion:              "01000800",
        noteOff:                        commands.NoteOff,
        noteOn:                         commands.NoteOn,
        afterTouch:                     commands.AfterTouch,
        controlChange:                  commands.ControlChange,
        programChange:                  commands.ProgramChange,
        channelAfterTouch:              commands.ChannelAfterTouch,
        pitchBend:                      commands.PitchBend,
        eventsMidiChanged:              "EVENTS_MIDI_CHANGED",
        eventsMidiStartConnect:         "EVENTS_MIDI_START_CONNECT",
        eventsMidiConnected:            "EVENTS_MIDI_CONNECTED",
        eventsMidiConnectFailed:        "EVENTS_MIDI_CONNECT_FAILED",
        eventsMidiDisconnected:         "EVENTS_MIDI_DISCONNECTED"
    };

    // アドレスのサイズを指定する（サイズが1の場合は省略可）
    var addressSizeMap = {};
    // 010000xx
    addressSizeMap[addresses.serverSetupFileName] = 32;
    // 010001xx
    addressSizeMap[addresses.sequencerMeasure] = 2;
    addressSizeMap[addresses.sequencerTempoRO] = 2;
    // 010002xx
    addressSizeMap[addresses.toneForSingle] = 3;
    addressSizeMap[addresses.toneForSplit] = 3;
    addressSizeMap[addresses.toneForDual] = 3;
    addressSizeMap[addresses.songNumber] = 3;
    addressSizeMap[addresses.masterTuning] = 2;
    // 010003xx
    addressSizeMap[addresses.arrangerPedalFunction] = 2;
    addressSizeMap[addresses.sequencerTempoWO] = 2;
    // 010007xx
    addressSizeMap[addresses.uptime] = 8;

    // dt1通信（実機メモリ）キャッシュ
    var deviceMemoryCaches = {};

    var connectedMIDIDevice = undefined;

    var previousRequestModelIdCallbackKey = undefined;
    var previousRequestAddressMapVersionCallbackKey = undefined;
    var previousRequestAddressMapVersionTimer = undefined;

    var connectionLogs = [];

    var addressMapVersion = -1;

    var addConnectionLog = function(log) {
        var now = new Date();
        connectionLogs.unshift(_.sprintf('[%02d:%02d:%02d.%03d] %s', now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds(), log));
        if (connectionLogs.length > 100) {
            connectionLogs.pop();
        }
    };

    var rq1 = function(address, size) {
        var size = undefined !== size ? size : getAddressSize(address);
        __.send("11", address, paddedHex(size, 8));
    };

    var dt1 = function(address, data) {
        if (__.isConnected()) {
            writeToDeviceMemoryCacheIfNeeded(address, data);
        }
        __.send("12", address, data);
    };

    var getAddressSize = function(address) {
        return undefined !== addressSizeMap[address] ? addressSizeMap[address] : 1;
    };

    var paddedHex = function(intData, length)
    {
        return (Array(length).join("0") + intData.toString(16)).slice(-length).toUpperCase();
    };

    var checkSum = function(address, data)
    {
        var total = 0;
        for (var i = 0; i < address.length / 2; i++) {
            total += parseInt(address.substr(2 * i, 2), 16);
        }
        for (var j = 0; j < data.length / 2; j++) {
            total += parseInt(data.substr(2 * j, 2), 16);
        }
        return paddedHex((128 - total % 128) & 0x7F, 2);
    };

    var send = function(commandId, address, data)
    {
        var message = "F0411000000028" + commandId + address + data + checkSum(address, data) + "F7";
        console.log((__.isConnected() ? '' : '[!!NOT CONNECTED!!]') + "send message [" + message + "]");
        midi.send(message);
    };

    var parseMessage = function(message) {
        var command = commands.unknown;

        if (message.length <= 6) {
            // MIDI GMメッセージ
            switch (message.substr(0, 1)) {
                case '8':
                    return {
                        command: commands.NoteOff,
                        address: addresses.noteOff,
                        data: message
                    };
                case '9':
                    return {
                        command: commands.NoteOn,
                        address: addresses.noteOn,
                        data: message
                    };
                case 'A':
                    return {
                        command: commands.AfterTouch,
                        address: addresses.afterTouch,
                        data: message
                    };
                case 'B':
                    return {
                        command: commands.ControlChange,
                        address: addresses.controlChange,
                        data: message
                    };
                case 'C':
                    return {
                        command: commands.ProgramChange,
                        address: addresses.programChange,
                        data: message
                    };
                case 'D':
                    return {
                        command: commands.ChannelAfterTouch,
                        address: addresses.channelAfterTouch,
                        data: message
                    };
                case 'E':
                    return {
                        command: commands.PitchBend,
                        address: addresses.pitchBend,
                        data: message
                    };
                default:
                    break;
            }
        } else {
            if (message.substr(0, 12) == 'F07E10060241') {
                // 機種情報の取得
                return {
                    command: commands.ModelId,
                    address: commands.ModelId,
                    data: message.substr(12, 16)
                };
            } else {
                // MIDI システムエクスクルーシブメッセージ
                var commandId = message.substr(14, 2);
                switch (commandId) {
                    case "11":
                        command = commands.RQ1;
                        break;
                    case "12":
                        command = commands.DT1;
                        break;
                }
                var address = message.substr(16, 8);
                var data = message.substr(24, message.length - 28);
                return {
                    command: command,
                    address: address,
                    data: data
                };
            }
        }
    };

    // MIDI通信のデータ部をパースします
    var parseData = function(command, address, data)
    {
        switch (command) {
            case commands.NoteOff:
            case commands.NoteOn:
            case commands.AfterTouch:
            case commands.ControlChange:
            case commands.ProgramChange:
            case commands.ChannelAfterTouch:
            case commands.PitchBend:
                return {
                    channel: parseInt(data.substr(1, 1), 16),
                    number: parseInt(data.substr(2, 2), 16),
                    velocity: data.length > 4 ? parseInt(data.substr(4, 2), 16) : undefined
                };
            case commands.ModelId:
                return {
                    value: data
                };
        }

        switch (address) {
            case addresses.serverSetupFileName:
                var fileName = '';
                for (var i = 0; i < data.length; i += 2) {
                     fileName += String.fromCharCode(parseInt(data.substr(i, 2), 16));
                }
                return {fileName: fileName.trim()};
            case addresses.toneForSingle:
            case addresses.toneForSplit:
            case addresses.toneForDual:
            case addresses.songNumber:
                return {
                    categoryNo: parseInt(data.substr(0, 2), 16),
                    number: parseInt(data.substr(2, 2), 16) * 128 + parseInt(data.substr(4, 2), 16)
                };
            case addresses.uptime:
                var uptime = ((parseInt(data.substr(0, 2), 16) & 0x0F) << 28) |
                    ((parseInt(data.substr(2, 2), 16) & 0x0F) << 24) |
                    ((parseInt(data.substr(4, 2), 16) & 0x0F) << 20) |
                    ((parseInt(data.substr(6, 2), 16) & 0x0F) << 16) |
                    ((parseInt(data.substr(8, 2), 16) & 0x0F) << 12) |
                    ((parseInt(data.substr(10, 2), 16) & 0x0F) << 8) |
                    ((parseInt(data.substr(12, 2), 16) & 0x0F) << 4) |
                    ((parseInt(data.substr(14, 2), 16) & 0x0F) << 0);
                PP2_CORE.setUptime(uptime);
                return {
                    value: uptime
                };
            default:
                if (undefined === data) {
                    console.log('data undefined. Address: ' + address);
                    return {};
                }
                switch (getAddressSize(address)) {
                    case 1:
                        return {value: parseInt(data.substr(0, 2), 16)};
                    case 2:
                        return {value: parseInt(data.substr(0, 2), 16) * 128 + parseInt(data.substr(2, 2), 16)};
                    default:
                        return {};
                }
        }
    };

    var setToneOrSong = function(address, categoryNo, number) {
        var numberHigh = Math.floor(number / 128);
        var numberLow = number % 128;
        dt1(address, paddedHex(categoryNo, 2) + paddedHex(numberHigh, 2) + paddedHex(numberLow, 2));
    };

    // MIDIコールバック群
    var midiCallbacks = {
        /* 以降は各アドレス毎のコールバック。サンプル
         PP2_MIDI.addresses.keyBoardMode: {
         key: function(params) {
         something to do...
         }
         }
         */
    };

    var callMIDICallbacksIfExists = function(command, address, data, timestamp)
    {
        var params;
        if ('object' == typeof(address)) {
            params = address;
            address = undefined;
        }
        if (undefined == address) {
            address = command;
        }

        var callbacks = midiCallbacks[address];
        if (undefined != callbacks) {
            if (undefined == params) {
                params = undefined != data ? parseData(command, address, data) : {};
            }
            if (undefined !== timestamp) {
                params.timestamp = 'string' === typeof(timestamp) ? parseInt(timestamp, 10) : timestamp;
            }
            console.log({command: command, address: address, data: data, params: params});

            _.forEach(callbacks, function(callback) {
                callback(params);
            });
        }
    };

    var generateCallbackKey = function(address) {
        return address + '_' + new Date().getTime() + '_' + Math.floor(Math.random() * 9999999);
    };

    var getAddressInCallbackKey = function(key) {
        if (undefined == key) {
            return undefined;
        }
        return key.split('_')[0];
    };

    // 特殊リクエスト（AddressMapVersion）
    var requestAddressMapVersionIfNeeded = function(callback) {
        if (addressMapVersion >= 0) {
            callback();
            return;
        }

        __.removeCallback(previousRequestAddressMapVersionCallbackKey);
        rq1(addresses.addressMapVersion);
        clearTimeout(previousRequestAddressMapVersionTimer);
        previousRequestAddressMapVersionTimer = setTimeout(function() {
            console.log('AddressMapVersion is not exist. Return default value "00".');
            callMIDICallbacksIfExists(commands.DT1, addresses.addressMapVersion, "00");
        }, 500);
        previousRequestAddressMapVersionCallbackKey = __.addCallback(addresses.addressMapVersion, function(params) {
            clearTimeout(previousRequestAddressMapVersionTimer);
            addressMapVersion = params.value;
            callback();
        });
    };

    var writeToDeviceMemoryCacheIfNeeded = function(address, data) {
        if (!__.isConnected() || undefined === data) {
            return;
        }
        var addressPrefix = address.substr(0, 6);
        var startAddrSuffixInt = parseInt(address.substr(-2), 16);
        if (undefined === deviceMemoryCaches[addressPrefix]) {
            deviceMemoryCaches[addressPrefix] = Array(256 + 1).join('00');
        }
        var cache = deviceMemoryCaches[addressPrefix];
        deviceMemoryCaches[addressPrefix] = cache.substr(0, startAddrSuffixInt * 2) + data + cache.slice(-(cache.length - startAddrSuffixInt * 2 - data.length));
        //console.log(addressPrefix + ":" + deviceMemoryCaches[addressPrefix]);
    };

    var __ = {
        commands: commands,
        addresses: addresses,
        isAutoConnectable: false,
        getEndpoints: function(needToGetInputs, callback) {
            midi.output.endpoints(function(outputs) {
                midi.input.endpoints(function(inputs) {
                    // 特に指定が無ければoutputのエンドポイントを返す
                    var targets = !needToGetInputs ? outputs : inputs;
                    var otherDeviceNames = _.pluck(needToGetInputs ? outputs : inputs, 'MIDIDeviceNameKey');
                    // outならin、inならoutにも同名のデバイスが存在するもののみ抽出する
                    callback(_.filter(targets, function(v) {return _.contains(otherDeviceNames, v.MIDIDeviceNameKey)}));
                });
            });
        },
        connect: function(endpoint, isAutoConnect) {
            addConnectionLog('Connect start.');
            if (__.isConnected() && connectedMIDIDevice.MIDIEndpointUIDKey == endpoint.MIDIEndpointUIDKey) {
                // 接続中のデバイスへの再接続はスルー
                addConnectionLog('Connect cancelled because already connected device.');
                return;
            }

            connectedMIDIDevice = undefined;
            addressMapVersion = -1;
            midi.output.disconnect();
            midi.input.disconnect();
            PP2_LANGUAGE.reset();
            PP2_CONTENTS.clear();
            callMIDICallbacksIfExists(addresses.eventsMidiStartConnect, endpoint);
            addConnectionLog('MIDI connecting...');
            setTimeout(function() {
                __.getEndpoints(false, function(outputEndpoints) {
                    var connectTargetForOutput = _.findWhere(outputEndpoints, {MIDIEndpointUIDKey: endpoint.MIDIEndpointUIDKey});
                    __.getEndpoints(true, function(inputEndpoints) {
                        var connectTargetForInput = inputEndpoints[_.indexOf(outputEndpoints, connectTargetForOutput)];
                        if (undefined == connectTargetForOutput || undefined == connectTargetForInput) {
                            addConnectionLog('MIDI connect failed. Target device lost.');
                            callMIDICallbacksIfExists(addresses.eventsMidiConnectFailed);
                            return;
                        }
                        connectedMIDIDevice = connectTargetForOutput;
                        midi.output.connect(connectTargetForOutput);
                        midi.input.connect(connectTargetForInput);
                        PP2_CORE.setMIDIDeviceName(connectedMIDIDevice.MIDIDeviceNameKey);
                        __.request(addresses.uptime);
                        PP2_CONTENTS.requestContentsFinishedCallback = function (error) {
                            if (error) {
                                callMIDICallbacksIfExists(addresses.eventsMidiConnectFailed, {error: error});
                            } else {
                                callMIDICallbacksIfExists(addresses.eventsMidiConnected, connectTargetForOutput);
                                // シーケンサーのステータスを取得しておく
                                __.request(addresses.sequencerStatus);
                                __.request(addresses.metronomeStatus);
                                addConnectionLog('Connect finished.');
                            }
                        };
                        addConnectionLog('MIDI connected.');
                        requestAddressMapVersionIfNeeded(function() {
                            PP2_CONTENTS.requestContents();
                        });
                    });
                });
            }, isAutoConnect && PP2_CORE.isAndroid() ? 8000 : 500);
        },
        autoConnectIfPossible: function() {
            if (!__.isAutoConnectable) {
                return;
            }
            __.getEndpoints(false, function(endpoints) {
                if (!__.isConnected() && endpoints.length > 0) {
                    __.connect(endpoints[0], true);
                }
            });
        },
        isConnected: function() {
            return undefined != connectedMIDIDevice;
        },
        isBlueTooth: function(endpoint) {
            if (undefined == endpoint) {
                if (!__.isConnected()) {
                    return false;
                }
                endpoint = connectedMIDIDevice;
            }
            if (PP2_CORE.isAndroid()) {
                return endpoint.MIDIEndpointUIDKey.indexOf(':BLE:') != -1;
            } else {
                // iOSの場合は言語設定によってMIDIEntityNameKeyが変動するため、チェックを行わない
                return true;
            }
        },
        getMIDIDeviceName: function() {
            return __.isConnected() ? connectedMIDIDevice.MIDIDeviceNameKey : '';
        },
        disconnect: function() {
            addConnectionLog('Disconnect start.');
            midi.output.disconnect();
            midi.input.disconnect();
            var previousIsConnected = __.isConnected();
            connectedMIDIDevice = undefined;
            if (previousIsConnected) {
                callMIDICallbacksIfExists(addresses.eventsMidiDisconnected);
            }
            PP2_CONTENTS.reset();
            PP2_CORE.setMIDIDeviceName('');
            PP2_CORE.setUptime(0);
            deviceMemoryCaches = {};
            addressMapVersion = -1;
            addConnectionLog('Disconnect finished.');
        },
        addConnectionLog: addConnectionLog,
        getConnectionLog: function() {
            return connectionLogs;
        },
        getAddressMapVersion: function() {
            return addressMapVersion;
        },
        // 特殊リクエスト（機種ID取得）
        requestModelId: function(callback) {
            console.log((__.isConnected() ? '' : '[!!NOT CONNECTED!!]') + "send message [request modelId]");
            __.removeCallback(previousRequestModelIdCallbackKey);
            midi.send("F07E100601F7");
            previousRequestModelIdCallbackKey = __.addCallback(commands.ModelId, callback);
        },
        // RQ1
        request: function(address, size) {
            if ('object' == typeof(address)) {
                _.forEach(address, function(v) {
                    rq1(v, size);
                });
            } else {
                rq1(address, size);
            }
        },
        requestSequencerStatuses: function() {
            this.request([addresses.sequencerStatus,
                addresses.sequencerMeasure,
                addresses.sequencerTempoNotation,
                addresses.sequencerTempoRO,
                addresses.sequencerBeatNumerator,
                addresses.sequencerBeatDenominator]);
        },
        requestKeyboardMode: function() {
            this.request([addresses.keyBoardMode,
                addresses.splitPoint,
                addresses.splitOctaveShift,
                addresses.splitBalance,
                addresses.dualOctaveShift,
                addresses.dualBalance,
                addresses.twinPianoMode]);
        },
        // DT1(write)
        dt1: function(address, data, byteLength) {
            if ('string' === typeof(data) && /^[0-9A-F]+$/i.test(data)) {
                // HEX文字列の場合はbyteLengthの設定は無視してそのまま送る
                dt1(address, data);
            } else if (isFinite(data)) {
                // 数値の場合はHEX化して送る
                if (undefined == byteLength) {
                    byteLength = getAddressSize(address);
                }
                switch (byteLength) {
                    case 2:
                        dt1(address, paddedHex(Math.floor(data / 128), 2) + paddedHex(data % 128, 2));
                        break;
                    default:
                        dt1(address, paddedHex(data, byteLength * 2));
                        break;
                }
            } else if ('array' === typeof(data)) {
                // 数値の配列の場合はHEX化＆つなげて送る
                var combinedData = '';
                _.forEach(data, function(v, k) {
                    if (!isFinite(v)) {
                        console.error('Invalid dt1[' + address + ']. Data and byteLength is below.');
                        console.error(data);
                        console.error(byteLength);
                        return;
                    }
                    combinedData += paddedHex(data, ('array' === typeof(byteLength) ? byteLength[k] : byteLength) * 2);
                });
                dt1(address, combinedData);
            } else {
                console.error('Invalid dt1[' + address + ']. Data and byteLength is below.');
                console.error(data);
                console.error(byteLength);
            }
        },
        setToneForSingle: function(categoryNo, number) {
            setToneOrSong(addresses.toneForSingle, categoryNo, number);
        },
        setToneForSplit: function(categoryNo, number) {
            setToneOrSong(addresses.toneForSplit, categoryNo, number);
        },
        setToneForDual: function(categoryNo, number) {
            setToneOrSong(addresses.toneForDual, categoryNo, number);
        },
        setSong: function(categoryNo, number) {
            setToneOrSong(addresses.songNumber, categoryNo, number);
        },
        setMasterVolume: function(value) {
            dt1(addresses.masterVolume, paddedHex(value, 2));
        },
        setAllSongPlayMode: function(value) {
            dt1(addresses.allSongPlayMode, paddedHex(value, 2));
        },
        // DT1(command)
        sendApplicationMode: function(mode, status) {
            dt1(addresses.applicationMode, paddedHex(mode, 2) + paddedHex(status, 2));
        },
        sendSoundEffectPlay: function(type, velocity) {
            dt1(addresses.soundEffect, paddedHex(type, 2) + paddedHex(velocity, 2));
        },
        sendSoundEffectStop: function(type) {
            dt1(addresses.soundEffect, paddedHex(type, 2) + paddedHex(0, 2));
        },
        sendSoundEffectStopAll: function() {
            dt1(addresses.soundEffectStopAll, paddedHex(1, 2));
        },
        sendSorePageTurn: function(onOrOff) {
            dt1(addresses.scorePageTurn, paddedHex(onOrOff ? 1 : 0, 2));
        },
        setArrangerPedalMode: function(mode) {
            switch (mode) {
                case 1:
                    dt1(addresses.arrangerPedalFunction, paddedHex(1, 2) + paddedHex(0, 2));
                    break;
                case 2:
                    dt1(addresses.arrangerPedalFunction, paddedHex(0, 2) + paddedHex(1, 2));
                    break;
                default:
                    dt1(addresses.arrangerPedalFunction, paddedHex(0, 2) + paddedHex(0, 2));
                    break;
            }
        },
        setArrangerBalance: function(value) {
            dt1(addresses.arrangerBalance, paddedHex(value, 2));
        },
        sendConnection: function(value) {
            dt1(addresses.connection, paddedHex(value, 2));
        },
        sendPreviousSong: function(){
            dt1(addresses.sequencerPreviousSong, "00");
        },
        sendNextSong: function(){
            dt1(addresses.sequencerNextSong, "00");
        },
        setupSequencerButton: function(element, address, callback)
        {
            var touching = false;
            var keepAction = function() {
                if (!touching) {
                    return;
                }
                dt1(address, "01");
                if (undefined != callback) {
                    callback(false);
                }
                // リピートは100ms毎
                setTimeout(keepAction, 100);
            };
            element.on('touchstart', function() {
                dt1(address, "00");
                if (undefined != callback) {
                    callback(false);
                }
                touching = true;
                // 700ms後にリピート開始
                setTimeout(keepAction, 700);
            });
            element.on('touchend', function() {
                touching = false;
                if (undefined != callback) {
                    callback(true);
                }
            });
            element.on('touchcancel', function() {
                touching = false;
                if (undefined != callback) {
                    callback(true);
                }
            });
        },
        addCallback: function (address, callback) {
            var key = generateCallbackKey(address);
            if (undefined === midiCallbacks[address]) {
                midiCallbacks[address] = {};
            }
            midiCallbacks[address][key] = callback;
            return key;
        },
        getCallback: function(key) {
            var address = getAddressInCallbackKey(key);
            var callbacks = midiCallbacks[address];
            if (undefined != callbacks) {
                return callbacks[key];
            }
            return undefined;
        },
        removeCallbacks: function(keys) {
            _.forEach(keys, function(key) {
                __.removeCallback(key);
            });
        },
        removeCallback: function(key) {
            if (undefined == key) {
                return;
            }
            var address = getAddressInCallbackKey(key);
            var callbacks = midiCallbacks[address];
            if (undefined != callbacks) {
                delete(callbacks[key]);
            }
        },
        stopSequencerIfNeeded: function() {
            if (__.getCachedValue(addresses.sequencerStatus)) {
                console.log('Send sequencer status toggle command.');
                dt1(addresses.sequencerPlayStopToggle, '00');
                // 最新値がDT1で来ない場合があるので、強制的にキャッシュを書き換えておく
                writeToDeviceMemoryCacheIfNeeded(addresses.sequencerStatus, '00');
            }
		},
        stopMetronomeIfNeeded: function() {
            if (__.getCachedValue(addresses.metronomeStatus)) {
                console.log('Send metronome status toggle command.');
                dt1(addresses.metronomeSwToggle, '00');
                // 最新値がDT1で来ない場合があるので、強制的にキャッシュを書き換えておく
                writeToDeviceMemoryCacheIfNeeded(addresses.metronomeStatus, '00');
            }
		},
        stopSequencerAndMetronomeIfNeeded: function() {
            console.log('PP2_MIDI.stopSequencerAndMetronomeIfNeeded() called.');
            __.stopSequencerIfNeeded();
            __.stopMetronomeIfNeeded();
        },
        reset: function() {
            midiCallbacks = {};
        },
        receiveMessage: function(command, address, data, timestamp) {
            if (command === commands.NoteOff || command === commands.NoteOn || command === commands.AfterTouch ||
                command === commands.ControlChange || command === commands.ProgramChange || command === commands.ChannelAfterTouch ||
                command === commands.PitchBend || command === commands.ModelId) {
                callMIDICallbacksIfExists(command, address, data, timestamp);
            } else if (command == commands.DT1) {
                var addressPrefix = address.substr(0, 6);
                var startAddrSuffixInt = parseInt(address.substr(-2), 16);
                writeToDeviceMemoryCacheIfNeeded(address, data);
                if (addressPrefix == '010005') {
                    PP2_DIGISCORE.notifyButton(startAddrSuffixInt, data == '01');
                }
                var i = 0;
                while (i < data.length / 2) {
                    var address = addressPrefix + paddedHex(i + startAddrSuffixInt, 2);
                    var size = getAddressSize(address);
                    var cutData = data.substr(i * 2, size * 2);
                    if (address === p2addr.sequencerStatus && cutData === '01' && PP2_PLAYER.isLoaded()) {
                        // ピアノ実機での再生が始まった場合はPP2_PLAYERをpauseして実機曲情報を再取得する
                        PP2_PLAYER.pause();
                        __.forceReceiveMessageFromCache(p2addr.songNumber, 3);
                    }
                    callMIDICallbacksIfExists(commands.DT1, address, cutData, timestamp);
                    i += size;
                }
            }
        },
        getCachedMessage: function(address, size) {
            if (undefined === size) {
                size = getAddressSize(address);
            }

            var addressPrefix = address.substr(0, 6);
            var startAddrSuffixInt = parseInt(address.substr(-2), 16);
            var cache = deviceMemoryCaches[addressPrefix];
            if (undefined === cache) {
                return undefined;
            }

            return cache.substr(startAddrSuffixInt * 2, size * 2);
        },
        getCachedValue: function(address) {
            var data = __.getCachedMessage(address);
            return parseData(commands.DT1, address, data).value;
        },
        forceReceiveMessageFromCache: function(address, size) {
            var message = __.getCachedMessage(address, size);
            if (undefined !== message) {
                __.receiveMessage(commands.DT1, address, message);
            }
        },
        paddedHex: paddedHex,
        parseData: parseData,
        send: send,
        getAddressSize: getAddressSize
    };

    $(function() {
        // MIDIコールバック設定
        var midi = $native.midi;
        midi.event = {
            message: function (msg, timestamp) {
                console.log('MIDI message received. ' + msg + ' at ' + timestamp);
                var parsedMessage = parseMessage(msg);
                __.receiveMessage(parsedMessage.command, parsedMessage.address, parsedMessage.data, timestamp);
            },
            changed: function () {
                __.getEndpoints(false, function(endpoints) {
                    addConnectionLog('$native.midi.event.changed called by quattro.');
                    if (__.isConnected() && !_.findWhere(endpoints, {MIDIEndpointUIDKey: connectedMIDIDevice.MIDIEndpointUIDKey})) {
                        console.log('Disconnected. ' + connectedMIDIDevice.MIDIDeviceNameKey);
                        __.disconnect();
                    }
                    __.autoConnectIfPossible();
                    callMIDICallbacksIfExists(addresses.eventsMidiChanged);
                });
            },
            connectfailed: function (ep) {
                addConnectionLog('$native.midi.event.connectfailed called by quattro.');
                ep = JSON.parse(ep);
                console.log('connect failed: ' + ep.MIDIDeviceNameKey);
                if (__.isConnected()) {
                    __.disconnect();
                } else {
                    callMIDICallbacksIfExists(addresses.eventsMidiConnectFailed);
                }
            },
            error: function (code) {
                addConnectionLog('$native.midi.event.error called by quattro.');
                alert('error (' + code + ')');
            }
        };
    });

    return __;
})();

// addressショートカット
var p2addr = PP2_MIDI.addresses;
