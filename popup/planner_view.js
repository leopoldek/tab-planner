import { Planner, setBadge, getSettings } from "../tabs.js";

const settings = await getSettings();
var planner = await Planner.init();
planner.renderGroups();
planner.renderTabs();
//document.getElementById("tab-list").style.width = window.getComputedStyle("tab-list").getPropertyValue('width');

function scrollToActive() {
	const tab_index = planner.tabs.findIndex(tab => tab.data.active);
	if (tab_index === -1) return;
	document.getElementById("tab-list")[tab_index].scrollIntoView({ behavior: "instant", block: "center", inline: "nearest" });
}
scrollToActive();

document.addEventListener("dblclick", async (e) => {
	if (e.target.tagName !== "OPTION") return;
	if (e.target.closest("#groups")) {
		await planner.openGroup(document.getElementById("groups").value);
		filterTabs();
		planner.persistAndRender();
	} else if (e.target.closest("#tab-list")) {
		const tab = planner.tabs[e.target.value];
		await planner.openGroup(settings["switch-global"] ? "" : tab.group, tab.data.id);
		filterTabs();
	    planner.persistAndRender();
	}
});

document.addEventListener("auxclick", (e) => {
	if (e.button !== 1 || e.target.tagName !== "OPTION") return;
	if (e.target.closest("#tab-list")) {
		// Close one tab.
		const tab_list = document.getElementById("tab-list");
		const scroll = tab_list.scrollTop;
		planner.removeTab(e.target.value);
		planner.renderGroups();
		planner.renderTabs();
		filterTabs();
		tab_list.scrollTop = scroll;
	} else if (e.target.closest("#groups")) {
		// Close all tabs in group and delete it.
		const name = e.target.value;
		if (name === "") return;
		const group_list = document.getElementById("groups");
		const scroll = group_list.scrollTop;
		planner.removeTabs(planner.tabs.map((tab, i) => i).filter(i => planner.tabs[i].group === name));
		planner.remove(name);
		planner.persistAndRender();
		filterTabs();
		group_list.scrollTop = scroll;
	}
});

document.getElementById("new").onclick = async () => {
	const name = await pollInputText();
	if (name === "") return;
	planner.create(name);
	planner.persist();
	planner.renderGroups();
};

document.getElementById("delete").onclick = () => {
	const name = document.getElementById("groups").value;
	if (name === "") return;
	planner.remove(name);
	planner.persistAndRender();
};

document.getElementById("rename").onclick = async () => {
	const old_name = document.getElementById("groups").value;
	if (old_name === "") return;
	const new_name = await pollInputText();
	if (new_name === "" || old_name === new_name) return;
	planner.rename(old_name, new_name);
	planner.persistAndRender();
};

document.getElementById("recolor").onclick = async () => {
	const name = document.getElementById("groups").value;
	if (name === "") return;
	const color = await pollColorPicker();
	planner.setGroupColor(name, color);
	planner.persistAndRender();
};

document.getElementById("open").onclick = async () => {
	await planner.openGroup(document.getElementById("groups").value);
	filterTabs();
	planner.persistAndRender();
};

document.getElementById("unload").onclick = async () => {
	const selection = Array.from(document.getElementById("tab-list").selectedOptions);
	await browser.tabs.discard(selection.map(option => planner.tabs[option.value].data.id));
	await planner.reloadTabs();
	filterTabs();
};

document.getElementById("set").onclick = () => {
	const name = document.getElementById("groups").value;
	const selected_tabs = document.getElementById("tab-list").selectedOptions;
	for (const selected of selected_tabs) {
		planner.setTab(selected.value, name);
	}
	planner.persistAndRender();
};

document.getElementById("reorder-up").onclick = () => moveGroup(-1);
document.getElementById("reorder-down").onclick = () => moveGroup(1);
function moveGroup(offset) {
	const name = document.getElementById("groups").value;
	if (name === "") return;
	planner.reorder(name, offset);
	planner.persist();
	planner.renderGroups();
	document.getElementById("groups").value = name;
}

document.getElementById("active").onclick = scrollToActive;

document.getElementById("inverse").onclick = e => {
	const tab_list = document.getElementById("tab-list");
	const scroll = tab_list.scrollTop;
	for (const option of tab_list.childNodes) {
		option.selected = !option.selected;
	}
	tab_list.scrollTop = scroll;
	planner.renderTabs();
};

document.getElementById("close").onclick = e => {
	const tab_list = document.getElementById("tab-list");
	const scroll = tab_list.scrollTop;
	planner.removeTabs(Array.from(tab_list.selectedOptions).map(selected => selected.value));
	planner.renderGroups();
	planner.renderTabs();
	filterTabs();
	tab_list.scrollTop = scroll;
};

document.getElementById("settings").onclick = e => {
	browser.runtime.openOptionsPage();
	window.close();
};

document.getElementById("show-rules").onclick = e => {
	const tab_list = document.getElementById("tab-list");
	const rules = document.getElementById("rules");
	const checked = e.target.checked;
	tab_list.hidden = checked;
	rules.hidden = !checked;
	if (!checked) {
		planner.updateRules(rules.value);
		planner.renderGroups();
        planner.renderTabs();
		filterTabs();
	}
};

document.onvisibilitychange = e => {
	if (!document.getElementById("show-rules").checked) return;
	// We have to do it in the background script because updateRules doesn't work in this event.
	browser.runtime.sendMessage({ruletext: document.getElementById("rules").value});
};

