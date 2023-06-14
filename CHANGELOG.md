# 1.16.0

-   default displayed speed will now be the highest found when land speed is 0
-   added `Force Highest Speed` setting, when enabled the highest speed will always be used as default even if the land speed isn't 0
-   removed equipment carry icon/menu from vehicles
-   fixed NPCs strike damage formula overflowing the button

# 1.15.0

-   compatible with v11
-   converted all UUIDs to v11 version
-   fixed vehicles equipment carry type error

# 1.14.0

-   hazards now use the actions sidebar instead of listing them at the bottom of the hazard sidebar
-   hazards now have strikes (didn't know it was a thing when i looked up hazards in the compendium)

# 1.13.0

-   pf2e inline flat checks are now working
-   pf2e inline links (such as DC checks) will now always be rolled as if the hovered over token was selected, overriding the selection altogether
-   moved `Hazard Max Width` setting to the sidebar section of the settings
-   fixed settings registration being too early to use localization for the pre-defined health statuses
-   fixed forgotten icons from an old version displayed in ritual spells
-   fixed not being able to send ritual spells to chat
-   fixed not being able to open ritual spells description popup
-   fixed pf2e inline template links creation

# 1.12.0

-   added a different tooltip for hazards
-   added `Hazard Max Width` setting which let you set the max width for the hazard sidebar
-   added a different tooltip for vehicles
-   made the base tooltip compatible with familiars
-   two columns spells will now have its width set to max to avoid overflown rows preventing the use of spells
-   pf2e specific inline links (such as DC checks) are now properly working in the popup
-   fixed some strike versatiles/auxiliaries not showing up in the actions sidebar

# 1.11.0

-   added `Scale by Font`, changing the font size will scale the entirety of the tooltip and its attached sidebars/popup
-   fixed not being able to remove/edit a macro when said macro was never cached in the browser
-   finished the README yeah!

# 1.10.0

-   added tooltip containing the name of the container for stowed equipment, you need to hover over the little cardbox to see it
-   added `Two Columns Actions` and `Two Columns Equipment` settings (disabled by default), honestly don't use them, it looks terrible
-   fixed two columns layout with overflowed names (as if it could really be fixed)
-   fixed some layout issues that were preventing long names in equipment and spells to be properly cut and wouldn't trigger the hover tooltip
-   did the first part of the README

# 1.9.2

-   fixed part of the lores table showing in the `Recall Knowledge` target chat message event without lore skills
-   lot of code cleaning

# 1.9.1

-   fixed the mix up with `unspecific` and `specific` lores

# 1.9.0

-   added a target version of `Recall Knowledge`, same principal and look as the `PF2e Workbench` module
-   fixed `Recall Knowledge` number of rows being static in the chat message

# 1.8.0

-   added tooltips for all the main tooltip icons (got bullied by shark, had no choice)
-   added `Disable Icons Tooltips` setting to disable the showing of the icons tooltips in the main tooltip
-   added a `ITT Macros` context menu option for actors to add/remove macros directly from the actors directory sidebar, it is mostly useful for GMs so they can setup macros on NPCs before dragging them on the board, instead of having to do it for each instance or having to copy/paste tokens every time
-   only prevent the fade out of the tooltip (when the extras sidebar is opened) if the user is the owner of the token
-   moved `Recall Knowledge` from the skills sidebar to the extras, the result is inspired by the work done in the `PF2e Workbench`
-   fixed actions toggles being squeezed when setting a max height for sidebars
-   fixed the main tooltip ranks position

# 1.7.0

-   added the option to select the DC for the `Aid` action
-   added description and send-to-chat icons for the actions in the extras sidebar
-   added `Show Saves` setting (default: `Show Bonus`) to choose between displaying the saves bonus modifiers or DCs in the tooltip, can also be removed entirely
-   added `Perception, Stealth, Athletics` setting (default: `Disabled`) to choose between displaying the bonus modifiers or DCs of those skills in the main tooltip, you can click on them to roll their respective basic rolls (the `perception` and `stealth` will be blind by default)
-   added `Display Ranks` which let you see the ranks (one letter superscript) of the different saves and others in the main tooltip
-   added `Small Tooltip Position` which allows you to select your preferred side to display the small tooltip
-   you can now add macros to the extras sidebar by dropping them directly onto it, those macros are on a per user basis and will automatically be executed with the `Actor` and `Token` the tooltip is related to as arguments
-   renamed `Preferred Position` to `Tooltip Position` to make it distinct from `Small Tooltip Position`
-   the small tooltip will now disappear when hovered over, making navigating between cluttered tokens smoother (since there is nothing to interact with)
-   if a character has focus cantrips but no focus spells (like psychics), the module will display the focus pips in the cantrip header
-   the `Use Hold Keybind` setting will now show different options and descriptions to GM and players to make it less confusing, the setting has been reset to `Disabled` because of that

# 1.6.0

-   added magazines icon for strikes that use them
-   added a way to show `NPC` strike trait descriptions by clicking on them
-   added `Party as Observed` GM setting, when enabled, all actors in the `Party` alliance will be considered as observed
-   the `Owned tokens only` option of `Use Hold Keybind` now will allow the GM (previously it did nothing special because GMs own all the tokens) to see the small alternative tooltip when they don't hold the `Hold to Display`, at any moment they can hit the key to instead see the full tooltip
-   moved non-cantrip focus spells to their own section instead of populating the highest spell slot one
-   fixed invalid languages breaking the tooltip display (could happen if a now removed homebrew language was still in the actor's data)

# 1.5.0

-   added traits to `NPC` strike attacks
-   added a way to show strike descriptions for `Characters` by clicking on their name
-   added a way to show equipment descriptions by clicking on their name
-   added a way to send equipment descriptions to chat by clicking on their image
-   added a way to send spell descriptions to chat by clicking on their image (formerly it would open the description popup)
-   added `Tooltip on Observe` setting (enabled by default) which generates a uneditable version of the regular tooltip for tokens to which the user has `observe` permission
-   added `Disable Chat Card Hover` setting (enabled by default) which prevent the tooltip from showing up when hovering over a chat card owned by a token
-   changed the way to show spell descriptions by clicking on their name (formerly required to click on their image)
-   changed so that most of the features `owned only` will now also extend to `observed` when the `Tooltip on Observe` is enabled
-   changed the `Take Cover` icon to a wall
-   changed `Remove Death Line` setting into `Show Death Line` multi choice with an option to only show the line when the actor has any wounded or dying
-   fixed issue with firefox displaying name tooltips even though they were not too big for their container

# 1.4.0

-   added `Health Status on Owned` setting allowing the display of the health status on the regular tooltip instead of just on the non-owned token one
-   prevent the tooltip from showing up when hovering over a chat card owned by a token
-   clicking anywhere on the tooltip will now bring in on top of everything respecting the way the foundry does it (the tooltip is now part of the `ui.windows` stack)
-   reduced the space the distance and health status indicators are taking on screen

# 1.3.2

-   fixed extras sidebar crashing if the module `PF2e Dailies` isn't physically on the server's drive

# 1.3.1

-   fixed skill actions labels being broken

# 1.3.0

-   added `Hold to Display` keybind
-   added `Use Hold Keybind` setting, when used in consort with the `Hold to Display` keybind, it will allow you to only display the tooltip when the key is held, clicking on the key when the token is already hovered will also work
    -   `Disabled` the keybind is not used
    -   `Owned tokens only` the keybind will only affect owned tokens and the others will use the delay as usual, you can short circuit the delay by hitting the key on those still
    -   `Owned and non-owned` will force the use of the keybind for any type of tooltip, no delay is used in that case
-   remove `warning` variant from the perform skill action, not sure what i had been smoking when i did this
-   fixed tooltip re-rendering actually using the delay
-   fixed not being able to change the number of uses for innate spells
-   fixed issue with tooltip not re-rendering when triggering a change by clicking outside an input onto another part of the tooltip

# 1.2.0

-   changed the name of the module for `PF2e Interactive Token Tooltip`, the HUD part was misleading
-   fully integrated the `PF2e Hero Actions` module into this one, you can find them in the actions sidebar
-   added `Remove Death Line` setting, when enabled, the tooltip will not display the whole dying/wounded line
-   added `aid` action to the extras sidebar, it is joined with `escape` which is removed from the skills sidebar, just like for the skill actions, you can use `shift` and/or `ctrl` on them and also `right click` to use a variant skill

# 1.1.0

-   you can now select which speed to display in the hud by opening the `speeds` tooltip and clicking on the speed for this actor (this is a per user choice)
-   removed `Tooltips on Click` setting, disabling it was interfering with the new selectable `speeds` feature
-   made both the held `ctrl` and the check for `right click` more accurate
-   fixed closing a sidebar not removing the lock on the tooltip

# 1.0.1

-   fixed `Rest for the Night` not doing anything, i actually forgot to even implement it to begin with oops
-   fixed `right click` while dragging with `left click` (for instance to create waypoints with `Drag Ruler`) would disable the tooltip display prevention
-   the tooltip will now be prevented from showing for as long as the `ctrl` key is held (useful for when using the core ruling tool)

# 1.0.0

-   added `level`, `alignment` and `Hero Points` pips in the tooltip
-   added `Two Columns Skills` and `Two Columns Spells` settings (disabled by default)
-   added `Rest for the Night` action in the extras sidebar
-   added `Daily Preparations` action in the extras sidebar (shows only if the `PF2e Dailies` is active)
-   merged `speeds` and `languages` into a single icon each with their own tooltip displaying the full details, they are accompanied with a new `IWR` and `senses` icons
-   added `Tooltips on Click` setting (enabled by default) used for the `speeds`, `languages` and `IWR` tooltips to be shown on click instead of hover
-   moved `stamina` to its own line in the tooltip and added the `resolve` data with it, the resolve icon itself is used to use both `Take a Breather` and `Steel Your Resolve` if available
-   clicking on the button of the currently opened sidebar will now close it instead of doing nothing
-   fixed issue with tooltip showing up if a click was registered between the token hover and the end of the delay time

# 0.11.0

-   added `dying` and `wounded` pips to the tooltip, the dying icon itself is used to roll a `Recovery Check`
-   added `Hide Untrained Skills` setting (enabled by default) that will hide all skill actions that requires the character to be trained when they are in fact not trained in the associated skill.
-   added `Show Spell Tradition` setting (disabled by default) that will show the first letter of the spellcasting tradition just be fore the spellcasting category (i.e. 'A| Spontaneous')
-   moved `initiative` from the skills sidebar to the extras sidebar and now allows the selection of an alternate skill
-   the module settings menu now displays headers for the different setting groups for better readability

# 0.10.0

-   added `Distance Unit` setting allowing the customization of the displayed `Distance to Token` on the tooltip, expects a string containing the multiplier, the unit and the number of decimals all separated by commas
-   added `Sidebars Max Height` setting allowing the customization of the sidebars max height, accepts any css string used for a `height` property

# 0.9.0

-   added `Distance to Token` setting with the option to disable, show on all tokens or only on owned token tooltips
-   added `Health Status` setting allowing the GM to specify the different states of a creature's health (only used for non-owned tokens)
-   the module will display both the `Distance to Token` and `Health Status` on non-owned tokens when appropriate

# 0.8.0

-   added showing distance from token on the hud tooltip
    -   if one token is selected and is not the currently hovered one, the distance to the selected token will be shown
    -   if not, then the same thing will be tested for a targeted token instead
    -   a different icon is shown to indicate if it is a selected or targeted token

# 0.7.1

-   fixed `1 to 3` spells overflowing out of the sidebar
-   fixed focus cantrip showing as expended when all focus points were depleted

# 0.7.0

-   added initiative action in the skills sidebar under `Perception`, it will only appear if an encounter is available, also, as opposed to all other skill actions, you cannot `right click` to select a variant skill to roll initiative (the system doesn't handle it)
-   added a setting (enabled by default) to use the same color scheme as the system actor sheet for the strikes and damage buttons in the actions sidebar

# 0.6.2

-   removed `exploration` and `downtime` actions from the list
-   some css fixes

# 0.6.1

-   fixed `Character` action without a cost breaking the actions sidebar
-   fixed skill use looping over non existent modifiers array

# 0.6.0

-   first public version of the module
-   all the core features are there
-   nothing has been done for the `extras` (not even sure what the extras are yet)
