import { Component, ElementRef, ViewChild, inject, AfterViewInit, OnDestroy, PLATFORM_ID, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import type { Feature, Polygon, MultiPolygon } from 'geojson';
import * as turf from '@turf/turf';
import { GameService } from '../../services/game/game.service';
import { AuthService } from '../../services/auth/auth.service';
import { InventoryItem } from '../../models/game.models';

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './game.component.html',
  styleUrl: './game.component.scss'
})
export class GameComponent implements AfterViewInit, OnDestroy {
  gameService = inject(GameService);
  authService = inject(AuthService);
  platformId = inject(PLATFORM_ID);

  @ViewChild('openStreetMap') mapEl?: ElementRef<HTMLDivElement>;

  mapLoading = true;
  mapError = '';
  currentZoom = signal(16);
  private mapInstance: any = null;
  private marker: any = null;
  private watchId: number | null = null;
  private L: any = null;
  movementDestination: any = null;
  private autoWalkInterval: ReturnType<typeof setInterval> | null = null;
  private buildPlacementLocation: { x: number; y: number; realm: string } | null = null;
  private isAutoWalking = false;
  private hasInitializedFromGPS = false;
  playerMenuOpen = false;
  
  // Entity markers
  private readonly monsterMarkers: Map<string, any> = new Map();
  private readonly buildingMarkers: Map<string, any> = new Map();
  private readonly resourceMarkers: Map<string, any> = new Map();
  private readonly territoryCircles: Map<string, any> = new Map();

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Expose clear territories to window for testing
      (globalThis as any).clearTerritories = () => {
        this.gameService.clearFirstFlag();
        this.renderGameEntities();
        console.log('Territories cleared!');
      };

      // Try to load saved game first
      const gameLoaded = this.gameService.loadGameLocal();
      if (!gameLoaded) {
        this.gameService.loadGameRemote().catch(err => console.error('Remote load failed:', err));
      }
      
