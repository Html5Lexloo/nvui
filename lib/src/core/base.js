/**
 *   nvui 1.0
 *   lexloo
 */
;
(function($) {
    Date.prototype.format = function(format) {
        var o = {
            "M+": this.getMonth() + 1, //month
            "d+": this.getDate(), //day
            "h+": this.getHours(), //hour
            "m+": this.getMinutes(), //minute
            "s+": this.getSeconds(), //second
            "q+": Math.floor((this.getMonth() + 3) / 3), //quarter
            "S": this.getMilliseconds() //millisecond
        }
        if (/(y+)/.test(format)) format = format.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
        for (var k in o)
            if (new RegExp("(" + k + ")").test(format))
                format = format.replace(RegExp.$1,
                    RegExp.$1.length == 1 ? o[k] :
                    ("00" + o[k]).substr(("" + o[k]).length));
        return format;
    };

    /*核心对象*/
    window.nvui = $.nvui = {
        version: "1.0.0",
        managerCount: 0,
        managerIdPrev: 'nv',
        pluginPrev: 'nv',
        /*组件管理器池*/
        managers: {},
        /*继承*/
        inherits: function(clazz, parent, overrides) {
            if (typeof parent != 'function') {
                return clazz;
            }

            clazz.base = parent.prototype;
            clazz.base.constructor = parent;

            var f = function() {};
            f.prototype = parent.prototype;
            clazz.prototype = new f();
            clazz.prototype.constructor = clazz;

            if (overrides) {
                $.extend(clazz.prototype, overrides);
            }
        },
        template: function(template, data) {
            return template.replace(/\{([\w\.]*)\}/g, function(str, key) {
                var keys = key.split(".");
                var v = data[keys.shift()];
                for (var i = 0, l = keys.length; i < l; i++) {
                    v = v[keys[i]];
                }
                return (typeof v !== "undefined" && v !== null) ? v : "";
            });
        },
        /*延时加载*/
        defer: function(fn, o, t, args) {
            return setTimeout(function() {
                fn.apply(o, args || [])
            }, t);
        },

        getId: function(prev) {
            prev = prev || this.managerIdPrev;
            var id = prev + (1000 + this.managerCount);
            this.managerCount++;

            return id;
        },

        //根据类型查找某一个对象
        find: function(type) {
            var arr = [];
            for (var id in this.managers) {
                var manager = this.managers[id];
                if (type instanceof Function) {
                    if (manager instanceof type) {
                        arr.push(manager);
                    }
                } else if (type instanceof Array) {
                    if ($.inArray(manager.__getType(), type) != -1) {
                        arr.push(manager);
                    }
                } else {
                    if (manager.__getType() == type) {
                        arr.push(manager);
                    }
                }
            }
            return arr;
        },

        add: function(manager) {
            if (arguments.length == 2) {
                var m = arguments[1];
                m.id = m.id || m.options.id || arguments[0].id;
                this.addManager(m);
                return;
            }
            if (!manager.id) manager.id = this.getId(manager.__idPrev());
            //if (this.managers[manager.id]) manager.id = this.getId(manager.__idPrev());
            //if (this.managers[manager.id])
            //{
            //    throw new Error(this.error.managerIsExist);
            //}
            this.managers[manager.id] = manager;
        },
        remove: function(arg) {
            if (typeof arg == "string" || typeof arg == "number") {
                delete nvui.managers[arg];
            } else if (typeof arg == "object") {
                if (arg instanceof nvui.core.Component) {
                    delete nvui.managers[arg.id];
                } else {
                    if (!$(arg).attr(this.idAttrName)) return false;
                    delete nvui.managers[$(arg).attr(this.idAttrName)];
                }
            }

        },

        get: function(arg, idAttrName) {
            idAttrName = idAttrName || "nvid";
            if (typeof arg == "string" || typeof arg == "number") {
                return nvui.managers[arg];
            } else if (typeof arg == "object") {
                var domObj = arg.length ? arg[0] : arg;
                var id = domObj[idAttrName] || $(domObj).attr(idAttrName);
                if (!id) return null;

                return nvui.managers[id];
            }
            return null;
        },

        //$.fn.nvui{Plugin} 和 $.fn.nvuiGet{Plugin}Manager
        //会调用这个方法,并传入作用域(this)
        //parm [plugin]  插件名
        //parm [args] 参数(数组)
        //parm [ext] 扩展参数,定义命名空间或者id属性名
        run: function(plugin, args, ext) {
            if (!plugin) return;
            ext = $.extend({
                defaultsNamespace: 'nvuiDefaults',
                methodsNamespace: 'nvuiMethods',
                controlNamespace: 'controls',
                idAttrName: 'nvuiid',
                isStatic: false,
                hasElement: true, //是否拥有element主体(比如drag、resizable等辅助性插件就不拥有)
                propertyToElemnt: null //链接到element的属性名
            }, ext || {});
            plugin = plugin.replace(/^nvuiGet/, '');
            plugin = plugin.replace(/^nvui/, '');
            if (this == null || this == window || ext.isStatic) {
                if (!nvui.plugins[plugin]) {
                    nvui.plugins[plugin] = {
                        fn: $[nvui.pluginPrev + plugin],
                        isStatic: true
                    };
                }

                return new $.nvui[ext.controlNamespace][plugin]($.extend({}, $[ext.defaultsNamespace][plugin] || {}, $[ext.defaultsNamespace][plugin + 'String'] || {}, args.length > 0 ? args[0] : {}));
            }
            if (!nvui.plugins[plugin]) {
                nvui.plugins[plugin] = {
                    fn: $.fn[nvui.pluginPrev + plugin],
                    isStatic: false
                };
            }
            if (/Manager$/.test(plugin)) return nvui.get(this, ext.idAttrName);
            this.each(function() {
                if (this[ext.idAttrName] || $(this).attr(ext.idAttrName)) {
                    var manager = nvui.get(this[ext.idAttrName] || $(this).attr(ext.idAttrName));
                    if (manager && args.length > 0) manager.set(args[0]);
                    //已经执行过 
                    return;
                }
                if (args.length >= 1 && typeof args[0] == 'string') return;
                //只要第一个参数不是string类型,都执行组件的实例化工作
                var options = args.length > 0 ? args[0] : null;
                var p = $.extend({}, $[ext.defaultsNamespace][plugin], $[ext.defaultsNamespace][plugin + 'String'], options);
                if (ext.propertyToElemnt) p[ext.propertyToElemnt] = this;
                if (ext.hasElement) {
                    new $.nvui[ext.controlNamespace][plugin](this, p);
                } else {
                    new $.nvui[ext.controlNamespace][plugin](p);
                }
            });
            if (this.length == 0) return null;
            if (args.length == 0) return nvui.get(this, ext.idAttrName);

            if (typeof args[0] == 'object') return nvui.get(this, ext.idAttrName);
            if (typeof args[0] == 'string') {
                var manager = nvui.get(this, ext.idAttrName);
                if (manager == null) return;
                if (args[0] == "option") {
                    if (args.length == 2)
                        return manager.get(args[1]); //manager get
                    else if (args.length >= 3)
                        return manager.set(args[1], args[2]); //manager set
                } else {
                    var method = args[0];
                    if (!manager[method]) return; //不存在这个方法
                    var parms = Array.apply(null, args);
                    parms.shift();
                    return manager[method].apply(manager, parms); //manager method
                }
            }
            return null;
        },
        /*上下文*/
        context: (function() {
            var contextPath = document.location.pathname;
            var index = contextPath.substr(1).indexOf("/");
            var cp = contextPath.substr(1, index);

            if (/salesmanage|wxwx|yypt|ws|em|weixin|xfsh|zwt/.test(cp)) {
                return "/" + cp + "/";
            }

            return "/";
        })(),
        //命名空间
        //数据访问对象
        data: {},
        //命名空间
        //核心控件,封装了一些常用方法
        core: {},
        //命名空间
        //组件的集合
        controls: {},
        //plugin 插件的集合
        plugins: {}
    };

    String.prototype.format = function(params) {
        return nvui.template(this, params)
    };

    nvui.date = {
        monthStartDateStr: function(date) {
            return date.format('yyyy-MM-01');
        },
        /**
         * 获取当前月的第一天(yyyy-MM-01)
         */
        getMonthStartStr: function() {
            return new Date().format('yyyy-MM-01');
        },
        /**
         * 获取当天(yyyy-MM-dd)
         */
        getCurrDateStr: function() {
            return new Date().format('yyyy-MM-dd');
        },

        /*
         *增加月
         */
        addMonths: function(date, i) {
            return new Date(date.getFullYear(), date.getMonth() + i, date.getDate());
        },

        /**
         * 判断年是否是闰年
         */
        isLeap: function(year) {
            return (year % 100 == 0 ? res = (year % 400 == 0 ? 1 : 0) : res = (year % 4 == 0 ? 1 : 0));
        }
    };

    //扩展对象
    $.nvuiDefaults = {};

    //扩展对象
    $.nvuiMethods = {};

    //关联起来
    nvui.defaults = $.nvuiDefaults;
    nvui.methods = $.nvuiMethods;

    nvui.core.Component = function(options) {
        this.events = this.events || {};
        this.options = options || {};
        this.children = {};
    };

    $.extend(nvui.core.Component.prototype, {
        __getType: function() {
            return 'nvui.core.Component';
        },
        __idPrev: function() {
            return 'nvui';
        },

        //设置属性
        // arg 属性名    value 属性值 
        // arg 属性/值   value 是否只设置事件
        set: function(arg, value, value2) {
            if (!arg) return;
            if (typeof arg == 'object') {
                var tmp;
                if (this.options != arg) {
                    $.extend(this.options, arg);
                    tmp = arg;
                } else {
                    tmp = $.extend({}, arg);
                }
                if (value == undefined || value == true) {
                    for (var p in tmp) {
                        if (p.indexOf('on') == 0)
                            this.set(p, tmp[p]);
                    }
                }
                if (value == undefined || value == false) {
                    for (var p in tmp) {
                        if (p.indexOf('on') != 0)
                            this.set(p, tmp[p], value2);
                    }
                }
                return;
            }
            var name = arg;
            //事件参数
            if (name.indexOf('on') == 0) {
                if (typeof value == 'function')
                    this.bind(name.substr(2), value);
                return;
            }
            if (!this.options) this.options = {};
            if (this.trigger('propertychange', [arg, value]) == false) return;
            this.options[name] = value;
            var pn = '_set' + name.substr(0, 1).toUpperCase() + name.substr(1);
            if (this[pn]) {
                this[pn].call(this, value, value2);
            }
            this.trigger('propertychanged', [arg, value]);
        },

        //获取属性
        get: function(name) {
            var pn = '_get' + name.substr(0, 1).toUpperCase() + name.substr(1);
            if (this[pn]) {
                return this[pn].call(this, name);
            }
            return this.options[name];
        },

        hasBind: function(arg) {
            var name = arg.toLowerCase();
            var event = this.events[name];

            return (event && event.length);
        },

        //触发事件
        //data (可选) Array(可选)传递给事件处理函数的附加参数
        trigger: function(arg, data) {
            if (!arg) return;
            var name = arg.toLowerCase();
            var event = this.events[name];

            if (!event) return;
            data = data || [];
            if ((data instanceof Array) == false) {
                data = [data];
            }
            for (var i = 0; i < event.length; i++) {
                var ev = event[i];
                if (ev.handler.apply(ev.context, data) == false)
                    return false;
            }
        },

        //绑定事件
        bind: function(arg, handler, context) {
            if (typeof arg == 'object') {
                for (var p in arg) {
                    this.bind(p, arg[p]);
                }
                return;
            }
            if (typeof handler != 'function') return false;
            var name = arg.toLowerCase();
            var event = this.events[name] || [];
            context = context || this;
            event.push({
                handler: handler,
                context: context
            });
            this.events[name] = event;
        },

        //取消绑定
        unbind: function(arg, handler) {
            if (!arg) {
                this.events = {};
                return;
            }
            var name = arg.toLowerCase();
            var event = this.events[name];
            if (!event || !event.length) return;
            if (!handler) {
                delete this.events[name];
            } else {
                for (var i = 0, l = event.length; i < l; i++) {
                    if (event[i].handler == handler) {
                        event.splice(i, 1);
                        break;
                    }
                }
            }
        },
        destroy: function() {
            nvui.remove(this);
        }
    });

    nvui.core.UIComponent = function(element, options) {
        nvui.core.UIComponent.base.constructor.call(this, options);
        var extendMethods = this._extendMethods();
        if (extendMethods) $.extend(this, extendMethods);
        this.element = element;
        this._init();
        this._preRender();
        this.trigger('render');
        this._render();
        this.trigger('rendered');
        this._rendered();
    };

    nvui.inherits(nvui.core.UIComponent, nvui.core.Component, {
        __getType: function() {
            return 'nvui.core.UIComponent';
        },
        //扩展方法
        _extendMethods: function() {

        },
        _init: function() {
            this.type = this.__getType();
            if (!this.element) {
                this.id = this.options.id || nvui.getId(this.__idPrev());
            } else {
                this.id = this.options.id || this.element.id || nvui.getId(this.__idPrev());
            }
            //存入管理器池
            nvui.add(this);

            if (!this.element) return;

            //读取attr方法,并加载到参数,比如['url']
            var attributes = this.attr();
            if (attributes && attributes instanceof Array) {
                for (var i = 0; i < attributes.length; i++) {
                    var name = attributes[i];
                    if ($(this.element).attr(name)) {
                        this.options[name] = $(this.element).attr(name);
                    }
                }
            }

            //读取data-opts这个属性，并加载到参数，比如 data-opts = "width:120;heigth:100"
            var p = this.options;
            var opts = $(this.element).attr("data-opts");
            if (opts) {
                $.each(opts.replace(/\s+/g, "").split(";"), function() {
                    var item = this.split(":");
                    if (/^[0-9]*$/.test(item[1])) {
                        p[item[0]] = parseInt(item[1]);
                    } else {
                        p[item[0]] = item[1];
                    }
                });
            }
        },
        //预渲染,可以用于继承扩展
        _preRender: function() {

        },
        _render: function() {

        },
        _rendered: function() {
            if (this.element) {
                $(this.element).attr("nvuiid", this.id);
            }
        },
        _setCls: function(value) {
            if (this.element && value) {
                $(this.element).addClass(value);
            }
        },

        //返回要转换成nvui参数的属性,比如['url']
        attr: function() {
            return [];
        },
        destroy: function() {
            if (this.element) {
                $(this.element).remove();
            }
            this.options = null;
            nvui.remove(this);
        }
    });

    //表单控件基类
    nvui.controls.Input = function(element, options) {
        nvui.controls.Input.base.constructor.call(this, element, options);
    };

    nvui.inherits(nvui.controls.Input, nvui.core.UIComponent, {
        __getType: function() {
            return 'nvui.controls.Input';
        },
        attr: function() {
            return ['nullText'];
        },
        setValue: function(value) {
            return this.set('value', value);
        },
        getValue: function() {
            return this.get('value');
        },
        //设置只读
        _setReadonly: function(readonly) {
            var wrapper = this.wrapper || this.text;
            if (!wrapper || !wrapper.hasClass("l-text")) return;
            var inputText = this.inputText;
            if (readonly) {
                if (inputText) inputText.attr("readonly", "readonly");
                wrapper.addClass("l-text-readonly");
            } else {
                if (inputText) inputText.removeAttr("readonly");
                wrapper.removeClass("l-text-readonly");
            }
        },
        setReadonly: function(readonly) {
            return this.set('readonly', readonly);
        },
        setEnabled: function() {
            return this.set('disabled', false);
        },
        setDisabled: function() {
            return this.set('disabled', true);
        },
        updateStyle: function() {

        },
        resize: function(width, height) {
            this.set({
                width: width,
                height: height + 2
            });
        }
    });

    // /*全局窗口对象*/
    // nvui.win = {
    //     /*顶端显示*/
    //     top: false,

    //     /*遮罩*/
    //     mask: function(win) {
    //         function setHeight() {
    //             if (!nvui.win.windowMask) return;
    //             var h = $(window).height() + $(window).scrollTop();
    //             nvui.win.windowMask.height(h);
    //         }
    //         if (!this.windowMask) {
    //             this.windowMask = $("<div class='l-window-mask' style='display: block;'></div>").appendTo('body');
    //             $(window).bind('resize.nvuiwin', setHeight);
    //             $(window).bind('scroll', setHeight);
    //         }
    //         this.windowMask.show();
    //         setHeight();
    //         this.masking = true;
    //     },

    //     /*取消遮罩*/
    //     unmask: function(win) {
    //         var jwins = $("body > .l-dialog:visible,body > .l-window:visible");
    //         for (var i = 0, l = jwins.length; i < l; i++) {
    //             var winid = jwins.eq(i).attr("nvuiid");
    //             if (win && win.id == winid) continue;
    //             /*获取ligerui对象*/
    //             var winmanager = nvui.get(winid);
    //             if (!winmanager) continue;
    //             /*是否模态窗口*/
    //             var modal = winmanager.get('modal');
    //             /*如果存在其他模态窗口，那么不会取消遮罩*/
    //             if (modal) return;
    //         }
    //         if (this.windowMask)
    //             this.windowMask.hide();
    //         this.masking = false;
    //     },

    //     /*显示任务栏*/
    //     createTaskbar: function() {
    //         if (!this.taskbar) {
    //             this.taskbar = $('<div class="l-taskbar"><div class="l-taskbar-tasks"></div><div class="l-clear"></div></div>').appendTo('body');
    //             if (this.top) this.taskbar.addClass("l-taskbar-top");
    //             this.taskbar.tasks = $(".l-taskbar-tasks:first", this.taskbar);
    //             this.tasks = {};
    //         }
    //         this.taskbar.show();
    //         this.taskbar.animate({
    //             bottom: 0
    //         });
    //         return this.taskbar;
    //     },

    //     //关闭任务栏
    //     removeTaskbar: function() {
    //         var self = this;
    //         self.taskbar.animate({
    //             bottom: -32
    //         }, function() {
    //             self.taskbar.remove();
    //             self.taskbar = null;
    //         });
    //     },
    //     activeTask: function(win) {
    //         for (var winid in this.tasks) {
    //             var t = this.tasks[winid];
    //             if (winid == win.id) {
    //                 t.addClass("l-taskbar-task-active");
    //             } else {
    //                 t.removeClass("l-taskbar-task-active");
    //             }
    //         }
    //     },

    //     /*获取任务*/
    //     getTask: function(win) {
    //         var self = this;
    //         if (!self.taskbar) return;
    //         if (self.tasks[win.id]) return self.tasks[win.id];
    //         return null;
    //     },


    //     /*增加任务*/
    //     addTask: function(win) {
    //         var self = this;
    //         if (!self.taskbar) self.createTaskbar();
    //         if (self.tasks[win.id]) return self.tasks[win.id];
    //         var title = win.get('title');
    //         var task = self.tasks[win.id] = $('<div class="l-taskbar-task"><div class="l-taskbar-task-icon"></div><div class="l-taskbar-task-content">' + title + '</div></div>');
    //         self.taskbar.tasks.append(task);
    //         self.activeTask(win);
    //         task.bind('click', function() {
    //             self.activeTask(win);
    //             if (win.actived)
    //                 win.min();
    //             else
    //                 win.active();
    //         }).hover(function() {
    //             $(this).addClass("l-taskbar-task-over");
    //         }, function() {
    //             $(this).removeClass("l-taskbar-task-over");
    //         });
    //         return task;
    //     },

    //     hasTask: function() {
    //         for (var p in this.tasks) {
    //             if (this.tasks[p])
    //                 return true;
    //         }
    //         return false;
    //     },

    //     /*移除任务*/
    //     removeTask: function(win) {
    //         var self = this;
    //         if (!self.taskbar) return;
    //         if (self.tasks[win.id]) {
    //             self.tasks[win.id].unbind();
    //             self.tasks[win.id].remove();
    //             delete self.tasks[win.id];
    //         }
    //         if (!self.hasTask()) {
    //             self.removeTaskbar();
    //         }
    //     },

    //     /*前端显示*/
    //     setFront: function(win) {
    //         var wins = liger.find(liger.core.Win);
    //         for (var i in wins) {
    //             var w = wins[i];
    //             if (w == win) {
    //                 $(w.element).css("z-index", "9200");
    //                 this.activeTask(w);
    //             } else {
    //                 $(w.element).css("z-index", "9100");
    //             }
    //         }
    //     }
    // };

    // /*窗口基类 window、dialog*/
    // nvui.core.Win = function(element, options) {
    //     nvui.core.Win.base.constructor.call(this, element, options);
    // };

    // nvui.inherits(nvui.core.Win, nvui.core.UIComponent, {
    //     __getType: function() {
    //         return 'liger.controls.Win';
    //     },
    //     mask: function() {
    //         if (this.options.modal)
    //             nvui.win.mask(this);
    //     },
    //     unmask: function() {
    //         if (this.options.modal)
    //             nvui.win.unmask(this);
    //     },
    //     min: function() {},
    //     max: function() {},
    //     active: function() {}
    // });

    // nvui.draggable = {
    //     dragging: false
    // };

    // nvui.resizable = {
    //     reszing: false
    // };
})(jQuery);

