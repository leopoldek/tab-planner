import { Planner, setBadge } from "./tabs.js";

async function updateCount(tabId, isOnRemoved) {
    let tabs = await browser.tabs.query({hidden: false});
    let length = tabs.length;
    // onRemoved fires too early and the count is one too many.
    // see https://bugzilla.mozilla.org/show_bug.cgi?id=1396758
    if (isOnRemoved && tabId && tabs.map((t) => { return t.id; }).includes(tabId)) {
        length--;
    }
    await setBadge(length);
    return length;
}

browser.tabs.onCreated.addListener(async (tab) => {
    updateCount(tab.id, false);
    if ("openerTabId" in tab) {
        var group = await browser.sessions.getTabValue(tab.openerTabId, "group");
        if (group !== undefined) browser.sessions.setTabValue(tab.id, "group", group);
    } else {
        const getter = await browser.storage.local.get("current");
        if ("current" in getter && getter.current !== "") {
            browser.sessions.setTabValue(tab.id, "group", getter.current);
        }
    }
});

browser.tabs.onRemoved.addListener(async (id) => {
    const count = await updateCount(id, true);
    if (count < 2) {
        const planner = await Planner.init();
        if (planner.getGroupCount(planner.current) === 0) {
            await planner.openGroup("");
            setBadge(planner.tabs.length);
            planner.persistAndRender();
        }
    }
});

//browser.tabs.onMoved.addListener((id, info) => {
//    
//});

browser.menus.onClicked.addListener((info, tab) => {
    //switch (info.menuItemId)
    browser.tabs.discard(tab.id);
});

browser.runtime.onInstalled.addListener(details => {
    browser.menus.create({
        "id": "unload",
        "title": "Unload Tab",
        "contexts": ["tab"]
    });
});

browser.browserAction.setBadgeTextColor({"color": "white"});
updateCount();
