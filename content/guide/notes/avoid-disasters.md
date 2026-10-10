---
title: Avoid early disasters
kind: note
summary: The ESR traps that cost characters or items, from charms that do nothing to items you must never wear.
tags: [basics, early-game]
aliases: [traps, hp 1, life 1, crash, items disappearing]
knowFirst: [start-here]
related: [unique-charms, stockers]
volatility: high
mentions: [Vessel of Souls, Noob's Odd Charm, Veteran's Odd Charm, Antidote Potion, Horadric Cube]
officialDocs:
  - label: Vessel of Souls
    href: docs:vessel_of_souls.htm
sources: [official-docs, official-cube, patchnotes, esr-txt, esru-wiki]
---

### Charms only work in the charm inventory

ESR adds a separate charm inventory, opened from a button on the inventory panel. Charms left in the normal inventory get a red tint and give no bonus. Only one of Noob's or Veteran's Odd Charm counts at a time, and unique charms are limited as well: patch 3.2.11 fixed a bug that let you equip several in the charm inventory ([[unique-charms]]). <!-- verify: exact unique-charm rule in 3.2.12 -->

### Items that are not for you

- Gear changed by **Merc Only Conversion** shows "(merc only)". Give it to your mercenary. Three Antidote Potions in the cube remove the conversion. Older guides warn that wearing such gear yourself drops your life to 1. <!-- verify: still true in 3.2.12 -->
- The :term[Vessel of Souls] is a mythical amulet you feed organs in the cube. It is not meant to be worn; the official page warns that wearing it sets your life to 1.

### Cube and save safety

- Never transmute or drop a cube holding more than 100 items; the mod author lists this as a crash. <!-- verify: still a crash in 3.2.12 -->
- Back up your save folder now and then. Older versions could silently drop items, often stockers, from large saves, and 3.2.11 fixed saves above 16 KB failing to load. <!-- verify: whether item loss can still happen -->
- If a reroll recipe does nothing, check whether the item has a :term[Forging]; most rerolls ignore forged items ([[cube-basics]]).

Keeping materials inside [[stockers]] also keeps the item count, and the save, small.
