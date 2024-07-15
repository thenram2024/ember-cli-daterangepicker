import Component from '@ember/component';
// import moment from 'moment';     Remove for embroider use to get error.
import layout from '../templates/components/date-range-picker';
import { computed } from '@ember/object';
import { isPresent, isEmpty } from '@ember/utils';
import { run,cancel,scheduleOnce } from '@ember/runloop';
import { assert } from '@ember/debug';

const noop = function() {};

export default Component.extend({
    layout,
    // classNames: ['form-group'],
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
    format24WithSeconds: 'MMM D, YYYY, HH:mm:ss',
    format24WithoutSeconds:'MMM D, YYYY, HH:mm',
    format12WithSeconds:'MMM D, YYYY, hh:mm:ss A',
    format12WithoutSeconds:'MMM D, YYYY, hh:mm A',
    rangeText: computed('start', 'end', 'chosenLabel', function() {
        let format = this.get('format');
        let serverFormat = this.get('serverFormat');
        let start = this.get('start');
        let end = this.get('end');
        let chosenLabel = this.get('chosenLabel');
        let timePicker=this.get('timePicker');
        if(timePicker)
        {
            // format='MMM D, YYYY (HH:mm:ss)';
            if(this.get('timePicker24Hour'))
            {
                format = this.get('timePickerSeconds') ? this.get('format24WithSeconds'):this.get('format24WithoutSeconds') ; 
            }
            else{
                format = this.get('timePickerSeconds') ? this.get('format12WithSeconds'):this.get('format12WithoutSeconds') ;
            }
        }
        //TODO need to check with dateRanges in o365attributes for corresponding id for custom range.
        if (this.get('singleDatePicker') === false && isPresent(chosenLabel) && chosenLabel === 'Custom Range') {
            if (!isEmpty(start) && !isEmpty(end)) {
                if(moment.isMoment(start) && start._f === this.serverFormat){
                    return start.format(format) + this.get('separator') + end.format(format);
                }
                // else if(moment.isMoment(start) && start._f === "YYYY-MM-DD HH:mm:ss"){
                //     if(start.isUtc() === false)
                //         return start.local().format(format) + this.get('separator') + end.local().format(format);
                //     else
                //     return start.format(format) + this.get('separator') + end.format(format);
                // }
                else if(moment.isMoment(start) && start._f === "YYYY-MM-DDTHH:mm:ss.SSSSZ"){
                    if(start._i.indexOf("+00:00") ==-1)
                        return start.local().format(format) + this.get('separator') + end.local().format(format);
                    else 
                        return start.utc().format(format) + this.get('separator') + end.utc().format(format);
                }else {
                    console.warn("UnSupported server format");
                }
                return moment(start, serverFormat).format(format) + this.get('separator') + moment(end, serverFormat).format(format);
            }
        }
        if (this.get('singleDatePicker') && isPresent(start)) {
            if(moment.isMoment(start) && start._f === this.serverFormat){
                return start.format(format);
            }
            // else if(moment.isMoment(start) && start._f === "YYYY-MM-DD HH:mm:ss"){
            //     if(start.isUtc() === false)
            //         return start.local().format(format);
            //     else
            //     return start.format(format);
            // }
            else if(moment.isMoment(start) && start._f === "YYYY-MM-DDTHH:mm:ss.SSSSZ"){
                if(start._i.indexOf("+00:00") ==-1)
                    return start.local().format(format);
                else 
                    return start.utc().format(format);
            }else {
                console.warn("UnSupported server format");
            }
            return moment(start, serverFormat).format(format);
        }
        //console.log(' chosen lable in rangeText CP ', chosenLabel);
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
    //currently ranges passed from external component itself.
    ranges: {
        'All Time': ['', ''],
        'Today': [moment(), moment()],
        'Yesterday': [moment().subtract(1, 'days'), moment().subtract(1, 'days')],
        'Last 7 Days': [moment().subtract(6, 'days'), moment()],
        'Last 30 Days': [moment().subtract(29, 'days'), moment()],
        'This Month': [moment().startOf('month'), moment().endOf('month')],
        'Last Month': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')]
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
    autoApply: true,
    alwaysShowCalendars: false,
    context: undefined,
    firstDay: 0,
    isInvalidDate: noop,
    isCustomDate: noop,
    chosenLabel: '',
    selectedOptionId: 0,
    showDropDownLabel: true,
    datePickerDropDownId:null,
	subLabel: "",
	customClass: "",

    didReceiveAttrs() {
        this._super(...arguments);
        //start can me valid moment object or moment with empty or with empty for initial time.
        let start = this.get('start') || moment(this.get('start'));
        let end = this.get('end') || moment(this.get('end'));
        //console.log(' daterange didReceiveAttrs Start ', start, ' end ', end, ' selectedOptionId ', this.get('selectedOptionId'));
        //calculate chosen label for the first time showing.
        if (start.isValid() || end.isValid()) {
            var customRange = true;
            var i = 0;
            let ranges = this.get('ranges');
            for (var range in ranges) {
                if (range !== "All Time") {
                    if (this.get('timePicker')) {
                        if (start.format(this.serverFormat) == this.ranges[range][0].format(this.serverFormat) && end.format(this.serverFormat) == this.ranges[range][1].format(this.serverFormat)) {
                            customRange = false;
                            // this.chosenLabel = this.container.find('.ranges li:eq(' + i + ')').addClass('active').html();
                            this.set('chosenLabel', range);
                            break;
                        }
                    } else {
                        //ignore times when comparing dates if time picker is not enabled
                        if (start.format('YYYY-MM-DD') == ranges[range][0].format('YYYY-MM-DD') && end.format('YYYY-MM-DD') == ranges[range][1].format('YYYY-MM-DD')) {
                            customRange = false;
                            // this.chosenLabel = this.container.find('.ranges li:eq(' + i + ')').addClass('active').html();
                            this.set('chosenLabel', range);
                            break;
                        }
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
        } else if (!start.isValid() && !end.isValid()) {
            this.set('chosenLabel', 'All Time');
        }
    },
    // Init the dropdown when the component is added to the DOM
    didInsertElement() {
        this._super(...arguments);
        this.setupPicker();
    },

    didUpdateAttrs() {
        this._super(...arguments);
        this.setupPicker();
    },

    // Remove the hidden dropdown when this component is destroyed
    willDestroy() {
        this._super(...arguments);

        cancel(this._setupTimer);

        if (this.get('removeDropdownOnDestroy')) {
            if(isPresent(this.datePickerDropDownId))
                $('#'+this.datePickerDropDownId).remove();
            else
                $('.daterangepicker').remove();
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
            'parentEl',
			'subLabel',
			'customClass'
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
        cancel(this._setupTimer);
        this._setupTimer = scheduleOnce('afterRender', this, this._setupPicker);
    },

    _setupPicker() {
          let ele =this.element.querySelector('.daterangepicker-input');
          $(ele).daterangepicker(this.getOptions())
        if(isPresent(this.datePickerDropDownId)){
            $('.daterangepicker').each((i,e)=>{
                let elem=$(e);
                if(!elem.is('[id]')){
                    elem.attr('id',this.datePickerDropDownId);
                }
            });
        }
        this.attachPickerEvents();
    },

    attachPickerEvents() {
        let ele =this.element.querySelector('.daterangepicker-input');
        $(ele).on('apply.daterangepicker', (ev, picker) => {
            this.handleDateRangePickerEvent(this.applyAction, picker);
        });

        $(ele).on('hide.daterangepicker', (ev, picker) => {
            this.handleDateRangePickerEvent(this.hideAction, picker);
        });

        $(ele).on('cancel.daterangepicker', () => {
            this.handleDateRangePickerEvent(this.cancelAction, undefined, true);
        });

    
    },

    handleDateRangePickerEvent(callBackAction, picker, isCancel = false) {
        let start;
        let end;
        let chosenLabel;

        if (!isCancel) {
            start = picker.startDate.format(this.get('serverFormat'));
            end = picker.endDate.format(this.get('serverFormat'));
            chosenLabel = picker.chosenLabel;
            this.set('start', picker.startDate);
            this.set('end', picker.endDate);
            this.set('chosenLabel', chosenLabel);
        }

        if (callBackAction) {
            assert(
                `${actionName} for date-range-picker must be a function`,
                typeof callBackAction === 'function'
            );
          

            callBackAction(start, end, chosenLabel, picker); 
        } 
        else {
            if (!this.isDestroyed) {
                // console.log(' Date-Range-Picker ', { start, end, 'chosenLabel': chosenLabel });
                this.setProperties({ start, end, 'chosenLabel': chosenLabel });
            }
        }
    }
});
