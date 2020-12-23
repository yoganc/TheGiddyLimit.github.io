"use strict";

class ItemsPage {
	constructor () {
		this._pageFilter = new PageFilterItems();

		this._sublistCurrencyConversion = null;
		this._sublistCurrencyDisplayMode = null;

		this._$totalWeight = null;
		this._$totalValue = null;
		this._$totalItems = null;

		this._mundaneList = null;
		this._magicList = null;

		this._itemList = [];
		this._itI = 0;

		this._subList = null;
	}

	getListItem (item, itI, isExcluded) {
		const hash = UrlUtil.autoEncodeHash(item);

		if (ExcludeUtil.isExcluded(hash, "item", item.source)) return null;
		if (item.noDisplay) return null;
		Renderer.item.enhanceItem(item);

		this._pageFilter.mutateAndAddToFilters(item, isExcluded);

		const eleLi = document.createElement("li");
		eleLi.className = `row ${isExcluded ? "row--blacklisted" : ""}`;

		const source = Parser.sourceJsonToAbv(item.source);
		const type = item._typeListText.join(", ").toTitleCase();

		if (item._fIsMundane) {
			eleLi.innerHTML = `<a href="#${hash}" class="lst--border">
				<span class="col-3-5 pl-0 bold">${item.name}</span>
				<span class="col-4-5">${type}</span>
				<span class="col-1-5 text-center">${item.value || item.valueMult ? Parser.itemValueToFullMultiCurrency(item, {isShortForm: true}).replace(/ +/g, "\u00A0") : "\u2014"}</span>
				<span class="col-1-5 text-center">${Parser.itemWeightToFull(item, true) || "\u2014"}</span>
				<span class="col-1 text-center ${Parser.sourceJsonToColor(item.source)} pr-0" title="${Parser.sourceJsonToFull(item.source)}" ${BrewUtil.sourceJsonToStyle(item.source)}>${source}</span>
			</a>`;

			const listItem = new ListItem(
				itI,
				eleLi,
				item.name,
				{
					hash,
					source,
					type,
					cost: item.value || 0,
					weight: Parser.weightValueToNumber(item.weight),
				},
				{
					uniqueId: item.uniqueId ? item.uniqueId : itI,
					isExcluded,
				},
			);
			eleLi.addEventListener("click", (evt) => this._mundaneList.doSelect(listItem, evt));
			eleLi.addEventListener("contextmenu", (evt) => ListUtil.openContextMenu(evt, this._mundaneList, listItem));
			return {mundane: listItem};
		} else {
			eleLi.innerHTML += `<a href="#${hash}" class="lst--border">
				<span class="col-3-5 pl-0 bold">${item.name}</span>
				<span class="col-4">${type}</span>
				<span class="col-1-5 text-center">${Parser.itemWeightToFull(item, true) || "\u2014"}</span>
				<span class="attunement col-0-6 text-center">${item._attunementCategory !== "No" ? "×" : ""}</span>
				<span class="rarity col-1-4">${(item.rarity || "").toTitleCase()}</span>
				<span class="source col-1 text-center ${Parser.sourceJsonToColor(item.source)} pr-0" title="${Parser.sourceJsonToFull(item.source)}" ${BrewUtil.sourceJsonToStyle(item.source)}>${source}</span>
			</a>`;

			const listItem = new ListItem(
				itI,
				eleLi,
				item.name,
				{
					source,
					hash,
					type,
					rarity: item.rarity,
					attunement: item._attunementCategory !== "No",
					weight: Parser.weightValueToNumber(item.weight),
				},
				{uniqueId: item.uniqueId ? item.uniqueId : itI},
			);
			eleLi.addEventListener("click", (evt) => this._magicList.doSelect(listItem, evt));
			eleLi.addEventListener("contextmenu", (evt) => ListUtil.openContextMenu(evt, this._magicList, listItem));
			return {magic: listItem};
		}
	}

	handleFilterChange () {
		const f = this._pageFilter.filterBox.getValues();
		function listFilter (li) {
			const it = this._itemList[li.ix];
			return this._pageFilter.toDisplay(f, it);
		}
		this._mundaneList.filter(listFilter.bind(this));
		this._magicList.filter(listFilter.bind(this));
		FilterBox.selectFirstVisible(this._itemList);
	}

