# 🎮 Parallel Realms - Quick Start Guide

## What You Just Got

A fully functional location-based MMORPG game built with Angular v17! Similar to Parallel Kingdom, but playable on both Windows desktop and mobile browsers.

## Game Is Running!

🌐 **Open your browser:** http://localhost:4200/

The game server is already running in your terminal!

## First Steps

### 1. Understanding the Map 🗺️
- **Your character**: 🧙 (the wizard icon with a golden glow)
- **Monsters**: 👹 Goblins, 👺 Orcs, 🧌 Trolls, 🐉 Dragons
- **Terrain**: 🌱 Grass, 🌲 Forest, ⛰️ Mountain, 🌊 Water, 🏜️ Desert, 🏰 Dungeons
- **Fog of War**: Dark tiles are undiscovered - explore to reveal them!

### 2. Movement Controls
```
        ⬆️ North
    ⬅️ West    ➡️ East
        ⬇️ South
```
- Each move costs **1 Energy**
- Click **Rest** button to restore health and energy

### 3. Combat System ⚔️
When you walk into a monster:
1. **Combat initiates automatically**
2. Click **⚔️ Attack** button to damage enemy
3. Enemy counter-attacks (watch your HP!)
4. **Defeat enemy** → Earn XP + Gold + Loot
5. **Level up** when you gain enough XP!

### 4. Your Stats (Top Bar)
- **HP (Red bar)**: Your health - don't let it hit 0!
- **Energy (Cyan bar)**: Needed for movement
- **💰 Gold**: Currency for future trading
- **⭐ XP**: Experience points to next level

### 5. Inventory 🎒
- **Potions**: Click "Use" to restore health
- **Weapons**: Increase your attack power
- **Color-coded rarity**:
  - Gray = Common
  - Green = Uncommon
  - Blue = Rare
  - Purple = Epic
  - Orange = Legendary

## Pro Tips

### For Beginners
1. **Start by exploring** - move around to reveal the map
2. **Fight weak enemies first** - look for Goblins (👹)
3. **Rest often** - keep your HP and Energy high
4. **Use potions wisely** - save them for tough fights

### Combat Strategy
- **Check enemy stats** before attacking
- Higher level = stronger enemy
- **Attack > Enemy Defense** = more damage dealt
- **Your Defense** reduces incoming damage
- Level up to increase all stats!

### Map Navigation
- **Terrain affects gameplay**:
  - Grass (🌱): Safe, common areas
  - Forests (🌲): More monsters
  - Mountains (⛰️): Harder enemies
  - Dungeons (🏰): High-level content
- **Explore systematically** to avoid getting lost
- **Remember landmarks** to navigate back

## Current Monster Levels

| Monster | Level | HP | Attack | Defense | Icon |
|---------|-------|----|----|---------|------|
| Goblin  | 1     | 50 | 8  | 3       | 👹   |
| Orc     | 3     | 150| 15 | 8       | 👺   |
| Troll   | 5     | 250| 25 | 15      | 🧌   |
| Dragon  | 10    | 500| 50 | 30      | 🐉   |

## Character Progression

**Level 1 Stats:**
- HP: 100
- Energy: 50
- Attack: 10
- Defense: 5

**Each Level Up:**
- Max HP: +20
- Max Energy: +10
- Attack: +3
- Defense: +2
- Full HP/Energy restore!

**XP Required:** Level × 100
- Level 1→2: 100 XP
- Level 2→3: 200 XP
- Level 3→4: 300 XP
- etc.

## Mobile Play 📱

### On Your Phone
1. **Same WiFi network?** Open http://[your-pc-ip]:4200/
2. **Touch controls work!** - Tap buttons to move
3. **Landscape mode** recommended for better view
4. **Add to Home Screen** for app-like experience

### Performance Tips
- Close other apps
- Use Chrome or Safari
- Reduce browser tabs
- Enable hardware acceleration

## Game Mechanics

### Death
- Respawn at starting position (25, 25)
- Keep all items and XP
- Restore full HP/Energy
- **No permanent penalties!**

### Loot System
- Monsters drop gold on death
- Drop rates vary by monster level
- Higher level = better rewards
- Loot auto-added to inventory

### Energy Management
- Starts at 50/50
- -1 per movement
- Restore with Rest button
- +10 max per level

## What's Coming Next? 🔮

### Phase 2: Territories
- Build towns and fortresses
- Resource generation
- Territory ownership

### Phase 3: Multiplayer
- See other players on map
- PvP combat
- Guilds and alliances
- Trading system

### Phase 4: Advanced
- Quest system
- Crafting
- Skill trees
- Day/night cycle
- Weather effects

## Troubleshooting

### Game won't load?
```bash
# Restart the server
cd "c:\Users\dandk\source\Parallel-Realms"
npm start
```

### Map not showing?
- Refresh page (F5)
- Clear browser cache
- Check browser console (F12)

### Monsters not appearing?
- They're randomly spawned
- Explore different areas
- Try refreshing the game

### Can't move?
- Check energy level (need at least 1)
- Click Rest to restore
- Make sure not in combat

## Advanced Tips

### Optimal Leveling Route
1. Farm Goblins (👹) until Level 2
2. Move to Orcs (👺) at Level 3-4
3. Challenge Trolls (🧌) at Level 5+
4. Dragons (🐉) are end-game content

### Resource Management
- **HP < 30%** → Use potion or Rest
- **Energy < 10** → Plan rest stops
- **Save gold** for future updates

### Exploration Strategy
- Move in spiral pattern from start
- Mark dungeon locations (mental note)
- Avoid mountains until higher level
- Water tiles may be barriers

## Controls Summary

| Action | Button/Key |
|--------|-----------|
| Move North | ⬆️ North button |
| Move South | ⬇️ South button |
| Move East | ➡️ East button |
| Move West | ⬅️ West button |
| Rest | 🛏️ Rest button |
| Attack | ⚔️ Attack button (in combat) |
| Use Item | Click "Use" on potion |

## Have Fun! 🎉

This is your game now - explore, experiment, and enjoy! 

**Current Status:**
- ✅ Full combat system working
- ✅ Character progression with leveling
- ✅ Inventory management
- ✅ Procedural world generation
- ✅ Mobile responsive design
- ⏳ Multiplayer coming soon
- ⏳ Territory system in development

**Questions or Issues?**
The code is fully open - check the models and services to understand game mechanics!

---

**Happy adventuring in the Parallel Realms!** ⚔️🏰🗺️
