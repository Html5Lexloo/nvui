/**
 * nvui 1.0
 * YearMonthSelect
 */
(function($) {
    $.fn.nvYearMonthSelect = function(options) {
        return nvui.run.call(this, "nvuiYearMonthSelect", arguments);
    };

    /**
     * 年月选择
     */
    nvui.controls.YearMonthSelect = function(element, options) {
        nvui.controls.YearMonthSelect.base.constructor.call(this, element, options);
    };

    nvui.inherits(nvui.controls.YearMonthSelect, nvui.core.UIComponent, {
        __getType: function() {
            return "nvui.controls.YearMonthSelect";
        },

        attr: function() {
            return [];
        },

        setValue: function(value) {

        },

        getValue: function() {
            return this._y.val() + "-" + this._m.val();
        },

        setReadonly: function(readonly) {

        },

        setEnabled: function() {

        },

        setDisabled: function() {

        },
        _render: function() {
            var that = this;
            var d = new Date();
            var opts = this.options;

            var y = this._y = $('<select style="margin-left: 2px;"/>');
            var cy = d.getFullYear();
            var startYear = opts["startYear"] || 2012;
            for (var i = startYear; i <= cy; i++) {
                y.append("<option>" + i + "</option>");
            }
            y.val(cy);

            var m = this._m = $('<select style="margin-left:2px;margin-right:2px;"/>');
            for (var i = 1; i <= 12; i++) {
                m.append("<option>" + (i > 9 ? "" + i : "0" + i) + "</option>");
            }
            var cm = d.getMonth() + 1;
            m.val(cm > 9 ? cm : "0" + cm);

            $(that.element).addClass("nv-yearmonthselect").append(y).append(m);
        }
    });
})(jQuery);