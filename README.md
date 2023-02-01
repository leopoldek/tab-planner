# Tab Planner
A web browser extension for viewing, filtering & organizing your tabs into groups.

Available for Firefox here: https://addons.mozilla.org/firefox/addon/tab-planner/

## Features
- Filter tabs by title and attributes to find tabs quickly.
- Organize tabs into groups.
- Multiple ways to unload tabs to free up system resources.
- Quickly switch between groups of tabs by hiding tabs you don't need to see right now & decluttering your tab bar.
- Switching away from a group saves the last visited tab, allowing you to jump back to where you were when you switch back.

## Usage
![usage](https://user-images.githubusercontent.com/15792219/215706503-215b7f39-0bb7-44fd-8b63-d4b2bd4b2420.jpg)
1. Group View: List of all your groups. Includes title and tab count. The "Uncategorized" group is for any tab not in a group. Pressing middle mouse button on a group will close all its tabs and delete the group. Double clicking will open that group. (See #8)
2. Tab View: List of all your tabs. Can select multiple tabs by drag clicking or using shift/ctrl while clicking. Pressing middle mouse button on a tab will close it. Double clicking will goto the tab.
3. Create Group: Creates a new group. Upon clicking this, a textbox will appear where you can enter the new name. Then press enter to submit.
4. Delete Group: Deletes the currently selected group.
5. Rename Group: Renames the currently selected group. Upon clicking this, a textbox will appear where you can enter the new name. Then press enter to submit.
6. Recolor Group: Recolors the currently selected group. Upon clicking this, a color picker will appear. Select a color from the gradient box in the center, or change the hue by selecting a color to the right.
7. Move Group: Moves the currently selected group up or down.
8. Open Group: Opens the currently selected group. This will hide all tabs not in the group. To exit this group, open the "Uncategorized" group which will unhide all tabs.
9. Unload Group: Unloads all selected tabs. This will keep the tab open but will stop consuming resources. (You can also right click a tab in the tab bar and select "Unload Tab".)
10. Set Tabs: Sets all selected tabs to the selected group.
11. Filter by Group: Filters the tab view to only show tabs in the currently selected group.
12. Filter by Playing Media: Filters the tab view to only show tabs that are playing audio or muted.
13. Filter by Loaded: Filters the tab view to only show tabs that are loaded.
14. Filter by Title: Filters the tab view to only show tabs that have the keywords in the title.
15. Invert Selection: All tabs that are selected will be unselected and vice-versa.
16. Open Preferences: Opens the preferences page for this extension.

## Permissions
- tabs: For managing your tabs.
- tabHide: For switching to different groups of tabs.
- sessions: For storing data on which tab belongs to which group.
- storage: For storing group data.
- menus: Adds an "Unload Tab" item to the tab context menu.
