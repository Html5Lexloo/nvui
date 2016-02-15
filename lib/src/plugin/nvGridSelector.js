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
	},
	_render: function() {
		$(this.element).addClass("nv-gridselector");

		this._loadData();
	}
});

nvui.controls.GridSelector.prototype._loadData = function() {
	this._initFilter();
	this._initTbBody();
	this._initPageInfo();
};

nvui.controls.GridSelector.prototype._initFilter = function() {
	$(this.element).append('<div class="nv-gridselector-top">查询</div>');
};

nvui.controls.GridSelector.prototype._initTbBody = function() {
	var that = this,
		opts = this.options,
		params = opts["params"],
		columns = opts["columns"],
		code = opts["code"];

	var tbl = $('<table class="nv-gridselector-data"/>');
	var hd = $('<thead></thead>');
	var row = $("<tr></tr>").appendTo(hd);
	var th = $('<th><input class="nv-gridselector-hd-check" type="checkbox"></th>');
	th.width(24).click(function() {
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

	$.each(columns, function() {
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

	this.body = $('<tbody></tbody>');
	tbl.append(this.body);

	$(this.element).append(tbl);
};

nvui.controls.GridSelector.prototype._initPageInfo = function() {
	var that = this;

	this.pager = $('<div class="nv-gridselector-pagination"></div>');
	var selInfo = $('<span class="nv-gridselector-sel">选中项</span>');
	this.selCount = $('<span class="nv-gridselector-selcount">0</span>');
	selInfo.append(this.selCount);

	this.rec = $('<span class="nv-gridselector-records"></span>');
	var pageC = $('<div class="nv-gridselector-page"></div>');

	pageC.append(selInfo);
	pageC.append(this.pager);
	pageC.append(this.rec);

	var div = $('<div style="height:28px"/>');
	div.append(pageC);
	$(this.element).append(div);
	nvui.data.getJSON("", function(data) {
		alert(data);
		that.pageCount = data["pageCount"];
		that.recordCount = data["recordCount"];

		that.pager.pagination(data["recordCount"], {
			callback: that._cbGetData,
			prev_text: '上一页',
			next_text: '下一页',
			items_per_page: that.options.pageRows,
			num_display_entries: 6,
			current_page: data["currPage"] - 1,
			num_edge_entries: 2
		});

		var info = data["currPage"] + "/" + that.pageCount + " 共 " + that.recordCount + " 条记录";
		that.rec.html(info);
	});
};

nvui.controls.GridSelector.prototype._cbGetData = function() {
	var that = this;
	this.currPage = pageIndex;

	var url = this.makeUrl(pageIndex + 1);
	$.post(
		url,
		null,
		that._parseRowData,
		"xml"
	);
};

/**
 * 解析行数据
 */
nvui.controls.GridSelector.prototype._parseRowData = function(data) {
	var that = this,
		opts = this.options,
		params = opts["params"],
		columns = opts["columns"],
		code = opts["code"];

	this.body.empty();

	$(data).find("item").each(function() {
		that._addRow(that.body, $(this), columns);
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
			var td = $('<td class="nv-gridselector-cell"/>').css("text-align", this["align"].toLowerCase()).html(data.children(this["code"]).text());
			tr.append(td);
		}
	});
};


nvui.controls.GridSelector.prototype.filter = function() {};


nvui.controls.GridSelector.prototype._initSelectBox = function() {
	var that = this;
	var cellHs = $(".nv-gridselector-cell-check", that.body$);
	if (cellHs.length == 0) {
		return;
	}

	var headHs = $(".nv-gridselector-header-check", that.tblHeader$);
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
		this.selCount$.html(this.selCount);
	}
};

nvui.controls.GridSelector.prototype._removeSelectedId = function(id) {
	var ix = this.selectedIds.indexOf(id);

	if (ix > -1) {
		this.selectedIds.splice(ix, 1);
		this.selCount--;
		this.selCount$.html(this.selCount);
	}
};

nvui.controls.GridSelector.prototype.ok = function() {
	this.callback(this.selectedIds);
};