(function() {
    var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        escapable =
        /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        gap, indent, meta = {
            '\b': '\\b',
            '\t': '\\t',
            '\n': '\\n',
            '\f': '\\f',
            '\r': '\\r',
            '"': '\\"',
            '\\': '\\\\'
        },
        rep;

    var quote = function(string) {
        escapable.lastIndex = 0;

        return escapable.test(string) ? '"' + string.replace(escapable, function(a) {
            var c = meta[a];
            return typeof c === 'string' ? c : '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
        }) + '"' : '"' + string + '"';
    };

    var str = function(key, holder) {
        var i, k, v, length, mind = gap,
            partial, value = holder[key];

        if (value && typeof value === 'object' && typeof value.toJSON === 'function') {
            value = value.toJSON(key);
        }

        if (typeof rep === 'function') {
            value = rep.call(holder, key, value);
        }

        switch (typeof value) {
            case 'string':
                return quote(value);
            case 'number':
                return isFinite(value) ? String(value) : 'null';
            case 'boolean':
            case 'null':
                return String(value);
            case 'object':
                if (!value) {
                    return 'null';
                }

                gap += indent;
                partial = [];
                if (Object.prototype.toString.apply(value) === '[object Array]') {
                    length = value.length;
                    for (i = 0; i < length; i += 1) {
                        partial[i] = str(i, value) || 'null';
                    }
                    v =
                        partial.length === 0 ? '[]' : gap ? '[\n' + gap + partial.join(',\n' + gap) + '\n' + mind + ']' : '[' + partial.join(',') + ']';
                    gap = mind;
                    return v;
                }

                if (rep && typeof rep === 'object') {
                    length = rep.length;
                    for (i = 0; i < length; i += 1) {
                        if (typeof rep[i] === 'string') {
                            k = rep[i];
                            v = str(k, value);
                            if (v) {
                                partial.push(quote(k) + (gap ? ': ' : ':') + v);
                            }
                        }
                    }
                } else {
                    for (k in value) {
                        if (Object.prototype.hasOwnProperty.call(value, k)) {
                            v = str(k, value);
                            if (v) {
                                partial.push(quote(k) + (gap ? ': ' : ':') + v);
                            }
                        }
                    }
                }

                v = partial.length === 0 ? '{}' : gap ? '{\n' + gap + partial.join(',\n' + gap) + '\n' + mind + '}' : '{' + partial.join(',') + '}';
                gap = mind;
                return v;
        }
    };

    if (typeof JSON == 'undefined') {
        JSON = {};
    }

    if (typeof JSON.stringify !== 'function') {
        JSON.stringify = function(value, replacer, space) {
            var i;
            gap = '';
            indent = '';

            if (typeof space === 'number') {
                for (i = 0; i < space; i += 1) {
                    indent += ' ';
                }
            } else if (typeof space === 'string') {
                indent = space;
            }

            rep = replacer;
            if (replacer && typeof replacer !== 'function' && (typeof replacer !== 'object' || typeof replacer.length !== 'number')) {
                throw new Error('JSON.stringify');
            }

            return str('', {
                '': value
            });
        };
    }

    if (typeof JSON.parse !== 'function') {
        JSON.parse = function(text, reviver) {
            var j;

            function walk(holder, key) {
                var k, v, value = holder[key];
                if (value && typeof value === 'object') {
                    for (k in value) {
                        if (Object.prototype.hasOwnProperty.call(value, k)) {
                            v = walk(value, k);
                            if (v !== undefined) {
                                value[k] = v;
                            } else {
                                delete value[k];
                            }
                        }
                    }
                }
                return reviver.call(holder, key, value);
            }

            text = String(text);
            cx.lastIndex = 0;
            if (cx.test(text)) {
                text = text.replace(cx, function(a) {
                    return '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
                });
            }

            if (/^[\],:{}\s]*$/.test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@').replace(
                    /"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']').replace(
                    /(?:^|:|,)(?:\s*\[)+/g, ''))) {
                j = eval('(' + text + ')');

                return typeof reviver === 'function' ? walk({
                    '': j
                }, '') : j;
            }

            throw new SyntaxError('JSON.parse');
        };
    }

    nvui.data.getJSON = function() {
        var url = nvui.context + arguments[0];
        var params;
        var cb;
        if (typeof arguments[1] == "function") {
            cb = arguments[1];
        } else {
            params = arguments[1];
            cb = arguments[2];
        }

        $.get(url, params, function(data) {
            cb(data);
            //          $.unmask();
        }, 'json');
        //      $.mask();
    };

    nvui.data.postJSON = function() {
        var url = nvui.context + arguments[0];
        var params;
        var cb;
        if (typeof arguments[1] == "function") {
            cb = arguments[1];
        } else {
            params = arguments[1];
            cb = arguments[2];
        }

        $.post(url, params, function(data) {
            cb(data);
            //          $.unmask();
        }, 'json');
        //      $.mask();
    };

    nvui.data.getXml = function() {
        var url = nvui.context + arguments[0];
        var params;
        var cb;
        if (typeof arguments[1] == "function") {
            cb = arguments[1];
        } else {
            params = arguments[1];
            cb = arguments[2];
        }

        $.get(url, params, function(data) {
            cb(data);
            //          $.unmask();
        }, 'text');

        //      $.mask();
    };

    /*string format*/
    String.prototype.format = function(params) {
        return nvui.template(this, params)
    };
})();