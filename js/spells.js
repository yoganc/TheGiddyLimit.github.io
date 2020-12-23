"use strict";

const JSON_DIR = "data/spells/";

const SUBCLASS_LOOKUP = {};

function handleBrew (homebrew) {
	RenderSpells.mergeHomebrewSubclassLookup(SUBCLASS_LOOKUP, homebrew);
	addSpells(homebrew.spell);
	return Promise.resolve();
}

class SpellsPage {
	constructor () {
		this._pageFilter = new PageFilterSpells();
		this._multiSource = new MultiSource({
			fnHandleData: addSpells,
			prop: "spell",
		});
	}

	getListItem (spell, spI) {
		const hash = UrlUtil.autoEncodeHash(spell);
		if (!spell.uniqueId && _addedHashes.has(hash)) return null;
		_addedHashes.add(hash);
		const isExcluded = ExcludeUtil.isExcluded(spell.name, "spell", spell.source);

		this._pageFilter.mutateAndAddToFilters(spell, isExcluded);

		const eleLi = document.createElement("li");
		eleLi.className = `row ${isExcluded ? "row--blacklisted" : ""}`;

		const source = Parser.sourceJsonToAbv(spell.source);
		const time = PageFilterSpells.getTblTimeStr(spell.time[0]);
		const school = Parser.spSchoolAndSubschoolsAbvsShort(spell.school, spell.subschools);
		const concentration = spell._isConc ? "×" : "";
		const range = Parser.spRangeToFull(spell.range);

		eleLi.innerHTML = `<a href="#${hash}" class="lst--border">
			<span class="bold col-2-9 pl-0">${spell.name}</span>
			<span class="col-1-5 text-center">${Parser.spLevelToFull(spell.level)}${this._getListItem_getLevelMetaPart(spell)}</span>
			<span class="col-1-7 text-center">${time}</span>
			<span class="col-1-2 sp__school-${spell.school} text-center" title="${Parser.spSchoolAndSubschoolsAbvsToFull(spell.school, spell.subschools)}" ${Parser.spSchoolAbvToStyle(spell.school)}>${school}</span>
			<span class="col-0-6 text-center" title="Concentration">${concentration}</span>
			<span class="col-2-4 text-right">${range}</span>
			<span class="col-1-7 text-center ${Parser.sourceJsonToColor(spell.source)} pr-0" title="${Parser.sourceJsonToFull(spell.source)}" ${BrewUtil.sourceJsonToStyle(spell.source)}>${source}</span>
		</a>`;

		const listItem = new ListItem(
			spI,
			eleLi,
			spell.name,
			{
				hash,
				source,
				level: spell.level,
				time,
				school: Parser.spSchoolAbvToFull(spell.school),
				classes: Parser.spClassesToFull(spell, true, SUBCLASS_LOOKUP),
				concentration,
				normalisedTime: spell._normalisedTime,
				normalisedRange: spell._normalisedRange,
			},
			{
				uniqueId: spell.uniqueId ? spell.uniqueId : spI,
				isExcluded,
			},
		);

		eleLi.addEventListener("click", (evt) => list.doSelect(listItem, evt));
		eleLi.addEventListener("contextmenu", (evt) => ListUtil.openContextMenu(evt, list, listItem));

		return listItem;
	}

	_getListItem_getLevelMetaPart (spell) { return `${spell.meta && spell.meta.ritual ? " (rit.)" : ""}${spell.meta && spell.meta.technomagic ? " (tec.)" : ""}`; }

	handleFilterChange () {
		const f = this._pageFilter.filterBox.getValues();
		list.filter(li => {
			const s = spellList[li.ix];
			return this._pageFilter.toDisplay(f, s);
		});
		MultiSource.onFilterChangeMulti(spellList);
	}

