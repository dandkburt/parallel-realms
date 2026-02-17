# Parallel Kingdom Style GPS System - Implementation Guide

## Overview
This game now uses a **real-world GPS-based coordinate system** similar to Parallel Kingdom, where player movement happens by physically walking in the real world.

## Key Features Implemented

### 1. **GPS Coordinate System**
- **Latitude/Longitude**: All game entities use GPS coordinates (lat/lng) instead of grid-based x/y
- **Position Format**: `{ x: latitude, y: longitude, realm: 'real-world' }`
- **Distance Calculation**: Haversine formula for accurate real-world distances in meters

### 2. **First Flag Placement**
When starting the game:
- **GPS Location Required**: Enable location services to get your real position
- **Click Map to Place**: Click on the map where you want to establish your first territory
- **Claimed Check**: System verifies location isn't already claimed (within 25m)
- **Territory Created**: 25-meter radius territory established at that GPS location
- **Entities Spawn**: Monsters, resources, and NPCs spawn within ~1km radius

### 3. **Adjacent-Only Expansion Rule**
Territorial expansion follows Parallel Kingdom rules:
- **First Flag**: Must be placed at unclaimed GPS location
- **Subsequent Buildings**: Must be within 30 meters of existing territory
- **No Skipping**: Cannot claim territory far from existing claims
- **Physical Movement Required**: Walk in real life to expand territory

### 4. **Real-Time GPS Tracking**
- **Position Updates**: `watchPosition()` tracks your real-world movement
- **Energy Cost**: Moving 100 meters costs 1 energy
- **Entity Detection**: Automatically checks for monsters/resources within 10 meters
- **Map Centering**: Map follows your GPS location in real-time

### 5. **Game Entities as Map Markers**
All game elements render as Leaflet markers:

**Territories**: Blue circles (25m radius) for player, red for others
**Buildings**: Emoji icons (🏠 🗼 ⚔️ etc.) at GPS locations
**Monsters**: Creature emojis (👹 👺 🧌 🐉) roaming the area
**Resources**: Resource icons (🌳 🪨 ⛓️ 🍎) at specific GPS points
**Player**: 🧙 marker at your current GPS location

### 6. **Distance-Based Interactions**
- **Combat**: Triggered when within 10 meters of monster
- **Harvesting**: Collect resources within 10 meters
- **Building**: Construct within 30 meters of owned territory
- **Territory Claim**: Each building creates 25-meter claim radius

## Starting the Game

### First Time Setup
1. **Enable GPS**: Allow browser to access your location
2. **Wait for Map**: Map loads centered on your current GPS position
3. **Place First Flag**: Click map at desired location (must be unclaimed)
4. **Explore**: Walk in real life to discover entities and expand territory

### If Location Already Claimed
If you start in someone else's territory:
- **Walk Away**: Physically move to an unclaimed area
- **Find Free Space**: Look for areas without blue/red territory circles
- **Place Flag**: Click map when you reach unclaimed location

## Game Mechanics

### Territory System
```typescript
Territory Radius: 25 meters
Adjacent Distance: 30 meters (for expansion)
Claim Check Distance: 5 meters (prevents duplicate claims)
```

### Entity Detection
```typescript
Combat Range: 10 meters
Resource Range: 10 meters
Building Proximity: 10 meters minimum spacing
```

### Movement & Energy
```typescript
Energy Cost: 1 per 100 meters walked
Position Update: Real-time via GPS watchPosition
Map Centering: Automatic on position change
```

## Code Architecture

### Game Service (`game.service.ts`)
- **initializePlayerPosition()**: Sets initial GPS location
- **placeFirstFlag()**: First territory claim with location check
- **updatePlayerGPSPosition()**: Handles real-time movement
- **calculateDistance()**: Haversine formula for GPS distances
- **isLocationClaimed()**: Checks if area is already owned
- **claimTerritory()**: Creates new territory at GPS location
- **spawnNearbyEntities()**: Spawns monsters/resources near player

### Game Component (`game.component.ts`)
- **initializeMap()**: Leaflet map with GPS centering
- **watchPosition**: Real-time GPS tracking
- **onMapClick()**: Handles first flag placement
- **renderGameEntities()**: Renders all markers on map
- **clearAllMarkers()**: Cleanup for marker updates

## Building System

### Requirements
1. **First Flag Placed**: Must have established initial territory
2. **Adjacent to Territory**: Within 30 meters of owned land
3. **Resources Available**: Sufficient wood/stone/iron/gold
4. **Clear Location**: No existing buildings/monsters within 10m

### Building Process
```typescript
1. Open build menu (button in UI)
2. Select building type
3. System builds at player's current GPS location
4. Validates adjacency requirement
5. Creates new territory (25m radius)
6. Renders building marker on map
```

## Troubleshooting

### Map Not Loading
- Enable location services in browser settings
- Grant permission when prompted
- Check console for geolocation errors
- Fallback map centers at default location if GPS fails

### Cannot Place First Flag
- Another player may have claimed that location
- Walk to a different area and try again
- Look for areas without blue/red territory circles

### Entities Not Appearing
- Entities spawn after first flag placement
- Walk around to trigger GPS updates
- Check that markers are rendering on map
- Ensure GPS is actively tracking position

### Cannot Build
- Must be within 30m of existing territory
- Check resources in city inventory
- Ensure location isn't occupied
- First flag must be placed before building

## Future Enhancements

Potential additions for full Parallel Kingdom experience:
- **Alliances**: Team up with nearby players
- **PvP Combat**: Territory conflicts and raids
- **Trade Routes**: Resource exchange with other players
- **Dungeons**: Special GPS-locked locations with bosses
- **Realm Portals**: Travel between different map layers
- **Persistent World**: Server-side multiplayer sync

## Technical Notes

### Coordinate Conversion
- **Degrees to Meters**: ~111,000 meters per degree latitude
- **Radius Calculations**: 0.0005° ≈ 50 meters
- **Spawn Radius**: 0.01° ≈ 1 kilometer

### Performance
- **Marker Cleanup**: Old markers removed before re-rendering
- **Distance Checks**: Only calculate for nearby entities
- **Update Throttling**: GPS updates every 10 seconds max

### Browser Compatibility
- **Geolocation API**: Standard HTML5 feature
- **Leaflet**: Compatible with all modern browsers
- **Mobile Support**: Full GPS tracking on mobile devices
