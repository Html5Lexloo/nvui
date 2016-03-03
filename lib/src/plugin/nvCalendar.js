$.fn.nvCalendar = function(options) {
    return nvui.run.call(this, "nvuiCalendar", arguments);
};

/**
 * 日历组件
 */
nvui.controls.Calendar = function(element, options) {
    nvui.controls.Calendar.base.constructor.call(this, element, options);
};

nvui.inherits(nvui.controls.Calendar, nvui.core.UIComponent, {
    __getType: function() {
        return "nvui.controls.Calendar";
    },

    attr: function() {
        return [];
    },

    _init: function() {
        nvui.controls.Calendar.base._init.call(this);
    },

    setValue: function(value) {},

    getValue: function() {},

    setReadonly: function(readonly) {},

    setEnabled: function() {},

    setDisabled: function() {},
    setDayLabel: function(day, css) {
        this._calendarBase.setDayLabel(day, css);
    },
    onChangeMonth: function(func) {
        this._calendarBase.onChangeMonth(func);
    },
    getSelectedDays: function() {
        return this._calendarBase.getSelectedDays();
    },

    _render: function() {
        var base = $('<div style="position: absolute;width: 97%;top: 38px;bottom: 0;"></div>');
        this._calendarBase = new nvui.controls._CalendarBase(base);

        var changer = $('<div style="height:32px;"></div>');
        this._calendarChanger = new nvui.controls._CalendarMonthChanger(changer, {
            calendar: this._calendarBase
        });

        $(this.element).append(changer);
        $(this.element).append(base);
    }
});

/**
 * 日历组件日期选择器
 */
nvui.controls._CalendarMonthChanger = function(element, options) {
    nvui.controls._CalendarMonthChanger.base.constructor.call(this, element, options);
};

nvui.inherits(nvui.controls._CalendarMonthChanger, nvui.core.UIComponent, {
    __getType: function() {
        return "nvui.controls._CalendarMonthChanger";
    },

    attr: function() {
        return [];
    },

    _init: function() {
        nvui.controls._CalendarMonthChanger.base._init.call(this);

        this._calendar = this.options["calendar"];
    },

    _render: function() {
        var that = this;
        var container = $(this.element);
        container.append('<span class="nv-btn nv-btn-default nv-calendar-button-day">本月</span>').addClass("nv-calendar-datepane");

        var year = $("<b></b>").text(this._calendar.getYear());
        var month = $("<b></b>").text(this._calendar.getMonth());

        var btnPrev = $("<li></li>").click(function() {
            that._calendar.addMonth(-1);
            year.text(that._calendar.getYear());
            month.text(that._calendar.getMonth());
        });
        var btnNext = $("<li></li>").click(function() {
            that._calendar.addMonth(1);
            year.text(that._calendar.getYear());
            month.text(that._calendar.getMonth());
        });

        var bc = $('<ul class="nv-calendar-button-l">').append(btnPrev).append(btnNext);
        var tc = $('<span class="nv-calendar-button-time"></span>').append(year).append("年").append(month).append("月");
        container.append(bc).append(tc);
    }
});

/**
 * 日历组件基础
 */
nvui.controls._CalendarBase = function(element, options) {
    nvui.controls._CalendarBase.base.constructor.call(this, element, options);
};