	getSublistItem (spell, pinId) {
		const hash = UrlUtil.autoEncodeHash(spell);
		const school = Parser.spSchoolAndSubschoolsAbvsShort(spell.school, spell.subschools);
		const time = PageFilterSpells.getTblTimeStr(spell.time[0]);
		const concentration = spell._isConc ? "×" : "";
		const range = Parser.spRangeToFull(spell.range);

		const $ele = $(`<li class="row">
			<a href="#${UrlUtil.autoEncodeHash(spell)}" title="${spell.name}" class="lst--border">
				<span class="bold col-3-2 pl-0">${spell.name}</span>
				<span class="capitalise col-1-5 text-center">${Parser.spLevelToFull(spell.level)}${this._getListItem_getLevelMetaPart(spell)}</span>
				<span class="col-1-8 text-center">${time}</span>
				<span class="capitalise col-1-6 sp__school-${spell.school} text-center" title="${Parser.spSchoolAndSubschoolsAbvsToFull(spell.school, spell.subschools)}" ${Parser.spSchoolAbvToStyle(spell.school)}>${school}</span>
				<span class="concentration--sublist col-0-7 text-center" title="Concentration">${concentration}</span>
				<span class="range col-3-2 pr-0 text-right">${range}</span>
			</a>
		</li>`).contextmenu(evt => ListUtil.openSubContextMenu(evt, listItem));

		const listItem = new ListItem(
			pinId,
			$ele,
			spell.name,
			{
				hash,
				school,
				level: spell.level,
				time,
				concentration,
				range,
				normalisedTime: spell._normalisedTime,
				normalisedRange: spell._normalisedRange,
			},
		);
		return listItem;
	}

