# FoundryVTT PF2e Interactive Token Tooltip

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/K3K6M2V13)

### This module will generate an interactive token tooltip to access all the most used `Character` and `Npc` features.

# Main Tooltip

![](./readme/main.webp)

This tooltip will be shown if you are the owner of the currently hovered over token or if the `Tooltip on Observe` is enabled and you have `observer` permission for this token (there is also the GM setting `Party as Observer` that would affect this showing).

1. Hero Points - Alignment - Level

    - you can add/remove hero points by left/right clicking on the pips

2. Temp HP - HP

3. Resolve Points - Stamina

    - this line only appears if the stamina variant rule is enabled in this world

4. Armor Class - Shield

    - you can use the `Take Cover` action or remove cover by clicking on the wall
    - you can use the `Raise Shield` action by clicking on the shield

5. Fortitude - Reflex - Will

    - this line can be removed
    - you can display thir DC instead of their bonus modifier
    - you can display thir proficiency rank (U, T, E, M, L)

6. Perception - Stealth - Athletics

    - same as for the saves

7. Dying - Wounded

    - you can add/remove dying/wounded by left/right clicking on the pips
    - clicking on the skull when having dying will roll a `Recovery Check`
    - this line can be removed
    - you can decide to only show this line when the actor has any dying/wounded

8. Speeds - Languages - Senses - IWR

    - clicking on them will reveal their list
    - you can select any speed from within the list that you want to be displayed in the tooltip (this is a per user option)
    - will be greyed out when the actor doesn't have any listed
    - IWR stands for `Immunities`, `Weaknesses` and `Resistances`

9. Actions - Equipment - Spells - Skills - Extras

    - those will open their respective sidebar containing an abundance of information about the actor
    - a first screening is done to see if any should be greyed out

10. Distance to Selected/Target

    - this uses the pf2e system distance calculation with alternate diagonals and also the height difference between the tokens
    - if you have a token selected and it is not the one currently hovered over, then the distance between them will be displayed
    - if no token is selected or is the currently hovered over, then your target will be used instead if any
    - a different icon is show to make it clear if the distance is calculated with a selected or target token
    - there needs to be only 1 selected or target token for it to work
    - this can be disabled or set to owned/observed tooltip only

11. Health Status
    - This gives a textual representation of the current state of wellness of the hovered over token
    - can be disabled for owned/observed tokens

# bullet points for the readme:

-   you can hold `ctrl` & `shift` while click most of the action across the tooltip just like you would in the regular actor sheet
-   you can `right click` any skill action (and similar in the extras sidebar) to use a variant skill for the action
-   you can drag anything over any popup of the tooltip and they will all fade out to make it possible to add effects and other items on tokens that are hidden by them (this is also true if you start dragging something from inside the tooltip sidebars or description popup)
-   equipment items are actually draggable so you can give them to another actor the usual way (this module doesn't prevent the system restriction though, for that you would have to use another module \*_cough_\*)
-   the holding keybind can either be used before hovering over a token or during
-   `Use Hold Keybind` have different options and descriptions for the GM and players
-   macros added are on per user basis and will be executed with the `Actor` and `Token` the tooltip is related to as arguments

# CHANGELOG

You can see the changelog [HERE](./CHANGELOG.md)