nvui.inherits(nvui.controls._CalendarBase, nvui.core.UIComponent, {
    __getType: function() {
        return "nvui.controls._CalendarBase";
    },

    attr: function() {
        return [];
    },

    _init: function() {
        nvui.controls._CalendarBase.base._init.call(this);

        //$(this.element).css("height", "100%");
        var initDate = this.options["initDate"];
        if (!!initDate) {
            this._currDate = new Date(initDate);
        } else {
            this._currDate = new Date();
        }
    },

    setValue: function(value) {},

    getValue: function() {},

    setReadonly: function(readonly) {},

    setEnabled: function() {},
    setDisabled: function() {},
    setDayLabel: function(day, css) {
        var c = $("<span>" + day["label"] + "</span>");
        if (css) {
            c.css(css);
        }

        $("#" + day["day"], $(this.element)).append(c);
    },
    onChangeMonth: function(func) {
        this._onChangeMonth = func;

        this._draw();
        if (this._onChangeMonth) {
            this._onChangeMonth(this.startDate, this.endDate);
        }
    },
    getSelectedDays: function() {
        var ids = [];
        $(".nv-calendar-day[sel=1]", $(this.element)).each(function() {
            ids.push($(this).attr("id"));
        });

        return ids.join(",");
    },
    /*
     * 公共方法：改变月份
     */
    addMonth: function(value) {
        var month = this._currDate.getMonth();
        this._currDate.setMonth(month + value);

        this._draw();

        if (this._onChangeMonth) {
            this._onChangeMonth(this.startDate, this.endDate);
        }
    },
    /**
     * 获取年属性
     */
    getYear: function() {
        return this._currDate.getFullYear();
    },

    /**
     * 获取月属性
     */
    getMonth: function() {
        var adapterValue = function(value) {
            return (value >= 10 ? "" : "0") + value;
        };

        return adapterValue(this._currDate.getMonth() + 1);
    },
    _render: function() {},

    _draw: function() {
        var adapterValue = function(value) {
            return (value >= 10 ? "" : "0") + value;
        };

        var createTdHtml = function(dateStr, day, clazz) {
            return "<td class='nv-calendar-day " + clazz + "'id='" + dateStr + "''><span>" + day + "</span></td>";
        };

        var ynow = this._currDate.getFullYear(); //年份
        var mnow = this._currDate.getMonth(); //月份
        var dnow = this._currDate.getDate(); //今日日期
        var adaptMonth;
        var adaptDay;
        var num_div;

        var n1str = new Date(ynow, mnow, 1);
        var firstday = n1str.getDay(); //当月第一天星期几
        var m_days = new Array(31, 28 + nvui.date.isLeap(ynow), 31, 30, 31, 30,
            31, 31, 30, 31, 30, 31); //各月份的总天数
        var tr_str = 6;
        var calendar_arr = [];

        calendar_arr.push("<table class='nv-calendar'><thead>");
        //打印表格第一行（有星期标志）
        calendar_arr
            .push("<tr class='nv-calendar-head'><th style='width:14%'>周日</th><th style='width:14%'>周一</th><th style='width:14%'>周二</th><th style='width:14%'>周三</th><th style='width:14%'>周四</th><th style='width:14%'>周五</th><th style='width:14%'>周六</th></tr>");
        calendar_arr.push("</thead><tbody>");

        var lastDate = nvui.date.addMonths(this._currDate, -1);
        var lastYear = lastDate.getFullYear();
        var lastMonth = lastDate.getMonth();
        var nextDate = nvui.date.addMonths(this._currDate, 1);
        var nextMonth = nextDate.getMonth();

        if (firstday == 0) {
            adaptMonth = adapterValue(lastMonth + 1);

            calendar_arr.push("<tr>");
            for (var j = 6; j >= 0; j--) {
                adaptDay = adapterValue(m_days[lastMonth] - j);
                var date_str = lastYear + "-" + adaptMonth + "-" + adaptDay;

                if (j == 6) {
                    this.startDate = date_str;
                }

                calendar_arr.push("<td class='nv-calendar-day nv-calendar-prevmonth' id='" + date_str + "'>" + "<span>" + adaptDay + "</span></td>");
            }

            calendar_arr.push("</tr>");
            tr_str = 5;
        }

        for (i = 0; i < tr_str; i++) { //表格的行
            calendar_arr.push("<tr>");

            for (k = 0; k < 7; k++) { //表格每行的单元格
                idx = i * 7 + k; //单元格自然序列号

                var date_num = idx - firstday + 1; //计算日期
                var date_str = "";
                if (date_num <= 0) {
                    adaptMonth = adapterValue(lastMonth + 1);

                    date_num = date_num + m_days[lastMonth];
                    adaptDay = adapterValue(date_num);

                    // 记录本月第一天
                    date_str = lastYear + "-" + adaptMonth + "-" + adaptDay;

                    if (k == 0) {
                        this.startDate = date_str;
                    }

                    num_div = createTdHtml(date_str, adaptDay,
                        "nv-calendar-prevmonth");
                } else if (date_num > m_days[mnow]) {
                    adaptMonth = adapterValue(nextMonth + 1);
                    date_num = idx - firstday + 1 - m_days[mnow];

                    adaptDay = adapterValue(date_num);
                    date_str = nextDate.getFullYear() + "-" + adaptMonth + "-" + adaptDay;

                    if (k == 6) {
                        this.endDate = date_str;
                    }

                    num_div = createTdHtml(date_str, adaptDay,
                        "nv-calendar-nextmonth");
                } else {
                    date_num = idx - firstday + 1;

                    adaptMonth = adapterValue(mnow + 1);
                    adaptDay = adapterValue(date_num);

                    date_str = ynow + "-" + adaptMonth + "-" + adaptDay;

                    if (ynow == new Date().getFullYear() && mnow == new Date().getMonth() && date_num == new Date().getDate()) {
                        num_div = createTdHtml(date_str, adaptDay,
                            "nv-calendar-today");
                    } else {
                        num_div = createTdHtml(date_str, adaptDay, "");

                        if (k == 6) {
                            this.endDate = ynow + "-" + adaptMonth + "-" + adaptDay;
                        }
                    }
                }

                calendar_arr.push(num_div);

            }
            calendar_arr.push("</tr>"); //表格的行结束
        }

        calendar_arr.push("</tbody></table>");
        $(this.element).html(calendar_arr.join(""));

        var attachClick = null;
        var attachTitle = "";
        // $.each(plugins, function() {
        //     this.setCalendar(exports);
        //     this.refresh(startDate, endDate, params);
        //     if (this.attachClick) {
        //         attachClick = this.attachClick;
        //         attachTitle = this.attachTitle();
        //     }
        // });

        if (attachClick) {
            var titleSpan = '<span class="nv-cal-headerdec">' + attachTitle + '</span>';
            $(".nv-calendar-day-hd").click(function() {
                var date = $(this).attr("date");
                attachClick(date, params);
            }).append(titleSpan);
        }

        $(".nv-calendar-day", $(this.element)).click(function() {
            var $this = $(this);
            var selected = $this.attr("sel");
            if (selected) {
                $this.removeAttr("sel").css("background", "#fff");
            } else {
                $this.attr("sel", "1").css("background", "green");
            }
        });
    },
});