	doLoadHash (id) {
		Renderer.get().setFirstSection(true);
		const $content = $("#pagecontent").empty();
		const spell = spellList[id];

		function buildStatsTab () {
			$content.append(RenderSpells.$getRenderedSpell(spell, SUBCLASS_LOOKUP));
		}

		function buildFluffTab (isImageTab) {
			return Renderer.utils.pBuildFluffTab({
				isImageTab,
				$content,
				entity: spell,
				pFnGetFluff: Renderer.spell.pGetFluff,
			});
		}

		const statTab = Renderer.utils.tabButton(
			"Spell",
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

		Renderer.utils.bindTabButtons(statTab, infoTab, picTab);

		ListUtil.updateSelected();
	}

	async pDoLoadSubHash (sub) {
		sub = this._pageFilter.filterBox.setFromSubHashes(sub);
		await ListUtil.pSetFromSubHashes(sub, pPreloadSublistSources);

		await spellBookView.pHandleSub(sub);
	}

	async pOnLoad () {
		window.loadHash = this.doLoadHash.bind(this);
		window.loadSubHash = this.pDoLoadSubHash.bind(this);

		await this._pageFilter.pInitFilterBox({
			$iptSearch: $(`#lst__search`),
			$wrpFormTop: $(`#filter-search-group`).title("Hotkey: f"),
			$btnReset: $(`#reset`),
		});

		const [subclassLookup] = await Promise.all([
			RenderSpells.pGetSubclassLookup(),
			ExcludeUtil.pInitialise(),
		]);
		Object.assign(SUBCLASS_LOOKUP, subclassLookup);
		await spellsPage._multiSource.pMultisourceLoad(JSON_DIR, this._pageFilter.filterBox, pPageInit, addSpells, pPostLoad);
		if (Hist.lastLoadedId == null) Hist._freshLoad();
		ExcludeUtil.checkShowAllExcluded(spellList, $(`#pagecontent`));

		window.dispatchEvent(new Event("toolsLoaded"));
	}

	// TODO refactor this and bestiary markdown section
	static popoutHandlerGenerator (toList) {
		return (evt) => {
			if (Hist.lastLoadedId !== null) {
				const toRender = toList[Hist.lastLoadedId];

				if (evt.shiftKey) {
					const $content = Renderer.hover.$getHoverContent_statsCode(toRender);
					Renderer.hover.getShowWindow(
						$content,
						Renderer.hover.getWindowPositionFromEvent(evt),
						{
							title: `${toRender.name} \u2014 Source Data`,
							isPermanent: true,
							isBookContent: true,
						},
					);
				} else if (evt.ctrlKey || evt.metaKey) {
					const name = `${toRender._displayName || toRender.name} \u2014 Markdown`;
					const mdText = RendererMarkdown.get().render({entries: [{type: "dataSpell", dataSpell: toRender}]});
					const $content = Renderer.hover.$getHoverContent_miscCode(name, mdText);

					Renderer.hover.getShowWindow(
						$content,
						Renderer.hover.getWindowPositionFromEvent(evt),
						{
							title: name,
							isPermanent: true,
							isBookContent: true,
						},
					);
				} else {
					Renderer.hover.doPopoutCurPage(evt, toList, Hist.lastLoadedId);
				}
			}
		}
	}
}
SpellsPage._BOOK_VIEW_MODE_K = "bookViewMode";

async function pPostLoad () {
	const homebrew = await BrewUtil.pAddBrewData();
	await handleBrew(homebrew);
	BrewUtil.bind({list});
	BrewUtil.makeBrewButton("manage-brew");
	BrewUtil.bind({filterBox: spellsPage._pageFilter.filterBox, sourceFilter: spellsPage._pageFilter.sourceFilter});
	await ListUtil.pLoadState();

	ListUtil.bindShowTableButton(
		"btn-show-table",
		"Spells",
		spellList,
		{
			name: {name: "Name", transform: true},
			source: {name: "Source", transform: (it) => `<span class="${Parser.sourceJsonToColor(it)}" title="${Parser.sourceJsonToFull(it)}" ${BrewUtil.sourceJsonToStyle(it.source)}>${Parser.sourceJsonToAbv(it)}</span>`},
			level: {name: "Level", transform: (it) => Parser.spLevelToFull(it)},
			time: {name: "Casting Time", transform: (it) => PageFilterSpells.getTblTimeStr(it[0])},
			duration: {name: "Duration", transform: (it) => Parser.spDurationToFull(it)},
			_school: {name: "School", transform: (sp) => `<span class="sp__school-${sp.school}" ${Parser.spSchoolAbvToStyle(sp.school)}>${Parser.spSchoolAndSubschoolsAbvsToFull(sp.school, sp.subschools)}</span>`},
			range: {name: "Range", transform: (it) => Parser.spRangeToFull(it)},
			_components: {name: "Components", transform: (sp) => Parser.spComponentsToFull(sp.components, sp.level)},
			_classes: {
				name: "Classes",
				transform: (sp) => {
					const fromClassList = Renderer.spell.getCombinedClasses(sp, "fromClassList");
					return Parser.spMainClassesToFull(fromClassList);
				},
			},
			entries: {name: "Text", transform: (it) => Renderer.get().render({type: "entries", entries: it}, 1), flex: 3},
			entriesHigherLevel: {name: "At Higher Levels", transform: (it) => Renderer.get().render({type: "entries", entries: (it || [])}, 1), flex: 2},
		},
		{generator: ListUtil.basicFilterGenerator},
		(a, b) => SortUtil.ascSort(a.name, b.name) || SortUtil.ascSort(a.source, b.source),
	);
}

let list;
let subList;
let spellBookView;

async function pPageInit (loadedSources) {
	Object.keys(loadedSources)
		.map(src => new FilterItem({item: src, pFnChange: spellsPage._multiSource.pLoadSource.bind(spellsPage._multiSource)}))
		.forEach(fi => spellsPage._pageFilter.sourceFilter.addItem(fi));

	list = ListUtil.initList({
		listClass: "spells",
		fnSort: PageFilterSpells.sortSpells,
	});
	ListUtil.setOptions({primaryLists: [list]});
	SortUtil.initBtnSortHandlers($(`#filtertools`), list);

	const $outVisibleResults = $(`.lst__wrp-search-visible`);
	list.on("updated", () => {
		$outVisibleResults.html(`${list.visibleItems.length}/${list.items.length}`);
	});

	// filtering function
	spellsPage._pageFilter.filterBox.on(
		FilterBox.EVNT_VALCHANGE,
		spellsPage.handleFilterChange.bind(spellsPage),
	);

	subList = ListUtil.initSublist({
		listClass: "subspells",
		fnSort: PageFilterSpells.sortSpells,
	});
	SortUtil.initBtnSortHandlers($("#sublistsort"), subList);
	ListUtil.initGenericPinnable();

	spellBookView = new BookModeView({
		hashKey: "bookview",
		$openBtn: $(`#btn-spellbook`),
		noneVisibleMsg: "If you wish to view multiple spells, please first make a list",
		pageTitle: "Spells Book View",
		popTblGetNumShown: ($wrpContent, $dispName, $wrpControls) => {
			const toShow = ListUtil.getSublistedIds().map(id => spellList[id])
				.sort((a, b) => SortUtil.ascSortLower(a.name, b.name));

			const renderSpell = (stack, sp) => {
				stack.push(`<div class="bkmv__wrp-item"><table class="stats stats--book stats--bkmv"><tbody>`);
				stack.push(Renderer.spell.getCompactRenderedString(sp));
				stack.push(`</tbody></table></div>`);
			};

			let lastOrder = StorageUtil.syncGetForPage(SpellsPage._BOOK_VIEW_MODE_K);
			if (lastOrder != null) lastOrder = `${lastOrder}`;

			const $selSortMode = $(`<select class="form-control input-sm">
				<option value="0">Spell Level</option>
				<option value="1">Alphabetical</option>
			</select>`)
				.change(() => {
					if (!toShow.length && Hist.lastLoadedId != null) return;

					const val = Number($selSortMode.val());
					if (val === 0) renderByLevel();
					else renderByAlpha();

					StorageUtil.syncSetForPage(SpellsPage._BOOK_VIEW_MODE_K, val);
				});
			if (lastOrder != null) $selSortMode.val(lastOrder);

			$$`<div class="flex-vh-center ml-3"><div class="mr-2 no-wrap">Sort order:</div>${$selSortMode}</div>`.appendTo($wrpControls);

			// region Markdown
			// TODO refactor this and bestiary markdown section
			const getAsMarkdown = () => {
				const toRender = toShow.length ? toShow : [spellList[Hist.lastLoadedId]];
				const parts = [...toRender]
					.sort((a, b) => lastOrder === "0" ? SortUtil.ascSort(a.level, b.level) : SortUtil.ascSortLower(a.name, b.name))
					.map(sp => RendererMarkdown.get().render({type: "dataSpell", dataSpell: sp}).trim());

				const out = [];
				let charLimit = RendererMarkdown._PAGE_CHARS;
				for (let i = 0; i < parts.length; ++i) {
					const part = parts[i];
					out.push(part);

					if (i < parts.length - 1) {
						if ((charLimit -= part.length) < 0) {
							if (RendererMarkdown._isAddPageBreaks) out.push("", "\\pagebreak", "");
							charLimit = RendererMarkdown._PAGE_CHARS;
						}
					}
				}

				return out.join("\n\n");
			};

			const $btnDownloadMarkdown = $(`<button class="btn btn-default btn-sm">Download as Markdown</button>`)
				.click(() => DataUtil.userDownloadText("spells.md", getAsMarkdown()));

			const $btnCopyMarkdown = $(`<button class="btn btn-default btn-sm px-2" title="Copy Markdown to Clipboard"><span class="glyphicon glyphicon-copy"/></button>`)
				.click(async () => {
					await MiscUtil.pCopyTextToClipboard(await getAsMarkdown());
					JqueryUtil.showCopiedEffect($btnCopyMarkdown);
				});

			const $btnDownloadMarkdownSettings = $(`<button class="btn btn-default btn-sm px-2" title="Markdown Settings"><span class="glyphicon glyphicon-cog"/></button>`)
				.click(async () => RendererMarkdown.pShowSettingsModal());

			$$`<div class="flex-v-center btn-group ml-3">
				${$btnDownloadMarkdown}
				${$btnCopyMarkdown}
				${$btnDownloadMarkdownSettings}
			</div>`.appendTo($wrpControls);
			// endregion

			const renderByLevel = () => {
				const stack = [];
				for (let i = 0; i < 10; ++i) {
					const atLvl = toShow.filter(sp => sp.level === i);
					if (atLvl.length) {
						stack.push(`<div class="w-100 h-100 bkmv__no-breaks">`);
						stack.push(`<div class="bkmv__spacer-name flex-v-center no-shrink">${Parser.spLevelToFullLevelText(i)}</div>`);
						atLvl.forEach(sp => renderSpell(stack, sp));
						stack.push(`</div>`);
					}
				}
				$wrpContent.empty().append(stack.join(""));
				lastOrder = "0";
			};

			const renderByAlpha = () => {
				const stack = [];
				toShow.forEach(sp => renderSpell(stack, sp));
				$wrpContent.empty().append(stack.join(""));
				lastOrder = "1";
			};

			const renderNoneSelected = () => {
				const stack = [];
				stack.push(`<div class="w-100 h-100 no-breaks">`);
				const sp = spellList[Hist.lastLoadedId];
				renderSpell(stack, sp);
				$dispName.text(Parser.spLevelToFullLevelText(sp.level));
				stack.push(`</div>`);
				$wrpContent.empty().append(stack.join(""));
			};

			if (!toShow.length && Hist.lastLoadedId != null) renderNoneSelected();
			else if (lastOrder === 1) renderByAlpha();
			else renderByLevel();

			return toShow.length;
		},
		hasPrintColumns: true,
	});

	const homebrew = await BrewUtil.pAddBrewData();
	BrewUtil.bind({pHandleBrew: () => {}}); // temporarily bind "do nothing" brew handler
	await BrewUtil.pAddLocalBrewData(); // load local homebrew, so we can add any local spell classes
	BrewUtil.bind({pHandleBrew: null}); // unbind temporary handler
	Renderer.spell.populateHomebrewClassLookup(homebrew);
}

let spellList = [];
let spI = 0;

const _addedHashes = new Set();
function addSpells (data) {
	if (!data || !data.length) return;

	spellList.push(...data);

	for (; spI < spellList.length; spI++) {
		const spell = spellList[spI];
		const listItem = spellsPage.getListItem(spell, spI);
		if (!listItem) continue;
		list.addItem(listItem);
	}
	list.update();

	spellsPage._pageFilter.filterBox.render();
	spellsPage.handleFilterChange();

	ListUtil.setOptions({
		itemList: spellList,
		getSublistRow: spellsPage.getSublistItem.bind(spellsPage),
		primaryLists: [list],
	});
	ListUtil.bindPinButton();
	const $btnPop = ListUtil.getOrTabRightButton(`btn-popout`, `new-window`);
	Renderer.hover.bindPopoutButton($btnPop, spellList, SpellsPage.popoutHandlerGenerator.bind(SpellsPage), "Popout Window (SHIFT for Source Data; CTRL for Markdown Render)");
	UrlUtil.bindLinkExportButton(spellsPage._pageFilter.filterBox);
	ListUtil.bindOtherButtons({
		download: true,
		upload: {
			pFnPreLoad: pPreloadSublistSources,
		},
		sendToBrew: {
			mode: "spellBuilder",
			fnGetMeta: () => ({
				page: UrlUtil.getCurrentPage(),
				source: Hist.getHashSource(),
				hash: Hist.getHashParts()[0],
			}),
		},
	});
}

async function pPreloadSublistSources (json) {
	const loaded = Object.keys(spellsPage._multiSource.loadedSources)
		.filter(it => spellsPage._multiSource.loadedSources[it].loaded);
	const lowerSources = json.sources.map(it => it.toLowerCase());
	const toLoad = Object.keys(spellsPage._multiSource.loadedSources)
		.filter(it => !loaded.includes(it))
		.filter(it => lowerSources.includes(it.toLowerCase()));
	const loadTotal = toLoad.length;
	if (loadTotal) {
		await Promise.all(toLoad.map(src => spellsPage._multiSource.pLoadSource(src, "yes")));
	}
}

async function pHandleUnknownHash (link, sub) {
	const src = Object.keys(spellsPage._multiSource.loadedSources)
		.find(src => src.toLowerCase() === decodeURIComponent(link.split(HASH_LIST_SEP)[1]).toLowerCase());
	if (src) {
		await spellsPage._multiSource.pLoadSource(src, "yes");
		Hist.hashChange();
	}
}

const spellsPage = new SpellsPage();
window.addEventListener("load", () => spellsPage.pOnLoad());