      setTimeout(() => {
        this.initializeMap();
        
        // If game was loaded, still need to update player position with current GPS
        if (gameLoaded && 'geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const lat = position.coords.latitude;
              const lng = position.coords.longitude;
              this.gameService.updatePlayerGPSPosition(lat, lng);
              this.renderGameEntities();
            }
          );
        }
      }, 0);
    }
  }

  ngOnDestroy(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
    }
    if (this.autoWalkInterval) {
      clearInterval(this.autoWalkInterval);
      this.autoWalkInterval = null;
    }
    if (this.mapInstance) {
      this.mapInstance.remove();
      this.mapInstance = null;
    }
  }

  togglePlayerMenu(): void {
    this.playerMenuOpen = !this.playerMenuOpen;
  }

  closePlayerMenu(): void {
    this.playerMenuOpen = false;
  }

  logout(): void {
    this.authService.logout();
  }

  private async initializeMap(): Promise<void> {
    if (!this.mapEl) return;

    try {
      this.L = await import('leaflet');

      // Get user's real location
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            // Initialize player position in game service
            this.gameService.initializePlayerPosition(lat, lng);
            
            // Initialize map centered on player - max zoom at 16, allow zoom out to 10
            this.mapInstance = this.L.map(this.mapEl!.nativeElement).setView([lat, lng], 16);
            this.mapInstance.setMinZoom(10);
            this.mapInstance.setMaxZoom(16);
            
            this.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '© OpenStreetMap contributors',
              maxZoom: 19
            }).addTo(this.mapInstance);

            // Update zoom level when map zooms
            this.mapInstance.on('zoomend', () => {
              this.currentZoom.set(this.mapInstance.getZoom());
            });

            // Player marker
            this.marker = this.L.marker([lat, lng], {
              icon: this.L.divIcon({
                html: '<div style="font-size: 24px;">🧙</div>',
                className: 'player-marker',
                iconSize: [30, 30],
                iconAnchor: [15, 15]
              })
            })
              .addTo(this.mapInstance)
              .bindPopup('You are here!');

            // Map click handler for placing first flag or building
            this.mapInstance.on('dblclick', (e: any) => this.onMapDoubleClick(e));
            
            // Attach context menu to map container
            this.mapEl!.nativeElement.addEventListener('contextmenu', (e: any) => {
              e.preventDefault();
              
              // Get map coordinates from mouse position
              const rect = this.mapEl!.nativeElement.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const y = e.clientY - rect.top;
              
              // Convert pixel coordinates to lat/lng
              const point = this.L.point(x, y);
              const latlng = this.mapInstance.containerPointToLatLng(point);
              
              this.onMapContextMenu({ latlng });
            });

            // Watch position changes
            this.watchId = navigator.geolocation.watchPosition(
              (pos) => this.updatePlayerPosition(pos),
              (error) => console.error('Geolocation watch error:', error),
              { enableHighAccuracy: true, maximumAge: 10000 }
            );

            this.mapLoading = false;
            
            // Render existing game entities
            this.renderGameEntities();
          },
          (error) => {
            console.error('Geolocation error:', error);
            this.mapError = 'Unable to get your location. Please enable location services.';
            this.mapLoading = false;
            
            // Fallback to default location
            this.initializeDefaultMap();
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      } else {
        this.mapError = 'Geolocation is not supported by your browser.';
        this.mapLoading = false;
        this.initializeDefaultMap();
      }
    } catch (error) {
      this.mapLoading = false;
      this.mapError = 'Unable to load map. Please refresh the page.';
      console.error('Map error:', error);
    }
  }

  private initializeDefaultMap(): void {
    const defaultCenter: [number, number] = [39.8283, -98.5795];
    
    this.mapInstance = this.L.map(this.mapEl!.nativeElement).setView(defaultCenter, 12);
    
    this.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(this.mapInstance);

    this.marker = this.L.marker(defaultCenter)
      .addTo(this.mapInstance)
      .bindPopup('Default location (enable GPS for your actual position)');
    
    this.gameService.initializePlayerPosition(defaultCenter[0], defaultCenter[1]);

    // Attach context menu to map container for default map too
    this.mapEl!.nativeElement.addEventListener('contextmenu', (e: any) => {
      e.preventDefault();
      
      // Get map coordinates from mouse position
      const rect = this.mapEl!.nativeElement.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Convert pixel coordinates to lat/lng
      const point = this.L.point(x, y);
      const latlng = this.mapInstance.containerPointToLatLng(point);
      
      this.onMapContextMenu({ latlng });
    });

    // Add double-click handler
    this.mapInstance.on('dblclick', (e: any) => this.onMapDoubleClick(e));
  }

  private updatePlayerPosition(position: GeolocationPosition): void {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;

    if (this.isAutoWalking) return;
    if (this.hasInitializedFromGPS) return;

    if (this.marker && this.mapInstance) {
      // Check if player has moved at least 0.0001 degrees
      const currentPos = this.gameService.player().position;
      const latDiff = Math.abs(lat - currentPos.x);
      const lngDiff = Math.abs(lng - currentPos.y);
      
      if (latDiff < 0.0001 && lngDiff < 0.0001) {
        return; // Movement too small, ignore
      }

      // Update marker position
      this.marker.setLatLng([lat, lng]);
      
      // Recenter map on player
      this.mapInstance.setView([lat, lng]);

      // Update game state
      this.gameService.updatePlayerGPSPosition(lat, lng);

      this.hasInitializedFromGPS = true;
      
      // Re-render entities (in case new ones spawned nearby)
      this.renderGameEntities();
    }
  }

  private onMapClick(e: any): void {
    // This is for left-click (handled by double-click)
    // Context menu is prevented for right-click
  }

  private onMapDoubleClick(e: any): void {
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;

    if (!this.gameService.hasPlacedFirstFlag()) {
      alert('Place your first flag first (right-click)!');
      return;
    }

    // Check if destination is within player's territory or black flag territory
    if (!this.gameService.canMoveToLocation(lat, lng)) {
      alert('✗ Cannot move there! You can only move within:\n• Your own territory\n• Black flag territories (capturable)');
      return;
    }

    // Set movement destination
    this.movementDestination = { x: lat, y: lng, realm: 'real-world' };
    this.startAutoWalkToDestination(lat, lng);
  }

  private onMapContextMenu(e: any): void {
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;

    console.log('Right-click detected at:', lat, lng);

    // If first flag not placed, place it
    if (!this.gameService.hasPlacedFirstFlag()) {
      const success = this.gameService.placeFirstFlag(lat, lng);
      if (success) {
        alert('✓ First flag placed! Your territory established.\n\nNow use:\n- Double-click to walk to locations\n- Right-click INSIDE territory to build\n- Right-click OUTSIDE (adjacent) to expand');
        this.renderGameEntities();
      } else {
        alert('✗ Location already claimed. Find unclaimed area.');
      }
      return;
    }

    // Check if clicked inside player's own territory
    const isInsideOwnTerritory = this.gameService.isLocationInOwnTerritory(lat, lng);
    
    const isNearEdge = this.gameService.isNearOwnTerritoryEdge(lat, lng, 30);

    if (isInsideOwnTerritory && !isNearEdge) {
      // Show building menu
      this.buildPlacementLocation = { x: lat, y: lng, realm: 'real-world' };
      this.gameService.openBuildingMenu();
      alert('Building menu opened. Select a building type from the right panel.');
      return;
    }

    // Try to place flag to expand (inside edge buffer or just outside edge)
    const success = this.gameService.placeAdditionalFlag(lat, lng);
    if (success) {
      alert('✓ Flag placed! Territory expanded.');
      this.renderGameEntities();
    } else {
      alert('✗ Cannot place flag here. Must be:\n1. Within 30m of the territory edge\n2. Not already claimed');
    }
  }

  private startAutoWalkToDestination(lat: number, lng: number): void {
    if (this.autoWalkInterval) {
      clearInterval(this.autoWalkInterval);
      this.autoWalkInterval = null;
    }

    this.isAutoWalking = true;

    const stepMeters = 5; // step size for gradual movement
    const tickMs = 100; // faster movement (100ms instead of 200ms)

    this.autoWalkInterval = setInterval(() => {
      const current = this.gameService.player().position;
      const remaining = this.gameService['calculateDistance'](current.x, current.y, lat, lng);

      if (this.gameService.player().energy <= 0) {
        clearInterval(this.autoWalkInterval!);
        this.autoWalkInterval = null;
        this.movementDestination = null;
        this.isAutoWalking = false;
        alert('✗ Out of energy. Rest to restore energy.');
        return;
      }

      if (remaining <= stepMeters) {
        this.gameService.updatePlayerGPSPosition(lat, lng);
        if (this.marker && this.mapInstance) {
          this.marker.setLatLng([lat, lng]);
          this.mapInstance.setView([lat, lng]);
        }
        this.movementDestination = null;
        this.renderGameEntities();
        clearInterval(this.autoWalkInterval!);
        this.autoWalkInterval = null;
        this.isAutoWalking = false;
        alert('✓ Arrived!');
        return;
      }

      const ratio = stepMeters / remaining;
      const nextLat = current.x + (lat - current.x) * ratio;
      const nextLng = current.y + (lng - current.y) * ratio;

      // Update game state first
      this.gameService.updatePlayerGPSPosition(nextLat, nextLng);
      
      // Then sync UI to game state (not ahead of it)
      const updatedPos = this.gameService.player().position;
      if (this.marker && this.mapInstance) {
        this.marker.setLatLng([updatedPos.x, updatedPos.y]);
        this.mapInstance.setView([updatedPos.x, updatedPos.y]);
      }
      // Render only when needed (less often)
      this.renderGameEntities();
    }, tickMs);
  }

  private renderGameEntities(): void {
    if (!this.mapInstance || !this.L) return;

    // Clear existing markers
    this.clearAllMarkers();

    // Render territories as a merged union per owner
    const territories = this.gameService.territories();
    const territoryRadiusMeters = 200;
    const territoryRadiusKm = territoryRadiusMeters / 1000;
    const groupedTerritories = new Map<string, { ownerId: string; ownerName: string; color: string; isPlayer: boolean; territories: typeof territories }>();

    territories.forEach(territory => {
      const ownerId = territory.ownerId;
      const isPlayerTerritory = ownerId === this.gameService.player().id;
      const color = territory.color || (isPlayerTerritory ? '#4169e1' : '#ff4444');
      const existing = groupedTerritories.get(ownerId);
      if (existing) {
        existing.territories.push(territory);
      } else {
        groupedTerritories.set(ownerId, {
          ownerId,
          ownerName: territory.ownerName,
          color,
          isPlayer: isPlayerTerritory,
          territories: [territory]
        });
      }
    });

    groupedTerritories.forEach(group => {
      let unionFeature: Feature<Polygon | MultiPolygon> | null = null;

      group.territories.forEach(territory => {
        const circle = turf.circle([territory.position.y, territory.position.x], territoryRadiusKm, {
          steps: 64,
          units: 'kilometers'
        });

        if (!unionFeature) {
          unionFeature = circle as Feature<Polygon | MultiPolygon>;
          return;
        }

        const merged = turf.union(turf.featureCollection([unionFeature, circle]));
        if (merged) {
          unionFeature = merged;
        }
      });

      if (!unionFeature) return;

      const unionLayer = this.L.geoJSON(unionFeature, {
        style: {
          color: group.color,
          weight: 2,
          opacity: 0.8,
          fillColor: group.color,
          fillOpacity: 0.1,
          dashArray: group.isPlayer ? null : '5, 5'
        }
      }).addTo(this.mapInstance);

      unionLayer.bindPopup(`Territory owned by ${group.ownerName}${group.isPlayer ? ' (YOUR TERRITORY)' : ''}`);
      this.territoryCircles.set(`union-${group.ownerId}`, unionLayer);
    });

    // Render territory flags at centers
    territories.forEach(territory => {
      const isPlayerTerritory = territory.ownerId === this.gameService.player().id;
      const flagColor = territory.color || '#4169e1';
      const flagEmoji = territory.isActive ? '🚩' : '🏴'; // Active = flag, Inactive = black flag
      const flagMarker = this.L.marker([territory.position.x, territory.position.y], {
        icon: this.L.divIcon({
          html: `<div style="font-size: 16px; color: ${flagColor};">${flagEmoji}</div>`,
          className: 'flag-marker',
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        })
      }).addTo(this.mapInstance);
      
      const flagStatus = territory.isActive ? 'Active' : 'Inactive (Capturable - 2x energy cost)';
      const popupContent = isPlayerTerritory 
        ? `${flagStatus} | ${territory.ownerName}'s Territory<br><small>(Double-click to teleport)</small>`
        : `${flagStatus} | ${territory.ownerName}'s Territory`;
      flagMarker.bindPopup(popupContent);
      
      // Double-click to teleport for own territories
      if (isPlayerTerritory) {
        flagMarker.on('dblclick', () => {
          this.gameService.teleportToFlag(territory.id);
          if (this.mapInstance) {
            this.mapInstance.closePopup();
          }
        });
      }
    });

    // Render buildings
    const buildings = this.gameService.buildings();
    buildings.forEach(building => {
      const buildingInfo = this.gameService.getBuildingInfo(building.type);
      const marker = this.L.marker([building.position.x, building.position.y], {
        icon: this.L.divIcon({
          html: `<div style="font-size: 20px;">${buildingInfo?.icon || '🏗️'}</div>`,
          className: 'building-marker',
          iconSize: [25, 25],
          iconAnchor: [12, 12]
        })
      }).addTo(this.mapInstance);
      
      marker.bindPopup(`${buildingInfo?.name || building.type} (Level ${building.level})${building.isUnderConstruction ? ' - Under Construction' : ''}`);
      marker.on('click', () => {
        if (building.type === 'house') {
          const cityId = this.gameService.player().cities[0]?.id;
          if (cityId) {
            this.gameService.openCityMenu(cityId);
          }
        }
      });
      this.buildingMarkers.set(building.id, marker);
    });

    // Render monsters
    const monsters = this.gameService.monsters();
    monsters.forEach(monster => {
      if (monster.health <= 0) return; // Skip dead monsters
      
      const marker = this.L.marker([monster.position.x, monster.position.y], {
        icon: this.L.divIcon({
          html: `<div style="font-size: 20px;">${monster.icon}</div>`,
          className: 'monster-marker',
          iconSize: [25, 25],
          iconAnchor: [12, 12]
        })
      }).addTo(this.mapInstance);
      
      marker.bindPopup(`${monster.name} (Level ${monster.level})<br>HP: ${monster.health}/${monster.maxHealth}`);
      this.monsterMarkers.set(monster.id, marker);
    });

    // Render resource nodes
    const resources = this.gameService.resourceNodes();
    resources.forEach(resource => {
      if (resource.amount <= 0) return; // Skip depleted resources
      
      const marker = this.L.marker([resource.position.x, resource.position.y], {
        icon: this.L.divIcon({
          html: `<div style="font-size: 18px;">${resource.icon}</div>`,
          className: 'resource-marker',
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        })
      }).addTo(this.mapInstance);
      
      marker.bindPopup(`${resource.type} - ${resource.amount}/${resource.maxAmount}`);
      this.resourceMarkers.set(resource.id, marker);
    });
  }

  private clearAllMarkers(): void {
    this.monsterMarkers.forEach(marker => this.mapInstance.removeLayer(marker));
    this.buildingMarkers.forEach(marker => this.mapInstance.removeLayer(marker));
    this.resourceMarkers.forEach(marker => this.mapInstance.removeLayer(marker));
    this.territoryCircles.forEach(circle => this.mapInstance.removeLayer(circle));
    
    this.monsterMarkers.clear();
    this.buildingMarkers.clear();
    this.resourceMarkers.clear();
    this.territoryCircles.clear();
  }

  // Combat controls
  attack(): void {
    this.gameService.attack();
    // Re-render after combat to update monster health
    this.renderGameEntities();
  }

  // Building controls
  openBuildMenu(): void {
    this.gameService.openBuildingMenu();
  }

  closeBuildMenu(): void {
    this.gameService.closeBuildingMenu();
    this.buildPlacementLocation = null;
  }

  openCityMenu(cityId: string): void {
    this.gameService.openCityMenu(cityId);
  }

  closeCityMenu(): void {
    this.gameService.closeCityMenu();
  }

  openHouseInterior(): void {
    this.gameService.openHouseInterior();
  }

  closeHouseInterior(): void {
    this.gameService.closeHouseInterior();
  }

  goToRoom(room: 'hall' | 'bedroom' | 'storage' | 'workshop' | 'vault'): void {
    this.gameService.goToRoom(room);
  }

  collectCityResources(cityId: string): void {
    this.gameService.collectCityResources(cityId);
  }

  craftAtAnvil(recipeId: string): void {
    const result = this.gameService.craftAtAnvil(recipeId);
    alert(result.message);
  }

  getGems(): InventoryItem[] {
    return this.gameService.player().inventory.filter(i => i.type === 'gem');
  }

  getSocketableEquipment(): InventoryItem[] {
    const equipment = this.gameService.player().equipment || {};
    return Object.values(equipment).filter(
      (item): item is InventoryItem => !!item && (item.type === 'weapon' || item.type === 'armor')
    );
  }

  getSocketInfo(item: InventoryItem): string {
    const maxSockets = item.maxSockets ?? 0;
    const used = item.socketedGems?.length ?? 0;
    return `${used}/${maxSockets}`;
  }

  socketGem(targetItemId: string, gemId: string): void {
    const result = this.gameService.socketGem(targetItemId, gemId);
    alert(result.message);
  }

  // Build at player's current location or selected location
  buildAtCurrentLocation(type: any): void {
    const targetPos = this.buildPlacementLocation ?? this.gameService.player().position;
    if (this.gameService.buildStructure(type, targetPos.x, targetPos.y)) {
      this.closeBuildMenu();
      this.renderGameEntities();
      alert(`${type} construction started!`);
    } else {
      alert('Cannot build here. Must be inside or adjacent to your territory.');
    }
  }

  // Get city resources
  getCityResources() {
    return this.gameService.player().cities[0]?.resources || [];
  }

  useItem(itemId: string): void {
    const result = this.gameService.useItem(itemId);
    if (result?.message) {
      alert(result.message);
    }
  }

  rest(): void {
    this.gameService.rest();
  }

  walkToDogFlag(): void {
    const flag = this.gameService.player().movementFlag;
    if (!flag) return;
    this.movementDestination = { x: flag.x, y: flag.y, realm: flag.realm };
    this.startAutoWalkToDestination(flag.x, flag.y);
  }

  // Clear first flag (reset game)
  clearFlag(): void {
    if (confirm('Are you sure you want to clear your territory and start over?')) {
      this.gameService.clearFirstFlag();
      this.movementDestination = null;
      this.renderGameEntities();
      alert('Territory cleared. Right-click to place a new flag.');
    }
  }

  // Build structure wrapper (calls service method)
  buildStructure(type: any, lat: number, lng: number): boolean {
    return this.gameService.buildStructure(type, lat, lng);
  }

  // Toggle flag placement mode
  flagPlacementMode = false;
  
  toggleFlagPlacementMode(): void {
    this.flagPlacementMode = !this.flagPlacementMode;
    if (this.flagPlacementMode) {
      alert('Flag Placement Mode: Click on the map to place flags');
    } else {
      alert('Flag Placement Mode: Disabled');
    }
  }
}