	getSublistItem (item, pinId, addCount) {
		const hash = UrlUtil.autoEncodeHash(item);
		const count = addCount || 1;

		const $dispCount = $(`<span class="text-center col-2 pr-0">${count}</span>`);
		const $ele = $$`<li class="row">
			<a href="#${hash}" class="lst--border">
				<span class="bold col-6 pl-0">${item.name}</span>
				<span class="text-center col-2">${item.weight ? `${item.weight} lb${item.weight > 1 ? "s" : ""}.` : "\u2014"}</span>
				<span class="text-center col-2">${item.value || item.valueMult ? Parser.itemValueToFullMultiCurrency(item, {isShortForm: true}).replace(/ +/g, "\u00A0") : "\u2014"}</span>
				${$dispCount}
			</a>
		</li>`.contextmenu(evt => ListUtil.openSubContextMenu(evt, listItem));

		const listItem = new ListItem(
			pinId,
			$ele,
			item.name,
			{
				hash,
				source: Parser.sourceJsonToAbv(item.source),
				weight: Parser.weightValueToNumber(item.weight),
				cost: item.value || 0,
				count,
			},
			{
				$elesCount: [$dispCount],
			},
		);
		return listItem;
	}

	doLoadHash (id) {
		Renderer.get().setFirstSection(true);
		const $content = $(`#pagecontent`).empty();
		const item = this._itemList[id];

		function buildStatsTab () {
			$content.append(RenderItems.$getRenderedItem(item));
		}

		function buildFluffTab (isImageTab) {
			return Renderer.utils.pBuildFluffTab({
				isImageTab,
				$content,
				entity: item,
				pFnGetFluff: Renderer.item.pGetFluff,
			});
		}

		const statTab = Renderer.utils.tabButton(
			"Item",
			() => {},
			buildStatsTab,
		);
		const infoTab = Renderer.utils.tabButton(
			"Info",
			() => {},
			buildFluffTab,
		);
		const picTab = Renderer.utils.tabButton(
			"Images",
			() => {},
			buildFluffTab.bind(null, true),
		);

		// only display the "Info" tab if there's some fluff info--currently (2018-12-13), no official item has text fluff
		if (item.fluff && item.fluff.entries) Renderer.utils.bindTabButtons(statTab, infoTab, picTab);
		else Renderer.utils.bindTabButtons(statTab, picTab);

		ListUtil.updateSelected();
	}

	async pDoLoadSubHash (sub) {
		sub = this._pageFilter.filterBox.setFromSubHashes(sub);
		await ListUtil.pSetFromSubHashes(sub);
	}

	onSublistChange () {
		this._$totalwWeight = this._$totalWeight || $(`#totalweight`);
		this._$totalValue = this._$totalValue || $(`#totalvalue`);
		this._$totalItems = this._$totalItems || $(`#totalitems`);

		let weight = 0;
		let value = 0;
		let cntItems = 0;

		const availConversions = new Set();
		ListUtil.sublist.items.forEach(it => {
			const item = this._itemList[it.ix];
			if (item.currencyConversion) availConversions.add(item.currencyConversion);
			const count = it.values.count;
			cntItems += it.values.count;
			if (item.weight) weight += Number(item.weight) * count;
			if (item.value) value += item.value * count;
		});

		this._$totalwWeight.text(`${weight.toLocaleString(undefined, {maximumFractionDigits: 5})} lb${weight !== 1 ? "s" : ""}.`);
		this._$totalItems.text(cntItems);

		if (availConversions.size) {
			this._$totalValue
				.text(Parser.itemValueToFullMultiCurrency({value, currencyConversion: this._sublistCurrencyConversion}))
				.off("click")
				.click(async () => {
					const values = ["(Default)", ...[...availConversions].sort(SortUtil.ascSortLower)];
					const defaultSel = values.indexOf(this._sublistCurrencyConversion);
					const userSel = await InputUiUtil.pGetUserEnum({
						values,
						isResolveItem: true,
						default: ~defaultSel ? defaultSel : 0,
						title: "Select Currency Conversion Table",
						fnDisplay: it => it === null ? values[0] : it,
					});
					if (userSel == null) return;
					this._sublistCurrencyConversion = userSel === values[0] ? null : userSel;
					await StorageUtil.pSetForPage("sublistCurrencyConversion", this._sublistCurrencyConversion);
					this.onSublistChange();
				});
		} else {
			const modes = ["Exact Coinage", "Lowest Common Currency", "Gold"];
			const text = (() => {
				switch (this._sublistCurrencyDisplayMode) {
					case modes[1]: return Parser.itemValueToFull({value});
					case modes[2]: {
						return value ? `${Parser.DEFAULT_CURRENCY_CONVERSION_TABLE.find(it => it.coin === "gp").mult * value} gp` : "";
					}
					default:
					case modes[0]: {
						const CURRENCIES = ["gp", "sp", "cp"];
						const coins = {cp: value};
						CurrencyUtil.doSimplifyCoins(coins);
						return CURRENCIES.filter(it => coins[it]).map(it => `${coins[it].toLocaleString(undefined, {maximumFractionDigits: 5})} ${it}`).join(", ");
					}
				}
			})();

			this._$totalValue
				.text(text || "\u2014")
				.off("click")
				.click(async () => {
					const defaultSel = modes.indexOf(this._sublistCurrencyDisplayMode);
					const userSel = await InputUiUtil.pGetUserEnum({
						values: modes,
						isResolveItem: true,
						default: ~defaultSel ? defaultSel : 0,
						title: "Select Display Mode",
						fnDisplay: it => it === null ? modes[0] : it,
					});
					if (userSel == null) return;
					this._sublistCurrencyDisplayMode = userSel === modes[0] ? null : userSel;
					await StorageUtil.pSetForPage("sublistCurrencyDisplayMode", this._sublistCurrencyDisplayMode);
					this.onSublistChange();
				});
		}
	}

