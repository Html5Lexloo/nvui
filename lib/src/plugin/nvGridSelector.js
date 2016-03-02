/**
 * 网格选择组件
 */
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

        this.selCount = 0;
        this.filter = "";
        this.selectedIds = [];
    },
    _render: function() {
        $(this.element).addClass("nv-gridselector");

        this._loadData();
    }
});

nvui.controls.GridSelector.prototype._loadData = function() {
    this._initFilter();
    this._initTbBody();
};

nvui.controls.GridSelector.prototype._initFilter = function() {
    var that = this;

    var input = $('<input placeholder="查询条件"></input>');
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

    $(this.element).append(p);
};

nvui.controls.GridSelector.prototype._filter = function(text) {
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

nvui.controls.GridSelector.prototype._initTbBody = function() {
    var that = this,
        opts = this.options,
        clientId = opts["clientId"],
        code = opts["code"];


    nvui.data.getJSON("controls/grid_selector/config.mvc", {
        code: code,
        clientId: clientId
    }, function(req) {
        var data = $('<div class="nv-gridselector-data-c"></div>');
        var hasTree = req["treeCode"];
        if (hasTree) {
            var tc = $('<div style="float:left;width:140px;border:1px solid #d4d4d4;height:274px;box-shadow:0 0 4px #ccc;"></div>');
            $(that.element).append(tc);
            data.css("margin-left", "142px");

            tc.addClass("ztree");

            var url = nvui.context + 'dept_tree/data.mvc';
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
                        //var treeObj = $.fn.zTree.getZTreeObj(tc);
                        //treeObj.expandAll(true);

                        // var node = treeObj.getNodesByFilter(function(node) {
                        //     return node.level == 3
                        // }, true);

                        // if (node) {
                        //     treeObj.selectNode(node);
                        //     $(document).trigger("EVENT_TREE_CHANNEL_CLICK", [node.id]);
                        // }
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
        }

        var tbl = that._createTable(req);
        data.append(tbl);
        $(that.element).append(data);

        $.proxy(that._initPageInfo(req["pageInfo"]), that);
    });
};

nvui.controls.GridSelector.prototype._createTable = function(req) {
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
                that._addSelectedId($(this).attr("data"));
            });
        } else {
            cellHs.removeAttr("checked");
            cellHs.parent().parent().removeClass("nv-gridselector-row-selected");
            cellHs.each(function() {
                that._removeSelectedId($(this).attr("data"));
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

nvui.controls.GridSelector.prototype._filterByTree = function(id){
    alert(id);
};

nvui.controls.GridSelector.prototype._initPageInfo = function(pageInfo) {
    this.pager = $('<div class="nv-gridselector-pagination"></div>');
    var selInfo = $('<span class="nv-gridselector-sel">选中项</span>');
    this.selDom = $('<span class="nv-gridselector-selcount">0</span>');
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

    $(this.element).append(pageC);
};

nvui.controls.GridSelector.prototype._cbGetData = function(pageIndex) {
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
nvui.controls.GridSelector.prototype._parseRowData = function(data) {
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

nvui.controls.GridSelector.prototype._addRow = function(tb, data, columns) {
    var tr = $("<tr/>");
    tb.append(tr);

    var td = $('<td class="nv-gridselector-cell" style="text-align:center"/>');
    var chk = $('<input class="nv-gridselector-cell-check" type="checkbox" data="' + data.children("id").text() + '"/>');
    td.append(chk);
    if (data.children("checked").text() == "1") {
        chk.click();
        this._addSelectedId(data.children("id").text());
        tr.addClass("nv-gridselector-row-selected");
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

nvui.controls.GridSelector.prototype._initSelectBox = function() {
    var that = this;
    var cellHs = $(".nv-gridselector-cell-check", that.body);
    if (cellHs.length == 0) {
        return;
    }

    var headHs = that.headChk;
    cellHs.each(function() {
        var $this = $(this);
        var id = $this.attr("data");
        if (that.selectedIds.indexOf(id) > -1) {
            $this.attr("checked", "checked");
        }
    });
    that._updateHeadSelectBox(headHs, cellHs);
    cellHs.click(function(event) {
        var $this = $(this);
        var checked = $this.is(':checked');
        if (checked) {
            that._addSelectedId($this.attr("data"));
            $this.parent().parent().addClass("nv-gridselector-row-selected");
            that._updateHeadSelectBox(headHs, cellHs);
        } else {
            headHs.removeAttr("checked");
            $this.parent().parent().removeClass("nv-gridselector-row-selected");
            that._removeSelectedId($this.attr("data"));
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
            that._removeSelectedId(check.attr("data"));
        } else {
            check.attr("checked", "checked");
            $this.addClass("nv-gridselector-row-selected");
            that._addSelectedId(check.attr("data"));
            that._updateHeadSelectBox(headHs, cellHs);
        }
        event.stopPropagation();
    });
};

nvui.controls.GridSelector.prototype._updateHeadSelectBox = function(headHs, cellHs) {
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

nvui.controls.GridSelector.prototype._addSelectedId = function(id) {
    var ix = this.selectedIds.indexOf(id);

    if (ix == -1) {
        this.selectedIds.push(id);
        this.selCount++;
        this.selDom.html(this.selCount);
    }
};

nvui.controls.GridSelector.prototype._removeSelectedId = function(id) {
    var ix = this.selectedIds.indexOf(id);

    if (ix > -1) {
        this.selectedIds.splice(ix, 1);
        this.selCount--;
        this.selDom.html(this.selCount);
    }
};

nvui.controls.GridSelector.prototype.ok = function() {
    this.callback(this.selectedIds);
};

/*保存配置信息*/
nvui.controls.GridSelector.prototype.saveConfig = function(id) {
    nvui.data.postJSON("controls/grid_selector/saveAuthConfig.mvc", {
        clientId: id,
        value: this.selectedIds.join(","),
        code: this.options.code
    }, function(req) {
        if (req["code"] == 0) {
            $.notify("执行成功");
        } else {
            $.notify("失败:" + req["results"]);
        }
    });
};