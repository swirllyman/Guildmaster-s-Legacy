import React, { useRef, useEffect, useState } from 'react';
import { useGame, generateRandomItem } from '../../context/GameContext';
import type { EquipmentSlot, Item } from '../../types/game';
import { ItemTooltip } from '../Hub/ItemTooltip';
import { 
  ShieldAlert, 
  AlertCircle, 
  Compass, 
  Sword,
  Flame,
  Heart,
  Shield,
  Footprints,
  Crown,
  ShieldCheck,
  Play,
  Pause,
  FastForward,
  Sparkles,
  LogOut
} from 'lucide-react';

interface GridPos {
  x: number;
  y: number;
}

interface SimulatedEntity {
  id: string;
  name: string;
  type: 'ranger' | 'warrior' | 'wizard' | 'rogue' | 'paladin' | 'druid' | 'necromancer' | 'enemy' | 'archer' | 'elite' | 'boss' | 'chest' | 'cage' | 'portal' | 'item_loot';
  gridX: number;
  gridY: number;
  posX: number; // canvas pixels x
  posY: number; // canvas pixels y
  hp: number;
  maxHp: number;
  speed: number;
  attackRange: number;
  attackCooldown: number;
  damage: number;
  lifeSteal: number;
  tempBuffs: string[];
  color: string;
  isDead: boolean;
  aggroed?: boolean; // Diablo style aggro
  groupingMode?: boolean; // Stateful flag for hysteresis grouping behavior
  groupingModeTimer?: number; // Minimum seconds to commit to walking back towards party
  lootItem?: Item;
  velX?: number;
  velY?: number;
  lootTimer?: number;
}

interface FloatingText {
  text: string;
  x: number;
  y: number;
  color: string;
  life: number; // 0-1
}

const powerupDescriptions: Record<string, string> = {
  'Divine Shield': 'Grant Warrior +15% Health per stack',
  'Shield Slam': 'Warrior attacks stun targets per stack',
  'Vampiric Blade': 'Warrior gains +3% Life Steal per stack',
  'Sharpshooter': 'Grant Ranger +10% Damage per stack',
  'Double Shot': 'Ranger attack speed +30% per stack (diminishing, capped at 75%)',
  'Mana Flow': 'Grant Sorceress +20% Magical Power per stack',
  'Fireball Strike': 'Sorceress spells explode in area per stack',
  'Rejuvenate': 'Heal all squad members 25% HP (instant)',
  'Iron Will': 'Boost All Defense by +10% per stack'
};

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
}

const slotIcons: Record<EquipmentSlot, any> = {
  helm: Crown,
  shoulders: ShieldAlert,
  chest: Shield,
  pants: ShieldCheck,
  boots: Footprints,
  gloves: ShieldAlert,
  weapon: Sword
};

