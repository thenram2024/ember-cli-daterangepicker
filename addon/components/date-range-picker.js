import Ember from 'ember';
import moment from 'moment';
import layout from '../templates/components/date-range-picker';

const {
    run,
    isEmpty,
    computed
} = Ember;

const noop = function() {};

export default Ember.Component.extend({
    layout,
    classNames: ['form-group'],
    attributeBindings: ['start', 'end', 'serverFormat'],
    start: undefined,
    end: undefined,
    minDate: undefined,
    maxDate: undefined,
    timePicker: false,
    timePicker24Hour: false,
    timePickerSeconds: false,
    timePickerIncrement: undefined,
    showWeekNumbers: false,
    showDropdowns: false,
    linkedCalendars: false,
    datelimit: false,
    parentEl: 'body',
    format: 'MMM D, YYYY',
    serverFormat: 'YYYY-MM-DD',
    rangeText: computed('start', 'end', 'chosenLabel', function() {
        let format = this.get('format');
        let serverFormat = this.get('serverFormat');
        let start = this.get('start');
        let end = this.get('end');
        let chosenLabel = this.get('chosenLabel');
        //TODO need to check with dateRanges in o365attributes for corresponding id for custom range.
        if (this.get('singleDatePicker') === false && Ember.isPresent(chosenLabel) && chosenLabel === 'Custom Range') {
            if (!isEmpty(start) && !isEmpty(end)) {
                return moment(start, serverFormat).format(format) + this.get('separator') +
                    moment(end, serverFormat).format(format);
            }
        }
        if (this.get('singleDatePicker') && Ember.isPresent(start)) {
            return moment(start, serverFormat).format(format);
        }
        console.log(' chosen lable in rangeText CP ', chosenLabel);
        return chosenLabel;
    }),
    opens: null,
    drops: null,
    separator: ' - ',
    singleDatePicker: false,
    placeholder: null,
    buttonClasses: ['btn'],
    applyClass: null,
    cancelClass: null,
    ranges: {
        'Today': [moment(), moment()],
        'Yesterday': [moment().subtract(1, 'days'), moment().subtract(1, 'days')],
        'Last 7 Days': [moment().subtract(6, 'days'), moment()],
        'Last 30 Days': [moment().subtract(29, 'days'), moment()],
        'This Month': [moment().startOf('month'), moment().endOf('month')],
        'Last Month': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')]
    },
    rangesById: {
        1: 'Today',
        2: 'Yesterday',
        3: 'Last 7 Days',
        4: 'Last 30 Days',
        5: 'This Month',
        6: 'Last Month'
    },
    daysOfWeek: moment.weekdaysMin(),
    monthNames: moment.monthsShort(),
    removeDropdownOnDestroy: false,
    cancelLabel: 'Cancel',
    applyLabel: 'Apply',
    customRangeLabel: 'Custom Range',
    showCustomRangeLabel: true,
    fromLabel: 'From',
    toLabel: 'To',
    hideAction: null,
    applyAction: null,
    cancelAction: null,
    autoUpdateInput: true,
    autoApply: false,
    alwaysShowCalendars: false,
    context: undefined,
    firstDay: 0,
    isInvalidDate: noop,
    isCustomDate: noop,
    chosenLabel: '',
    selectedOptionId: 0,
    showDropDownLabel: true,

    didReceiveAttrs() {
        this._super(...arguments);
        console.log(' daterange didReceiveAttrs Start ', this.get('start'), ' end ', this.get('end'), ' selectedOptionId ', this.get('selectedOptionId'));
        // if (this.get('selectedOptionId')) {
        //     let rangeName = this.get('rangesById')[this.get('selectedOptionId')];
        //     this.set('start', this.get('ranges')[rangeName][0]);
        //     this.set('end', this.get('ranges')[rangeName][1]);
        // } else {
        //     if (Ember.isPresent(this.get('start') && Ember.isPresent(this.get('end')))) {
        //         this.set('start', moment(this.get('start')));
        //         this.set('end', moment(this.get('end')));
        //     } else if (Ember.isPresent(this.get('start'))) {
        //         this.set('start', moment(this.get('start')));
        //     }
        // }
        //calculate chosen label for the first time showing.
        if (Ember.isPresent(this.get('start') && Ember.isPresent(this.get('end')))) {
            var customRange = true;
            var i = 0;
            let ranges = this.get('ranges');
            for (var range in ranges) {
                if (this.get('timePicker')) {
                    if (this.get('start').isSame(ranges[range][0]) && this.get('end').isSame(ranges[range][1])) {
                        customRange = false;
                        // this.chosenLabel = this.container.find('.ranges li:eq(' + i + ')').addClass('active').html();
                        this.set('chosenLabel', range);
                        break;
                    }
                } else {
                    //ignore times when comparing dates if time picker is not enabled
                    if (this.get('start').format('YYYY-MM-DD') == ranges[range][0].format('YYYY-MM-DD') && this.get('end').format('YYYY-MM-DD') == ranges[range][1].format('YYYY-MM-DD')) {
                        customRange = false;
                        // this.chosenLabel = this.container.find('.ranges li:eq(' + i + ')').addClass('active').html();
                        this.set('chosenLabel', range);
                        break;
                    }
                }
                i++;
            }
            if (customRange) {
                if (this.get('showCustomRangeLabel')) {
                    // this.chosenLabel = this.container.find('.ranges li:last').addClass('active').html();
                    this.set('chosenLabel', 'Custom Range');
                } else {
                    // this.chosenLabel = null;
                    this.set('chosenLabel', '');
                }
            }
        }

    },
    // Init the dropdown when the component is added to the DOM
    didInsertElement() {
        this._super(...arguments);
        this.setupPicker();
    },

    didUpdateAttrs() {
        this._super(...arguments);
        // console.log(' didUpdateAttrs in date-range-picker');
        this.setupPicker();
    },

    // Remove the hidden dropdown when this component is destroyed
    willDestroy() {
        this._super(...arguments);

        run.cancel(this._setupTimer);

        if (this.get('removeDropdownOnDestroy')) {
            Ember.$('.daterangepicker').remove();
        }
    },

    getOptions() {
        let momentStartDate = moment(this.get('start'), this.get('serverFormat'));
        let momentEndDate = moment(this.get('end'), this.get('serverFormat'));
        let startDate = momentStartDate.isValid() ? momentStartDate : undefined;
        let endDate = momentEndDate.isValid() ? momentEndDate : undefined;

        let momentMinDate = moment(this.get('minDate'), this.get('serverFormat'));
        let momentMaxDate = moment(this.get('maxDate'), this.get('serverFormat'));
        let minDate = momentMinDate.isValid() ? momentMinDate : undefined;
        let maxDate = momentMaxDate.isValid() ? momentMaxDate : undefined;

        let options = this.getProperties(
            'isInvalidDate',
            'isCustomDate',
            'alwaysShowCalendars',
            'autoUpdateInput',
            'autoApply',
            'timePicker',
            'buttonClasses',
            'applyClass',
            'cancelClass',
            'singleDatePicker',
            'drops',
            'opens',
            'timePicker24Hour',
            'timePickerSeconds',
            'timePickerIncrement',
            'showWeekNumbers',
            'showDropdowns',
            'linkedCalendars',
            'dateLimit',
            'parentEl'
        );

        let localeOptions = this.getProperties(
            'applyLabel',
            'cancelLabel',
            'customRangeLabel',
            'showCustomRangeLabel',
            'fromLabel',
            'toLabel',
            'format',
            'firstDay',
            'daysOfWeek',
            'monthNames',
            'separator'
        );

        const defaultOptions = {
            locale: localeOptions,
            startDate: startDate,
            endDate: endDate,
            minDate: minDate,
            maxDate: maxDate,
        };

        if (!this.get('singleDatePicker')) {
            options.ranges = this.get('ranges');
        }

        return {...options, ...defaultOptions };
    },

    setupPicker() {
        run.cancel(this._setupTimer);
        this._setupTimer = run.scheduleOnce('afterRender', this, this._setupPicker);
    },

    _setupPicker() {
        this.$('.daterangepicker-input').daterangepicker(this.getOptions());
        this.attachPickerEvents();
    },

    attachPickerEvents() {
        this.$('.daterangepicker-input').on('apply.daterangepicker', (ev, picker) => {
            this.handleDateRangePickerEvent('applyAction', picker);
        });

        this.$('.daterangepicker-input').on('hide.daterangepicker', (ev, picker) => {
            this.handleDateRangePickerEvent('hideAction', picker);
        });

        this.$('.daterangepicker-input').on('cancel.daterangepicker', () => {
            this.handleDateRangePickerEvent('cancelAction', undefined, true);
        });
    },

    handleDateRangePickerEvent(actionName, picker, isCancel = false) {
        let action = this.get(actionName);
        let start;
        let end;
        let chosenLabel;

        if (!isCancel) {
            start = picker.startDate.format(this.get('serverFormat'));
            end = picker.endDate.format(this.get('serverFormat'));
            chosenLabel = picker.chosenLabel;
            //console.log('daterangepicker start ', start, ' end ', end, ' picker.startDate ', picker.startDate, ' picker.endDate', picker.endDate);
            this.set('start', picker.startDate);
            this.set('end', picker.endDate);
            this.set('chosenLabel', chosenLabel);
        }

        if (action) {
            Ember.assert(
                `${actionName} for date-range-picker must be a function`,
                typeof action === 'function'
            );
            this.sendAction(actionName, start, end, picker);
        } else {
            if (!this.isDestroyed) {
                // console.log(' Date-Range-Picker ', { start, end, 'chosenLabel': chosenLabel });
                this.setProperties({ start, end, 'chosenLabel': chosenLabel });
            }
        }
    }
});