/**
 * Created by kako on 2016/03/17.
 */

var PP2_DB = (function() {
    /**
     * [{
     *     onUserChanged: function() {...}
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

    var __ = {
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
        currentUser: undefined,
        changeUser: function(targetUser, onFinished) {
            var onFinishedIfExists = function (isChanged) {
                if ('function' === typeof(onFinished)) {
                    onFinished(isChanged);
                }
            };
            if (undefined === __.currentUser || undefined === targetUser || __.currentUser.objectId !== targetUser.objectId) {
                targetUser['lastLoginedAt'] = new Date();
                __.createOrUpdateUser(targetUser, function(res) {
                    __.currentUser = res.item;
                    PP2_RECORDER.init();
                    PP2_SAVEDATA.data.lastUserId = __.currentUser.objectId;
                    callEvent('onUserChanged');
                    onFinishedIfExists(true);
                });
            } else {
                __.currentUser = targetUser;
                onFinishedIfExists(false);
            }
        },
        notifyUserChanged: function() {
            callEvent('onUserChanged');
        },
        createOrUpdateUser: function(params, callback) {
            PP2_CORE.call(PP2_CORE.nativeMethods.db.createOrUpdateUser, __.paramsToTypedValuesIfNeeded(params), callback);
        },
        createOrUpdateActivity: function(params, callback) {
            PP2_CORE.call(PP2_CORE.nativeMethods.db.createOrUpdateActivity, __.paramsToTypedValuesIfNeeded(params), callback);
        },
        createOrUpdateRecordedSong: function(params, callback) {
            PP2_CORE.call(PP2_CORE.nativeMethods.db.createOrUpdateRecordedSong, __.paramsToTypedValuesIfNeeded(params), callback);
        },
        createActionLogIfNeeded: function(action, callback) {
            if (undefined === __.currentUser || __.currentUser.isGuest) {
                return;
            }
            var params = {
                cognitoUserId: __.currentUser.objectId,
                action: action
            };
            PP2_CORE.call(PP2_CORE.nativeMethods.db.createActionLog, __.paramsToTypedValuesIfNeeded(params), callback);
        },
        requestUsers: function(callback) {
            PP2_CORE.call(PP2_CORE.nativeMethods.db.requestUsers, {}, callback);
        },
        requestActivitiesOnMonth: function(year, month, callback) {
            PP2_CORE.call(PP2_CORE.nativeMethods.db.requestActivitiesOnMonth, __.paramsToTypedValuesIfNeeded({userId: __.currentUser.objectId, year: year, month: month}), callback);
        },
        requestActivityOnToday: function(startAt, callback) {
            PP2_CORE.call(PP2_CORE.nativeMethods.db.requestActivityOnToday, __.paramsToTypedValuesIfNeeded({userId: __.currentUser.objectId, startAt: startAt}), callback);
        },
        requestRecordedSongsOnRecorder: function(callback) {
            PP2_CORE.call(PP2_CORE.nativeMethods.db.requestRecordedSongsOnRecorder, undefined, callback);
        },
        requestRecordedSongsOnDay: function(year, month, date, callback) {
            PP2_CORE.call(PP2_CORE.nativeMethods.db.requestRecordedSongsOnDay, __.paramsToTypedValuesIfNeeded({userId: __.currentUser.objectId, year: year, month: month, date: date}), callback);
        },
        requestBackupData: function (callback) {
            PP2_CORE.call(PP2_CORE.nativeMethods.db.requestBackupData, undefined, callback);
        },
        backupCompleted: function (activityObjectIds, recordedSongObjectIds, userObjectIds, backupedAt, callback) {
            PP2_CORE.call(PP2_CORE.nativeMethods.db.backupCompleted, {
                activityObjectIds: activityObjectIds.join(','),
                recordedSongObjectIds: recordedSongObjectIds.join(','),
                userObjectIds: userObjectIds.join(','),
                timestamp: backupedAt.getTime()
            }, callback);
        },
        sendToNCMB: function (callback) {
            PP2_CORE.call(PP2_CORE.nativeMethods.db.sendToNCMB, undefined, callback);
        },
        deleteOldData: function (callback) {
            PP2_CORE.call(PP2_CORE.nativeMethods.db.deleteOldData, {}, callback);
        },
        paramsToTypedValuesIfNeeded: function(params) {
            if (PP2_CORE.isAndroid()) {
                var typedValues = {};
                var boolFields = ['removed', 'uploaded', 'isAutoRecorded', 'isGuest', 'saveDataToServer'];

                _.forEach(params, function (v, k) {
                    // APIからはboolフィールドが数値で返ってくるが、AndroidのRealmでは数値をboolに変換できないのでここでキャスト
                    if (_.contains(boolFields, k)) {
                        typedValues[k] = !!v;
                        return;
                    }

                    // 日付フォーマット調整
                    switch (typeof(v)) {
                        case 'number':
                        case 'boolean':
                            typedValues[k] = v;
                            break;
                        case 'string':
                            if (new RegExp(/^[A-Z]{1}[a-z]{2} [0-9]{1,2}, [0-9]{4} [0-9]{1,2}:[0-9]{2}:[0-9]{2} AM|PM$/).test(v)) {
                                var date = fecha.parse(v, 'MMM D, YYYY h:mm:ss A');
                                typedValues[k] = date.getTime();
                            } else if (new RegExp(/^[A-Z]{1}[a-z]{2} [0-9]{1,2}, [0-9]{4} [0-9]{1,2}:[0-9]{2}:[0-9]{2}$/).test(v)) {
                                var date = fecha.parse(v, 'MMM D, YYYY h:mm:ss');
                                typedValues[k] = date.getTime();
                            } else {
                                typedValues[k] = v;
                            }
                            break;
                        case 'object':
                            if (v instanceof Date) {
                                typedValues[k] = v.getTime();
                            }
                            break;
                    }
                });
                return typedValues;
            } else {
                var typedValues = {};
                _.forEach(params, function (v, k) {
                    switch (typeof(v)) {
                        case 'number':
                            typedValues[k] = JSON.stringify({type: 'int', value: v});
                            break;
                        case 'boolean':
                            typedValues[k] = JSON.stringify({type: 'bool', value: v});
                            break;
                        case 'string':
                            typedValues[k] = JSON.stringify({type: 'string', value: v});
                            break;
                        case 'object':
                            if (v instanceof Date) {
                                typedValues[k] = JSON.stringify({type: 'date', value: v});
                            }
                            break;
                    }
                });
                return typedValues;
            }
        }
    };
    return __;
})();