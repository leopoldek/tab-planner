import { getSettings, setBadge } from "../tabs.js";

const settings = await getSettings();

function setSettings() {
    return browser.storage.local.set({"settings": settings});
}

function intSetting(name, onchange = null) {
    const text = document.getElementById(name);
    const toggle = document.getElementById(name + "-show");
    text.value = Math.abs(settings[name]);
    text.oninput = async () => {
        if (!/^\d+$/.test(text.value)) {
            text.value = settings[name];
            return;
        }
        settings[name] = parseInt(text.value);
        await setSettings();
        if (onchange !== null) onchange(settings[name]);
    };
    if (toggle !== null) {
        toggle.checked = text.value >= 0;
        text.style.display = toggle.checked ? "" : "none";
        toggle.onchange = async () => {
            settings[name] = toggle.checked ? text.value : -text.value;
            //text.value = settings[name];
            text.style.display = toggle.checked ? "" : "none";
            await setSettings();
            if (onchange !== null) onchange(settings[name]);
        };
    }
}

function boolSetting(name, onchange = null) {
    const checkbox = document.getElementById(name);
    checkbox.checked = settings[name];
    checkbox.onchange = async () => {
        settings[name] = checkbox.checked;
        await setSettings();
        if (onchange !== null) onchange(settings[name]);
    };
}

boolSetting("switch-global");
boolSetting("unload-hidden", async (checked) => {
    if (!checked) return;
    const tabs = await browser.tabs.query({hidden: true});
    browser.tabs.hide(tabs.map(tab => tab.id));
});
intSetting("warn-tab-count", async (count) => {
    const tabs = await browser.tabs.query({hidden: false});
    setBadge(tabs.length);
});
