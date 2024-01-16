
function cyrb53(str, seed = 0) {
  let h1 = 0xdeadbeef ^ seed,
    h2 = 0x41c6ce57 ^ seed;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};

function stringToHexColor(str) {
    if (str == "") return "FFFFFF";
    const hash = cyrb53(str);
    var r = hash & 0xFF;
    var g = (hash >> 8) & 0xFF;
    var b = (hash >> 16) & 0xFF;
    if (r < 10) r = 0xFF - r;
    if (g < 10) g = 0xFF - g;
    if (b < 10) b = 0xFF - b;
    if (b > 245) b -= 10;
    return r.toString(16) + g.toString(16) + b.toString(16);
}

function rgbToHsl(r, g, b){
    r /= 255, g /= 255, b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;

    if(max == min){
        h = s = 0; // achromatic
    }else{
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch(max){
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return [h, s, l];
}

export function parseRules(rules, url, title) {
    url = url.toLowerCase();
    title = title.toLowerCase();
    for (const [group, rulelist] of Object.entries(rules)) {
        for (const rule of rulelist) {
            if (rule.charAt(0) === '!') {
                if (title.includes(rule.substr(1))) return group;
            } else {
                if (url.includes(rule)) return group;
            }
        }
    }
    return null;
}

// TODO: Move render funcs into planner_view.js
// TODO: Have a active/archived tab for groups. Archived tabs are saved but not currently opened.
// TODO: Undo/Redo feature.
// TODO: Way to move tabs in the planner view.
// TODO: Add a context menu when right clicking on page to change group using dropdown submenu radio options. (menus.ContextType.all)
// Use menus.onShown to populate the menu at click time. https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/menus/onShown
// TODO: If user manually sets a tabs group, exempt it from auto grouping with a modified flag.
// Have an option to reset group. (if tab isn't in the ruleset, dont change the group but clear the modified flag.)
export class Planner {
    tabs;
    groups;
    current;
    
    static async init() {
        const self = new Planner();
        const reload = self.reloadTabs();
        
        const getter = await browser.storage.local.get(["groups", "current"]);
        self.groups = "groups" in getter ? getter.groups : [];
        self.current = "current" in getter ? getter.current : "";
        
        await reload;
        return self;
    }
    
    async reloadTabs() {
        const tabs = await browser.tabs.query({});
        const groups = await Promise.all(tabs.map(tab => browser.sessions.getTabValue(tab.id, "group")));
        for (let i = 0; i < groups.length; i++) {
            if (groups[i] === undefined) groups[i] = "";
        }
        this.tabs = tabs.map((tab, i) => {return {"data": tab, "group": groups[i], "changed": false};});
    }
    
    getGroupColor(name) {
        if (name === "") return [255, 255, 255];
        return this.groups[this.getGroupIndex(name)].color;
    }
    
    setGroupColor(name, color) {
        this.groups[this.getGroupIndex(name)].color = color;
    }
    
    getGroupTabs(name) {
        if (name === "") return this.tabs;
        return this.tabs.filter(tab => tab.group === name);
    }
    
    getGroupCount(name) {
        if (name === "") return this.tabs.filter(tab => tab.group === "").length;
        return this.getGroupTabs(name).length;
    }
    
    getGroupIndex(name) {
        return this.groups.findIndex(group => group.name === name);
    }
    
    containsGroup(name) {
        if (name === "") return true;
        return this.getGroupIndex(name) !== -1;
    }
    
    async getGroupCurrent(name) {
        if (name === "") return this.tabs.find(tab => tab.data.active);
        const tabs = this.getGroupTabs(name);
        const group = this.groups.find(group => group.name === name);
        if (tabs.length === 0) {
            const tab = {"data": await browser.tabs.create({}), "group": name, "changed": true};
            group.current = tab.data.id;
            this.tabs.push(tab);
            return tab;
        }
        const current_tab = tabs.find(tab => tab.data.id === group.current);
        return current_tab !== undefined ? current_tab : tabs[0];
    }
    
    async openGroup(name, custom_tab_id = null) {
        if (!this.containsGroup(name)) return;
        
        const current_group = this.groups.find(group => group.name === this.current);
        const active_tab = this.tabs.find(tab => tab.data.active);
        if (current_group !== undefined) {
            current_group.current = active_tab.data.id;
        }
        
        var active_tab_id = custom_tab_id;
        if (active_tab_id === null) {
            const current_tab = await this.getGroupCurrent(name);
            if (!current_tab.data.active && current_tab.group === name) active_tab_id = current_tab.data.id;
        }
        if (active_tab_id !== null) {
            await browser.tabs.update(active_tab_id, {"active": true});
            await this.reloadTabs();
        }
        
        if (this.current === name) return;
        this.current = name;
        var show = [];
        var hide = [];
        this.tabs.forEach(tab => {
            if (name === "" || tab.group === name) {
                show.push(tab.data.id);
            } else {
                hide.push(tab.data.id);
            }
        });
        
        const update_badge = setBadge(show.length);
        const show_promise = browser.tabs.show(show);
        const hide_promise = browser.tabs.hide(hide);
        if ((await getSettings())["unload-hidden"]) await browser.tabs.discard(hide);
        await show_promise;
        await hide_promise;
        await update_badge;
    }
    
    setTab(index, group) {
        if (this.tabs[index].group === group) return;
        this.tabs[index].group = group;
        this.tabs[index].changed = true;
    }
    
    create(name) {
        if (this.containsGroup(name)) return;
        
        const color = stringToHexColor(name);
        const r = parseInt(color.substr(1, 2), 16);
        const g = parseInt(color.substr(3, 2), 16);
        const b = parseInt(color.substr(5, 2), 16);
        this.groups.push({name: name, color: [r, g, b], current: null});
    }
    
    remove(name) {
        var index = this.getGroupIndex(name);
        if (index === -1) return;
        this.groups.splice(index, 1);
        this.getGroupTabs(name).forEach(tab => {
            tab.group = "";
            tab.changed = true;
        });
    }
    
    rename(old_name, new_name) {
        const index = this.getGroupIndex(old_name);
        if (index === -1) return;
        this.groups[index].name = new_name;
        this.getGroupTabs(old_name).forEach(tab => {
            tab.group = new_name;
            tab.changed = true;
        });
    }
    
    reorder(name, offset) {
        const index = this.getGroupIndex(name);
        if (index === -1) return;
        const new_index = index + offset;
        if (new_index < 0 || new_index >= this.groups.length) return;
        const group = this.groups[index];
        this.groups.splice(index, 1);
        this.groups.splice(new_index, 0, group);
    }
    
    async removeTab(index) {
        const id = this.tabs[index].data.id;
        this.tabs.splice(index, 1);
        await browser.tabs.remove(id);
        await this.reloadTabs();
    }
    
    async removeTabs(indices) {
        const ids = indices.map(index => this.tabs[index].data.id);
        indices.sort().reverse().forEach(index => this.tabs.splice(index, 1));
        await browser.tabs.remove(ids);
        await this.reloadTabs();
    }
    
    updateRules(ruletext) {
        const rulelist = ruletext.split("\n");
        var group = "";
        var rules = {};
        for (const rule of rulelist) {
            if (rule.length === 0) {
                continue;
            } else if (rule.length >= 2 && rule.charAt(0) === '/' && rule.charAt(1) === '/') {
                continue;
            } else if (rule.length >= 2 && rule.charAt(0) === '[' && rule.charAt(rule.length - 1) === ']') {
                group = rule.substr(1, rule.length - 2);
            } else if (this.containsGroup(group)) {
                if (!(group in rules)) rules[group] = [];
                rules[group].push(rule.toLowerCase());
            }
        }
        browser.storage.local.set({"ruletext": ruletext, "rules": rules});
        for (let i = 0; i < this.tabs.length; i++) {
            const new_group = parseRules(rules, this.tabs[i].data.url, this.tabs[i].data.title);
            if (new_group !== null) this.setTab(i, new_group);
        }
        this.persist();
    }
    
    renderGroups() {
        const setElement = (element, group, value = group.name) => {
            element.setAttribute("value", value);
            element.setAttribute("style", `background-color: rgb(${group.color[0]}, ${group.color[1]}, ${group.color[2]});`);
            element.setAttribute("title", group.name);
            element.textContent = `${group.name} (${this.getGroupCount(value)})`;
        }
        const group_list = document.getElementById("groups");
        if (group_list.childNodes.length - 1 !== this.groups.length) {
            const elements = this.groups.map(group => {
                const element = document.createElement("option");
                setElement(element, group);
                return element;
            });
            const all_element = document.createElement("option");
            setElement(all_element, {name: "Uncategorized", color: this.getGroupColor("")}, "");
            elements.unshift(all_element);
            group_list.replaceChildren(...elements);
        } else {
            //element.textContent = `Uncategorized (${this.getGroupCount("")})`;
            setElement(group_list.childNodes[0], {name: "Uncategorized", color: this.getGroupColor("")}, "");
            this.groups.forEach((group, i) => {
                setElement(group_list.childNodes[i + 1], group);
            });
        }
    }
    
    renderTabs() {
        const setElement = (element, tab, i) => {
            const color = this.getGroupColor(tab.group);
            element.setAttribute("value", i);
            element.setAttribute("style", `background-color: rgb(${color[0]}, ${color[1]}, ${color[2]}); color: ${element.selected ? "#0000FF" : "black"};`);
            element.setAttribute("title", tab.data.title + "\n" + tab.data.url);
            element.textContent = tab.data.title;
        };
        const tab_list = document.getElementById("tab-list");
        if (tab_list.childNodes.length !== this.tabs.length) {
            const elements = this.tabs.map((tab, i) => {
                const element = document.createElement("option");
                setElement(element, tab, i);
                return element;
            });
            tab_list.replaceChildren(...elements);
        } else {
            this.tabs.forEach((tab, i) => {
                setElement(tab_list.childNodes[i], tab, i);
            });
        }
    }
    
    persist() {
        const changed_tabs = this.tabs.filter(tab => tab.changed);
        const promises = changed_tabs.map(tab => browser.sessions.setTabValue(tab.data.id, "group", tab.group));
        promises.push(browser.storage.local.set({"groups": this.groups, "current": this.current}));
        return Promise.all(promises);
    }
    
    persistAndRender() {
        this.persist();
        this.renderGroups();
        this.renderTabs();
    }
};

export async function setBadge(count) {
    const promise = browser.browserAction.setBadgeText({"text": count < 1000 ? count.toString(): ">1k"});
    const warn_count = (await getSettings())["warn-tab-count"];
    var color = count > warn_count ? "red" : "green";
    if (warn_count < 0) color = "#305050";
    await browser.browserAction.setBadgeBackgroundColor({"color": color});
    await promise;
}

const defaults = {
    "unload-hidden": false,
    "switch-global": true,
    "warn-tab-count": 60,
    //"unload-tab-timeout": -1,
};

export async function getSettings() {
    const local = (await browser.storage.local.get("settings")).settings;
    if (local === undefined) return defaults;
    //for (const setting in defaults) {
    //    if (!(setting in local)) local[setting] = defaults[setting];
    //}
    return local;
}
