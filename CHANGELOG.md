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
