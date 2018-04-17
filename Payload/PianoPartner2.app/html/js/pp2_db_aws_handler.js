/**
 * Created by kako on 2017/09/07.
 */

var PP2_DB_AWS_HANDLER = (function() {
    var generateKey = function(apiName, params) {
        return _.sprintf('%s.%s.%s', PP2_DB.currentUser.objectId, apiName, JSON.stringify(params));
    };

    var stampAPICall = function (apiName, params) {
        var key = generateKey(apiName, params);
        PP2_SAVEDATA.data.lastAWSAPICalledTimestamps[key] = new Date().getTime();
    };

    var needToAPICall = function(apiName, params) {
        var key = generateKey(apiName, params);
        if (undefined === PP2_SAVEDATA.data.lastAWSAPICalledTimestamps[key]) {
            return true;
        }
        var timeDiff = new Date().getTime() - PP2_SAVEDATA.data.lastAWSAPICalledTimestamps[key];
        return timeDiff >= (24 * 60 * 60 * 1000);
    };

    // Androidは日付フォーマットがまちまちなので、サーバに送信する前に変換する
    var formatDateFields = function (items) {
        var res = [];
        _.each(items, function (item) {
            var newItem = {};
            _.each(item, function (v, k) {
                switch (typeof(v)) {
                    case 'string':
                        if (new RegExp(/^[A-Z]{1}[a-z]{2} [0-9]{1,2}, [0-9]{4} [0-9]{1,2}:[0-9]{2}:[0-9]{2} AM|PM$/).test(v)) {
                            var date = fecha.parse(v, 'MMM D, YYYY h:mm:ss A');
                            newItem[k] = date.getTime();
                        } else if (new RegExp(/^[A-Z]{1}[a-z]{2} [0-9]{1,2}, [0-9]{4} [0-9]{1,2}:[0-9]{2}:[0-9]{2}$/).test(v)) {
                            var date = fecha.parse(v, 'MMM D, YYYY h:mm:ss');
                            newItem[k] = date.getTime();
                        } else {
                            newItem[k] = v;
                        }
                        return;
                    case 'object':
                        if (v instanceof Date) {
                            newItem[k] = v.getTime();
                        }
                        return;
                }
                newItem[k] = v;
            });
            res.push(newItem);
        });
        return res;
    };

    var __ = {
        autoChangeUserAndLoginIfNeeded: function(callback) {
            if (undefined !== __.currentUser) {
                callback();
                return;
            }
            PP2_DB.requestUsers(function(res) {
                if (res.items.length === 0) {
                    PP2_DB.createOrUpdateUser({
                        isGuest: true,
                        email: '',
                        password: '',
                        handleName: 'Guest',
                        saveDataToServer: false,
                        calendarType: 0,
                        developmentMode: 0,
                        information: JSON.stringify({}),
                        icon: PP2_FRONT.spacerSrc
                    }, function(res) {
                        __.changeUserAndLogin(res.item);
                        callback();
                    });
                } else {
                    var lastUser = _.where(res.items, {objectId: PP2_SAVEDATA.data.lastUserId});
                    __.changeUserAndLogin(lastUser.length > 0 ? lastUser[0] : res.items[0], function () {
                        callback();
                    });
                }
            });
        },
        changeUserAndLogin: function(targetUser, onFinished) {
            var onFinishedIfExists = function () {
                PP2_FRONT.hideLoading();
                if ('function' === typeof(onFinished)) {
                    onFinished();
                }
            };

            if (undefined !== PP2_DB.currentUser && PP2_DB.currentUser.objectId === targetUser.objectId) {
                onFinishedIfExists();
                return;
            }

            PP2_AWS.logout();

            if (targetUser.isGuest) {
                PP2_DB.changeUser(targetUser, function () {
                    onFinishedIfExists();
                });
                return;
            }

            // データ同期のため、Cognitoログインする
            PP2_FRONT.showLoading(true);
            __.loginAndSync(targetUser.objectId, PP2_CRYPT.decrypt(targetUser.password), true, function (user) {
                PP2_DB.changeUser(user, function () {
                    if (!PP2_AWS.isLoginedUserEmailVerified()) {
                        PP2_FRONT.hideLoading();
                        PP2_AWS.resendEmailVerificationCode(function () {
                            PP2_FRONT.showForceVerifyEmailDialog(onFinishedIfExists);
                        }, function (err) {
                            PP2_FRONT.alert(err, function () {
                                PP2_FRONT.showForceVerifyEmailDialog(onFinishedIfExists);
                            });
                        });
                    } else {
                        onFinishedIfExists();
                    }
                });
            }, function (err) {
                PP2_DB.changeUser(targetUser, function () {
                    if (err.name === 'PasswordResetRequiredException' || err.name === 'NotAuthorizedException') {
                        var showNeedPasswordReset = function () {
                            PP2_FRONT.alert(_.sprintf(PP2_LANGUAGE.getValues().cognito_error_need_password_reset, targetUser.email), function () {
                                PP2_AWS.forgotPassword(targetUser.email, function () {
                                    PP2_FRONT.hideLoading();
                                    PP2_FRONT.showModal('user_reset_password', 500, function () {
                                        PP2_FRONT.scriptPool.userResetPasswordIF.setEmail(targetUser.email);
                                        PP2_FRONT.scriptPool.userResetPasswordIF.setOnCancelled(showNeedPasswordReset);
                                        PP2_FRONT.scriptPool.userResetPasswordIF.setOnFinished(function () {});
                                    });
                                }, function (err) {
                                    PP2_FRONT.hideLoading();
                                    PP2_FRONT.alert(err, function(modal) {
                                        modal.bind('hidden.bs.modal', showNeedPasswordReset);
                                    });
                                });
                            });
                        }
                        showNeedPasswordReset();
                    } else {
                        PP2_FRONT.alert(err);
                    }
                    onFinishedIfExists();
                });
            });
        },
        loginAndSync: function (email, password, ignoreBadAttribute, onSuccess, onFailure) {
            PP2_AWS.login(email, password, ignoreBadAttribute, function (userId) {
                PP2_AWS.requestUserByObjectId(userId, function(userData) {
                    PP2_DB.createOrUpdateUser(userData, function(res) {
                        if (undefined !== res.error) {
                            onFailure(res.error);
                        } else {
                            setTimeout(function() {
                                onSuccess(userData);
                            }, 3000);
                        }
                    });
                }, onFailure);
            }, onFailure);
        },
        updateEmail: function(newEmail, onSuccess, onFailure) {
            if (newEmail.length > 0 && PP2_DB.currentUser.email !== newEmail) {
                PP2_AWS.updateEmail(newEmail, function () {
                    PP2_DB.currentUser.email = newEmail;
                    PP2_DB.createOrUpdateUser(PP2_DB.currentUser, function (res) {
                        if (undefined !== res.error) {
                            onFailure(res.error);
                        } else {
                            onSuccess(true);
                        }
                    });
                }, function (err) {
                    onFailure(err);
                });
            } else {
                onSuccess(false);
            }
        },
        updatePassword: function(oldPassword, newPassword, onSuccess, onFailure) {
            if (newPassword.length > 0 && oldPassword !== newPassword) {
                PP2_AWS.updatePassword(oldPassword, newPassword, function () {
                    PP2_DB.currentUser.password = PP2_CRYPT.encrypt(newPassword);
                    PP2_DB.createOrUpdateUser(PP2_DB.currentUser, function (res) {
                        if (undefined !== res.error) {
                            onFailure(res.error);
                        } else {
                            onSuccess(true);
                        }
                    });
                }, function (err) {
                    onFailure(err);
                });
            } else {
                onSuccess(false);
            }
        },
        backupDataIfPossible: function (callback) {
            var executeCallbackIfExists = function () {
                if ('function' === typeof(callback)) {
                    callback();
                }
            };
            if (undefined === PP2_AWS.getLoginedUser() || PP2_DB.currentUser.isGuest || !PP2_DB.currentUser.saveDataToServer) {
                executeCallbackIfExists();
                return;
            }
            PP2_DB.requestBackupData(function (res) {
                var promise = new Promise(function (resolve, reject) {
                    resolve();
                });

                var backedUpAt = new Date();
                if (res['users'].length > 0) {
                    var users = formatDateFields(res['users']);
                    promise.then(new Promise(function (resolve, reject) {
                        PP2_AWS.saveUsers(users, function (objectIds) {
                            PP2_DB.backupCompleted([], [], objectIds, backedUpAt, function () {
                                resolve();
                            });
                        }, function (err) {
                            console.log(err);
                            resolve();
                        });
                    }));
                }
                if (res['activities'].length > 0) {
                    var activities = formatDateFields(res['activities']);
                    promise.then(new Promise(function (resolve, reject) {
                        PP2_AWS.saveActivities(activities, function (objectIds) {
                            PP2_DB.backupCompleted(objectIds, [], [], backedUpAt, function () {
                                resolve();
                            });
                        }, function (err) {
                            console.log(err);
                            resolve();
                        });
                    }));
                }
                var sendOnOnce = 10;
                var recordedSongs = res['recordedSongs'];
                recordedSongs = formatDateFields(recordedSongs);
                for (var i = 0; i < recordedSongs.length; i += sendOnOnce) {
                    promise.then(new Promise(function (resolve, reject) {
                        PP2_AWS.saveRecordedSongs(recordedSongs.slice(i, sendOnOnce), function (objectIds) {
                            PP2_DB.backupCompleted([], objectIds, [], backedUpAt, function () {
                                resolve();
                            });
                        }, function (err) {
                            console.log(err);
                            resolve();
                        });
                    }));
                }

                promise.then(executeCallbackIfExists);
            });
        },
        requestActivitiesOnMonth: function (year, month, callback) {
            PP2_DB.requestActivitiesOnMonth(year, month, function (res) {
                if (!PP2_DB.currentUser.isGuest && PP2_DB.currentUser.saveDataToServer && res.items.length === 0 && needToAPICall('requestActivitiesOnMonth', [year, month])) {
                    PP2_AWS.requestActivitiesOnMonth(PP2_DB.currentUser.objectId, year, month, function (items) {
                        stampAPICall('requestActivitiesOnMonth', [year, month]);
                        var promise = new Promise(function (resolve, reject) {
                            resolve();
                        });
                        _.each(items, function (item) {
                            promise.then(new Promise(function (resolve, reject) {
                                PP2_DB.createOrUpdateActivity(item, function () {
                                    resolve();
                                });
                            }));
                        });
                        promise.then(function () {
                            callback(items);
                        });
                    }, function(err) {
                        console.log(err);
                    });
                } else {
                    callback(res.items)
                }
            });
        },
        requestRecordedSongsOnDay: function (year, month, day, callback) {
            PP2_DB.requestRecordedSongsOnDay(year, month, day, function (res) {
                if (!PP2_DB.currentUser.isGuest && PP2_DB.currentUser.saveDataToServer && res.items.length === 0 && needToAPICall('requestRecordedSongsOnDay', [year, month, day])) {
                    PP2_AWS.requestRecordedSongsOnDay(PP2_DB.currentUser.objectId, year, month, day, function (items) {
                        stampAPICall('requestRecordedSongsOnDay', [year, month, day]);
                        var promise = new Promise(function (resolve, reject) {
                            resolve();
                        });
                        _.each(items, function (item) {
                            promise.then(new Promise(function (resolve, reject) {
                                PP2_DB.createOrUpdateRecordedSong(item, function () {
                                    resolve();
                                });
                            }));
                        });
                        promise.then(function () {
                            callback(items);
                        });
                    }, function(err) {
                        console.log(err);
                    });
                } else {
                    callback(res.items)
                }
            });
        },
        requestRecordedSongsOnRecorder: function (callback) {
            PP2_DB.requestRecordedSongsOnRecorder(function (res) {
                if (!PP2_DB.currentUser.isGuest && PP2_DB.currentUser.saveDataToServer && needToAPICall('requestRecordedSongsOnRecorder', [])) {
                    PP2_AWS.requestRecordedSongsOnRecorder(PP2_DB.currentUser.objectId, function (items) {
                        stampAPICall('requestRecordedSongsOnRecorder', []);
                        var promise = new Promise(function (resolve, reject) {
                            resolve();
                        });
                        _.each(items, function (item) {
                            promise.then(new Promise(function (resolve, reject) {
                                PP2_DB.createOrUpdateRecordedSong(item, function () {
                                    resolve();
                                });
                            }));
                        });
                        promise.then(function () {
                            callback(items);
                        });
                    }, function(err) {
                        console.log(err);
                    });
                } else {
                    callback(res.items)
                }
            });
        }
    };
    return __;
})();