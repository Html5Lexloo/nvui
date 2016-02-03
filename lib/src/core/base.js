/**
 *   nvui 1.0
 *   lexloo
 */
(function($) {
    /*核心对象*/
    window.nvui = $.nvui = {
        version: "1.0.0",
        managerCount: 0,
        managerIdPrev: 'nv',
        pluginPrev: 'nv',
        //组件管理器池
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
        //命名空间
        //核心控件,封装了一些常用方法
        core: {},
        //命名空间
        //组件的集合
        controls: {},
        //plugin 插件的集合
        plugins: {}
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
            if ($(this.element).attr("data-opts")) {
                try {
                    var attroptions = $(this.element).attr("data-opts");
                    if (attroptions.indexOf('{') != 0) attroptions = "{" + attroptions + "}";
                    eval("attroptions = " + attroptions + ";");
                    if (attroptions) $.extend(p, attroptions);
                } catch (e) {}
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
})(jQuery);