	async pOnLoad () {
		window.loadHash = this.doLoadHash.bind(this);
		window.loadSubHash = this.pDoLoadSubHash.bind(this);

		[this._sublistCurrencyConversion, this._sublistCurrencyDisplayMode] = await Promise.all([StorageUtil.pGetForPage("sublistCurrencyConversion"), StorageUtil.pGetForPage("sublistCurrencyDisplayMode")]);
		await ExcludeUtil.pInitialise();
		await this._pageFilter.pInitFilterBox({
			$iptSearch: $(`#lst__search`),
			$wrpFormTop: $(`#filter-search-group`).title("Hotkey: f"),
			$btnReset: $(`#reset`),
		});

		return this._pPopulateTablesAndFilters({item: await Renderer.item.pBuildList({isAddGroups: true, isBlacklistVariants: true})});
	}

	async _pPopulateTablesAndFilters (data) {
		this._mundaneList = ListUtil.initList({
			listClass: "mundane",
			fnSort: PageFilterItems.sortItems,
		});
		this._magicList = ListUtil.initList({
			listClass: "magic",
			fnSort: PageFilterItems.sortItems,
		});
		this._mundaneList.nextList = this._magicList;
		this._magicList.prevList = this._mundaneList;
		ListUtil.setOptions({primaryLists: [this._mundaneList, this._magicList]});

		const $elesMundaneAndMagic = $(`.ele-mundane-and-magic`);
		$(`.side-label--mundane`).click(() => {
			const filterValues = itemsPage._pageFilter.filterBox.getValues();
			const curValue = MiscUtil.get(filterValues, "Miscellaneous", "Mundane");
			itemsPage._pageFilter.filterBox.setFromValues({Miscellaneous: {Mundane: curValue === 1 ? 0 : 1}});
			itemsPage.handleFilterChange();
		});
		$(`.side-label--magic`).click(() => {
			const filterValues = itemsPage._pageFilter.filterBox.getValues();
			const curValue = MiscUtil.get(filterValues, "Miscellaneous", "Magic");
			itemsPage._pageFilter.filterBox.setFromValues({Miscellaneous: {Magic: curValue === 1 ? 0 : 1}});
			itemsPage.handleFilterChange();
		});
		const $outVisibleResults = $(`.lst__wrp-search-visible`);
		const $wrpListMundane = $(`.itm__wrp-list--mundane`);
		const $wrpListMagic = $(`.itm__wrp-list--magic`);
		this._mundaneList.on("updated", () => {
			const $elesMundane = $(`.ele-mundane`);

			// Force-show the mundane list if there are no items on display
			if (this._magicList.visibleItems.length) $elesMundane.toggleVe(!!this._mundaneList.visibleItems.length);
			else $elesMundane.showVe();
			$elesMundaneAndMagic.toggleVe(!!(this._mundaneList.visibleItems.length && this._magicList.visibleItems.length));

			const current = this._mundaneList.visibleItems.length + this._magicList.visibleItems.length;
			const total = this._mundaneList.items.length + this._magicList.items.length;
			$outVisibleResults.html(`${current}/${total}`);

			// Collapse the mundane section if there are no magic items displayed
			$wrpListMundane.toggleClass(`itm__wrp-list--empty`, this._mundaneList.visibleItems.length === 0);
		});
		this._magicList.on("updated", () => {
			const $elesMundane = $(`.ele-mundane`);
			const $elesMagic = $(`.ele-magic`);

			$elesMagic.toggleVe(!!this._magicList.visibleItems.length);
			// Force-show the mundane list if there are no items on display
			if (!this._magicList.visibleItems.length) $elesMundane.showVe();
			else $elesMundane.toggleVe(!!this._mundaneList.visibleItems.length);
			$elesMundaneAndMagic.toggleVe(!!(this._mundaneList.visibleItems.length && this._magicList.visibleItems.length));

			const current = this._mundaneList.visibleItems.length + this._magicList.visibleItems.length;
			const total = this._mundaneList.items.length + this._magicList.items.length;
			$outVisibleResults.html(`${current}/${total}`);

			// Collapse the magic section if there are no magic items displayed
			$wrpListMagic.toggleClass(`itm__wrp-list--empty`, this._magicList.visibleItems.length === 0);
		});

		// filtering function
		itemsPage._pageFilter.filterBox.on(
			FilterBox.EVNT_VALCHANGE,
			itemsPage.handleFilterChange.bind(itemsPage),
		);

		SortUtil.initBtnSortHandlers($("#filtertools-mundane"), this._mundaneList);
		SortUtil.initBtnSortHandlers($("#filtertools-magic"), this._magicList);

		this._subList = ListUtil.initSublist({
			listClass: "subitems",
			fnSort: PageFilterItems.sortItems,
			getSublistRow: itemsPage.getSublistItem.bind(itemsPage),
			onUpdate: itemsPage.onSublistChange.bind(itemsPage),
		});
		SortUtil.initBtnSortHandlers($("#sublistsort"), this._subList);
		ListUtil.initGenericAddable();

		this._addItems(data);
		BrewUtil.pAddBrewData()
			.then(this._pHandleBrew.bind(this))
			.then(() => BrewUtil.bind({lists: [this._mundaneList, this._magicList], pHandleBrew: this._pHandleBrew.bind(this)}))
			.then(() => BrewUtil.pAddLocalBrewData())
			.then(async () => {
				BrewUtil.makeBrewButton("manage-brew");
				BrewUtil.bind({lists: [this._mundaneList, this._magicList], filterBox: itemsPage._pageFilter.filterBox, sourceFilter: itemsPage._pageFilter.sourceFilter});
				await ListUtil.pLoadState();
				RollerUtil.addListRollButton();
				ListUtil.addListShowHide();

				ListUtil.bindShowTableButton(
					"btn-show-table",
					"Items",
					this._itemList,
					{
						name: {name: "Name", transform: true},
						source: {name: "Source", transform: (it) => `<span class="${Parser.sourceJsonToColor(it)}" title="${Parser.sourceJsonToFull(it)}" ${BrewUtil.sourceJsonToStyle(it.source)}>${Parser.sourceJsonToAbv(it)}</span>`},
						rarity: {name: "Rarity", transform: true},
						_type: {name: "Type", transform: it => it._typeHtml},
						_attunement: {name: "Attunement", transform: it => it._attunement ? it._attunement.slice(1, it._attunement.length - 1) : ""},
						_properties: {name: "Properties", transform: it => Renderer.item.getDamageAndPropertiesText(it).filter(Boolean).join(", ")},
						_weight: {name: "Weight", transform: it => Parser.itemWeightToFull(it)},
						_value: {name: "Value", transform: it => Parser.itemValueToFullMultiCurrency(it)},
						_entries: {name: "Text", transform: (it) => Renderer.item.getRenderedEntries(it, true), flex: 3},
					},
					{generator: ListUtil.basicFilterGenerator},
					(a, b) => SortUtil.ascSort(a.name, b.name) || SortUtil.ascSort(a.source, b.source),
				);

				this._mundaneList.init();
				this._magicList.init();
				this._subList.init();

				Hist.init(true);
				ExcludeUtil.checkShowAllExcluded(this._itemList, $(`#pagecontent`));

				window.dispatchEvent(new Event("toolsLoaded"));
			});
	}

