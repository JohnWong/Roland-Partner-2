/**
 * Created by kako on 2016/03/14.
 */

var PP2_FRONT = (function() {
    var templates = {};
    var isPageLoading = false;
    var marqueeTimers = [];
    var showingModalNames = {};
    var autoIncrementProgressTimer = undefined;
    var initHoldButton = function(element, action)
    {
        var touching = false;
        var timer;
        var keepAction = function() {
            if (!touching) {
                return;
            }
            action();
            // リピートは100ms毎
            setTimeout(keepAction, 100);
        };
        element.on('touchstart', function() {
            clearTimeout(timer);
            action();
            touching = true;
            // 700ms後にリピート開始
            timer = setTimeout(keepAction, 700);
        });
        element.on('touchend touchcancel', function() {
            touching = false;
        });
    };
    var initSliderHoldButton = function(buttonElement, sliderAccessor, slideEvent, step) {
        initHoldButton(buttonElement, function() {
            var value = clamp(sliderAccessor.sliderElement.slider('getValue') + step, sliderAccessor.sliderElement.slider('getAttribute', 'min'), sliderAccessor.sliderElement.slider('getAttribute', 'max'));
            sliderAccessor.setValue(value);
            slideEvent({value: value});
        });
    };
    var clamp = function(value, min, max) {
        return Math.min(Math.max(min, value), max);
    };
    var initSlider = function(sliderElement, valueElement, address, attributes, sliderValueToDt1ValueConverter, dt1ValueToSliderValueConverter, sliderValueToDisplayValueConverter) {
        var readAddress = 'object' === typeof(address) ? address[0] : address;
        var writeAddress = 'object' === typeof(address) ? address[1] : address;

        var sliderAccessor = initSliderWithoutMIDIConnection(sliderElement, valueElement, attributes, sliderValueToDisplayValueConverter, function(value) {
            var dt1Value;
            if (typeof(sliderValueToDt1ValueConverter) === 'function') {
                dt1Value = sliderValueToDt1ValueConverter(value);
            } else if (isFinite(sliderValueToDt1ValueConverter)) {
                dt1Value = value + sliderValueToDt1ValueConverter;
            } else {
                dt1Value = value;
            }
            PP2_MIDI.dt1(writeAddress, dt1Value);
        });

        var callbackKey = PP2_MIDI.addCallback(readAddress, function(params) {
            var sliderValue;
            if (typeof(dt1ValueToSliderValueConverter) === 'function') {
                sliderValue = dt1ValueToSliderValueConverter(params.value);
            } else if (isFinite(dt1ValueToSliderValueConverter)) {
                sliderValue = params.value + dt1ValueToSliderValueConverter;
            } else {
                sliderValue = params.value;
            }
            sliderAccessor.setValue(sliderValue);
        });
        return {slider: sliderAccessor, callbackKey: callbackKey};
    };
    var initSliderWithoutMIDIConnection = function(sliderElement, valueElement, attributes, sliderValueToDisplayValueConverter, onValueChangedCallback) {
        attributes = undefined === attributes ? {} : attributes;
        attributes.orientation = undefined !== attributes.orientation ? attributes.orientation : 'horizontal';
        attributes.reversed = attributes.orientation === 'vertical' && undefined === attributes.reversed ? true : attributes.reversed;
        attributes.min = undefined !== attributes.min ? attributes.min : 0;
        attributes.max = undefined !== attributes.max ? attributes.max : 100;
        attributes.step = undefined !== attributes.step ? attributes.step : 1;
        attributes.value = undefined !== attributes.value ? attributes.value : 0;
        attributes.tooltip = 'hide';

        sliderElement.attr({type: 'text', 'data-provide': 'slider'});
        var sliderAccessor = {
            sliderElement: sliderElement,
            setValue: function(value) {
                sliderElement.slider('setValue', value);
                sliderAccessor.updateDisplayValue(value);
            },
            getValue: function() {
                return sliderElement.slider('getValue');
            },
            updateDisplayValue: function(value) {
                if (undefined === valueElement) {
                    return;
                }
                value = undefined === value ? sliderAccessor.getValue() : value;
                if (typeof(sliderValueToDisplayValueConverter) === 'function') {
                    valueElement.html(sliderValueToDisplayValueConverter(value));
                } else if (isFinite(sliderValueToDisplayValueConverter)) {
                    valueElement.html(value + sliderValueToDisplayValueConverter);
                } else {
                    valueElement.html(value);
                }
            },
            onValueChanged: onValueChangedCallback
        };

        // スライダーの設定
        sliderElement.slider(attributes).on('change', function() {
            var value = sliderAccessor.getValue();
            onValueChangedCallback(value);
            sliderAccessor.updateDisplayValue(value);
        });

        return sliderAccessor;
    };

    var ignoreEnterSubmission = function (element) {
        element.find("input").on("keydown", function(e) {
            if ((e.which && e.which === 13) || (e.keyCode && e.keyCode === 13)) {
                document.activeElement.blur();
                return false;
            } else {
                return true;
            }
        });
    };

    var __ = {
        // modalが閉じた時のコールバック
        modalCloseCallback: function()
        {
        },
        onApplicationStop: function() {
        },
        onApplicationRestart: function() {
        },
        // ページアンロード時のコールバック
        onUnload: function() {
        },
        // 各ページ向けスクリプトプール
        scriptPool: {},
        // グローバルの代わり
        global: {},
        goTo: function(applicationMode) {
            if (isPageLoading) {
                return;
            }
            isPageLoading = true;

            if (typeof(this.onUnload) === 'function') {
                this.onUnload();
            }
            PP2_CORE.reset();

            var previousApplicationMode = PP2_CORE.getCurrentApplicationMode();
            var nextApplicationMode = applicationMode;
            switch (previousApplicationMode) {
                case PP2_CORE.applicationModes.Recorder:
                case PP2_CORE.applicationModes.Diary:
                    PP2_PLAYER.pause();
                    break;
                case PP2_CORE.applicationModes.Songs:
                    if (nextApplicationMode !== PP2_CORE.applicationModes.DigiScoreLite) {
                        PP2_MIDI.stopSequencerIfNeeded();
                    }
                    break;
                case PP2_CORE.applicationModes.DigiScoreLite:
                    if (nextApplicationMode !== PP2_CORE.applicationModes.Songs) {
                        PP2_MIDI.stopSequencerIfNeeded();
                    }
                    break;
            }
            // 必要に応じてシーケンサーとメトロノームを止める
            switch (nextApplicationMode) {
                case PP2_CORE.applicationModes.Rhythm:
                case PP2_CORE.applicationModes.FlashCard:
                    PP2_MIDI.stopMetronomeIfNeeded();
                    break;
                default:
                    break;
            }

            PP2_MIDI.reset();
            reset();

            $('.modal').modal('hide');

            var locationHash = undefined == location.hash ? '' : location.hash;
            if (undefined == applicationMode) {
                applicationMode = parseInt(locationHash.replace('#', ''), 0);
            }

            PP2_CORE.countUpUseCount(applicationMode);

            var applicationModeName = getApplicationModeName(applicationMode);
            var url = 'pp2/' + applicationModeName + '.html';

            PP2_DB.createActionLogIfNeeded(applicationModeName);

            _.each($('.animsition'), function(v) {
                $(v).animsition('out', $(v), '#' + applicationMode);
            });
            var isLoaded = false;
            var container = $('<div />');
            container.load(url, function() {
                isLoaded = true;
            });

            // フッターボタン制御
            updateFooter(applicationMode);
            PP2_MIDI.addCallback(p2addr.eventsMidiDisconnected, updateFooter);

            var checkLoadAction = function() {
                if (isLoaded) {
                    var contentsAndScript = getContentsAndScript(container);
                    $('.header').html(contentsAndScript.contents.header);
                    $('.content').html('<style type="text/css">' + contentsAndScript.style + '</style>' + contentsAndScript.contents.body);

                    eval(contentsAndScript.script);
                    $('.animsition').animsition('in');
                    isPageLoading = false;
                } else {
                    setTimeout(checkLoadAction, 10);
                }
            };
            setTimeout(checkLoadAction, 300);
        },
        showModal: function(name, width, onFinishedCallback) {
            if (showingModalNames[name]) {
                return;
            }
            showingModalNames[name] = true;
            var container = $('<div />');
            container.load('pp2/dialogs/' + name + '.html', function() {
                var contentsAndScript = getContentsAndScript(container);
                var compiled = _.template(templates['modal-template']);
                if (undefined === showingModalNames[name]) {
                    return;
                }
                var modal = $(compiled(contentsAndScript.contents));
                ignoreEnterSubmission(modal);
                modal.attr('name', name);
                modal.addClass(name);
                showingModalNames[name] = modal;
                modal.append('<style type="text/css">' + contentsAndScript.style + '</style>');
                modal.appendTo($(document.body));
                PP2_LANGUAGE.reload();
                eval(contentsAndScript.script);
                var modalCloseCallback = __.modalCloseCallback;
                if (undefined !== width) {
                    if ('function' === typeof(width)) {
                        onFinishedCallback = width;
                    } else {
                        modal.find('.modal-dialog').css({width: width + 'px'});
                    }
                }
                modal.modal({backdrop:'static', keyboard:false});
                modal.on('hide.bs.modal', function () {
                    if ('function' === typeof(modalCloseCallback)) {
                        modalCloseCallback();
                    }
                    delete(showingModalNames[name]);
                }).on('hidden.bs.modal', function () {
                    modal.remove();
                });
                if ('function' === typeof(onFinishedCallback)) {
                    onFinishedCallback(modal);
                }
                container.remove();
            });
        },
        showRightModal: function(name, width, onFinishedCallback) {
            if (showingModalNames[name]) {
                return;
            }
            showingModalNames[name] = true;
            var container = $('<div />');
            container.load('pp2/dialogs/' + name + '.html', function() {
                var contentsAndScript = getContentsAndScript(container);
                var compiled = _.template(templates['right-modal-template']);
                if (undefined === showingModalNames[name]) {
                    return;
                }
                var modal = $(compiled(contentsAndScript.contents));
                ignoreEnterSubmission(modal);
                modal.attr('name', name);
                modal.addClass(name);
                showingModalNames[name] = modal;
                modal.append('<style type="text/css">' + contentsAndScript.style + '</style>');
                modal.appendTo($(document.body));
                PP2_LANGUAGE.reload();
                eval(contentsAndScript.script);
                var modalCloseCallback = __.modalCloseCallback;
                if (undefined !== width) {
                    if ('function' === typeof(width)) {
                        onFinishedCallback = width;
                    } else {
                        modal.find('.modal-dialog').css({width: width + 'px'});
                    }
                }
                modal.modal({backdrop:true, keyboard:false});
                modal.on('hide.bs.modal', function () {
                    if ('function' === typeof(modalCloseCallback)) {
                        modalCloseCallback();
                    }
                    delete(showingModalNames[name]);
                }).on('hidden.bs.modal', function () {
                    modal.remove();
                });
                if ('function' === typeof(onFinishedCallback)) {
                    onFinishedCallback(modal);
                }
                container.remove();
            });
        },
        reloadModal: function(name, width, onFinishedCallback) {
            var modal = $('.modal');
            if (modal.size() === 0) {
                return;
            }
            modal.trigger('hide.bs.modal');
            modal.removeClass(modal.attr('name'));
            var modalContent = modal.find('.modal-content');
            showingModalNames[name] = true;
            var container = $('<div />');
            container.load('pp2/dialogs/' + name + '.html', function() {
                var contentsAndScript = getContentsAndScript(container);
                var compiled = _.template(templates['right-modal-template']);
                if (undefined === showingModalNames[name]) {
                    return;
                }
                modal.attr('name', name);
                modal.addClass(name);
                showingModalNames[name] = modal;
                modalContent.html($(compiled(contentsAndScript.contents)).find('.modal-content').html());
                modalContent.append('<style type="text/css">' + contentsAndScript.style + '</style>');
                ignoreEnterSubmission(modal);
                PP2_LANGUAGE.reload();
                eval(contentsAndScript.script);
                var modalCloseCallback = __.modalCloseCallback;
                if (undefined !== width) {
                    if ('function' === typeof(width)) {
                        onFinishedCallback = width;
                    } else {
                        modal.find('.modal-dialog').css({width: width + 'px'});
                    }
                }
                modal.off('hide.bs.modal').on('hide.bs.modal', function () {
                    if ('function' === typeof(modalCloseCallback)) {
                        modalCloseCallback();
                    }
                    delete(showingModalNames[name]);
                });
                if ('function' === typeof(onFinishedCallback)) {
                    onFinishedCallback(modal);
                }
                container.remove();
            });
        },
        switchModal: function (oldModal, newModalName, newModalWidth) {
            oldModal.on('hidden.bs.modal', function () {
                PP2_FRONT.showModal(newModalName, newModalWidth);
            }).modal('hide');
        },
        getShowingModalNames: function() {
            return _.keys(showingModalNames);
        },
        hideModal: function(name) {
            if ('object' === typeof(showingModalNames[name])) {
                showingModalNames[name].modal('hide');
            }
            delete(showingModalNames[name]);
        },
        loadPartsToElement: function(element, name, callback) {
            element.empty();
            var container = $('<div />');
            container.load('pp2/parts/' + name + '.html', function() {
                var contentsAndScript = getContentsAndScript(container);
                $('<style type="text/css">' + contentsAndScript.style + '</style>' + contentsAndScript.contents.body).appendTo(element);
                PP2_LANGUAGE.reload();
                eval(contentsAndScript.script);
                container.remove();
                if ('function' == typeof(callback)) {
                    callback();
                }
            });
        },
        alert: function(values, onClose) {
            __.showModal('alert', 450, function(modal) {
                if (!(values instanceof Array)) {
                    values = [values];
                }
                var message = values[0];
                var closeValue = values.length >= 2 ? values[1] : PP2_LANGUAGE.getValues().alert_close;

                modal.find('.alert-message').html(message);
                modal.find('.alert-close-button').text(closeValue).on('click', function() {
                    if ('function' === typeof(onClose)) {
                        onClose(modal);
                    }
                });
            });
        },
        confirm: function(values, onSubmit, onCancel) {
            __.showModal('confirm', 450, function(modal) {
                if (!(values instanceof Array)) {
                    values = [values];
                }
                var message = values[0];
                var okValue = values.length >= 2 ? values[1] : PP2_LANGUAGE.getValues().confirm_ok;
                var cancelValue = values.length >= 3 ? values[2] : PP2_LANGUAGE.getValues().confirm_cancel;

                modal.find('.confirm-message').html(message);
                modal.find('.confirm-ok-button').text(okValue).on('click', function() {
                    if ('function' === typeof(onSubmit)) {
                        onSubmit();
                    }
                });
                modal.find('.confirm-cancel-button').text(cancelValue).on('click', function () {
                    if ('function' === typeof(onCancel)) {
                        onCancel();
                    }
                });
            });
        },
        prompt: function(values, onSubmit) {
            var accessor = {
                onReady: function (modal) {}
            };
            __.showModal('prompt', 450, function(modal) {
                if (!(values instanceof Array)) {
                    values = [values];
                }
                var message = values[0];
                var fieldValue = values.length >= 2 ? values[1] : '';
                var submitValue = values.length >= 3 ? values[2] : PP2_LANGUAGE.getValues().prompt_submit;

                modal.find('.prompt-message').html(message);
                modal.find('.prompt-field').html(fieldValue);
                modal.find('.prompt-submit-button').text(submitValue).on('click', function() {
                    if ('function' === typeof(onSubmit)) {
                        onSubmit(modal.find('.prompt-input').val());
                    }
                });

                if ('function' === typeof(accessor.onReady)) {
                    accessor.onReady(modal);
                }
            });
            return accessor;
        },
        marquee: function(element) {
            var span = element.find('span');
            marqueeTimers.push(setInterval(function() {
                if (element.width() < span.width()) {
                    if (parseInt(span.css('left')) < -span.width()) {
                        span.css('left', span.width());
                        return;
                    }
                    span.css('left', parseInt(span.css('left')) - 1);
                } else {
                    span.css('left', 0);
                }
            }, 15));
        },
        showLoading: function(message, autoIncrementProgress, autoIncrementProgressTime) {
            var overlay = $('#loading-overlay');
            if (!overlay.length) {
                overlay = $(templates['loading-overlay-template']);
                $(document.body).append(overlay);
            }
            overlay.css({opacity: 0, display: 'block'});
            overlay.animate({opacity: 1}, 200, 'linear');
            if (message === true || message === false) {
                autoIncrementProgressTime = autoIncrementProgress;
                autoIncrementProgress = message;
                message = undefined;
            }
            message = undefined === message ? PP2_LANGUAGE.getValues().communicating_with_the_server : message;
            overlay.find('#loading-message').html(message);
            this.setLoadingProgress(0);
            if (autoIncrementProgress === true) {
                clearInterval(autoIncrementProgressTimer);
                if (undefined === autoIncrementProgressTime) {
                    autoIncrementProgressTime = 1000;
                }
                var progress = 0;
                autoIncrementProgressTimer = setInterval(function () {
                    progress += 10000 / autoIncrementProgressTime;
                    __.setLoadingProgress(progress);
                }, 100);
            }
        },
        hideLoading: function(callback) {
            clearInterval(autoIncrementProgressTimer);
            var overlay = $('#loading-overlay');
            if (!overlay.length) {
                return;
            }
            __.setLoadingProgress(100);
            overlay.animate({opacity: 0}, 200, 'linear', function() {
                overlay.css('display', 'none');
                __.setLoadingProgress(0);
                if ('function' === typeof(callback)) {
                    callback();
                }
            });
        },
        setLoadingProgress: function(progress) {
            // progressは0〜100
            var overlay = $('#loading-overlay');
            if (!overlay.length) {
                return;
            }
            var bar = overlay.find('.progress-bar');
            bar.attr('aria-valuenow', progress).css('width', progress + '%');
        },
        scrollToTargetIfNeeded: function(scrollContainer, targetObject) {
            if (undefined == targetObject || targetObject.length == 0) {
                return;
            }
            var targetOffset = targetObject.offset().top + scrollContainer.scrollTop();
            var targetHeight = targetObject.height();
            var containerBaseOffset = scrollContainer.offset().top;
            var containerOffset = scrollContainer.offset().top + scrollContainer.scrollTop();
            var containerHeight = scrollContainer.height();
            if (targetOffset < containerOffset) {
                scrollContainer.stop();
                scrollContainer.animate({scrollTop: targetOffset - containerBaseOffset}, 200);
            } else if ((containerOffset + containerHeight) < (targetOffset + targetHeight)) {
                scrollContainer.stop();
                scrollContainer.animate({scrollTop: targetOffset - containerBaseOffset - containerHeight + targetHeight}, 200);
            }
        },
        setupSliderHelperButton: function(sliderAccessor, slideEvent) {
            var step = sliderAccessor.sliderElement.slider('getAttribute', 'step');
            var plusButton = $('<button class="btn btn-default btn-slider-helper" style="right: 13px;margin-top: 2px;">+</button>');
            initSliderHoldButton(plusButton, sliderAccessor, slideEvent, step);
            sliderAccessor.sliderElement.after(plusButton);

            var minusButton = $('<button class="btn btn-default btn-slider-helper" style="left: 13px;margin-top: 2px;">-</button>');
            initSliderHoldButton(minusButton, sliderAccessor, slideEvent, -step);
            sliderAccessor.sliderElement.before(minusButton);
        },
        setup10StepSliderHelperButton: function(sliderAccessor, slideEvent) {
            var step = sliderAccessor.sliderElement.slider('getAttribute', 'step');
            var plusOneButton = $('<button class="btn btn-default btn-slider-helper" style="right: 13px;font-size: 15px;margin-top: -20px;">+1</button>');
            initSliderHoldButton(plusOneButton, sliderAccessor, slideEvent, 1);
            sliderAccessor.sliderElement.after(plusOneButton);

            var minusOneButton = $('<button class="btn btn-default btn-slider-helper" style="left: 13px;font-size: 15px;margin-top: -20px;">-1</button>');
            initSliderHoldButton(minusOneButton, sliderAccessor, slideEvent, -1);
            sliderAccessor.sliderElement.before(minusOneButton);

            var plusTenButton = $('<button class="btn btn-default btn-slider-helper" style="right: 13px;font-size: 15px;margin-top: 24px;">+10</button>');
            initSliderHoldButton(plusTenButton, sliderAccessor, slideEvent, 10);
            sliderAccessor.sliderElement.after(plusTenButton);

            var minusTenButton = $('<button class="btn btn-default btn-slider-helper" style="left: 13px;font-size: 15px;margin-top: 24px;">-10</button>');
            initSliderHoldButton(minusTenButton, sliderAccessor, slideEvent, -10);
            sliderAccessor.sliderElement.before(minusTenButton);
        },
        initSlider: function(sliderElement, valueElement, address, attributes, sliderValueToDt1ValueConverter, dt1ValueToSliderValueConverter, sliderValueToDisplayValueConverter) {
            var res = initSlider(sliderElement, valueElement, address, attributes, sliderValueToDt1ValueConverter, dt1ValueToSliderValueConverter, sliderValueToDisplayValueConverter);
            __.setupSliderHelperButton(res.slider, function(params) {
                res.slider.onValueChanged(params.value);
            });
            return res;
        },
        initSliderWith10StepButton: function(sliderElement, valueElement, address, attributes, sliderValueToDt1ValueConverter, dt1ValueToSliderValueConverter, sliderValueToDisplayValueConverter) {
            var res = initSlider(sliderElement, valueElement, address, attributes, sliderValueToDt1ValueConverter, dt1ValueToSliderValueConverter, sliderValueToDisplayValueConverter);
            __.setup10StepSliderHelperButton(res.slider, function(params) {
                res.slider.onValueChanged(params.value);
            });
            return res;
        },
        initSliderWithoutMIDIConnection: initSliderWithoutMIDIConnection,
        initButton: function(element, address, value, onStateChangeCallback) {
            var readAddress = 'object' === typeof(address) ? address[0] : address;
            var writeAddress = 'object' === typeof(address) ? address[1] : address;

            element.on('click', function() {
                PP2_MIDI.dt1(writeAddress, value);
                onStateChangeCallback(true);
            });
            return PP2_MIDI.addCallback(readAddress, function(params) {
                if (params.value === value) {
                    element.removeClass('btn-default').addClass('btn-primary');
                } else {
                    element.removeClass('btn-primary').addClass('btn-default');
                }
                onStateChangeCallback(false);
            });
        },
        initMultiButton: function(element, address, values, onValueChangeCallback) {
            var readAddress = 'object' === typeof(address) ? address[0] : address;
            var writeAddress = 'object' === typeof(address) ? address[1] : address;

            var accessor = __.initMultiButtonWithoutMIDIConnection(element, values, function(v, isClicked) {
                if (isClicked) {
                    PP2_MIDI.dt1(writeAddress, v);
                }
                if ('function' === typeof(onValueChangeCallback)) {
                    onValueChangeCallback(v, isClicked);
                }
            });

            return PP2_MIDI.addCallback(readAddress, function(params) {
                accessor.setValue(params.value);
            });
        },
        initMultiButtonWithoutMIDIConnection: function(element, values, onValueChangeCallback) {
             element.find('button').each(function(index) {
                $(this).on('click', function() {
                    element.find('button.btn-primary').removeClass('btn-primary').addClass('btn-default');
                    $(this).removeClass('btn-default').addClass('btn-primary');
                    var value = undefined === values ? index : ('object' === typeof(values) ? values[index] : values);
                    if ('function' === typeof(value)) {
                        value = value(index);
                    }
                    if (undefined === value || false === value) {
                        return;
                    }
                    if ('function' === typeof(onValueChangeCallback)) {
                        onValueChangeCallback(value, true);
                    }
                });
            });
            return {
                setValue: function(v) {
                    element.find('button.btn-primary').removeClass('btn-primary').addClass('btn-default');
                    var index = (undefined === values || 'function' === typeof(values)) ? v : ($.isArray(values) ? values.indexOf(v) : _.keys(values)[_.values(values).indexOf(v)]);
                    if (undefined !== index && index !== -1 && isFinite(index)) {
                        element.find('button').eq(index).removeClass('btn-default').addClass('btn-primary');
                        if ('function' === typeof(onValueChangeCallback)) {
                            onValueChangeCallback(v, false);
                        }
                    }
                }
            };
        },
        initSelect: function(element, address, values, customContentTemplate) {
            var readAddress = 'object' === typeof(address) ? address[0] : address;
            var writeAddress = 'object' === typeof(address) ? address[1] : address;

            __.initSelectWithoutMIDIConnection(element, values, customContentTemplate, function(index) {
                // 型が重要なので、valuesのキー生値をとる
                if (0 <= index) {
                    var key = $.isArray(values) ? parseInt(Object.keys(values)[index], 10) : Object.keys(values)[index];
                    PP2_MIDI.dt1(writeAddress, key);
                }
            });

            return PP2_MIDI.addCallback(readAddress, function(params) {
                element.val('' + values[params.value]);
                element.selectpicker('refresh');
            });
        },
        initSelectWithoutMIDIConnection: function(element, values, customContentTemplate, onChangeCallback) {
            element.addClass('selectpicker');
            element.empty();
            var stringValues = [];
            _.forEach(values, function(v) {
                stringValues.push('' + v);
                var option = $(_.sprintf('<option>%s</option>', v));
                if (undefined !== customContentTemplate) {
                    option.attr('data-content', _.sprintf(customContentTemplate, v));
                }
                option.appendTo(element);
            });

            var width = element.attr('data-width') === undefined ? 'fit' : element.attr('data-width');
            element.selectpicker({width: width});

            if ('function' === typeof(onChangeCallback)) {
                element.on('change', function() {
                    onChangeCallback(_.indexOf(stringValues, element.val()));
                });
            }
            element.selectpicker({width: 'fit'});
        },
        initSenderButton: function(element, address, valueGetter) {
            element.on('click', function() {
                if (typeof(valueGetter) === 'function') {
                    PP2_MIDI.dt1(address, valueGetter());
                } else {
                    PP2_MIDI.dt1(address, valueGetter);
                }
            });
        },
        initToggleButton: function(element, address) {
            var readAddress = 'object' === typeof(address) ? address[0] : address;
            var writeAddress = 'object' === typeof(address) ? address[1] : address;

            element.on('click', function() {
                PP2_MIDI.dt1(writeAddress, element.hasClass('btn-default') ? 1 : 0);
            });
            return PP2_MIDI.addCallback(readAddress, function(params) {
                if (params.value === 1) {
                    element.removeClass('btn-default').addClass('btn-primary');
                } else {
                    element.removeClass('btn-primary').addClass('btn-default');
                }
            });
        },
        initToggleIcon: function(element, address, onStatusChangedCallback) {
            var senderElement = $.isArray(element) ? element[0] : element;
            var receiverElement = $.isArray(element) ? element[1] : element;

            var readAddress = 'object' === typeof(address) ? address[0] : address;
            var writeAddress = 'object' === typeof(address) ? address[1] : address;

            PP2_MIDI.setupSequencerButton(senderElement, writeAddress);
            return PP2_MIDI.addCallback(readAddress, function(params) {
                switch (params.value) {
                    case 0:
                        receiverElement.removeAttr('disabled');
                        receiverElement.removeClass('on');
                        if ('function' === typeof(onStatusChangedCallback)) {
                            onStatusChangedCallback(params.value);
                        }
                        break;
                    case 1:
                        receiverElement.removeAttr('disabled');
                        receiverElement.addClass('on');
                        if ('function' === typeof(onStatusChangedCallback)) {
                            onStatusChangedCallback(params.value);
                        }
                        break;
                    case 2:
                        receiverElement.attr('disabled', true);
                        receiverElement.removeClass('on');
                        if ('function' === typeof(onStatusChangedCallback)) {
                            onStatusChangedCallback(params.value);
                        }
                        break;
                }
            });
        },
        initViewerElement: function(element, address, dt1ValueToDisplayValueConverter) {
            return PP2_MIDI.addCallback(address, function(params) {
                var displayValue;
                if (typeof(dt1ValueToDisplayValueConverter) === 'function') {
                    displayValue = dt1ValueToDisplayValueConverter(params.value);
                } else if (isFinite(dt1ValueToDisplayValueConverter)) {
                    displayValue = params.value + dt1ValueToDisplayValueConverter;
                } else {
                    displayValue = params.value;
                }
                element.html(displayValue);
            });
        },
        refreshUserIcon: function() {
            var button = $('.user-button').html('&nbsp;');
            button.css({position: 'relative'});
            if (undefined !== PP2_DB.currentUser) {
                button.removeClass('icbtn-user').css('background', 'transparent').append($('<img />').addClass('user-icon-small')
                    .attr('src', PP2_DB.currentUser.icon)
                    .css({
                        position: 'absolute',
                        left: '50%',
                        top: '8px',
                        transform: 'translateX(-50%)',
                        '-webkit-transform': 'translateX(-50%)'
                    }));
            } else {
                button.addClass('icbtn-user').css('background', '');
            }
        },
        showForceVerifyEmailDialog: function(onFinished) {
            __.showModal('user_force_verify_email', function () {
                PP2_FRONT.global.onShowForceVerifyEmailDialogFinished = onFinished;
            });
        },
        spacerSrc: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
    };

    var getApplicationModeName = function(applicationMode) {
        var applicationModeName = _.findKey(PP2_CORE.applicationModes, function(v) {
            return applicationMode == v;
        });
        return (undefined === applicationModeName ? 'Top' : applicationModeName).toLowerCase();
    };

    var updateFooter = function(applicationMode) {
        if ('number' != typeof(applicationMode)) {
            applicationMode = PP2_CORE.getCurrentApplicationMode();
        }
        var applicationModeName = getApplicationModeName(applicationMode);
        switch (applicationModeName) {
            case 'top':
                $('#ble-connect-message-container').show();
                $('.footer-logo').hide();
                $('.footer').find('.icbtn').hide();
                break;
            default:
                $('#ble-connect-message-container').hide();
                $('.footer-logo').show();
                $('.footer').find('.icbtn').removeClass('on').prop('disabled', false).show();
                if (PP2_MIDI.isConnected()) {
                    $('.footer').find('.icbtn').removeAttr('disabled');
                } else {
                    $('.footer').find('.icbtn').attr('disabled', true);
                    $('.footer').find('.footer-btn-top').removeAttr('disabled');
                    $('.footer').find('.footer-btn-flashcard').removeAttr('disabled');
                }
                $('.footer').find('.footer-btn-' + applicationModeName).addClass('on').attr('disabled', true);
                break;
        }
    };

    var reset = function() {
        __.onApplicationStop = function() {};
        __.onApplicationRestart = function() {};
        __.onUnload = function() {};
        __.scriptPool = {};
        _.forEach(marqueeTimers, function(v) {
            clearInterval(v);
        });
    };

    function getContentsAndScript(container) {
        var script = container.find('script[type="text/javascript"]').html();
        var style = container.find('style[type="text/css"]').html();
        var contents = [];
        _.each(container.find('script[type="text/html"]'), function(v) {
            contents[$(v).attr('id')] = $(v).html();
        });
        return {
            script: script,
            style: style,
            contents: contents
        };
    }

    // ロード時の処理
    $(function() {
        // テンプレートのロード
        var container = $('<div />');
        container.load('pp2/templates.html', function () {
            _.each(container.find('script[type="text/template"]'), function (v) {
                templates[$(v).attr('id')] = $(v).html();
            });
            container.remove();

            var readyLoop = function() {
                if (PP2_CORE.isReady()) {
                    // AWSイニシャライズ
                    PP2_AWS.init(PP2_CORE.systemData);

                    // Cryptoイニシャライズ
                    PP2_CRYPT.init(PP2_CORE.systemData.encryptKey);

                    // テンプレート表示
                    $('body').append(templates['main-template']);

                    // ページ表示アニメーションの設定
                    $('.animsition').animsition({
                        inClass: 'fade-in-right-lg',
                        outClass: 'fade-out-right-lg',
                        inDuration: 300,
                        outDuration: 300
                    });

                    // ページロード
                    __.goTo();
                } else {
                    setTimeout(readyLoop, 10);
                }
            };
            readyLoop();
        });
    });

    return __;
})();
