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
	$(this.element).append('<div class="nv-gridselector-top"><input placeholder="查询条件"></input><span>查询<span></div>');
};

nvui.controls.GridSelector.prototype._initTbBody = function() {
	var that = this,
		opts = this.options,
		params = opts["params"],
		code = opts["code"];


	nvui.data.getJSON("controls/grid-selector/config.mvc", {
		code: code
	}, function(req) {
		that.columns = req["columns"];

		var tbl = $('<table class="nv-gridselector-data"/>');
		var hd = $('<thead></thead>');
		var row = $("<tr></tr>").appendTo(hd);
		var th = $('<th><input class="nv-gridselector-hd-check" type="checkbox"></th>');
		th.width(24);

		that.hdChk = th.find(".nv-gridselector-hd-check");
		that.hdChk.click(function() {
			var cellHs = $(".nv-gridselector-cell-check", that.body);
			if ($(this).is(':checked')) {
				cellHs.attr("checked", "checked");
				cellHs.each(function() {
					that._addSelectedId($(this).attr("data"));
				});
			} else {
				cellHs.removeAttr("checked");
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

		$(that.element).append(tbl);

		that._initPageInfo(req["pageInfo"]);
	});
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
		num_display_entries: 6,
		current_page: 0,
		num_edge_entries: 2
	});

	var info = pageInfo["currPage"] + "/" + this.pageCount + " 共 " + this.recordCount + " 条记录";
	this.rec.html(info);

	$(this.element).append(pageC);
};

nvui.controls.GridSelector.prototype._cbGetData = function(pageIndex) {
	var that = this;
	this.currPage = pageIndex;
	nvui.data.getXml(
		"controls/grid-selector/data.mvc", {
			code: this.options.code,
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
	td.append('<input class="nv-gridselector-cell-check" type="checkbox" data="' + data.children("id").text() + '"/>');
	tr.append(td);

	$.each(columns, function() {
		if (this["visible"] != false) {
			var td = $('<td class="nv-gridselector-cell"/>').css("text-align", (this["align"] || "left").toLowerCase()).html(data.children(this["code"]).text());
			tr.append(td);
		}
	});
};


nvui.controls.GridSelector.prototype.filter = function() {};


nvui.controls.GridSelector.prototype._initSelectBox = function() {
	var that = this;
	var cellHs = $(".nv-gridselector-cell-check", that.body);
	if (cellHs.length == 0) {
		return;
	}

	var headHs = that.hdChk;
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
			that._updateHeadSelectBox(headHs, cellHs);
		} else {
			headHs.removeAttr("checked");
			that._removeSelectedId($this.attr("data"));
		}

		event.stopPropagation();
	});

	cellHs.parent().parent().click(function(event) {
		var check = $(this).find("td input:first-child");
		if (check.is(':checked')) {
			check.removeAttr("checked");
			headHs.removeAttr("checked");
			that._removeSelectedId(check.attr("data"));
		} else {
			check.attr("checked", "checked");
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