function filterTabs() {
	const group_only = document.getElementById("filter-current").checked;
	const media_only = document.getElementById("filter-media").checked;
	const loaded_only = document.getElementById("filter-loaded").checked;
	const duplicates_only = document.getElementById("filter-duplicates").checked;
	const group_name = document.getElementById("groups").value;
	var search = document.getElementById("search-box").value.toLowerCase().match(/\S+/g);
	if (search === null) search = [];
	const tab_list = document.getElementById("tab-list");
	var urls = {};
	if (duplicates_only) tab_list.childNodes.forEach((node, index) => {
		const url = planner.tabs[index].data.url;
		if (url in urls) urls[url] += 1; else urls[url] = 1;
	});
	tab_list.childNodes.forEach((node, index) => {
		const tab = planner.tabs[index];
		var hide = false;
		const title = node.title.toLowerCase();
		for (const token of search) {
			if (!title.includes(token)) {
				hide = true;
				break;
			}
		}
		if (duplicates_only) hide ||= urls[tab.data.url] === 1;
		hide ||= group_only && tab.group !== group_name;
		hide ||= media_only && !(tab.data.audible || tab.data.mutedInfo.muted);
		hide ||= loaded_only && tab.data.discarded;
		node.hidden = hide;
		node.disabled = hide;
	});
}

function pollInputText(initial_text = "") {
	const button_list = document.getElementById("button-row");
	const text_area = document.getElementById("name-box");
	text_area.value = initial_text;
	button_list.style.display = "none";
	text_area.style.display = "";
	text_area.focus();
	return new Promise((resolve) => {
	    const listener = (e) => {
			if (e.code !== "Enter") return;
			text_area.removeEventListener("keypress", listener);
			button_list.style.display = "";
			text_area.style.display = "none";
			resolve(text_area.value);
	    }
	    text_area.addEventListener("keypress", listener);
	});
}

document.getElementById("groups").onchange = filterTabs;
document.getElementById("search-box").oninput = filterTabs;
document.getElementById("filter-current").onchange = filterTabs;
document.getElementById("filter-duplicates").onchange = filterTabs;
document.getElementById("filter-media").onchange = filterTabs;
document.getElementById("filter-loaded").onchange = filterTabs;
document.getElementById("tab-list").onchange = () => planner.renderTabs();

const row_width = document.getElementById("button-row").getBoundingClientRect().width;
const name_box = document.getElementById("name-box");
name_box.style.width = row_width + "px";

const canvas = document.getElementById("color-picker");
canvas.width = row_width;
canvas.height = row_width;
const canvas_context = canvas.getContext("2d");
const hue_width = canvas.width / 10;
const hue_left = canvas.width - hue_width;

function renderColorPicker(hue = "#FF0000") {
	canvas_context.clearRect(0, 0, canvas.width, canvas.height);
	let gradient = canvas_context.createLinearGradient(0, 0, 0, canvas.height);
	gradient.addColorStop(0, "#FF0000");
	gradient.addColorStop(1 / 6, "#FFFF00");
	gradient.addColorStop((1 / 6) * 2, "#00FF00");
	gradient.addColorStop((1 / 6) * 3, "#00FFFF");
	gradient.addColorStop((1 / 6) * 4, "#0000FF");
	gradient.addColorStop((1 / 6) * 5, "#FF00FF");
	gradient.addColorStop(1, "#FF0000");
	canvas_context.fillStyle = gradient;
	canvas_context.fillRect(hue_left, 0, hue_width, canvas.height);

	gradient = canvas_context.createLinearGradient(0, 0, hue_left, 0);
	gradient.addColorStop(0, "#FFFFFF");
	gradient.addColorStop(1, hue);
	canvas_context.fillStyle = gradient;
	canvas_context.fillRect(0, 0, hue_left, canvas.height);

	gradient = canvas_context.createLinearGradient(0, 0, 0, canvas.height);
	gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
	gradient.addColorStop(1, "rgba(0, 0, 0, 1)");
	canvas_context.fillStyle = gradient;
	canvas_context.fillRect(0, 0, hue_left, canvas.height);
}

function pollColorPicker(initial = [255, 0, 0]) {
	const button_list = document.getElementById("button-row");
	renderColorPicker(`rgb(${initial[0]}, ${initial[1]}, ${initial[2]})`);
	button_list.style.display = "none";
	canvas.style.display = "";
	return new Promise((resolve) => {
	    const listener = (e) => {
			const x = (e.offsetX / canvas.clientWidth) * canvas.width;
			const y = (e.offsetY / canvas.clientHeight) * canvas.height;
			const rgba = canvas_context.getImageData(x, y, 1, 1).data;
			if (x >= hue_left) {
				renderColorPicker(`rgba(${rgba[0]}, ${rgba[1]}, ${rgba[2]}, ${rgba[3]})`);
				return;
			}
			canvas.removeEventListener("click", listener);
			button_list.style.display = "";
			canvas.style.display = "none";
			resolve(Array.from(rgba.slice(0, 3)));
	    }
	    canvas.addEventListener("click", listener);
	});
}

const ruletext = (await browser.storage.local.get("ruletext")).ruletext;
if (ruletext !== undefined) document.getElementById("rules").value = ruletext;
