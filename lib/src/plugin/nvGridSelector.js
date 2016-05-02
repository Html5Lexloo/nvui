/**
 * 网格选择组件
 */
;
(function($) {
    $.fn.nvGridSelector = function(options) {
        return nvui.run.call(this, "nvuiGridSelector", arguments);
    };

    $.fn.nvuiGetGridSelectorManager = function() {
        return nvui.run.call(this, "nvuiGetGridSelectorManager", arguments);
    };

    $.nvuiDefaults.GridSelector = {
        pageRows: 10
    };

    nvui.controls.GridSelector = function(element, options) {
        nvui.controls.GridSelector.base.constructor.call(this, element, options);
    };

    nvui.inherits(nvui.controls.GridSelector, nvui.core.UIComponent, {
        __getType: function() {
            return "nvui.controls.GridSelector";
        },
        __idPrev: function() {
            return 'GridSelector';
        },
        _extendMethods: function() {
            return {};
        },
        _init: function() {
            nvui.controls.Layout.base._init.call(this);
            this.grid = null;
        },
        _render: function() {
            $(this.element).addClass("nv-gridselector");

            this._initGrid();
        }
    });

    nvui.controls.GridSelector.prototype._initGrid = function() {
        var that = this,
            opts = this.options,
            clientId = opts["clientId"],
            code = opts["code"];

        nvui.data.getJSON("controls/grid_selector/config.mvc", {
            code: code,
            clientId: clientId
        }, function(req) {
            if (req["isTree"]) {
                that.grid = new nvui.controls.GridSelector._TreeGrid($(that.element), opts);
            } else {
                that.grid = new nvui.controls.GridSelector._Grid($(that.element), opts);
            }

            that.grid.init(req);
        });
    };

    nvui.controls.GridSelector.prototype.ok = function(callback) {
        if (this.grid) {
            this.grid.ok(callback);
        }
        //this.callback(this.selectedIds);
    };

    nvui.controls.GridSelector._TreeGrid = function(gridElement, opts) {
        this.parent = gridElement;
        this.options = opts;
        this.selected = null;
    };

    nvui.controls.GridSelector._TreeGrid.prototype.init = function(req) {
        var that = this;

        var data = $('<div class="nv-gridselector-data-c"></div>');
        data.height(336);

        var tc = $('<div style="float:left;width:140px;border:1px solid #d4d4d4;height:334px;box-shadow:0 0 4px #ccc;"></div>');
        this.parent.append(tc);
        data.css("margin-left", "142px");

        tc.addClass("ztree");
        var id = nvui.getId();
        tc.attr("id", id);
        var url = nvui.context + 'controls/grid_selector/tree_data.mvc?code=' + that.options["code"];
        var setting = {
            view: {
                selectedMulti: false
            },
            async: {
                enable: true,
                contentType: "application/json",
                url: url
            },
            callback: {
                onAsyncSuccess: function(event, treeId, treeNode, msg) {
                    var treeObj = $.fn.zTree.getZTreeObj(id);
                    treeObj.expandAll(true);

                    var node = treeObj.getNodesByFilter(function(node) {
                        return node.level == 1
                    }, true);

                    if (node) {
                        treeObj.selectNode(node);
                        that._filterByTree(node.id);
                    }
                },
                onClick: function(event, treeId, treeNode) {
                    that._filterByTree(treeNode.id);
                }
            },
            data: {
                simpleData: {
                    enable: true,
                    idKey: 'id',
                    pIdKey: 'pid'
                }
            }
        };

        $.fn.zTree.init(tc, setting, null);

        var tbl = that._createTable(req);
        data.append(tbl);
        this.parent.append(data);
    };

    nvui.controls.GridSelector._TreeGrid.prototype._filterByTree = function(id) {
        var that = this;
        nvui.data.getXml(
            "controls/grid_selector/data_all.mvc", {
                code: that.options["code"],
                parent: id
            },
            $.proxy(that._parseRowData, that)
        );
    };

    nvui.controls.GridSelector._TreeGrid.prototype._createTable = function(req) {
        var that = this;

        that.columns = req["columns"];

        var tbl = $('<table class="nv-gridselector-data" style="width:100%"/>');
        var hd = $('<thead></thead>');
        var row = $("<tr></tr>").appendTo(hd);
        $.each(that.columns, function() {
            var th = $("<th></th>");
            var span = $("<span>" + this["caption"] + "</span>");
            var w = parseInt(this["width"]);
            th.width(w);

            if (this["visible"] == false) {
                th.hide();
            }

            th.append(span);
            row.append(th);
        });

        tbl.append(hd);

        that.body = $('<tbody></tbody>');
        tbl.append(that.body);

        return tbl;
    };
    /**
     * 解析行数据
     */
    nvui.controls.GridSelector._TreeGrid.prototype._parseRowData = function(data) {
        var that = this,
            opts = this.options,
            params = opts["params"],
            code = opts["code"],
            columns = this.columns,
            tb = that.body;

        tb.empty();
        $(data).find("item").each(function() {
            var tr = $("<tr/>");
            tb.append(tr);
            var data = $(this);

            var td = $('<td class="nv-gridselector-cell" style="text-align:center"/>');
            $.each(columns, function() {
                if (this["visible"] != false) {
                    var td = $('<td class="nv-gridselector-cell"/>').css("text-align", (this["align"] || "left").toLowerCase());
                    td.html(data.children(this["code"]).text());
                    tr.append(td);
                }
            });

            tr.data("data", {
                id: data.children("id").text(),
                name: data.children("name").text()
            }).click(function() {
                var $this = $(this);
                $this.siblings().css("background-color", "");
                $this.css("background-color", "#c3c3c3");
                that.selected = $this.data("data");
            });
        });
    };

    nvui.controls.GridSelector._TreeGrid.prototype.ok = function(callback) {
        callback(this.selected);
    };

    nvui.controls.GridSelector._Grid = function(gridElement, opts) {
        this.parent = gridElement;
        this.options = opts;
    };

    nvui.controls.GridSelector._Grid.prototype.init = function(req) {
        var data = $('<div class="nv-gridselector-data-c"></div>');
        this._initFilter();

        var tbl = this._createTable(req);
        data.append(tbl);
        this.parent.append(data);

        this.selectedIds = req["checkedIds"] || [];

        $.proxy(this._initPageInfo(req["pageInfo"]), this);
    };

    nvui.controls.GridSelector._Grid.prototype._initFilter = function() {
        var that = this;

        var input = $('<input type="text" placeholder="查询条件"></input>');
        input.keypress(function(event) {
            if (event.which == 13) {
                that._filter($(this).val());
            }
        });

        var btn = $('<button class="nv-btn nv-btn-warning nv-btn-round">查询</button>');
        btn.click(function() {
            that._filter(input.val());
        });

        var p = $('<div class="nv-gridselector-top"></div>');
        p.append(input).append(btn);

        that.parent.append(p);
    };

    nvui.controls.GridSelector._Grid.prototype._filter = function(text) {
        var that = this;
        this.filter = text;

        nvui.data.getJSON("controls/grid_selector/page_info.mvc", {
            code: this.options.code,
            clientId: this.options.clientId,
            filter: text
        }, function(req) {
            that.pageCount = req["pageCount"];
            that.recordCount = req["recordCount"];

            that.pager.pagination(req["recordCount"], {
                callback: $.proxy(that._cbGetData, that),
                prev_text: '上一页',
                next_text: '下一页',
                items_per_page: that.options.pageRows,
                num_display_entries: 4,
                current_page: 0,
                num_edge_entries: 2
            });
        });
    };


    nvui.controls.GridSelector._Grid.prototype._createTable = function(req) {
        var that = this;

        that.columns = req["columns"];

        var tbl = $('<table class="nv-gridselector-data" style="width:100%"/>');
        var hd = $('<thead></thead>');
        var row = $("<tr></tr>").appendTo(hd);
        var th = $('<th><input class="nv-gridselector-hd-check" type="checkbox"></th>');
        th.width(24);

        that.headChk = th.find(".nv-gridselector-hd-check");
        that.headChk.click(function() {
            var cellHs = $(".nv-gridselector-cell-check", that.body);
            if ($(this).is(':checked')) {
                cellHs.attr("checked", "checked");
                cellHs.parent().parent().addClass("nv-gridselector-row-selected");
                cellHs.each(function() {
                    that._addSelectedId(+$(this).attr("data"));
                });
            } else {
                cellHs.removeAttr("checked");
                cellHs.parent().parent().removeClass("nv-gridselector-row-selected");
                cellHs.each(function() {
                    that._removeSelectedId(+$(this).attr("data"));
                });
            }
        });
        row.append(th);

        $.each(that.columns, function() {
            var th = $("<th></th>");
            var span = $("<span>" + this["caption"] + "</span>");
            var w = parseInt(this["width"]);
            th.width(w);

            if (this["visible"] == false) {
                th.hide();
            }

            th.append(span);
            row.append(th);
        });

        tbl.append(hd);

        that.body = $('<tbody></tbody>');
        tbl.append(that.body);

        return tbl;
    };

    nvui.controls.GridSelector._Grid.prototype._initPageInfo = function(pageInfo) {
        this.pager = $('<div class="nv-gridselector-pagination"></div>');
        var selInfo = $('<span class="nv-gridselector-sel">选中项</span>');
        this.selDom = $('<span class="nv-gridselector-selcount">' + this.selectedIds.length + '</span>');
        selInfo.append(this.selDom);

        this.rec = $('<span class="nv-gridselector-records"></span>');
        var pageC = $('<div class="nv-gridselector-page"></div>');

        pageC.append(selInfo);
        pageC.append(this.pager);
        pageC.append(this.rec);

        this.pageCount = pageInfo["pageCount"];
        this.recordCount = pageInfo["recordCount"];

        this.pager.pagination(pageInfo["recordCount"], {
            callback: $.proxy(this._cbGetData, this),
            prev_text: '上一页',
            next_text: '下一页',
            items_per_page: this.options.pageRows,
            num_display_entries: 4,
            current_page: 0,
            num_edge_entries: 2
        });

        this.parent.append(pageC);
    };

    nvui.controls.GridSelector._Grid.prototype._cbGetData = function(pageIndex) {
        var that = this;
        this.currPage = pageIndex;
        nvui.data.getXml(
            "controls/grid_selector/data.mvc", {
                code: this.options.code,
                clientId: this.options.clientId,
                filter: this.filter,
                page: pageIndex + 1,
                rows: that.options.pageRows
            },
            $.proxy(that._parseRowData, that)
        );
    };


    /**
     * 解析行数据
     */
    nvui.controls.GridSelector._Grid.prototype._parseRowData = function(data) {
        var that = this,
            opts = this.options,
            params = opts["params"],
            code = opts["code"];

        this.body.empty();

        $(data).find("item").each(function() {
            that._addRow(that.body, $(this), that.columns);
        });
        this._initSelectBox();

        var info = (this.currPage + 1) + "/" + this.pageCount + " 共 " + this.recordCount + " 条记录";
        this.rec.html(info);
    };

    nvui.controls.GridSelector._Grid.prototype._addRow = function(tb, data, columns) {
        var tr = $("<tr/>");
        tb.append(tr);

        var td = $('<td class="nv-gridselector-cell" style="text-align:center"/>');
        var id = data.children("id").text();
        var chk = $('<input class="nv-gridselector-cell-check" type="checkbox" data="' + id + '"/>');
        td.append(chk);
        if (data.children("checked").text() == "1") {
            if (this.selectedIds.indexOf(+id) > -1) {
                chk.click();
                tr.addClass("nv-gridselector-row-selected");
            }
        }
        tr.append(td);

        $.each(columns, function() {
            if (this["visible"] != false) {
                var td = $('<td class="nv-gridselector-cell"/>').css("text-align", (this["align"] || "left").toLowerCase());
                td.html(data.children(this["code"]).text());
                tr.append(td);
            }
        });
    };

    nvui.controls.GridSelector._Grid.prototype._initSelectBox = function() {
        var that = this;
        var cellHs = $(".nv-gridselector-cell-check", that.body);
        if (cellHs.length == 0) {
            return;
        }

        var headHs = that.headChk;
        cellHs.each(function() {
            var $this = $(this);
            var id = $this.attr("data");
            if (that.selectedIds.indexOf(+id) > -1) {
                $this.attr("checked", "checked");
            }
        });
        that._updateHeadSelectBox(headHs, cellHs);
        cellHs.click(function(event) {
            var $this = $(this);
            var checked = $this.is(':checked');
            if (checked) {
                that._addSelectedId(+$this.attr("data"));
                $this.parent().parent().addClass("nv-gridselector-row-selected");
                that._updateHeadSelectBox(headHs, cellHs);
            } else {
                headHs.removeAttr("checked");
                $this.parent().parent().removeClass("nv-gridselector-row-selected");
                that._removeSelectedId(+$this.attr("data"));
            }

            event.stopPropagation();
        });

        cellHs.parent().parent().click(function(event) {
            var $this = $(this);
            var check = $this.find("td input:first-child");
            if (check.is(':checked')) {
                check.removeAttr("checked");
                headHs.removeAttr("checked");
                $this.removeClass("nv-gridselector-row-selected");
                that._removeSelectedId(+check.attr("data"));
            } else {
                check.attr("checked", "checked");
                $this.addClass("nv-gridselector-row-selected");
                that._addSelectedId(+check.attr("data"));
                that._updateHeadSelectBox(headHs, cellHs);
            }
            event.stopPropagation();
        });
    };

    nvui.controls.GridSelector._Grid.prototype._updateHeadSelectBox = function(headHs, cellHs) {
        var ca = true;
        cellHs.each(function() {
            var ck = $(this).is(':checked');
            if (!ck) {
                ca = false;

                return false;
            }
        });

        if (ca) {
            headHs.attr("checked", "checked");
        } else {
            headHs.removeAttr("checked");
        }
    };

    nvui.controls.GridSelector._Grid.prototype._addSelectedId = function(id) {
        var ix = this.selectedIds.indexOf(id);

        if (ix == -1) {
            this.selectedIds.push(id);
            this.selDom.html(this.selectedIds.length);
        }
    };

    nvui.controls.GridSelector._Grid.prototype._removeSelectedId = function(id) {
        var ix = this.selectedIds.indexOf(id);

        if (ix > -1) {
            this.selectedIds.splice(ix, 1);
            this.selDom.html(this.selectedIds.length);
        }
    };

    nvui.controls.GridSelector._Grid.prototype.ok = function(callback) {
        callback(this.selectedIds);
    };

    /*保存配置信息*/
    nvui.controls.GridSelector._Grid.prototype.saveConfig = function(id, sucCallback) {
        nvui.data.postJSON("controls/grid_selector/saveAuthConfig.mvc", {
            clientId: id,
            value: this.selectedIds.join(","),
            code: this.options.code
        }, function(req) {
            if (req["code"] == 0) {
                $.notify("执行成功");
                sucCallback();
            } else {
                $.notify("失败:" + req["results"]);
            }
        });
    };

    /*表单单选组件使用*/
    PopupSelect = {};
    PopupSelect.show = function(opts) {
        var dom = $("<div></div>");
        $.showDom({
            title: "选择",
            width: 750,
            height: 450
        }, dom, function() {
            dom.nvGridSelector("ok", opts["callback"]);
        });

        dom.nvGridSelector({
            code: opts["code"]
        });
    };
})(jQuery);