	async _pHandleBrew (homebrew) {
		const itemList = await Renderer.item.getItemsFromHomebrew(homebrew);
		this._addItems({item: itemList});
	}

	_addItems (data) {
		if (!data.item || !data.item.length) return;

		this._itemList.push(...data.item);

		for (; this._itI < this._itemList.length; this._itI++) {
			const item = this._itemList[this._itI];
			const listItem = itemsPage.getListItem(item, this._itI);
			if (!listItem) continue;
			if (listItem.mundane) this._mundaneList.addItem(listItem.mundane);
			if (listItem.magic) this._magicList.addItem(listItem.magic);
		}

		// populate table labels
		$(`h3.ele-mundane span.side-label`).text("Mundane");
		$(`h3.ele-magic span.side-label`).text("Magic");

		this._mundaneList.update();
		this._magicList.update();

		itemsPage._pageFilter.filterBox.render();
		itemsPage.handleFilterChange();

		ListUtil.setOptions({
			itemList: this._itemList,
			getSublistRow: itemsPage.getSublistItem.bind(itemsPage),
			primaryLists: [this._mundaneList, this._magicList],
		});
		ListUtil.bindAddButton();
		ListUtil.bindSubtractButton();
		const $btnPop = ListUtil.getOrTabRightButton(`btn-popout`, `new-window`);
		Renderer.hover.bindPopoutButton($btnPop, this._itemList);
		UrlUtil.bindLinkExportButton(itemsPage._pageFilter.filterBox);
		ListUtil.bindOtherButtons({
			download: true,
			upload: true,
		});
	}
}

const itemsPage = new ItemsPage();
window.addEventListener("load", () => itemsPage.pOnLoad());
