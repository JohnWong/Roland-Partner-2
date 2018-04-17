/**
 * Created by kako on 2016/03/16.
 */

var PP2_SAVEDATA = (function() {
    var dataModel = {
        lastDownloadedFiles: {},
        digiScoreLite: {
            pageTurn: false,
            offsetInterval: 5
        },
        rhythm: {
            notShowRhythmNotificationDialogForAndroid: false,
            pedalMode: 0
        },
        lastUserId: undefined,
        userIds: [],
        notShowGuestNotificationDialog: false,
        lastAWSAPICalledTimestamps: {}
    };
    var __ = {
        data: $.extend(true, {}, dataModel),
        reset: function() {
            this.data = $.extend(true, {}, dataModel);
        }
    };
    $(function() {
        $native.app.storage(function (json) {
            if (undefined != json && json.length > 0) {
                try {
                    __.data = JSON.parse(json);
                    _.forEach(dataModel, function (v, k) {
                        console.log(k);
                        if (undefined === __.data[k]) {
                            __.data[k] = v;
                        }
                        _.forEach(dataModel[k], function (v2, k2) {
                            console.log(k2);
                            if (undefined === __.data[k][k2]) {
                                __.data[k][k2] = v2;
                            }
                        });
                    });
                } catch (e) {
                    console.log(e);
                    __.reset();
                }
            } else {
                __.reset();
            }
            var lastData = json;
            setInterval(function() {
                var json = JSON.stringify(__.data);
                if (lastData != json) {
                    $native.app.storage(json);
                    lastData = json;
                }
            }, 100);
        });
    });
    return __;
})();