/**
 * Created by kako on 2017/08/29.
 */

var PP2_AWS = (function() {
    var TIMEOUT = 60000;
    var region = undefined;
    var userPoolId = undefined;
    var userPool = undefined;
    var loginedUser = undefined;
    var loginedUserAttributes = {};
    var getUser = function(email) {
        return new AWSCognito.CognitoIdentityServiceProvider.CognitoUser({
            Username: email,
            Pool: userPool
        });
    };
    var startTimeoutTimer = function(onFailure) {
        return setTimeout(function() {
            if ('function' === typeof(onFailure)) {
                onFailure('Timeout occurred.');
            }
        }, TIMEOUT);
    };
    var __ = {
        TIMEOUT: TIMEOUT,
        init: function(systemData) {
            userPoolId = systemData.awsUserPoolId;
            region = systemData.awsRegion;
            AWSCognito.config.region = systemData.awsRegion;
            AWSCognito.config.httpOptions.timeout = 2000;
            userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool({
                UserPoolId : systemData.awsUserPoolId,
                ClientId : systemData.awsClientId
            });
        },
        registration: function(defaultUserName, email, password, onSuccess, onFailure) {
            var attributeList = [
                new AWSCognito.CognitoIdentityServiceProvider.CognitoUserAttribute({
                    Name: 'email',
                    Value: email
                })
            ];
            userPool.signUp(defaultUserName, password, attributeList, null, function(err, result){
                if (err) {
                    onFailure(err);
                    return;
                }
                onSuccess();
            });
        },
        confirmRegistration: function(email, code, onSuccess, onFailure) {
            setTimeout(function () {
                getUser(email).confirmRegistration(code, true, function (err, result) {
                    if (err) {
                        onFailure(err);
                        return;
                    }
                    onSuccess();
                });
            }, 500);
        },
        resendCode: function(email, onSuccess, onFailure) {
            getUser(email).resendConfirmationCode(function(err, result) {
                if (err) {
                    onFailure(err);
                    return;
                }
                onSuccess();
            });
        },
        login: function(email, password, ignoreBadAttribute, onSuccess, onFailure) {
            setTimeout(function () {
                var authenticationDetails = new AWSCognito.CognitoIdentityServiceProvider.AuthenticationDetails({
                    Username: email,
                    Password: password,
                });
                var user = getUser(email);
                user.authenticateUser(authenticationDetails, {
                    onSuccess: function (result) {
                        __.requestAttributes(user, function (attributes) {
                            var finish = function () {
                                loginedUser = user;
                                loginedUserAttributes = attributes;
                                onSuccess(loginedUser.getUsername());
                            };
                            if (!ignoreBadAttribute) {
                                if (attributes['email_verified'] !== 'true') {
                                    onFailure('Email is not verified.');
                                } else {
                                    finish();
                                }
                            } else {
                                finish();
                            }
                        }, function (err) {
                            onFailure(err);
                        });
                    },
                    onFailure: function(err) {
                        onFailure(err);
                    }
                });
            }, 500);
        },
        logout: function () {
            if (undefined === loginedUser) {
                return;
            }
            loginedUser.signOut();
            loginedUser = undefined;
            loginedUserAttributes = {};
        },
        requestAttributes: function(loginedUser, onSuccess, onFailure) {
            loginedUser.getUserAttributes(function(err, result) {
                if (err) {
                    onFailure(err);
                    return;
                }
                var attributes = {};
                for (var i = 0; i < result.length; i++) {
                    attributes[result[i].getName()] = result[i].getValue();
                }
                onSuccess(attributes);
            });
        },
        isLoginedUserEmailVerified: function () {
            return loginedUserAttributes['email_verified'] === 'true';
        },
        forgotPassword: function(email, onSuccess, onFailure) {
            getUser(email).forgotPassword({
                onSuccess: function () {
                    onSuccess();
                },
                onFailure: function (err) {
                    onFailure(err);
                }
            });
        },
        resetPassword: function(email, code, newPassword, onSuccess, onFailure) {
            getUser(email).confirmPassword(code, newPassword, {
                onSuccess: function () {
                    onSuccess();
                },
                onFailure: function (err) {
                    onFailure(err);
                }
            });
        },
        updatePreferredUsername: function(email, onSuccess, onFailure) {
            var attributeList = [
                new AWSCognito.CognitoIdentityServiceProvider.CognitoUserAttribute({
                    Name : 'preferred_username',
                    Value : email
                })
            ];
            __.getLoginedUser().updateAttributes(attributeList, function(err, result) {
                if (err) {
                    onFailure(err);
                    return;
                }
                onSuccess();
            });
        },
        updateEmail: function(email, onSuccess, onFailure) {
            var attributeList = [
                new AWSCognito.CognitoIdentityServiceProvider.CognitoUserAttribute({
                    Name : 'email',
                    Value : email
                }),
                new AWSCognito.CognitoIdentityServiceProvider.CognitoUserAttribute({
                    Name : 'preferred_username',
                    Value : email
                })
            ];
            __.getLoginedUser().updateAttributes(attributeList, function(err, result) {
                if (err) {
                    onFailure(err);
                    return;
                }
                onSuccess();
            });
        },
        resendEmailVerificationCode: function(onSuccess, onFailure) {
            __.getLoginedUser().getAttributeVerificationCode('email', {
                onSuccess: function () {
                    onSuccess();
                },
                onFailure: function (err) {
                    onFailure(err);
                }
            });
        },
        verifyEmail: function(verificationCode, onSuccess, onFailure) {
            __.getLoginedUser().verifyAttribute('email', verificationCode, {
                onSuccess: function (result) {
                    onSuccess();
                },
                onFailure: function(err) {
                    onFailure(err);
                }});
        },
        updatePassword: function(oldPassword, newPassword, onSuccess, onFailure) {
            __.getLoginedUser().changePassword(oldPassword, newPassword, function(err) {
                if (err) {
                    onFailure(err);
                    return;
                }
                onSuccess();
            });
        },
        deleteUser: function (onSuccess, onFailure) {
            if (undefined === loginedUser) {
                onSuccess();
                return;
            }
            loginedUser.deleteUser(function(err) {
                if (err) {
                    onFailure(err);
                    return;
                }
                onSuccess();
                loginedUser = undefined;
                loginedUserAttributes = {};
            });
        },
        getLoginedUser: function() {
            return loginedUser;
        },
        getLoginedUserAttributes: function () {
            return loginedUserAttributes;
        },
        getSessionIdToken: function (onSuccess, onFailure) {
            if (undefined === __.getLoginedUser()) {
                onFailure('No Login User.');
                return;
            }
            loginedUser.getSession(function (err, session) {
                if (err) {
                    onFailure(err);
                    return;
                }
                return onSuccess(session.getIdToken().getJwtToken());
            });
        },
        saveUsers: function(items, onSuccess, onFailure) {
            var apigClient = apigClientFactory.newClient();
            __.getSessionIdToken(function (token) {
                var params = {
                    headers: {
                        Authorization: token
                    }
                };
                var timeoutTimer = startTimeoutTimer(onFailure);
                apigClient.usersPost({}, items, params)
                    .then(function(result){
                        clearTimeout(timeoutTimer);
                        var bodyJson = JSON.parse(result.data.body);
                        if (undefined !== bodyJson.err) {
                            onFailure(bodyJson.err);
                        } else {
                            onSuccess(bodyJson.data);
                        }
                    }).catch(function(result){
                        clearTimeout(timeoutTimer);
                        onFailure(__.parseResult(result.data));
                    });
            }, function (err) {
                onFailure(err);
            });
        },
        saveActivities: function(items, onSuccess, onFailure) {
            var apigClient = apigClientFactory.newClient();
            __.getSessionIdToken(function (token) {
                var params = {
                    headers: {
                        Authorization: token
                    }
                };
                var timeoutTimer = startTimeoutTimer(onFailure);
                apigClient.activitiesPost({}, items, params)
                    .then(function(result){
                        clearTimeout(timeoutTimer);
                        var bodyJson = JSON.parse(result.data.body);
                        if (undefined !== bodyJson.err) {
                            onFailure(bodyJson.err);
                        } else {
                            onSuccess(bodyJson.data);
                        }
                    }).catch(function(result){
                        clearTimeout(timeoutTimer);
                        onFailure(__.parseResult(result.data));
                    });
            }, function (err) {
                onFailure(err);
            });
        },
        saveRecordedSongs: function(items, onSuccess, onFailure) {
            var promises = [];
            _.each(items, function (item) {
                promises.push(new Promise(function (resolve, reject) {
                    $native.fs.readData(_.sprintf('%s%s.mid', PP2_CORE.systemData.storageDir, item.objectId), function (data) {
                        item.midi = data;
                        resolve();
                    });
                }));
            });
            Promise.all(promises).then(function () {
                var apigClient = apigClientFactory.newClient();
                __.getSessionIdToken(function (token) {
                    var params = {
                        headers: {
                            Authorization: token
                        }
                    };
                    var timeoutTimer = startTimeoutTimer(onFailure);
                    apigClient.recordedSongsPost({}, items, params)
                        .then(function(result){
                            clearTimeout(timeoutTimer);
                            var bodyJson = JSON.parse(result.data.body);
                            if (undefined !== bodyJson.err) {
                                onFailure(bodyJson.err);
                            } else {
                                onSuccess(bodyJson.data);
                            }
                        }).catch(function(result){
                        clearTimeout(timeoutTimer);
                        onFailure(__.parseResult(result.data));
                    });
                }, function (err) {
                    onFailure(err);
                });
            });
        },
        requestUserByObjectId: function(objectId, onSuccess, onFailure) {
            var apigClient = apigClientFactory.newClient();
            __.getSessionIdToken(function (token) {
                var params = {
                    queryParams: {
                        objectId: objectId
                    },
                    headers: {
                        Authorization: token
                    }
                };
                var timeoutTimer = startTimeoutTimer(onFailure);
                apigClient.usersGet({}, {}, params)
                    .then(function(result){
                        clearTimeout(timeoutTimer);
                        var bodyJson = JSON.parse(result.data.body);
                        if (undefined !== bodyJson.err) {
                            onFailure(bodyJson.err);
                        } else {
                            onSuccess(bodyJson.data);
                        }
                    }).catch(function(result){
                        clearTimeout(timeoutTimer);
                        onFailure(__.parseResult(result.data));
                    });
            }, function (err) {
                onFailure(err);
            });
        },
        requestActivitiesOnMonth: function(userId, year, month, onSuccess, onFailure) {
            var apigClient = apigClientFactory.newClient();
            __.getSessionIdToken(function (token) {
                var params = {
                    queryParams: {
                        userId: userId,
                        targetYear: year,
                        targetMonth: month
                    },
                    headers: {
                        Authorization: token
                    }
                };
                var timeoutTimer = startTimeoutTimer(onFailure);
                apigClient.activitiesGet({}, {}, params)
                    .then(function(result){
                        clearTimeout(timeoutTimer);
                        var bodyJson = JSON.parse(result.data.body);
                        if (undefined !== bodyJson.err) {
                            onFailure(bodyJson.err);
                        } else {
                            onSuccess(bodyJson.data);
                        }
                    }).catch(function(result){
                        clearTimeout(timeoutTimer);
                        onFailure(__.parseResult(result.data));
                    });
            }, function (err) {
                onFailure(err);
            });
        },
        requestRecordedSongsOnRecorder: function (userId, onSuccess, onFailure) {
            var apigClient = apigClientFactory.newClient();
            __.getSessionIdToken(function (token) {
                var params = {
                    queryParams: {
                        userId: userId,
                        mode: 2
                    },
                    headers: {
                        Authorization: token
                    }
                };
                var timeoutTimer = startTimeoutTimer(onFailure);
                apigClient.recordedSongsGet({}, {}, params)
                    .then(function(result){
                        clearTimeout(timeoutTimer);
                        var bodyJson = JSON.parse(result.data.body);
                        if (undefined !== bodyJson.err) {
                            onFailure(bodyJson.err);
                        } else {
                            onSuccess(bodyJson.data);
                        }
                    }).catch(function(result){
                        clearTimeout(timeoutTimer);
                        onFailure(__.parseResult(result.data));
                    });
            }, function (err) {
                onFailure(err);
            });
        },
        requestRecordedSongsOnDay: function(userId, year, month, day, onSuccess, onFailure) {
            var apigClient = apigClientFactory.newClient();
            __.getSessionIdToken(function (token) {
                var params = {
                    queryParams: {
                        userId: userId,
                        targetYear: year,
                        targetMonth: month,
                        targetDay: day,
                        mode: 1
                    },
                    headers: {
                        Authorization: token
                    }
                };
                var timeoutTimer = startTimeoutTimer(onFailure);
                apigClient.recordedSongsGet({}, {}, params)
                    .then(function(result){
                        clearTimeout(timeoutTimer);
                        var bodyJson = JSON.parse(result.data.body);
                        if (undefined !== bodyJson.err) {
                            onFailure(bodyJson.err);
                        } else {
                            onSuccess(bodyJson.data);
                        }
                    }).catch(function(result){
                        clearTimeout(timeoutTimer);
                        onFailure(__.parseResult(result.data));
                    });
            }, function (err) {
                onFailure(err);
            });
        },
        requestMIDI: function (objectId, onSuccess, onFailure) {
            __.getSessionIdToken(function (token) {
                var params = {
                    queryParams: {
                        objectId: objectId
                    },
                    headers: {
                        Authorization: token
                    }
                };
                var apigClient = apigClientFactory.newClient();
                var timeoutTimer = startTimeoutTimer(onFailure);
                apigClient.midiGet({}, {}, params)
                    .then(function(result){
                        clearTimeout(timeoutTimer);
                        var bodyJson = JSON.parse(result.data.body);
                        if (undefined !== bodyJson.err) {
                            onFailure(bodyJson.err);
                        } else {
                            onSuccess(bodyJson.data);
                        }
                    }).catch(function(result){
                        clearTimeout(timeoutTimer);
                        onFailure(__.parseResult(result.data));
                    });
            }, function (err) {
                onFailure(err);
            });
        },
        parseResult: function (result) {
            var resultJson = JSON.parse(result.body);
            if (resultJson.hasOwnProperty('data')) {
                console.log(resultJson.data);
                return resultJson.data;
            } else {
                return resultJson.err;
            }
        }
    };
    return __;
})();