export const CombatSimulation: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const {
    activeRun,
    roster,
    setRoster,
    squad,
    equipItem,
    campHealAllHeroes,
    campReviveHero,
    addRunGold,
    addRunXp,
    addRunLootToBag,
    advanceChamber,
    terminateRun,
    enqueueDialogue,
    activeDialogue,
    questState
  } = useGame();

  const [combatLog, setCombatLog] = useState<string[]>(['Entering Chamber...']);
  const [runStarted, setRunStarted] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [activeToast, setActiveToast] = useState<{ text: string; type: 'gold' | 'xp' | 'alert' | 'death' | 'info' } | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);
  const combatLogRef = useRef<HTMLDivElement>(null);

  // 0 = idle, 1 = animating (fade + text), 2 = terminate
  const [deathSequencePhase, setDeathSequencePhase] = useState<0 | 1 | 2>(0);
  const [showExitModal, setShowExitModal] = useState<boolean>(false);

  const triggerToast = (text: string, type: 'gold' | 'xp' | 'alert' | 'death' | 'info') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setActiveToast({ text, type });
    toastTimeoutRef.current = window.setTimeout(() => {
      setActiveToast(null);
    }, 2800);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  // Auto-scroll combat log to bottom
  useEffect(() => {
    if (combatLogRef.current) {
      combatLogRef.current.scrollTop = combatLogRef.current.scrollHeight;
    }
  }, [combatLog]);

  // Camp states (pre-combat preparation phase)
  const [selectedHeroId, setSelectedHeroId] = useState<string | null>(null);
  const [selectedBagItemId, setSelectedBagItemId] = useState<string | null>(null);
  const [showReviveModal, setShowReviveModal] = useState<boolean>(false);
  const [healedHeroes, setHealedHeroes] = useState<string[]>([]);
  const [hoveredItem, setHoveredItem] = useState<Item | null>(null);
  const [mouseCoords, setMouseCoords] = useState<{ x: number; y: number } | null>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    setMouseCoords({ x: e.clientX, y: e.clientY });
  };
  const handleMouseEnterItem = (item: Item, e: React.MouseEvent) => {
    setHoveredItem(item);
    setMouseCoords({ x: e.clientX, y: e.clientY });
  };
  const handleMouseLeaveItem = () => {
    setHoveredItem(null);
    setMouseCoords(null);
  };

  // Simulation parameters (Expanded to 40x40 Diablo-like dungeon!)
  const gridSize = 40;
  const tileSize = 32;

  // Preloaded hero avatar images ref
  const imagesRef = useRef<Record<string, HTMLImageElement>>({});
  const [, setImagesLoaded] = useState<boolean>(false);

  // Local mutable state refs for the animation loop
  const loopRef = useRef<number | null>(null);
  const entitiesRef = useRef<SimulatedEntity[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const gridMapRef = useRef<number[][]>([]); // 0: walkable, 1: wall
  const fogMapRef = useRef<boolean[][]>([]); // Fog of war
  const lastUpdateRef = useRef<number>(0);
  const deathCameraRef = useRef<{ x: number; y: number } | null>(null);
  const targetPosRef = useRef<{ x: number; y: number }>({ x: 36, y: 20 });

  // Synchronized refs to prevent loop restarts and stale closures
  const isPausedRef = useRef<boolean>(isPaused);
  const speedMultiplierRef = useRef<number>(speedMultiplier);
  const activeRunRef = useRef(activeRun);
  const bossDialogueShownRef = useRef<boolean>(false);
  const activeDialogueRef = useRef(activeDialogue);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    speedMultiplierRef.current = speedMultiplier;
  }, [speedMultiplier]);

  useEffect(() => {
    activeRunRef.current = activeRun;
  }, [activeRun]);

  useEffect(() => {
    activeDialogueRef.current = activeDialogue;
  }, [activeDialogue]);

  // Campfire event handlers & helpers
  const handleHeroClick = (heroId: string) => {
    setSelectedHeroId(selectedHeroId === heroId ? null : heroId);
  };

  const handleEquip = (slot: EquipmentSlot) => {
    if (!selectedHeroId || !selectedBagItemId) return;
    const item = activeRun?.runBag.find(i => i.id === selectedBagItemId);
    if (!item || item.type !== slot) return;

    equipItem(selectedHeroId, slot, item);
    setSelectedBagItemId(null);
  };

  const getSlotIcon = (slot: EquipmentSlot, isOccupied: boolean) => {
    const IconComponent = slotIcons[slot] || Shield;
    return (
      <IconComponent 
        size={16} 
        style={{ color: isOccupied ? 'var(--accent-gold)' : '#2b303c' }} 
      />
    );
  };

  const handleHealAll = () => {
    if (healedHeroes.length > 0 || !activeRun) return;
    campHealAllHeroes();
    const livingIds = Object.keys(activeRun.livingSquad).filter(
      id => activeRun.livingSquad[id].hp > 0
    );
    setHealedHeroes(livingIds);
  };

  const handleRevive = (heroId: string) => {
    campReviveHero(heroId);
    setShowReviveModal(false);
  };

  const advanceRoomCleared = () => {
    if (!activeRun) return;
    if (loopRef.current) cancelAnimationFrame(loopRef.current);
    
    // Auto-collect any remaining loot entities on the ground
    entitiesRef.current.forEach(ent => {
      if (ent.type === 'item_loot' && !ent.isDead && ent.lootItem) {
        addRunLootToBag(ent.lootItem);
        setCombatLog(log => [...log, `🎁 Loot Collected: Found [${ent.lootItem?.name}] (${ent.lootItem?.rarity})!`].slice(-40));
      }
    });

    const roomType = activeRun.currentChamber;
    let goldScavenged = 30 + Math.round(Math.random() * 20) + activeRun.currentBiome * 10;
    let xpScavenged = 120 + Math.round(Math.random() * 40) + activeRun.currentBiome * 30;
    
    addRunGold(goldScavenged);
    addRunXp(xpScavenged);
    triggerToast('🏆 Chamber Cleared!', 'info');

    setCombatLog(log => [
      ...log,
      `✨ Chamber Cleared! Scavenged ${goldScavenged} Gold and +${xpScavenged} XP.`
    ]);

    if (roomType === 5) {
      setCombatLog(log => [...log, `🏆 Gorgon Overlord Slain! Expedition Successful!`]);
    }

    advanceChamber();
    setRunStarted(false);
    setHealedHeroes([]); // Reset heal list for new chamber camp phase
  };

  const selectedHero = roster.find(h => h.character_id === selectedHeroId) || null;
  const selectedBagItem = activeRun?.runBag.find(i => i.id === selectedBagItemId) || null;

  const getAvatarPath = (type: string) => {
    const pathMap: Record<string, string> = {
      RANGER: 'ranger.png',
      WARRIOR: 'warrior_chef.png',
      WIZARD: 'sorceress.png',
      ROGUE: 'ranger.png',
      PALADIN: 'warrior.png',
      DRUID: 'ranger.png',
      NECROMANCER: 'wizard.png',
      ENEMY: 'enemy_grunt.png',
      ARCHER: 'enemy_archer.png',
      ELITE: 'enemy_elite.png',
      BOSS: 'enemy_boss.png',
      CHEST: 'treasure_chest.png'
    };
    return import.meta.env.BASE_URL + (pathMap[type] || 'ranger.png');
  };

  // Preload actual images on mount
  useEffect(() => {
    const typesToLoad = [
      'ranger', 'warrior', 'wizard', 'rogue', 'paladin', 'druid', 'necromancer',
      'enemy', 'archer', 'elite', 'boss', 'chest'
    ];
    let loadedCount = 0;
    typesToLoad.forEach(cls => {
      const img = new Image();
      img.src = getAvatarPath(cls.toUpperCase());
      const handleLoad = () => {
        loadedCount++;
        if (loadedCount === typesToLoad.length) {
          setImagesLoaded(true);
        }
      };
      img.onload = handleLoad;
      img.onerror = handleLoad;
      imagesRef.current[cls] = img;
    });
  }, []);

  // A* Pathfinding helper
  const findPath = (start: GridPos, target: GridPos): GridPos[] => {
    const grid = gridMapRef.current;
    if (grid.length === 0) return [];
    
    const openSet: GridPos[] = [start];
    const cameFrom = new Map<string, string>();
    
    const gScore = new Map<string, number>();
    gScore.set(`${start.x},${start.y}`, 0);
    
    const fScore = new Map<string, number>();
    const heuristic = (a: GridPos, b: GridPos) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    fScore.set(`${start.x},${start.y}`, heuristic(start, target));

    while (openSet.length > 0) {
      openSet.sort((a, b) => {
        const fa = fScore.get(`${a.x},${a.y}`) ?? 9999;
        const fb = fScore.get(`${b.x},${b.y}`) ?? 9999;
        return fa - fb;
      });

      const current = openSet.shift()!;
      if (current.x === target.x && current.y === target.y) {
        const path: GridPos[] = [current];
        let currStr = `${current.x},${current.y}`;
        while (cameFrom.has(currStr)) {
          const prevStr = cameFrom.get(currStr)!;
          const [px, py] = prevStr.split(',').map(Number);
          const prev = { x: px, y: py };
          path.unshift(prev);
          currStr = prevStr;
        }
        return path;
      }

      const neighbors = [
        { x: current.x + 1, y: current.y },
        { x: current.x - 1, y: current.y },
        { x: current.x, y: current.y + 1 },
        { x: current.x, y: current.y - 1 }
      ];

      for (const neighbor of neighbors) {
        if (neighbor.x < 0 || neighbor.x >= gridSize || neighbor.y < 0 || neighbor.y >= gridSize) continue;
        if (grid[neighbor.y][neighbor.x] === 1) continue;

        const tenantStr = `${neighbor.x},${neighbor.y}`;
        const tentativeGScore = (gScore.get(`${current.x},${current.y}`) ?? 9999) + 1;
        const neighborGScore = gScore.get(tenantStr) ?? 9999;

        if (tentativeGScore < neighborGScore) {
          cameFrom.set(tenantStr, `${current.x},${current.y}`);
          gScore.set(tenantStr, tentativeGScore);
          fScore.set(tenantStr, tentativeGScore + heuristic(neighbor, target));
          if (!openSet.some(pos => pos.x === neighbor.x && pos.y === neighbor.y)) {
            openSet.push(neighbor);
          }
        }
      }
    }
    return [];
  };

  // Initialize room layout & entities
  useEffect(() => {
    if (!activeRun) return;

    // Reset loop
    if (loopRef.current) cancelAnimationFrame(loopRef.current);

    // Clear frozen death camera
    deathCameraRef.current = null;

    // Initialize Fog of War (All false initially)
    fogMapRef.current = Array.from({ length: gridSize }, () => Array(gridSize).fill(false));

    // 1. Generate Connected Dungeon Grid
    let attempts = 0;
    let pathFound = false;
    let grid: number[][] = [];
    const startPos = { x: 2, y: 20 };
    let targetPos = { x: 36, y: 20 };

    while (!pathFound && attempts < 40) {
      grid = Array.from({ length: gridSize }, () => Array(gridSize).fill(0));
      
      // Outer borders
      for (let x = 0; x < gridSize; x++) {
        grid[0][x] = 1;
        grid[gridSize - 1][x] = 1;
      }
      for (let y = 0; y < gridSize; y++) {
        grid[y][0] = 1;
        grid[y][gridSize - 1] = 1;
      }

      // Hide target exit inside random coordinates on the east side!
      targetPos = {
        x: 34 + Math.floor(Math.random() * 4), // 34 to 37
        y: 4 + Math.floor(Math.random() * 32)  // 4 to 35
      };

      // Populate random pillars & maze walls
      for (let y = 2; y < gridSize - 2; y++) {
        for (let x = 4; x < gridSize - 4; x++) {
          if (x === startPos.x && y === startPos.y) continue;
          if (x === targetPos.x && y === targetPos.y) continue;
          if (Math.abs(x - startPos.x) <= 1 && Math.abs(y - startPos.y) <= 1) continue;
          if (Math.abs(x - targetPos.x) <= 1 && Math.abs(y - targetPos.y) <= 1) continue;
          
          if (Math.random() < 0.22) {
            grid[y][x] = 1;
          }
        }
      }

      gridMapRef.current = grid;
      const path = findPath(startPos, targetPos);
      if (path.length > 0) {
        pathFound = true;
        targetPosRef.current = targetPos;
      }
      attempts++;
    }

    // 2. Initialize Squad Entities on the far left
    const spawnedEntities: SimulatedEntity[] = [];
    let startX = 2;
    let startY = 20;

    squad.forEach((heroId, idx) => {
      const hero = roster.find(h => h.character_id === heroId);
      const runStatus = activeRun.livingSquad[heroId];
      if (!hero || !runStatus || runStatus.hp <= 0) return;

      const type = hero.class.toLowerCase() as any;
      const combinedSpeed = hero.base_stats.speed_mult * (hero.class === 'RANGER' ? 1.2 : 0.9);

      // Class base damage + flat weapon damage from equipped weapon
      const classBaseDmg = hero.class === 'WARRIOR' ? 12 : hero.class === 'WIZARD' ? 16 : 9;
      const weapon = hero.equipment['weapon'];
      const weaponDmg = weapon?.stats?.damage ?? 0;

      // Sum lifeSteal from all equipped items
      let lifeSteal = 0;
      if (hero.equipment) {
        for (const key in hero.equipment) {
          const item = hero.equipment[key as EquipmentSlot];
          if (item?.stats?.lifeSteal) lifeSteal += item.stats.lifeSteal;
        }
      }
      // Warrior passive: 2% life steal
      if (hero.class === 'WARRIOR') {
        lifeSteal += 0.02;
      }
      // Vampiric Blade powerup: +3% life steal per stack
      const vampBladeCount = (activeRun.selectedPowerups ?? []).filter(p => p === 'Vampiric Blade').length;
      if (vampBladeCount > 0) {
        lifeSteal += 0.03 * vampBladeCount;
      }

      spawnedEntities.push({
        id: heroId,
        name: hero.class,
        type,
        gridX: startX,
        gridY: startY + idx - 1,
        posX: startX * tileSize + tileSize / 2,
        posY: (startY + idx - 1) * tileSize + tileSize / 2,
        hp: runStatus.hp,
        maxHp: runStatus.maxHp,
        speed: combinedSpeed * 1.5,
        attackRange: hero.class === 'RANGER' ? 4 : hero.class === 'WIZARD' ? 3.5 : 1.2,
        attackCooldown: 0,
        damage: classBaseDmg + weaponDmg,
        lifeSteal,
        tempBuffs: runStatus.tempBuffs ?? [],
        color: hero.class === 'WARRIOR' ? '#0070dd' : hero.class === 'WIZARD' ? '#a335ee' : '#1eff00',
        isDead: false,
      });
    });


    // 3. Initialize Chamber Objectives at targetPos
    const roomType = activeRun.currentChamber;
    if (roomType === 5) {
      // Boss battle
      spawnedEntities.push({
        id: 'boss',
        name: 'Gorgon Overlord',
        type: 'boss',
        gridX: targetPos.x,
        gridY: targetPos.y,
        posX: targetPos.x * tileSize + tileSize / 2,
        posY: targetPos.y * tileSize + tileSize / 2,
        hp: Math.round(450 * Math.pow(1.55, activeRun.currentBiome)),
        maxHp: Math.round(450 * Math.pow(1.55, activeRun.currentBiome)),
        speed: 1.0,
        attackRange: 2.0,
        attackCooldown: 0,
        damage: Math.round(22 * Math.pow(1.40, activeRun.currentBiome)),
        lifeSteal: 0,
        tempBuffs: [],
        color: '#f87171',
        isDead: false,
        aggroed: false
      });
    } else if (roomType === 4) {
      // Loot Chest Room (second chest per biome) - chest now spawns where the Warden spawns!
    } else if (roomType === 3) {
      // Loot Chest Room - chest now spawns where the Warden spawns!
    } else {
      // Standard room has a Portal exit
      spawnedEntities.push({
        id: 'portal',
        name: 'Chamber Exit',
        type: 'portal',
        gridX: targetPos.x,
        gridY: targetPos.y,
        posX: targetPos.x * tileSize + tileSize / 2,
        posY: targetPos.y * tileSize + tileSize / 2,
        hp: 1,
        maxHp: 1,
        speed: 0,
        attackRange: 0,
        attackCooldown: 9999,
        damage: 0,
        lifeSteal: 0,
        tempBuffs: [],
        color: '#a335ee',
        isDead: false
      });
    }

    // 4. Scatter groups of enemies sporadically throughout the dungeon
    const groupCount = 4 + activeRun.currentBiome * 2;
    
    for (let g = 0; g < groupCount; g++) {
      let gx = 6;
      let gy = 20;
      let attempts = 0;
      let valid = false;

      while (attempts < 15 && !valid) {
        gx = 6 + Math.floor(Math.random() * 28); // columns 6 to 33
        gy = 3 + Math.floor(Math.random() * 34); // rows 3 to 36
        attempts++;

        const distToStart = Math.abs(gx - startPos.x) + Math.abs(gy - startPos.y);
        const distToExit = Math.abs(gx - targetPos.x) + Math.abs(gy - targetPos.y);
        if (grid[gy]?.[gx] !== 0 || distToStart <= 6 || distToExit <= 7) {
          continue;
        }

        // Ensure enemies are spread out and not clustered together
        let tooCloseToOther = false;
        for (const existing of spawnedEntities) {
          if (existing.type === 'enemy' || existing.type === 'elite') {
            const dist = Math.abs(existing.gridX - gx) + Math.abs(existing.gridY - gy);
            if (dist < 6) {
              tooCloseToOther = true;
              break;
            }
          }
        }
        if (!tooCloseToOther) {
          valid = true;
        }
      }

      if (grid[gy]?.[gx] === 0) {
        const biome = activeRun.currentBiome;
        const chamber = activeRun.currentChamber;
        // Exponential scaling: later biomes become dramatically harder
        const scaledHp   = (b: number, ch: number) => Math.round((60 + ch * 20) * Math.pow(1.45, b));
        const scaledDmg  = (b: number, ch: number) => Math.round((8  + ch * 2.5) * Math.pow(1.35, b));

        const isElite = g === groupCount - 1 && roomType >= 3;
        // Archers unlock at biome 1 chamber 2+ and appear more often with higher biome
        const archerChance = (biome >= 1 && chamber >= 2) ? 0.30 + biome * 0.05 : 0;
        const spawnAsArcher = !isElite && Math.random() < archerChance;

        const mobType = isElite ? 'elite' : spawnAsArcher ? 'archer' : 'enemy';
        const mobHp = mobType === 'elite'
          ? Math.round((140 + chamber * 25) * Math.pow(1.50, biome))
          : scaledHp(biome, chamber);
        const mobDmg = mobType === 'elite'
          ? Math.round((12 + chamber * 3)  * Math.pow(1.35, biome))
          : scaledDmg(biome, chamber);

        spawnedEntities.push({
          id: `enemy-${g}-0`,
          name: mobType === 'elite' ? 'Dungeon Warden' : mobType === 'archer' ? 'Bone Archer' : 'Feral Ghoul',
          type: mobType,
          gridX: gx,
          gridY: gy,
          posX: gx * tileSize + tileSize / 2,
          posY: gy * tileSize + tileSize / 2,
          hp: mobHp,
          maxHp: mobHp,
          speed: mobType === 'elite' ? 1.44 : mobType === 'archer' ? 1.0 : 1.32,
          attackRange: mobType === 'archer' ? 4.5 : 1.2,
          attackCooldown: mobType === 'archer' ? 1.5 : 0,
          damage: mobDmg,
          lifeSteal: 0,
          tempBuffs: [],
          color: mobType === 'elite' ? '#f87171' : mobType === 'archer' ? '#fb923c' : '#e2e8f0',
          isDead: false,
          aggroed: false
        });

        if (mobType === 'elite') {
          spawnedEntities.push({
            id: 'chest',
            name: 'Scavenger Chest',
            type: 'chest',
            gridX: gx,
            gridY: gy,
            posX: gx * tileSize + tileSize / 2,
            posY: gy * tileSize + tileSize / 2,
            hp: 1,
            maxHp: 1,
            speed: 0,
            attackRange: 0,
            attackCooldown: 9999,
            damage: 0,
            lifeSteal: 0,
            tempBuffs: [],
            color: '#facc15',
            isDead: false
          });
        }

        // Spawn melee sibling for melee packs only
        if (mobType === 'enemy' && gy + 1 < gridSize - 2 && grid[gy+1]?.[gx] === 0) {
          spawnedEntities.push({
            id: `enemy-${g}-1`,
            name: 'Feral Ghoul',
            type: 'enemy',
            gridX: gx,
            gridY: gy + 1,
            posX: gx * tileSize + tileSize / 2,
            posY: (gy + 1) * tileSize + tileSize / 2,
            hp: scaledHp(biome, chamber),
            maxHp: scaledHp(biome, chamber),
            speed: 1.32,
            attackRange: 1.2,
            attackCooldown: 0,
            damage: scaledDmg(biome, chamber),
            lifeSteal: 0,
            tempBuffs: [],
            color: '#e2e8f0',
            isDead: false,
            aggroed: false
          });
        }
      }
    }

    entitiesRef.current = spawnedEntities;
    floatingTextsRef.current = [];
    particlesRef.current = [];
    lastUpdateRef.current = performance.now();

    // Reveal starting area in fog map
    updateFogOfWarForInitialPos();
  }, [activeRun?.currentBiome, activeRun?.currentChamber]);

  // Reveal Vision around start coordinates
  const updateFogOfWarForInitialPos = () => {
    const fog = fogMapRef.current;
    if (fog.length === 0) return;
    for (let dy = -5; dy <= 5; dy++) {
      for (let dx = -5; dx <= 5; dx++) {
        const tx = 2 + dx;
        const ty = 20 + dy;
        if (tx >= 0 && tx < gridSize && ty >= 0 && ty < gridSize) {
          if (dx*dx + dy*dy <= 25) {
            fog[ty][tx] = true;
          }
        }
      }
    }
  };

  // Update vision radius around living squad members
  const updateVisionFog = () => {
    const fog = fogMapRef.current;
    if (fog.length === 0) return;
    const heroes = entitiesRef.current.filter(e => !e.isDead && e.type !== 'enemy' && e.type !== 'archer' && e.type !== 'elite' && e.type !== 'boss' && e.type !== 'chest' && e.type !== 'cage' && e.type !== 'portal');

    heroes.forEach(h => {
      const hx = h.gridX;
      const hy = h.gridY;
      const vision = 6;
      for (let dy = -vision; dy <= vision; dy++) {
        for (let dx = -vision; dx <= vision; dx++) {
          const tx = hx + dx;
          const ty = hy + dy;
          if (tx >= 0 && tx < gridSize && ty >= 0 && ty < gridSize) {
            if (dx*dx + dy*dy <= vision * vision) {
              fog[ty][tx] = true;
            }
          }
        }
      }
    });
  };

  // Main simulation tick
  const updateSimulation = (time: number) => {
    const run = activeRunRef.current;
    if (!run) return;

    const delta = (time - lastUpdateRef.current) / 1000;
    lastUpdateRef.current = time;

    if (isPausedRef.current || run.drafting || activeDialogueRef.current) {
      draw();
      loopRef.current = requestAnimationFrame(updateSimulation);
      return;
    }

    const grid = gridMapRef.current;
    const dt = Math.min(delta, 0.1) * speedMultiplierRef.current;

    // Update vision fog of war
    updateVisionFog();

    // Update floating texts & particles
    particlesRef.current.forEach(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt * 2.0;
    });
    particlesRef.current = particlesRef.current.filter(p => p.life > 0);

    floatingTextsRef.current.forEach(t => {
      t.y -= 20 * dt;
      t.life -= dt * 1.5;
    });
    floatingTextsRef.current = floatingTextsRef.current.filter(t => t.life > 0);

    const entities = entitiesRef.current;
    const heroTypes = new Set(['ranger','warrior','wizard','rogue','paladin','druid','necromancer']);
    const heroes = entities.filter(e => !e.isDead && heroTypes.has(e.type));
    const hostiles = entities.filter(e => !e.isDead && !heroTypes.has(e.type));

    // Check if squad is wiped
    if (heroes.length === 0) {
      setCombatLog(log => [...log, `Expedition wiped. Squad eliminated in Biome ${run.currentBiome}.`]);
      setDeathSequencePhase(1); // kick off animation
      return;
    }

    // Detect boss death — show sorceress dialogue immediately in-dungeon (only on first kill)
    const wizardAlreadyUnlocked = roster.find(h => h.character_id === 'hero_wizard')?.unlocked;
    if (run.currentBiome === 1 && run.currentChamber === 5 && !bossDialogueShownRef.current && !wizardAlreadyUnlocked) {
      const boss = entities.find(e => e.type === 'boss');
      if (boss && boss.isDead) {
        bossDialogueShownRef.current = true;

        // Unlock wizard/sorceress
        setRoster(prev => prev.map(h =>
          h.character_id === 'hero_wizard' ? { ...h, unlocked: true } : h
        ));

        // Show sorceress dialogue right away
        const warriorUnlocked = roster.find(h => h.character_id === 'hero_warrior')?.unlocked;
        if (warriorUnlocked && questState.warriorSurvivedBoss) {
          enqueueDialogue([
            { speaker: "Sorceress", portrait: import.meta.env.BASE_URL + "sorceress.png", text: "Ah, the ones who vanquished the terror of the first biome..." },
            { speaker: "Sorceress", portrait: import.meta.env.BASE_URL + "sorceress.png", text: "I am a seeker of arcane mysteries, bound to these chambers by the boss's dark curse." },
            { speaker: "Warrior Chef", portrait: import.meta.env.BASE_URL + "warrior_chef.png", text: "Daughter! You're safe! Oh, thank the heavens. I thought I'd lost you to these dungeons forever!" },
            { speaker: "Sorceress", portrait: import.meta.env.BASE_URL + "sorceress.png", text: "Father? You... you're fighting again? I thought you retired to serve stews." },
            { speaker: "Warrior Chef", portrait: import.meta.env.BASE_URL + "warrior_chef.png", text: "A dad's job is never done, sweetie! Especially when his daughter goes dungeon-crawling for garlic bread herbs." },
            { speaker: "Sorceress", portrait: import.meta.env.BASE_URL + "sorceress.png", text: "Well... since you're here, I suppose I shall pledge my spells to this guild as well. Let us burn down what remains of these dungeons together." }
          ]);
        } else {
          enqueueDialogue([
            { speaker: "Sorceress", portrait: import.meta.env.BASE_URL + "sorceress.png", text: "Ah, the ones who vanquished the terror of the first biome..." },
            { speaker: "Sorceress", portrait: import.meta.env.BASE_URL + "sorceress.png", text: "I am a seeker of arcane mysteries, bound to these chambers by the boss's dark curse." },
            { speaker: "Sorceress", portrait: import.meta.env.BASE_URL + "sorceress.png", text: "Now that you have shattered their control, I shall pledge my spells to your cause. Let us burn down what remains of these dungeons." }
          ]);
        }
        setCombatLog(log => [...log, `✨ The Sorceress has joined your guild!`]);
      }
    }

    // 1. Process active objective clearing
    const activeObjective = hostiles.find(e => !e.isDead && (e.type === 'boss' || e.type === 'chest' || e.type === 'cage'));
    const activePortal = hostiles.find(e => !e.isDead && e.type === 'portal');
    const primaryObjective = hostiles.find(e => !e.isDead && (e.type === 'chest' || e.type === 'cage' || e.type === 'boss' || e.type === 'portal'));

    // Spawn an Exit Portal at targetPos once cleared
    // Block portal while boss dialogue is active so player reads it first
    if (!activeObjective && !activePortal && !activeDialogue) {
      const tx = targetPosRef.current.x;
      const ty = targetPosRef.current.y;

      entities.push({
        id: 'portal',
        name: 'Exit Portal',
        type: 'portal',
        gridX: tx,
        gridY: ty,
        posX: tx * tileSize + tileSize / 2,
        posY: ty * tileSize + tileSize / 2,
        hp: 1,
        maxHp: 1,
        speed: 0,
        attackRange: 0,
        attackCooldown: 9999,
        damage: 0,
        lifeSteal: 0,
        tempBuffs: [],
        color: '#a335ee',
        isDead: false
      });
      setCombatLog(log => [...log, `🌀 Chamber objective complete! An Exit Portal has opened.`].slice(-40));
    }

    // 2. Exiting the room only triggers when a living hero steps onto the active portal!
    const portal = hostiles.find(e => !e.isDead && e.type === 'portal');
    if (portal) {
      const heroOnPortal = heroes.find(h => h.gridX === portal.gridX && h.gridY === portal.gridY);
      if (heroOnPortal) {
        advanceRoomCleared();
        return;
      }
    }

    // Process entity AI
    for (const ent of entities) {
      if (ent.isDead) continue;

      if (ent.type === 'item_loot') {
        if (ent.lootTimer === undefined) ent.lootTimer = 0;
        ent.lootTimer += dt;
        
        if (ent.lootTimer < 0.6) {
          // Physics popout phase
          const vx = ent.velX ?? 0;
          const vy = ent.velY ?? 0;
          ent.posX += vx * dt * 25;
          ent.posY += vy * dt * 25;
          ent.velX = vx * Math.max(0, 1 - 5 * dt);
          ent.velY = (vy + 20 * dt) * Math.max(0, 1 - 2 * dt); // gravity + drag
          // Keep grid updated
          ent.gridX = Math.floor(ent.posX / tileSize);
          ent.gridY = Math.floor(ent.posY / tileSize);
        } else {
          // Magnetized suction phase
          let closestHero: SimulatedEntity | null = null;
          let minD = 99999;
          for (const h of heroes) {
            const dx = h.posX - ent.posX;
            const dy = h.posY - ent.posY;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d < minD) {
              minD = d;
              closestHero = h;
            }
          }
          if (closestHero) {
            const dx = closestHero.posX - ent.posX;
            const dy = closestHero.posY - ent.posY;
            const speed = 100 + 400 * (ent.lootTimer - 0.6); // accelerate suction
            ent.posX += (dx / minD) * speed * dt;
            ent.posY += (dy / minD) * speed * dt;
            ent.gridX = Math.floor(ent.posX / tileSize);
            ent.gridY = Math.floor(ent.posY / tileSize);
            
            if (minD < 12) {
              // Collected!
              ent.isDead = true;
              if (ent.lootItem) {
                addRunLootToBag(ent.lootItem);
                setCombatLog(log => [...log, `🎁 Loot Collected: Found [${ent.lootItem?.name}] (${ent.lootItem?.rarity})!`].slice(-40));
                
                floatingTextsRef.current.push({
                  text: `+1 Loot: ${ent.lootItem.name}`,
                  x: closestHero!.posX,
                  y: closestHero!.posY - 12,
                  color: ent.color,
                  life: 1.5
                });
                
                // Spawn particles
                for (let i = 0; i < 8; i++) {
                  const angle = Math.random() * Math.PI * 2;
                  const pSpeed = 20 + Math.random() * 40;
                  particlesRef.current.push({
                    x: closestHero!.posX,
                    y: closestHero!.posY,
                    vx: Math.cos(angle) * pSpeed,
                    vy: Math.sin(angle) * pSpeed,
                    color: ent.color,
                    size: 2 + Math.random() * 2,
                    life: 0.5 + Math.random() * 0.5
                  });
                }
              }
            }
          }
        }
        continue;
      }

      if (ent.type === 'chest' || ent.type === 'cage' || ent.type === 'portal') continue;

      // After the early continue above, ent is never chest/cage/portal here
      const isHostile = !heroTypes.has(ent.type);

      // 1. Process Aggro triggers for unaggroed hostiles (Diablo Style)
      // Archers keep distance from heroes: they want to stay at 3-4 tile range
      const isArcher = ent.type === 'archer';

      if (isHostile && !ent.aggroed) {
        // Find nearest hero
        let nearestHeroDist = 999;
        let nearestHero: SimulatedEntity | null = null;
        for (const h of heroes) {
          const dx = h.gridX - ent.gridX;
          const dy = h.gridY - ent.gridY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < nearestHeroDist) {
            nearestHeroDist = dist;
            nearestHero = h;
          }
        }

        // If hero is within 6 tiles vision, aggro!
        if (nearestHero && nearestHeroDist <= 6.5) {
          ent.aggroed = true;
          floatingTextsRef.current.push({
            text: '!',
            x: ent.posX,
            y: ent.posY - 10,
            color: '#ef4444',
            life: 1.0
          });

          // Alert other sentries in a 5 tile radius
          entities.forEach(other => {
            if (other.id !== ent.id && (other.type === 'enemy' || other.type === 'elite') && !other.aggroed) {
              const odx = other.gridX - ent.gridX;
              const ody = other.gridY - ent.gridY;
              if (odx*odx + ody*ody <= 6) {
                other.aggroed = true;
                floatingTextsRef.current.push({
                  text: 'Alerted!',
                  x: other.posX,
                  y: other.posY - 10,
                  color: '#f87171',
                  life: 0.8
                });
              }
            }
          });

          setCombatLog(log => [...log, `⚠️ Monsters spotted the squad!`].slice(-40));
          triggerToast('⚠️ Monsters spotted the squad!', 'alert');
        } else {
          continue; // Stay idle
        }
      }

      // Update cooldowns
      if (ent.attackCooldown > 0) {
        ent.attackCooldown -= dt;
      }

      // 2. Target Selection
      let target: SimulatedEntity | null = null;

      if (isHostile) {
        // Hostile targets the nearest living hero
        let minDist = 9999;
        for (const h of heroes) {
          const dx = h.posX - ent.posX;
          const dy = h.posY - ent.posY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < minDist) {
            minDist = dist;
            target = h;
          }
        }
      } else {
        // Find anchor (Warrior/Paladin, or teammate furthest behind)
        const teammates = heroes.filter(h => h.id !== ent.id);
        let anchor: SimulatedEntity | null = null;
        if (teammates.length > 0) {
          anchor = teammates.find(t => t.type === 'warrior' || t.type === 'paladin') || null;
          if (!anchor) {
            anchor = teammates.reduce((furthest, curr) => curr.posX < furthest.posX ? curr : furthest, teammates[0]);
          }
        }
        const distToAnchorTiles = anchor 
          ? Math.sqrt((ent.posX - anchor.posX) ** 2 + (ent.posY - anchor.posY) ** 2) / tileSize 
          : 0;

        // Grouping mode: walk back towards party when too far from anchor
        // Uses distance-based hysteresis: activate at 4.5 tiles, deactivate at 2.0 tiles
        // Minimum 1 second commitment prevents oscillation when both members are borderline
        if (anchor) {
          if (ent.groupingModeTimer !== undefined && ent.groupingModeTimer > 0) {
            ent.groupingModeTimer = Math.max(0, ent.groupingModeTimer - dt);
            ent.groupingMode = true;
          } else if (distToAnchorTiles > 4.5) {
            ent.groupingMode = true;
            ent.groupingModeTimer = 1.0;
          } else if (distToAnchorTiles < 2.0) {
            ent.groupingMode = false;
          }
          // Between 2.0 and 4.5 tiles with no active timer: maintain current state (hysteresis)
        } else {
          ent.groupingMode = false;
          ent.groupingModeTimer = 0;
        }

        // Hero targeting priority:
        // A) Lowest HP aggroed enemy (finish off weak targets), nearest as tiebreaker
        // B) If no aggroed enemy, pathfind and walk towards the main objective on the right!
        //    (However, if groupingMode is active, target the anchor to wait/pull back)
        const activeEnemies = hostiles.filter(e => e.aggroed && e.type !== 'chest' && e.type !== 'cage' && e.type !== 'portal');
        
        if (activeEnemies.length > 0) {
          let bestTarget: SimulatedEntity | null = null;
          let bestHpRatio = 999;
          let bestDist = 9999;
          for (const e of activeEnemies) {
            const hpRatio = e.hp / e.maxHp;
            const dx = e.posX - ent.posX;
            const dy = e.posY - ent.posY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            // Prioritize lowest HP%, then nearest distance as tiebreaker
            if (hpRatio < bestHpRatio || (hpRatio === bestHpRatio && dist < bestDist)) {
              bestHpRatio = hpRatio;
              bestDist = dist;
              bestTarget = e;
            }
          }
          target = bestTarget;
        } else {
          // No active threat: target the main exit portal/chest/cage directly!
          // If we are in groupingMode, target the anchor instead to group up
          if (ent.groupingMode && anchor) {
            target = anchor;
          } else {
            target = primaryObjective || null;
          }
        }
      }

      if (target) {
        const dx = target.posX - ent.posX;
        const dy = target.posY - ent.posY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const tileDist = dist / tileSize;

        // 3. Attack / Interaction Check
        const effectiveRange = target.type === 'portal' ? 0.1 : (target.type === 'chest' || target.type === 'cage') ? 0.9 : ent.attackRange;
        
        // Prevent friendly fire: heroes must never attack other heroes
        if (!isHostile && heroTypes.has(target.type)) {
          target = null;
          continue;
        }

        if (tileDist <= effectiveRange) {
          if (ent.attackCooldown <= 0) {
            // Base attack cooldown per class
            const baseAtkCooldown = ent.type === 'ranger' ? 1.0 : ent.type === 'wizard' ? 1.8 : 1.2;

            // Apply weapon atkSpeed from equipped weapon (heroes only — enemies have no equipment)
            const heroRec = roster.find(h => h.character_id === ent.id);
            let combinedAtkSpeed = 1.0;
            if (heroRec) {
              combinedAtkSpeed *= heroRec.base_stats.atk_speed_mult;
              const weapon = heroRec.equipment?.['weapon'];
              if (weapon?.stats?.atkSpeed) {
                combinedAtkSpeed *= weapon.stats.atkSpeed;
              }
              // Light gear speed bonus
              if (heroRec.class === 'RANGER') {
                let hasHeavy = false;
                for (const key in heroRec.equipment) {
                  const item = heroRec.equipment[key as EquipmentSlot];
                  if (item && item.weight === 'heavy') hasHeavy = true;
                }
                if (!hasHeavy) {
                  combinedAtkSpeed *= 1.15;
                }
              }
            }
            const weaponAtkSpeed = Math.max(combinedAtkSpeed, 0.5);

            // Count stacks of Double Shot (diminishing returns, capped at 75% reduction)
            const doubleShotStacks = run.selectedPowerups?.filter(p => p === 'Double Shot').length ?? 0;
            const atkCooldownMult = ent.type === 'ranger'
              ? Math.max(0.25, Math.pow(0.70, doubleShotStacks))
              : 1.0;
            ent.attackCooldown = (baseAtkCooldown / weaponAtkSpeed) * atkCooldownMult;

            // Handle chest unlock / cage breaking
            if (target.type === 'chest' || target.type === 'cage') {
              target.hp = 0;
              target.isDead = true;
              
              if (target.type === 'chest') {
                const item = generateRandomItem(run.currentBiome);
                entitiesRef.current.push({
                  id: `loot-${Date.now()}-${Math.random()}`,
                  name: item.name,
                  type: 'item_loot',
                  gridX: target.gridX,
                  gridY: target.gridY,
                  posX: target.posX,
                  posY: target.posY,
                  hp: 1,
                  maxHp: 1,
                  speed: 2,
                  attackRange: 0,
                  attackCooldown: 0,
                  damage: 0,
                  lifeSteal: 0,
                  tempBuffs: [],
                  color: item.rarity === 'Legendary' ? '#ff8000' : item.rarity === 'Epic' ? '#a335ee' : item.rarity === 'Rare' ? '#0070dd' : '#1eff00',
                  isDead: false,
                  lootItem: item,
                  velX: (Math.random() - 0.5) * 10,
                  velY: -5 - Math.random() * 8,
                });

                floatingTextsRef.current.push({
                  text: `Scavenging...`,
                  x: target.posX,
                  y: target.posY - 15,
                  color: '#facc15',
                  life: 1.0
                });
              }

              continue;
            }
            if (target.type === 'portal') {
              // Portals are not attacked or destroyed; heroes stand on them to exit
              continue;
            }

            // --- Powerup damage multipliers (stacking: count occurrences) ---
            let dmgMult = 1.0;
            const powerups = run.selectedPowerups ?? [];
            const countOf = (name: string) => powerups.filter(p => p === name).length;
            // Sharpshooter: Ranger +10% damage per stack
            if (ent.type === 'ranger') dmgMult += 0.10 * countOf('Sharpshooter');
            // Mana Flow: Wizard +20% per stack
            if (ent.type === 'wizard') dmgMult += 0.20 * countOf('Mana Flow');
            // Fireball Strike: Wizard +25% per stack
            if (ent.type === 'wizard') dmgMult += 0.25 * countOf('Fireball Strike');
            // Shield Slam: Warrior +15% per stack
            if (ent.type === 'warrior') dmgMult += 0.15 * countOf('Shield Slam');
            // Elixir of Wrath: +10% damage from purchased buff
            if (ent.tempBuffs?.includes('damage')) dmgMult += 0.10;

            const isMitigated = target.type === 'warrior' && Math.random() < 0.25;
            const rawDmg = Math.round(ent.damage * dmgMult);
            const dmg = isMitigated ? Math.round(rawDmg * 0.4) : rawDmg;
            
            target.hp = Math.max(target.hp - dmg, 0);

            if (Math.random() < 0.35 || ent.type === 'boss') {
              setCombatLog(log => [
                ...log,
                isMitigated 
                  ? `${ent.name} attacks Warrior (Shield Block!)`
                  : `${ent.name} attacks ${target!.name} dealing ${dmg} dmg.`
              ].slice(-40));
            }

            floatingTextsRef.current.push({
              text: isMitigated ? `Blocked!` : `-${dmg}`,
              x: target.posX,
              y: target.posY - 8,
              color: isMitigated ? '#60a5fa' : isHostile ? '#ef4444' : '#fbbf24',
              life: 1.0
            });

            for (let k = 0; k < 6; k++) {
              particlesRef.current.push({
                x: target.posX,
                y: target.posY,
                vx: (Math.random() - 0.5) * 80,
                vy: (Math.random() - 0.5) * 80,
                color: isHostile ? '#ef4444' : '#fbbf24',
                size: 2 + Math.random() * 2,
                life: 0.4
              });
            }

            // --- Lifesteal: heal attacker based on lifeSteal % of damage dealt ---
            if (!isHostile && ent.lifeSteal > 0) {
              const healAmount = Math.round(dmg * ent.lifeSteal);
              if (healAmount > 0) {
                const oldHp = ent.hp;
                ent.hp = Math.min(ent.hp + healAmount, ent.maxHp);
                const actualHeal = ent.hp - oldHp;
                if (actualHeal > 0) {
                  // Sync to livingSquad
                  if (run.livingSquad[ent.id]) {
                    run.livingSquad[ent.id].hp = ent.hp;
                  }
                  floatingTextsRef.current.push({
                    text: `+${actualHeal}`,
                    x: ent.posX,
                    y: ent.posY - 10,
                    color: '#4ade80',
                    life: 1.0
                  });
                }
              }
            }

            if (target.hp <= 0) {
              target.isDead = true;
              setCombatLog(log => [...log, `💀 ${target!.name} has fallen.`].slice(-40));
              
              if (target.type === 'boss') {
                const item = generateRandomItem(run.currentBiome);
                item.rarity = 'Legendary';
                entitiesRef.current.push({
                  id: `loot-${Date.now()}-${Math.random()}`,
                  name: item.name,
                  type: 'item_loot',
                  gridX: target.gridX,
                  gridY: target.gridY,
                  posX: target.posX,
                  posY: target.posY,
                  hp: 1,
                  maxHp: 1,
                  speed: 2,
                  attackRange: 0,
                  attackCooldown: 0,
                  damage: 0,
                  lifeSteal: 0,
                  tempBuffs: [],
                  color: '#ff8000', // Legendary
                  isDead: false,
                  lootItem: item,
                  velX: (Math.random() - 0.5) * 10,
                  velY: -5 - Math.random() * 8,
                });
              }
              
              if (run.livingSquad[target.id]) {
                run.livingSquad[target.id].hp = 0;
                triggerToast(`💀 ${target!.name} has fallen!`, 'death');
              }

              // Drops on enemy monster defeat
              if (!isHostile && (target.type as string) !== 'chest' && (target.type as string) !== 'cage' && (target.type as string) !== 'portal') {
                let goldDropped = 0;
                // Gold drop (50% chance)
                if (Math.random() < 0.50) {
                  goldDropped = 4 + Math.round(Math.random() * 8) + run.currentBiome * 2;
                  addRunGold(goldDropped);
                  setCombatLog(log => [...log, `💰 ${target!.name} dropped ${goldDropped} Gold!`].slice(-40));
                  
                  // Add gold floating text
                  floatingTextsRef.current.push({
                    text: `+${goldDropped}g`,
                    x: target.posX - 8,
                    y: target.posY - 12,
                    color: '#facc15',
                    life: 1.2
                  });
                }

                // XP drop (100% chance for rapid level-up support!)
                const xpDropped = 25 + Math.round(Math.random() * 15) + run.currentBiome * 5;
                addRunXp(xpDropped);
                setCombatLog(log => [...log, `✨ Squad gained +${xpDropped} Team XP!`].slice(-40));
                
                // Add XP floating text
                floatingTextsRef.current.push({
                  text: `+${xpDropped} XP`,
                  x: target.posX + 8,
                  y: target.posY - 12,
                  color: '#c084fc',
                  life: 1.2
                });

                // Display unified toast
                if (goldDropped > 0) {
                  triggerToast(`💰 +${goldDropped}g   ✨ +${xpDropped} XP`, 'gold');
                } else {
                  triggerToast(`✨ +${xpDropped} XP`, 'xp');
                }
              }
            } else {
              if (run.livingSquad[target.id]) {
                run.livingSquad[target.id].hp = target.hp;
              }
            }
          }
        }

        // 4. Movement Logic (independent of whether we just attacked, supports kiting!)
        let kited = false;
        const isRangedHero = ent.type === 'ranger' || ent.type === 'wizard';

        // Archer enemies kite away from heroes when they close into melee range
        if (isArcher && target) {
          const adx = target.posX - ent.posX;
          const ady = target.posY - ent.posY;
          const adist = Math.sqrt(adx * adx + ady * ady) / tileSize;
          // If hero is too close, back away
          if (adist < 3.0) {
            const mdx = -(adx / (adist * tileSize));
            const mdy = -(ady / (adist * tileSize));
            const nextX = ent.posX + mdx * ent.speed * tileSize * dt;
            const nextY = ent.posY + mdy * ent.speed * tileSize * dt;
            const nextGridX = Math.floor(nextX / tileSize);
            const nextGridY = Math.floor(nextY / tileSize);
            if (grid[nextGridY]?.[nextGridX] !== 1) {
              ent.posX = nextX;
              ent.posY = nextY;
              ent.gridX = nextGridX;
              ent.gridY = nextGridY;
              kited = true;
            }
          }
        }

        if (isRangedHero) {
          // Identify threats (enemies, elites, bosses, archers) targeting or close to this hero
          const closeThreats = hostiles.filter(h => {
            if (h.isDead || (h.type !== 'enemy' && h.type !== 'elite' && h.type !== 'boss' && h.type !== 'archer')) return false;
            const hdx = h.posX - ent.posX;
            const hdy = h.posY - ent.posY;
            const hdist = Math.sqrt(hdx * hdx + hdy * hdy);
            return hdist / tileSize <= 2.2; // threat within 2.2 tiles
          });

          if (closeThreats.length > 0) {
            const neighbors = [
              { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
              { dx: 0, dy: -1 }, { dx: 0, dy: 1 }
            ];

            let bestCell = { x: ent.gridX, y: ent.gridY };
            let maxThreatDist = -1;
            let bestScore = -9999;

            // Find anchor for kiting cell selection scoring
            const teammates = heroes.filter(h => h.id !== ent.id);
            let anchor: SimulatedEntity | null = null;
            if (teammates.length > 0) {
              anchor = teammates.find(t => t.type === 'warrior' || t.type === 'paladin') || null;
              if (!anchor) {
                anchor = teammates.reduce((furthest, curr) => curr.posX < furthest.posX ? curr : furthest, teammates[0]);
              }
            }
            const isTooFar = ent.groupingMode;

            // Current cell distance to closest threat
            let currentMinThreatDist = 999;
            closeThreats.forEach(t => {
              const dist = Math.sqrt((t.gridX - ent.gridX) ** 2 + (t.gridY - ent.gridY) ** 2);
              if (dist < currentMinThreatDist) {
                currentMinThreatDist = dist;
              }
            });

            if (isTooFar && anchor) {
              const currentDistToAnchor = Math.sqrt((anchor.gridX - ent.gridX) ** 2 + (anchor.gridY - ent.gridY) ** 2);
              bestScore = currentMinThreatDist * 2.0 - currentDistToAnchor;
            } else {
              maxThreatDist = currentMinThreatDist;
            }

            // Find neighboring walkable cell that maximizes distance to nearest threat or balances it with anchor gravity
            neighbors.forEach(n => {
              const nx = ent.gridX + n.dx;
              const ny = ent.gridY + n.dy;

              if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize) {
                const grid = gridMapRef.current;
                if (grid[ny]?.[nx] === 0) {
                  let minThreatDist = 999;
                  closeThreats.forEach(t => {
                    const dist = Math.sqrt((t.gridX - nx) ** 2 + (t.gridY - ny) ** 2);
                    if (dist < minThreatDist) minThreatDist = dist;
                  });

                  if (isTooFar && anchor) {
                    const distToAnchor = Math.sqrt((anchor.gridX - nx) ** 2 + (anchor.gridY - ny) ** 2);
                    const score = minThreatDist * 2.0 - distToAnchor;
                    if (score > bestScore) {
                      bestScore = score;
                      bestCell = { x: nx, y: ny };
                    }
                  } else {
                    if (minThreatDist > maxThreatDist) {
                      maxThreatDist = minThreatDist;
                      bestCell = { x: nx, y: ny };
                    }
                  }
                }
              }
            });

             if (bestCell.x !== ent.gridX || bestCell.y !== ent.gridY) {
              const destX = bestCell.x * tileSize + tileSize / 2;
              const destY = bestCell.y * tileSize + tileSize / 2;
              const mdx = destX - ent.posX;
              const mdy = destY - ent.posY;
              const stepDist = Math.sqrt(mdx * mdx + mdy * mdy);

              if (stepDist > 1.0) {
                // Move away (Ranger / Wizard speed mult reduced by 50% for balance)
                const nextX = ent.posX + (mdx / stepDist) * ent.speed * 0.375 * tileSize * dt;
                const nextY = ent.posY + (mdy / stepDist) * ent.speed * 0.375 * tileSize * dt;
                const nextGridX = Math.floor(nextX / tileSize);
                const nextGridY = Math.floor(nextY / tileSize);

                if (grid[nextGridY]?.[nextGridX] !== 1) {
                  ent.posX = nextX;
                  ent.posY = nextY;
                  ent.gridX = nextGridX;
                  ent.gridY = nextGridY;
                  kited = true;
                }
              }
            }
          }
        }

        if (!kited && tileDist > effectiveRange) {
          // Normal pathfind movement
          let moveTarget = target;

          // If in combat (target is an enemy) but target is out of our attack range,
          // and we are too far ahead of the anchor, move towards the anchor to draw the enemies back!
          const teammates = heroes.filter(h => h.id !== ent.id);
          let anchor: SimulatedEntity | null = null;
          if (teammates.length > 0) {
            anchor = teammates.find(t => t.type === 'warrior' || t.type === 'paladin') || null;
            if (!anchor) {
              anchor = teammates.reduce((furthest, curr) => curr.posX < furthest.posX ? curr : furthest, teammates[0]);
            }
          }


          if (ent.groupingMode && anchor && target.type !== 'portal' && target.type !== 'chest' && target.type !== 'cage') {
            if (tileDist > ent.attackRange) {
              moveTarget = anchor;
            }
          }

          const path = findPath({ x: ent.gridX, y: ent.gridY }, { x: moveTarget.gridX, y: moveTarget.gridY });
          let destX = moveTarget.posX;
          let destY = moveTarget.posY;

          if (path.length > 1) {
            const nextStep = path[1];
            destX = nextStep.x * tileSize + tileSize / 2;
            destY = nextStep.y * tileSize + tileSize / 2;
          }

          const mdx = destX - ent.posX;
          const mdy = destY - ent.posY;
          const stepDist = Math.sqrt(mdx * mdx + mdy * mdy);

          if (stepDist > 1.5) {
            const nextX = ent.posX + (mdx / stepDist) * ent.speed * tileSize * dt;
            const nextY = ent.posY + (mdy / stepDist) * ent.speed * tileSize * dt;
            const nextGridX = Math.floor(nextX / tileSize);
            const nextGridY = Math.floor(nextY / tileSize);

            if (grid[nextGridY]?.[nextGridX] !== 1) {
              ent.posX = nextX;
              ent.posY = nextY;
              ent.gridX = nextGridX;
              ent.gridY = nextGridY;
            } else {
              // Sliding logic: try moving along X or Y individually if diagonal/direct path is blocked by a wall
              const nextXOnly = ent.posX + (mdx / stepDist) * ent.speed * tileSize * dt;
              const nextGridXOnly = Math.floor(nextXOnly / tileSize);
              if (grid[ent.gridY]?.[nextGridXOnly] !== 1) {
                ent.posX = nextXOnly;
                ent.gridX = nextGridXOnly;
              } else {
                const nextYOnly = ent.posY + (mdy / stepDist) * ent.speed * tileSize * dt;
                const nextGridYOnly = Math.floor(nextYOnly / tileSize);
                if (grid[nextGridYOnly]?.[ent.gridX] !== 1) {
                  ent.posY = nextYOnly;
                  ent.gridY = nextGridYOnly;
                }
              }
            }
          }
        }
      }
    }

    draw();

    loopRef.current = requestAnimationFrame(updateSimulation);
  };

  // Canvas drawing
  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate camera offset following the squad average position
    const heroes = entitiesRef.current.filter(e => !e.isDead && e.type !== 'enemy' && e.type !== 'archer' && e.type !== 'elite' && e.type !== 'boss' && e.type !== 'chest' && e.type !== 'cage' && e.type !== 'portal');
    let avgX = 20 * tileSize;
    let avgY = 20 * tileSize;
    if (heroes.length > 0) {
      avgX = heroes.reduce((sum, h) => sum + h.posX, 0) / heroes.length;
      avgY = heroes.reduce((sum, h) => sum + h.posY, 0) / heroes.length;
    }

    const viewWidth = 576;
    const viewHeight = 576;

    // Use frozen camera during death sequence, otherwise follow heroes
    let camX: number;
    let camY: number;
    if (deathSequencePhase >= 1 && deathCameraRef.current) {
      camX = deathCameraRef.current.x;
      camY = deathCameraRef.current.y;
    } else {
      camX = Math.max(0, Math.min(avgX - viewWidth / 2, gridSize * tileSize - viewWidth));
      camY = Math.max(0, Math.min(avgY - viewHeight / 2, gridSize * tileSize - viewHeight));
    }
    // Always store last computed position for freeze-on-death
    deathCameraRef.current = { x: camX, y: camY };

    // Clear full 1152x1152 pixel buffer
    ctx.fillStyle = '#020204';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Save state and scale coordinates to 2x for Retina/High-DPI sharp rendering!
    ctx.save();
    ctx.scale(2, 2);

    const grid = gridMapRef.current;
    const fog = fogMapRef.current;

    // Draw Grid walls in camera viewport
    const startCellX = Math.max(0, Math.floor(camX / tileSize));
    const endCellX = Math.min(gridSize, Math.ceil((camX + viewWidth) / tileSize));
    const startCellY = Math.max(0, Math.floor(camY / tileSize));
    const endCellY = Math.min(gridSize, Math.ceil((camY + viewHeight) / tileSize));

    // Biome tile colour palettes — each biome gets a distinct dungeon atmosphere
    const biomePalettes: Record<number, { wall: string; wallEdge: string; floor: string; floorEdge: string }> = {
      1: { wall: '#1e2230', wallEdge: '#2d334a', floor: '#0b0c13', floorEdge: '#0e1017' }, // Deep crypt — dark blue-grey
      2: { wall: '#1f1508', wallEdge: '#3a2710', floor: '#100b04', floorEdge: '#180f05' }, // Scorched ruins — dark amber
      3: { wall: '#0e1e12', wallEdge: '#1a3320', floor: '#060f08', floorEdge: '#091409' }, // Cursed forest — dark green
      4: { wall: '#1a0d1e', wallEdge: '#2e1635', floor: '#0c060f', floorEdge: '#110810' }, // Void depths — deep purple
      5: { wall: '#1e0e0e', wallEdge: '#3a1515', floor: '#0f0606', floorEdge: '#170909' }, // Inferno core — blood red
    };
    const biomeIdx = activeRunRef.current?.currentBiome ?? 1;
    const palette = biomePalettes[biomeIdx] ?? biomePalettes[1];

    for (let y = startCellY; y < endCellY; y++) {
      for (let x = startCellX; x < endCellX; x++) {
        // Draw unrevealed tiles as black
        if (!fog[y]?.[x]) {
          ctx.fillStyle = '#000000';
          ctx.fillRect(x * tileSize - camX, y * tileSize - camY, tileSize, tileSize);
          continue;
        }

        if (grid[y][x] === 1) {
          ctx.fillStyle = palette.wall;
          ctx.fillRect(x * tileSize - camX, y * tileSize - camY, tileSize, tileSize);
          ctx.strokeStyle = palette.wallEdge;
          ctx.strokeRect(x * tileSize - camX, y * tileSize - camY, tileSize, tileSize);
        } else {
          ctx.fillStyle = palette.floor;
          ctx.fillRect(x * tileSize - camX, y * tileSize - camY, tileSize, tileSize);
          ctx.strokeStyle = palette.floorEdge;
          ctx.strokeRect(x * tileSize - camX, y * tileSize - camY, tileSize, tileSize);
        }
      }
    }

    // Draw entities with camera offset
    entitiesRef.current.forEach(ent => {
      if (ent.isDead) return;

      // Don't render entities hidden in the vision fog!
      if (!fog[ent.gridY]?.[ent.gridX]) return;

      const drawX = ent.posX - camX;
      const drawY = ent.posY - camY;
      const isArcherUnit = ent.type === 'archer';

      // Skip if outside viewport
      if (drawX < -20 || drawX > viewWidth + 20 || drawY < -20 || drawY > viewHeight + 20) return;

      const radius = ent.type === 'boss' ? 24 : ent.type === 'chest' || ent.type === 'cage' ? 16 : 11;
      const img = imagesRef.current[ent.type];
      if (img && img.complete) {
        // Draw cropped avatar circle
        ctx.save();
        ctx.beginPath();
        ctx.arc(drawX, drawY, radius, 0, 2 * Math.PI);
        ctx.clip();
        ctx.drawImage(img, drawX - radius, drawY - radius, radius * 2, radius * 2);
        ctx.restore();

        // Draw color outline
        ctx.beginPath();
        ctx.arc(drawX, drawY, radius, 0, 2 * Math.PI);
        ctx.lineWidth = ent.type === 'boss' ? 3.0 : ent.type === 'elite' ? 2.5 : 1.8;
        ctx.strokeStyle = ent.color;
        ctx.stroke();
      } else if (ent.type === 'item_loot') {
        // Draw a shiny diamond or star for the loot
        ctx.beginPath();
        ctx.moveTo(drawX, drawY - 6);
        ctx.lineTo(drawX + 6, drawY);
        ctx.lineTo(drawX, drawY + 6);
        ctx.lineTo(drawX - 6, drawY);
        ctx.closePath();
        ctx.fillStyle = ent.color;
        ctx.fill();
        
        // Draw a glowing outer ring/aura
        ctx.beginPath();
        ctx.arc(drawX, drawY, 8, 0, Math.PI * 2);
        ctx.strokeStyle = ent.color + '44';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw a small text above the item with the name
        ctx.font = 'bold 7px sans-serif';
        ctx.fillStyle = ent.color;
        ctx.textAlign = 'center';
        ctx.fillText(ent.name || 'Loot', drawX, drawY - 9);
      } else if (isArcherUnit) {
        // Draw archers as diamond shapes to distinguish them
        ctx.beginPath();
        ctx.moveTo(drawX, drawY - radius);
        ctx.lineTo(drawX + radius, drawY);
        ctx.lineTo(drawX, drawY + radius);
        ctx.lineTo(drawX - radius, drawY);
        ctx.closePath();
        ctx.fillStyle = ent.color;
        ctx.fill();
        ctx.lineWidth = 1.8;
        ctx.strokeStyle = '#7c2d12';
        ctx.stroke();
        ctx.font = 'bold 9px sans-serif';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🏹', drawX, drawY);
      } else {
        // Draw custom shapes for enemies & interactives
        ctx.beginPath();
        ctx.arc(drawX, drawY, radius, 0, 2 * Math.PI);
        ctx.fillStyle = ent.color;
        ctx.fill();
        ctx.lineWidth = 1.8;
        ctx.strokeStyle = '#000000';
        ctx.stroke();

        // Overlay text drawings
        ctx.font = 'bold 11px sans-serif';
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        if (ent.type === 'chest') {
          ctx.fillStyle = '#000';
          ctx.fillText('C', drawX, drawY);
        } else if (ent.type === 'cage') {
          ctx.fillStyle = '#000';
          ctx.fillText('🔒', drawX, drawY);
        } else if (ent.type === 'enemy' || ent.type === 'elite' || ent.type === 'boss') {
          ctx.fillStyle = '#fff';
          ctx.fillText('💀', drawX, drawY);
        }
      }

      // Draw health bar
      const barW = ent.type === 'boss' ? 44 : 22;
      const barH = 3.5;
      const hpPct = ent.hp / ent.maxHp;
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(drawX - barW / 2, drawY - radius - 7, barW, barH);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(drawX - barW / 2, drawY - radius - 7, barW * hpPct, barH);
      ctx.strokeStyle = '#000';
      ctx.strokeRect(drawX - barW / 2, drawY - radius - 7, barW, barH);

      // Name label
      ctx.font = 'bold 8px sans-serif';
      ctx.fillStyle = '#a0aec0';
      ctx.textAlign = 'center';
      ctx.fillText(ent.name.substring(0, 12), drawX, drawY - radius - 13);
    });

    // Draw particles with offset
    particlesRef.current.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x - camX, p.y - camY, p.size * 1.5, 0, 2 * Math.PI);
      ctx.fillStyle = p.color;
      ctx.fill();
    });

    // Draw floating texts with offset
    floatingTextsRef.current.forEach(t => {
      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = t.color;
      ctx.textAlign = 'center';
      ctx.fillText(t.text, t.x - camX, t.y - camY);
    });

    ctx.restore(); // Restore drawing scale context
  };

  // Launch loop on mount
  useEffect(() => {
    if (runStarted && activeRun) {
      lastUpdateRef.current = performance.now();
      loopRef.current = requestAnimationFrame(updateSimulation);
    }
    return () => {
      if (loopRef.current) cancelAnimationFrame(loopRef.current);
    };
  }, [runStarted, activeRun?.currentBiome, activeRun?.currentChamber]);

  const handleStartSimulation = () => {
    if (activeRun) {
      entitiesRef.current.forEach(ent => {
        const runStatus = activeRun.livingSquad[ent.id];
        if (runStatus) {
          ent.hp = runStatus.hp;
          ent.maxHp = runStatus.maxHp;
          ent.tempBuffs = runStatus.tempBuffs ?? [];
        }
      });
    }
    setRunStarted(true);
    setCombatLog(log => [...log, `Squad coordinates locked. Commencing exploration.`]);
  };

  // Phase sequencer: 1 → animate for 1.5s → phase 2 (linger, button)
  useEffect(() => {
    if (deathSequencePhase !== 1) return;

    // Stop the simulation loop while animating
    if (loopRef.current) cancelAnimationFrame(loopRef.current);

    const lingerTimer = window.setTimeout(() => {
      setDeathSequencePhase(2);
    }, 1500);

    return () => clearTimeout(lingerTimer);
  }, [deathSequencePhase]);

  if (!activeRun) return null;

  return (
    <div className="dungeon-scene-layout">
      {/* 1. Biome Header section */}
      <div className="dungeon-header-section">
        <div className="dungeon-header-left">
          <ShieldAlert className="text-red-500 animate-pulse" size={22} />
          <div>
            <h3 className="dungeon-header-title">
              Biome {activeRun.currentBiome}: Chamber {activeRun.currentChamber}
            </h3>
            <div className="dungeon-header-stats flex items-center gap-4">
              <span>Observer mode active</span>
              <div className="xp-bar-wrapper flex items-center gap-2">
                <span className="text-[10px] text-purple-300 font-mono font-bold">LVL {activeRun.teamLevel}</span>
                <div className="xp-bar-bg" title={`XP: ${activeRun.teamXp}/${activeRun.teamXpThreshold}`}>
                  <div 
                    className="xp-bar-fill" 
                    style={{ width: `${(activeRun.teamXp / activeRun.teamXpThreshold) * 100}%` }} 
                  />
                </div>
                <span className="text-[9px] text-gray-500 font-mono">({activeRun.teamXp}/{activeRun.teamXpThreshold} XP)</span>
              </div>
            </div>
          </div>
        </div>

        <div className="dungeon-header-right">
          <span className="gold-badge">
            <span className="gold-icon-circle">g</span> {activeRun.runGold} scavenged
          </span>
          <span className="stats-badge">
            <span>Scrolls:</span> <strong>{activeRun.scrollOfResurrectionCount}</strong>
          </span>
        </div>
      </div>

      {/* 2. Main Content Split */}
      {!runStarted ? (
        /* Preparation / Campfire Phase Layout */
        <div className="camp-board">
          {/* Left Column: Campfire Visual Scene */}
          <div className="camp-campfire-visual-panel">
            <div className="campfire-scene-canvas">
              {/* Squad standing around campfire */}
              <div className="campfire-squad-row">
                {squad.map(id => {
                  const runHero = activeRun.livingSquad[id];
                  const hero = roster.find(h => h.character_id === id);
                  if (!hero || !runHero) return null;

                  const isDead = runHero.hp <= 0;
                  const isSelected = selectedHeroId === id;

                  return (
                    <div
                      key={id}
                      onClick={() => handleHeroClick(id)}
                      className={`campfire-character-spot ${isDead ? 'deceased' : ''} ${isSelected ? 'active' : ''}`}
                    >
                      {/* Floating health bubble */}
                      <div className="character-hp-bubble">
                        <span className="char-name">{hero.class}</span>
                        <span className="char-hp-text">
                          {isDead ? 'DECEASED' : `${runHero.hp}/${runHero.maxHp} HP`}
                        </span>
                        {!isDead && (
                          <div className="char-hp-bar-bg">
                            <div 
                              className="char-hp-bar-fill" 
                              style={{ width: `${(runHero.hp / runHero.maxHp) * 100}%` }} 
                            />
                          </div>
                        )}
                      </div>

                      {/* Character avatar portrait */}
                      <div className="character-sprite-card">
                        <img 
                          src={getAvatarPath(hero.class)} 
                          alt={hero.class} 
                          className="character-sprite-img" 
                        />
                        {isDead && (
                          <div className="deceased-overlay">
                            <span>K.O.</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Animating campfire element */}
              <div
                className={`campfire-fire-pit ${healedHeroes.length > 0 ? 'fire-used' : ''}`}
                onClick={handleHealAll}
                style={{ cursor: healedHeroes.length > 0 ? 'default' : 'pointer' }}
              >
                <div className="fire-pit-glow" />
                <img src={import.meta.env.BASE_URL + "campfire.png"} alt="Campfire" className="campfire-image-sprite animate-pulse" />
                {healedHeroes.length > 0 && (
                  <div className="campfire-rested-label">Rested</div>
                )}
              </div>

              {/* Deploy + Exit buttons underneath fire pit */}
              <div className="campfire-deploy-wrapper">
                <button className="deploy-btn-pronounced wide-deploy" onClick={handleStartSimulation}>
                  Deploy Squad <Compass size={14} className="inline ml-1" />
                </button>
                <button
                  className="exit-btn-pronounced"
                  onClick={() => setShowExitModal(true)}
                  title="Abandon this run and return to town with your loot"
                >
                  <LogOut size={13} className="inline mr-1" />
                  Exit to Town
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Camp Interactive Sheets */}
          <div className="camp-control-panel">
            {selectedHero ? (
              <div className="camp-control-content">
                {/* Selected Hero loadout */}
                <div className="camp-hero-details-sheet">
                  <div className="camp-sheet-header">
                    <h4 className="camp-sheet-title">Hero: {selectedHero.class}</h4>
                    {activeRun.livingSquad[selectedHero.character_id]?.hp <= 0 && (
                      <button 
                        className="camp-revive-btn"
                        onClick={() => setShowReviveModal(true)}
                      >
                        Revive Ally
                      </button>
                    )}
                  </div>

                  <div className="camp-slots-container">
                    <span className="camp-slots-title">Equipment Slots</span>
                    <div className="camp-slots-row">
                      {Object.keys(selectedHero.equipment).map(slotName => {
                        const slot = slotName as EquipmentSlot;
                        const item = selectedHero.equipment[slot];
                        const isCorrectSlot = selectedBagItem && selectedBagItem.type === slot;

                        return (
                          <div
                            key={slot}
                            onClick={() => {
                              if (isCorrectSlot) handleEquip(slot);
                            }}
                            onMouseEnter={(e) => {
                              if (item) handleMouseEnterItem(item, e);
                            }}
                            onMouseMove={handleMouseMove}
                            onMouseLeave={handleMouseLeaveItem}
                            className={`camp-slot-card ${item ? 'occupied' : 'empty'} ${isCorrectSlot ? 'highlight-equip' : ''}`}
                          >
                            {getSlotIcon(slot, !!item)}
                            <span className="camp-slot-label">{slot}</span>
                            {isCorrectSlot && <span className="equip-prompt-badge">Equip</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Scavenged Loot Bag */}
                <div className="camp-loot-sheet">
                  <h4 className="panel-title-yellow" style={{ borderBottom: '1px solid rgba(234, 179, 8, 0.25)', paddingBottom: '4px', margin: '0 0 8px 0' }}>
                    Scavenged Loot Bag
                  </h4>
                  <div className="camp-loot-list-scroll">
                    {activeRun.runBag.length === 0 ? (
                      <div className="loot-empty-text">No scavenged loot in bag.</div>
                    ) : (
                      activeRun.runBag.map(item => {
                        const isSelected = selectedBagItemId === item.id;
                        return (
                          <div
                            key={item.id}
                            onClick={() => setSelectedBagItemId(isSelected ? null : item.id)}
                            onMouseEnter={(e) => handleMouseEnterItem(item, e)}
                            onMouseMove={handleMouseMove}
                            onMouseLeave={handleMouseLeaveItem}
                            className={`camp-loot-card border-rarity-${item.rarity.toLowerCase()} ${isSelected ? 'active' : ''}`}
                          >
                            <div className="camp-loot-header">
                              <span className={`camp-loot-name ${
                                item.rarity === 'Legendary' ? 'text-legendary'
                                  : item.rarity === 'Epic' ? 'text-epic'
                                  : item.rarity === 'Rare' ? 'text-rare'
                                  : item.rarity === 'Uncommon' ? 'text-uncommon'
                                  : 'text-white'
                              }`}>{item.name}</span>
                              <span className="camp-loot-slot">{item.type}</span>
                            </div>
                            <div className="camp-loot-stats">
                              {item.stats.hp && <span>+{item.stats.hp} HP </span>}
                              {item.stats.damage && <span>+{item.stats.damage} Atk </span>}
                              {item.stats.armor && <span>+{item.stats.armor} Arm </span>}
                            </div>
                            {isSelected && (
                              <div className="camp-equip-indicator">
                                {selectedHero && selectedHero.equipment[item.type as EquipmentSlot]
                                  ? `Click the glowing [${item.type}] slot above to swap`
                                  : `Click the glowing [${item.type}] slot above to equip`}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="camp-campfire-empty">
                <Flame size={36} className="empty-icon text-amber-500/30 animate-pulse" />
                <h4 className="empty-title">Campfire Idle</h4>
                <p className="empty-desc">Select a squad member standing around the campfire to heal them or edit their gear.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Combat Phase Layout (Simulation Running) */
        <div className="dungeon-board">
          {/* Left Column: Canvas map */}
          <div className="dungeon-canvas-panel relative overflow-hidden">
            {/* HUD Overlay controls (Absolute positioned at top center, styled to match game aesthetic) */}
            <div className="dungeon-canvas-controls">
              <button 
                className={`dungeon-control-btn ${isPaused ? 'paused' : ''}`}
                onClick={() => setIsPaused(!isPaused)}
              >
                {isPaused ? <Play size={10} /> : <Pause size={10} />}
                {isPaused ? 'RESUME' : 'PAUSE'}
              </button>
              
              <button 
                className="dungeon-control-btn"
                onClick={() => setSpeedMultiplier(prev => prev === 1 ? 2 : prev === 2 ? 3 : prev === 3 ? 5 : prev === 5 ? 10 : 1)}
              >
                <FastForward size={10} />
                SPEED: {speedMultiplier}x
              </button>
              
              <span className="dungeon-controls-status">
                {isPaused ? '⏸ Paused' : speedMultiplier > 1 ? `⏩ ${speedMultiplier}x` : '▶ Playing'}
              </span>
            </div>

            {/* Floating Toast Notification HUD Overlay */}
            {activeToast && (
              <div className={`dungeon-toast animate-slide-down toast-${activeToast.type}`}>
                {activeToast.text}
              </div>
            )}
            {/* Active Powerups Floating list (MMA/ARPG Buff panel) */}
            {activeRun.selectedPowerups && activeRun.selectedPowerups.length > 0 && (() => {
              // Group powerups by name and count stacks
              const stacked = activeRun.selectedPowerups.reduce<Record<string, number>>((acc, p) => {
                acc[p] = (acc[p] || 0) + 1;
                return acc;
              }, {});

              return (
                <div className="dungeon-powerups-overlay">
                  <span className="powerups-header-label">
                    ✦ Active Powerups
                  </span>
                  {Object.entries(stacked).map(([powerup, count], idx) => {
                    const isDefense = powerup.includes('Shield') || powerup.includes('Defense') || powerup.includes('Will') || powerup.includes('Iron');
                    const isAttack = powerup.includes('Shot') || powerup.includes('Sharpshooter') || powerup.includes('Slam') || powerup.includes('Blade');
                    const isMagic = powerup.includes('Mana') || powerup.includes('Fireball') || powerup.includes('Strike');
                    const isHeal = powerup.includes('Rejuvenate');

                    const baseDesc = powerupDescriptions[powerup] || 'Active team enhancement';
                    const tooltipText = count > 1 ? `${baseDesc} (${count}x total)` : baseDesc;

                    return (
                      <div 
                        key={`${powerup}-${idx}`} 
                        className="dungeon-powerup-item"
                      >
                        {isDefense && <Shield className="text-blue-400" size={13} />}
                        {isAttack && <Sword className="text-green-400" size={13} />}
                        {isMagic && <Flame className="text-purple-400" size={13} />}
                        {isHeal && <Heart className="text-red-400" size={13} />}
                        {!isDefense && !isAttack && !isMagic && !isHeal && <Sparkles className="text-amber-400" size={13} />}
                        <span className="powerup-name-text">{powerup}</span>
                        {count > 1 && <span className="powerup-stack-badge">x{count}</span>}
                        
                        <div className="dungeon-powerup-tooltip">
                          {tooltipText}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
            <canvas
              ref={canvasRef}
              width={1152}
              height={1152}
              className="dungeon-canvas-map"
            />

            {/* Death Sequence Overlay — scoped to canvas panel */}
            {deathSequencePhase >= 1 && (
              <div className="death-overlay">
                <div className={`death-overlay-bg ${deathSequencePhase === 1 ? 'animating' : ''}`}
                     style={deathSequencePhase === 2 ? { opacity: 1 } : undefined} />
                <div className={`death-overlay-text ${deathSequencePhase === 1 ? 'animating' : ''}`}
                     style={deathSequencePhase === 2 ? { opacity: 1 } : undefined}>
                  Expedition Failed
                  <span className="death-sub">your squad has been eliminated</span>
                </div>
                {deathSequencePhase === 2 && (
                  <button className="death-next-btn" onClick={() => terminateRun(false)}>
                    Next
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Status sidebars */}
          <div className="dungeon-sidebar-panel">
            {/* Squad Status */}
            <div className="dungeon-squad-status-panel">
              <h4 className="panel-title-green" style={{ borderBottom: '1px solid rgba(34, 197, 94, 0.2)', paddingBottom: '6px' }}>
                <Sword size={14} /> Squad Monitor
              </h4>

              <div className="dungeon-squad-member-list">
                {squad.map(id => {
                  const runHero = activeRun.livingSquad[id];
                  const hero = roster.find(h => h.character_id === id);
                  if (!hero || !runHero) return null;

                  const isDead = runHero.hp <= 0;

                  return (
                    <div 
                      key={id} 
                      className={`dungeon-squad-member-card ${isDead ? 'deceased' : ''}`}
                    >
                      <div className="dungeon-squad-member-header">
                        <span className="dungeon-squad-member-name">{hero.class}</span>
                        <span className={`dungeon-squad-member-hp-text ${isDead ? 'deceased' : ''}`}>
                          {isDead ? 'DECEASED' : `${runHero.hp}/${runHero.maxHp} HP`}
                        </span>
                      </div>
                      {!isDead && (
                        <div className="dungeon-hp-bar-bg">
                          <div 
                            className="dungeon-hp-bar-fill" 
                            style={{ width: `${(runHero.hp / runHero.maxHp) * 100}%` }} 
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Combat Log */}
            <div className="dungeon-combat-feed-panel">
              <h4 className="panel-title-yellow" style={{ borderBottom: '1px solid rgba(234, 179, 8, 0.25)', paddingBottom: '6px', margin: 0 }}>
                <AlertCircle size={14} /> Combat Feed
              </h4>

              <div className="dungeon-combat-log-container" ref={combatLogRef}>
                {combatLog.map((log, index) => (
                  <div key={index} className="dungeon-combat-log-row">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Exit to Town Confirmation Modal */}
      {showExitModal && (
        <div className="menu-modal-overlay">
          <div className="menu-modal-card">
            <LogOut size={36} className="text-amber-500 mb-2 animate-bounce" />
            <h4 className="menu-modal-title">Abandon Expedition?</h4>
            <p className="menu-modal-desc">
              Your squad will <strong>retreat to town</strong>.<br />
              All gold and loot collected so far will be kept, but the run will end.
            </p>
            <div className="menu-modal-actions">
              <button
                className="modal-cancel-btn"
                onClick={() => setShowExitModal(false)}
              >
                Stay
              </button>
              <button
                className="modal-confirm-btn"
                onClick={() => {
                  setShowExitModal(false);
                  terminateRun(false);
                }}
              >
                Exit to Town
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revive Confirm Modal */}
      {showReviveModal && selectedHero && (
        <div className="menu-modal-overlay">
          <div className="menu-modal-card">
            <Heart size={36} className="text-green-500 mb-2 animate-bounce" />
            <h4 className="menu-modal-title">Revive Fallen Ally?</h4>
            <p className="menu-modal-desc">
              Reviving <strong>{selectedHero.class}</strong> will consume <strong>1 Resurrection Scroll</strong>.<br />
              Do you wish to proceed?
            </p>
            <p className="menu-modal-desc" style={{ marginTop: '-12px' }}>
              Scrolls remaining: {activeRun.scrollOfResurrectionCount}
            </p>
            <div className="menu-modal-actions">
              <button className="modal-cancel-btn" onClick={() => setShowReviveModal(false)}>
                Cancel
              </button>
              <button
                className="modal-confirm-health-btn"
                disabled={activeRun.scrollOfResurrectionCount <= 0}
                onClick={() => handleRevive(selectedHero.character_id)}
              >
                Revive
              </button>
            </div>
          </div>
        </div>
      )}
      {hoveredItem && <ItemTooltip item={hoveredItem} coords={mouseCoords} />}
    </div>
  );
};
export default CombatSimulation;
