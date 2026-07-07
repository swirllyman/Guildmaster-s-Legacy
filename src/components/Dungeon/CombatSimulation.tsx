import React, { useRef, useEffect, useState } from 'react';
import { useGame, generateRandomItem } from '../../context/GameContext';
import { type EquipmentSlot, type Item, POWERUP_DESCRIPTIONS as powerupDescriptions } from '../../types/game';
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
  Rewind,
  Sparkles,
  LogOut,
  Layers
} from 'lucide-react';

interface GridPos {
  x: number;
  y: number;
}

interface SimulatedEntity {
  id: string;
  name: string;
  type: 'ranger' | 'warrior' | 'wizard' | 'rogue' | 'paladin' | 'druid' | 'necromancer' | 'skeleton' | 'enemy' | 'archer' | 'elite' | 'boss' | 'chest' | 'cage' | 'portal' | 'item_loot' | 'wolf';
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
  healTimer?: number;
  chargeTimer?: number;
  charging?: boolean;
  chargeStartX?: number;
  chargeStartY?: number;
  chargeEndX?: number;
  chargeEndY?: number;
  chargeProgress?: number;
  chargeTargetId?: string;
  chargeDamage?: number;
  isMarked?: boolean;
  // Legendary fields
  legAegisTimer?: number;
  legCindermawTimer?: number;
  legStormcallerTimer?: number;
  legDivineBulwarkTimer?: number;
  legDivineBulwarkActive?: boolean;
  legDivineBulwarkActiveTimer?: number;
  legStaffWildsTimer?: number;
  legAstralSpauldersTimer?: number;
  legSunfireTrailTimer?: number;
  frostSlowed?: boolean;
  legShadowflameTimer?: number;
  legGaleTimer?: number;
  legVortexTimer?: number;
  legFrozenTrailTimer?: number;
  legTomeTimer?: number;
  legScepterTimer?: number;
  legDuskwalkerInvisible?: boolean;
  legDuskwalkerInvulnTimer?: number;
  runicAttackCount?: number;
  runicShield?: number;
  glacialShield?: number;
  isPoisoned?: boolean;
  poisonLevel?: number;
  druidForm?: 'bear' | 'werewolf' | 'owl';
  druidFormTimer?: number;
  druidBaseMaxHp?: number; // Saved maxHp before bear form inflates it
  druidWolfCooldown?: number;
  necroExplosionCooldown?: number;
  isNecroMinion?: boolean;
  isSkeletalMagi?: boolean;
  summonerId?: string; // ID of the hero who summoned this minion (for damage attribution)
  isDeadHandled?: boolean;
  isStealthed?: boolean;
  stealthTimer?: number;
  hasVanishedThisChamber?: boolean;
  vanishLockTimer?: number;
  shadowstepTimer?: number;
  adrenalineTimer?: number;
  adrenalineLevel?: number;
  currentTargetId?: string;
  bossSkillCooldown?: number;
  bossCastTimer?: number;
  bossState?: 'idle' | 'telegraphing' | 'casting';
  bossCurrentSkill?: 'firebreath' | 'earthquake' | 'timestop' | 'stonegaze' | 'summon' | 'vortex' | 'icetomb' | 'meteor' | 'lightning' | 'shadowclone';
  bossSkillAngle?: number;
  bossSkillTargetX?: number;
  bossSkillTargetY?: number;
  bossEarthquakeZones?: { x: number; y: number; radius: number }[];
  bossMeteorZones?: { x: number; y: number; radius: number; delay: number }[];
  petrifiedTimer?: number;
  frozenTombTimer?: number;
  stunTimer?: number;
  isBossClone?: boolean;
}

interface FloatingText {
  text: string;
  x: number;
  y: number;
  color: string;
  life: number; // 0-1
  vx?: number;
  vy?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
}

interface Projectile {
  x: number;
  y: number;
  startX: number;
  startY: number;
  attackerId: string;
  targetId: string;
  speed: number;
  damage: number;
  isMitigated: boolean;
  color: string;
  size: number;
  trail: { x: number; y: number }[];
  life: number;
  isAoE?: boolean;
  isPoisoned?: boolean;
  poisonLevel?: number;
  isMagiAoE?: boolean;
  isOwlAoE?: boolean;
}

interface SlashEffect {
  x: number;
  y: number;
  angle: number;
  color: string;
  life: number;
  radius?: number;
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
    sharedBag,
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

  const getOwnedLegendaries = (): Set<string> => {
    const owned = new Set<string>();
    if (sharedBag && sharedBag.items) {
      sharedBag.items.forEach(item => {
        if (item.rarity === 'Legendary') owned.add(item.name);
      });
    }
    if (activeRun && activeRun.runBag) {
      activeRun.runBag.forEach(item => {
        if (item.rarity === 'Legendary') owned.add(item.name);
      });
    }
    if (roster) {
      roster.forEach(hero => {
        if (hero.equipment) {
          Object.values(hero.equipment).forEach(item => {
            if (item && item.rarity === 'Legendary') owned.add(item.name);
          });
        }
      });
    }
    return owned;
  };

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

  const [chamberDamageDealt, setChamberDamageDealt] = useState<Record<string, number>>({});
  const chamberDamageDealtRef = useRef<Record<string, number>>({});

  // Camp states (pre-combat preparation phase)
  const [selectedHeroId, setSelectedHeroId] = useState<string | null>(squad[0] ?? null);
  const [selectedBagItemId, setSelectedBagItemId] = useState<string | null>(null);
  const [showReviveModal, setShowReviveModal] = useState<boolean>(false);
  const [healedHeroes, setHealedHeroes] = useState<string[]>([]);
  const [hoveredItem, setHoveredItem] = useState<Item | null>(null);
  const [mouseCoords, setMouseCoords] = useState<{ x: number; y: number } | null>(null);
  const [isAutoCampActive, setIsAutoCampActive] = useState<boolean>(() => {
    return localStorage.getItem('autoCampActive') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('autoCampActive', isAutoCampActive ? 'true' : 'false');
  }, [isAutoCampActive]);

  const [autoCampCountdown, setAutoCampCountdown] = useState<number | null>(null);
  const [autoCampAction, setAutoCampAction] = useState<'heal' | 'deploy' | null>(null);

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
  const [, setTick] = useState<number>(0);

  // Local mutable state refs for the animation loop
  const loopRef = useRef<number | null>(null);
  const entitiesRef = useRef<SimulatedEntity[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const slashEffectsRef = useRef<SlashEffect[]>([]);
  const sunfireTrailsRef = useRef<{ x: number; y: number; life: number; damage: number }[]>([]);
  const frozenTrailsRef = useRef<{ x: number; y: number; life: number }[]>([]);
  const fallingStarsRef = useRef<{ x: number; y: number; targetX: number; targetY: number; speed: number; damage: number; life: number }[]>([]);
  const visualEffectsRef = useRef<{ type: 'lightning' | 'laser' | 'nova' | 'shockwave' | 'leaf' | 'ghost' | 'star'; x1: number; y1: number; x2?: number; y2?: number; color: string; life: number; maxLife: number; size?: number }[]>([]);
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
  const timeStopTimerRef = useRef<number>(0);
  const activeDialogueRef = useRef(activeDialogue);
  const poisonStacksRef = useRef<Map<string, {stacks: number, timer: number, level: number}>>(new Map());
  const showExitModalRef = useRef<boolean>(showExitModal);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    showExitModalRef.current = showExitModal;
  }, [showExitModal]);

  useEffect(() => {
    speedMultiplierRef.current = speedMultiplier;
  }, [speedMultiplier]);

  const prevDraftingRef = useRef(activeRun?.drafting ?? false);

  useEffect(() => {
    activeRunRef.current = activeRun;
    
    // Check if drafting just transitioned from true to false (i.e. powerup selected)
    const wasDrafting = prevDraftingRef.current;
    const isCurrentlyDrafting = activeRun?.drafting ?? false;
    
    if (wasDrafting && !isCurrentlyDrafting && activeRun) {
      // Sync health back to active entitiesRef.current
      entitiesRef.current.forEach(ent => {
        const squadHero = activeRun.livingSquad[ent.id];
        if (squadHero) {
          ent.hp = squadHero.hp;
          ent.maxHp = squadHero.maxHp;
        }
      });
    }
    
    prevDraftingRef.current = isCurrentlyDrafting;
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
    if (roomType === 5) {
      triggerToast('🏆 Biome Cleared! Gained a Resurrection Scroll.', 'info');
      setCombatLog(log => [
        ...log,
        `✨ Chamber Cleared! Scavenged ${goldScavenged} Gold and +${xpScavenged} XP.`,
        `🏆 Gorgon Overlord Slain! Biome ${activeRun.currentBiome} Cleared!`,
        `📜 Gained +1 Resurrection Scroll!`
      ]);
    } else {
      triggerToast('🏆 Chamber Cleared!', 'info');
      setCombatLog(log => [
        ...log,
        `✨ Chamber Cleared! Scavenged ${goldScavenged} Gold and +${xpScavenged} XP.`
      ]);
    }

    // Sync chamber-specific damage stats before resetting/advancing
    setChamberDamageDealt({ ...chamberDamageDealtRef.current });

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
      ROGUE: 'rogue.png',
      PALADIN: 'warrior.png',
      DRUID: 'druid.png',
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

  // Helper to handle enemy deaths (Corpse Explosion & Necromancer minion revive)
  const handleEnemyDeath = (deadUnit: SimulatedEntity) => {
    if (deadUnit.isDeadHandled) return;
    deadUnit.isDeadHandled = true;

    // Check if there is an active Necromancer
    const necro = entitiesRef.current.find(e => e.type === 'necromancer' && !e.isDead);
    if (!necro) return;

    const powerups = activeRun?.selectedPowerups ?? [];
    const countOf = (name: string) => powerups.filter((p: string) => p === name).length;

    // 1. Corpse Explosion is now replaced by Skeletal Detonation in the update loop.
    // 2. Necromancer Revive Minion
    const activeMinions = entitiesRef.current.filter(e => !e.isDead && e.isNecroMinion).length;
    const maxMinions = 5 + countOf('Increase Horde') * 3;
    if (activeMinions < maxMinions) {
      const magiCount = countOf('Skeleton Magi');
      const isMagi = magiCount > 0 && Math.random() < (0.50 + 0.10 * (magiCount - 1));

      const minionId = `necro-minion-${Date.now()}-${Math.random()}`;
      const teamLevel = activeRun?.teamLevel || 1;

      const minion: SimulatedEntity = isMagi ? {
        id: minionId,
        name: 'Skeleton Magi',
        type: 'skeleton',
        gridX: deadUnit.gridX,
        gridY: deadUnit.gridY,
        posX: deadUnit.posX,
        posY: deadUnit.posY,
        hp: 15 + 4 * teamLevel,
        maxHp: 15 + 4 * teamLevel,
        speed: 1.725,
        attackRange: 3.2,
        attackCooldown: 0,
        damage: 6 + 1 * teamLevel,
        lifeSteal: 0,
        tempBuffs: [],
        color: '#c084fc',
        isDead: false,
        isNecroMinion: true,
        isSkeletalMagi: true,
        summonerId: necro.id
      } : {
        id: minionId,
        name: 'Skeleton Minion',
        type: 'skeleton',
        gridX: deadUnit.gridX,
        gridY: deadUnit.gridY,
        posX: deadUnit.posX,
        posY: deadUnit.posY,
        hp: 20 + 5 * teamLevel,
        maxHp: 20 + 5 * teamLevel,
        speed: 1.84,
        attackRange: 1.2,
        attackCooldown: 0,
        damage: 8 + 1 * teamLevel,
        lifeSteal: 0,
        tempBuffs: [],
        color: '#e5e7eb',
        isDead: false,
        isNecroMinion: true,
        summonerId: necro.id
      };

      entitiesRef.current.push(minion);
      setCombatLog(log => [...log, `💀 Necromancer revived a ${minion.name}! (Active: ${activeMinions + 1}/${maxMinions})`].slice(-40));

      for (let k = 0; k < 12; k++) {
        particlesRef.current.push({
          x: deadUnit.posX,
          y: deadUnit.posY,
          vx: (Math.random() - 0.5) * 60,
          vy: -30 - Math.random() * 40,
          color: isMagi ? '#c084fc' : '#16a34a',
          size: 2 + Math.random() * 2.5,
          life: 0.6
        });
      }
    }
  };

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

    // Retrieve surviving Necromancer skeleton minions before resetting
    const isNecromancerAlive = squad.some(heroId => {
      const hero = roster.find(h => h.character_id === heroId);
      const runStatus = activeRun?.livingSquad?.[heroId];
      return hero && hero.class === 'NECROMANCER' && runStatus && runStatus.hp > 0;
    });

    const survivingMinions = isNecromancerAlive
      ? entitiesRef.current.filter(ent => ent.type === 'skeleton' && ent.isNecroMinion && !ent.isDead)
      : [];

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
      let combinedSpeed = hero.base_stats.speed_mult * (hero.class === 'RANGER' ? 1.2 : 0.9);

      // Sum speed from all equipped items
      if (hero.equipment) {
        for (const key in hero.equipment) {
          const item = hero.equipment[key as EquipmentSlot];
          if (item?.stats?.speed) combinedSpeed *= (1 + item.stats.speed / 100);
        }
      }

      // Class base damage + flat damage from all equipped items
      const classBaseDmg =
        hero.class === 'WARRIOR' ? 12 :
        hero.class === 'WIZARD' ? 16 :
        hero.class === 'PALADIN' ? 11 :
        hero.class === 'NECROMANCER' ? 10 :
        hero.class === 'DRUID' ? 10 :
        9;
      let equipmentDmg = 0;
      if (hero.equipment) {
        for (const key in hero.equipment) {
          const item = hero.equipment[key as EquipmentSlot];
          if (item?.stats?.damage) equipmentDmg += item.stats.damage;
        }
      }

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

      const entityColor =
        hero.class === 'WARRIOR' ? '#0070dd' :
        hero.class === 'WIZARD' ? '#a335ee' :
        hero.class === 'PALADIN' ? '#eab308' :
        hero.class === 'NECROMANCER' ? '#d946ef' :
        hero.class === 'DRUID' ? '#22c55e' :
        '#1eff00';

      const baseAttackRange =
        hero.class === 'RANGER' ? 4.5 :
        hero.class === 'WIZARD' ? 3.5 :
        hero.class === 'NECROMANCER' ? 2.0 :
        1.2;

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
        attackRange: baseAttackRange,
        attackCooldown: 0,
        damage: classBaseDmg + equipmentDmg,
        lifeSteal,
        tempBuffs: runStatus.tempBuffs ?? [],
        color: entityColor,
        isDead: false,
        // Druid initial form
        druidForm: hero.class === 'DRUID' ? 'bear' : undefined,
        druidFormTimer: hero.class === 'DRUID' ? 8.0 : undefined,
        isStealthed: hero.class === 'ROGUE',
        stealthTimer: 0,
        hasVanishedThisChamber: false,
        vanishLockTimer: 0,
        shadowstepTimer: 10.0,
        adrenalineTimer: 0,
        legAegisTimer: 0,
        legCindermawTimer: 0,
        legStormcallerTimer: 0,
        legDivineBulwarkTimer: 0,
        legDivineBulwarkActive: false,
        legDivineBulwarkActiveTimer: 0,
        legStaffWildsTimer: 0,
        legAstralSpauldersTimer: 0,
        legSunfireTrailTimer: 0
      });
    });

    if (survivingMinions.length > 0) {
      const findFreeTileNearStart = (spawned: SimulatedEntity[]): { x: number; y: number } => {
        for (let dist = 1; dist < 15; dist++) {
          for (let dx = -dist; dx <= dist; dx++) {
            for (let dy = -dist; dy <= dist; dy++) {
              if (Math.abs(dx) !== dist && Math.abs(dy) !== dist) continue;
              const tx = startX + dx;
              const ty = startY + dy;
              if (tx >= 1 && tx < gridSize - 1 && ty >= 1 && ty < gridSize - 1) {
                if (grid[ty][tx] === 0) {
                  const occupied = spawned.some(e => e.gridX === tx && e.gridY === ty);
                  if (!occupied) {
                    return { x: tx, y: ty };
                  }
                }
              }
            }
          }
        }
        return { x: startX, y: startY };
      };

      survivingMinions.forEach(minion => {
        const pt = findFreeTileNearStart(spawnedEntities);
        spawnedEntities.push({
          ...minion,
          gridX: pt.x,
          gridY: pt.y,
          posX: pt.x * tileSize + tileSize / 2,
          posY: pt.y * tileSize + tileSize / 2,
          attackCooldown: 0,
          currentTargetId: undefined,
          isDead: false,
          isDeadHandled: false
        });
      });
    }

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
        hp: Math.round(900 * Math.pow(1.55, activeRun.currentBiome)),
        maxHp: Math.round(900 * Math.pow(1.55, activeRun.currentBiome)),
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
    const groupCount = (4 + activeRun.currentBiome * 2) * activeRun.currentChamber;
    
    for (let g = 0; g < groupCount; g++) {
      let gx = 6;
      let gy = 20;
      let attempts = 0;
      let valid = false;

      while (attempts < 30 && !valid) {
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
            if (dist < 4) {
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
          ? Math.round((140 + chamber * 25) * Math.pow(1.50, biome)) * 3
          : scaledHp(biome, chamber);
        const mobDmg = mobType === 'elite'
          ? Math.round((12 + chamber * 3)  * Math.pow(1.35, biome) * 0.7)
          : mobType === 'archer'
            ? Math.round(scaledDmg(biome, chamber) * 0.8)
            : scaledDmg(biome, chamber);

        if (biome >= 2 && mobType === 'enemy') {
          // Spawn a swarm of 3-6 Swarm Skitterers that stay together
          const swarmSize = 3 + Math.floor(Math.random() * 4);
          const swarmSpawnPoints: {x: number, y: number}[] = [{x: gx, y: gy}];
          const directions = [
            {dx: 1, dy: 0},
            {dx: -1, dy: 0},
            {dx: 0, dy: 1},
            {dx: 0, dy: -1},
            {dx: 1, dy: 1},
            {dx: -1, dy: 1},
            {dx: 1, dy: -1},
            {dx: -1, dy: -1}
          ];
          for (const dir of directions) {
            if (swarmSpawnPoints.length >= swarmSize) break;
            const nx = gx + dir.dx;
            const ny = gy + dir.dy;
            if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize && grid[ny]?.[nx] === 0) {
              const occupied = spawnedEntities.some(e => e.gridX === nx && e.gridY === ny);
              if (!occupied) {
                swarmSpawnPoints.push({x: nx, y: ny});
              }
            }
          }

          swarmSpawnPoints.forEach((pt, idx) => {
            spawnedEntities.push({
              id: `enemy-${g}-${idx}`,
              name: 'Swarm Skitterer',
              type: 'enemy',
              gridX: pt.x,
              gridY: pt.y,
              posX: pt.x * tileSize + tileSize / 2,
              posY: pt.y * tileSize + tileSize / 2,
              hp: Math.round(mobHp * 0.85),
              maxHp: Math.round(mobHp * 0.85),
              speed: 2.5,
              attackRange: 1.2,
              attackCooldown: 0,
              damage: Math.round(mobDmg * 0.60),
              lifeSteal: 0,
              tempBuffs: [],
              color: '#a3e635', // Lime green
              isDead: false,
              aggroed: false
            });
          });
        } else {
          // Standard enemy spawning
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
            speed: mobType === 'elite' ? 1.44 : mobType === 'archer' ? 1.0 : 1.716,
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

          // Spawn melee sibling for melee packs only (outside of Biome 2, where we spawned swarms instead)
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
              speed: 1.5,
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
    }

    entitiesRef.current = spawnedEntities;
    floatingTextsRef.current = [];
    particlesRef.current = [];
    projectilesRef.current = [];
    sunfireTrailsRef.current = [];
    frozenTrailsRef.current = [];
    fallingStarsRef.current = [];
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

    const markEntityForDeath = (entity: SimulatedEntity) => {
      if (!entity.isMarked) {
        const markedForDeathLevel = (run.selectedPowerups ?? []).filter(p => p === 'Marked for Death').length;
        const maxMarked = 2 + markedForDeathLevel; // level 1: 3, level 2: 4...
        const markedUnits = entitiesRef.current.filter(e => !e.isDead && e.isMarked);
        if (markedUnits.length >= maxMarked) {
          // Unmark the oldest/first marked unit
          markedUnits[0].isMarked = false;
        }
        entity.isMarked = true;
      }
    };

    const delta = (time - lastUpdateRef.current) / 1000;
    lastUpdateRef.current = time;

    if (isPausedRef.current || run.drafting || activeDialogueRef.current || showExitModalRef.current) {
      draw();
      loopRef.current = requestAnimationFrame(updateSimulation);
      return;
    }

    const grid = gridMapRef.current;
    const dt = Math.min(delta, 0.1) * speedMultiplierRef.current;

    if (timeStopTimerRef.current > 0) {
      timeStopTimerRef.current = Math.max(0, timeStopTimerRef.current - dt);
    }

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
      if (t.vx === undefined || t.vy === undefined) {
        // Randomize direction: left or right
        const goRight = Math.random() > 0.5;
        // Horizontal speed: 15 to 35 px/s
        t.vx = (goRight ? 1 : -1) * (15 + Math.random() * 20);
        // Initial vertical speed upwards: -60 to -80 px/s
        t.vy = -60 - Math.random() * 20;
      }
      t.x += t.vx * dt;
      t.y += t.vy * dt;
      t.vy += 120 * dt; // Gravity effect pulling it down to create an arc
      t.life -= dt * 1.5;
    });
    floatingTextsRef.current = floatingTextsRef.current.filter(t => t.life > 0);

    const entities = entitiesRef.current;
    const heroTypes = new Set(['ranger','warrior','wizard','rogue','paladin','druid','necromancer','skeleton','wolf']);

    // Reset frostSlowed flag for all hostiles
    entities.forEach(e => {
      if (!heroTypes.has(e.type)) {
        e.frostSlowed = false;
      }
    });

    // Process Legendary Item Effects
    entities.forEach(ent => {
      if (ent.isDead || !heroTypes.has(ent.type)) return;

      const hero = roster.find(h => h.character_id === ent.id);
      if (!hero || !hero.equipment) return;

      // Identify equipped legendary items
      const equippedLegendaries = new Set<string>();
      for (const slot in hero.equipment) {
        const item = hero.equipment[slot as EquipmentSlot];
        if (item && item.rarity === 'Legendary') {
          equippedLegendaries.add(item.name);
        }
      }

      if (equippedLegendaries.size === 0) return;

      // 1. Aegis of the Sun
      if (equippedLegendaries.has('Aegis of the Sun')) {
        if (ent.legAegisTimer === undefined) ent.legAegisTimer = 0;
        ent.legAegisTimer += dt;
        if (ent.legAegisTimer >= 2.0) {
          ent.legAegisTimer -= 2.0;
          // Strike a random nearby enemy within 4 tiles
          const target = entities.find(e => !e.isDead && !heroTypes.has(e.type) && e.type !== 'chest' && e.type !== 'cage' && e.type !== 'portal' && e.type !== 'item_loot' && Math.hypot(e.posX - ent.posX, e.posY - ent.posY) <= 4 * tileSize);
          if (target) {
            target.hp = Math.max(0, target.hp - 15);
            visualEffectsRef.current.push({
              type: 'lightning',
              x1: ent.posX,
              y1: ent.posY,
              x2: target.posX,
              y2: target.posY,
              color: '#fbbf24', // Golden yellow
              life: 0.25,
              maxLife: 0.25
            });
            floatingTextsRef.current.push({
              text: `-15 (Sun Aegis)`,
              x: target.posX,
              y: target.posY - 12,
              color: '#fbbf24',
              life: 1.0
            });
            if (target.hp <= 0) {
              target.isDead = true;
              setCombatLog(log => [...log, `💀 ${target.name} was incinerated by Aegis of the Sun.`].slice(-40));
            }
          }
        }
      }

      // 2. Cindermaw's Guard
      if (equippedLegendaries.has("Cindermaw's Guard")) {
        if (ent.legCindermawTimer === undefined) ent.legCindermawTimer = 0;
        ent.legCindermawTimer += dt;
        if (ent.legCindermawTimer >= 1.5) {
          ent.legCindermawTimer -= 1.5;
          // Pulse fire damage to all nearby enemies within 2.2 tiles
          entities.forEach(e => {
            if (!e.isDead && !heroTypes.has(e.type) && e.type !== 'chest' && e.type !== 'cage' && e.type !== 'portal' && e.type !== 'item_loot') {
              const dist = Math.hypot(e.posX - ent.posX, e.posY - ent.posY);
              if (dist <= 2.2 * tileSize) {
                e.hp = Math.max(0, e.hp - 10);
                floatingTextsRef.current.push({
                  text: `-10 (Flame Pulse)`,
                  x: e.posX,
                  y: e.posY - 8,
                  color: '#f97316',
                  life: 0.8
                });
                if (e.hp <= 0) {
                  e.isDead = true;
                  setCombatLog(log => [...log, `💀 ${e.name} burned to ashes.`].slice(-40));
                }
              }
            }
          });
          // Visual flame burst
          visualEffectsRef.current.push({
            type: 'nova',
            x1: ent.posX,
            y1: ent.posY,
            color: '#ef4444',
            size: 2.2 * tileSize,
            life: 0.3,
            maxLife: 0.3
          });
        }
      }

      // 3. Stormcaller's Pauldrons
      if (equippedLegendaries.has("Stormcaller's Pauldrons")) {
        if (ent.legStormcallerTimer === undefined) ent.legStormcallerTimer = 0;
        ent.legStormcallerTimer += dt;
        if (ent.legStormcallerTimer >= 2.5) {
          ent.legStormcallerTimer -= 2.5;
          // Shock a random nearby enemy for 12 damage
          const target = entities.find(e => !e.isDead && !heroTypes.has(e.type) && e.type !== 'chest' && e.type !== 'cage' && e.type !== 'portal' && e.type !== 'item_loot' && Math.hypot(e.posX - ent.posX, e.posY - ent.posY) <= 3.5 * tileSize);
          if (target) {
            target.hp = Math.max(0, target.hp - 12);
            visualEffectsRef.current.push({
              type: 'lightning',
              x1: ent.posX,
              y1: ent.posY,
              x2: target.posX,
              y2: target.posY,
              color: '#06b6d4', // Cyan
              life: 0.25,
              maxLife: 0.25
            });
            floatingTextsRef.current.push({
              text: `-12 (Storm Shock)`,
              x: target.posX,
              y: target.posY - 12,
              color: '#22d3ee',
              life: 1.0
            });
            if (target.hp <= 0) {
              target.isDead = true;
              setCombatLog(log => [...log, `💀 ${target.name} was electrocuted.`].slice(-40));
            }
          }
        }
      }

      // 4. Vanish Boots (Leaves trail of purple smoke particles)
      if (equippedLegendaries.has('Vanish Boots')) {
        // Spawn purple smoke particles periodically
        if (Math.random() < 0.2) {
          particlesRef.current.push({
            x: ent.posX + (Math.random() - 0.5) * 8,
            y: ent.posY + (Math.random() - 0.5) * 8,
            vx: (Math.random() - 0.5) * 15,
            vy: (Math.random() - 0.5) * 15,
            color: '#a855f7', // Purple
            size: 3 + Math.random() * 3,
            life: 0.6 + Math.random() * 0.4
          });
        }
      }

      // 12. Divine Bulwark
      if (equippedLegendaries.has('Divine Bulwark')) {
        if (ent.legDivineBulwarkTimer === undefined) ent.legDivineBulwarkTimer = 0;
        ent.legDivineBulwarkTimer += dt;
        
        if (ent.legDivineBulwarkActive) {
          if (ent.legDivineBulwarkActiveTimer === undefined) ent.legDivineBulwarkActiveTimer = 0;
          ent.legDivineBulwarkActiveTimer += dt;
          if (ent.legDivineBulwarkActiveTimer >= 2.0) {
            ent.legDivineBulwarkActive = false;
            ent.legDivineBulwarkActiveTimer = 0;
          }
        }

        if (ent.legDivineBulwarkTimer >= 10.0) {
          ent.legDivineBulwarkTimer = 0;
          ent.legDivineBulwarkActive = true;
          ent.legDivineBulwarkActiveTimer = 0;
          floatingTextsRef.current.push({
            text: `INVULNERABLE!`,
            x: ent.posX,
            y: ent.posY - 16,
            color: '#eab308',
            life: 1.5
          });
        }
      }

      // 13. Staff of the Wilds
      if (equippedLegendaries.has('Staff of the Wilds')) {
        if (ent.legStaffWildsTimer === undefined) ent.legStaffWildsTimer = 0;
        ent.legStaffWildsTimer += dt;
        if (ent.legStaffWildsTimer >= 3.0) {
          ent.legStaffWildsTimer -= 3.0;
          // Heal the lowest-HP ally within 3 tiles
          let lowestAlly: any = null;
          let minHPpct = 1.1;
          entities.forEach(e => {
            if (!e.isDead && heroTypes.has(e.type)) {
              const dist = Math.hypot(e.posX - ent.posX, e.posY - ent.posY);
              if (dist <= 3.5 * tileSize) {
                const pct = e.hp / e.maxHp;
                if (pct < minHPpct) {
                  minHPpct = pct;
                  lowestAlly = e;
                }
              }
            }
          });
          if (lowestAlly) {
            const actualHeal = Math.min(8, (lowestAlly as SimulatedEntity).maxHp - (lowestAlly as SimulatedEntity).hp);
            if (actualHeal > 0) {
              (lowestAlly as SimulatedEntity).hp += actualHeal;
              if (run.livingSquad[lowestAlly.id]) {
                run.livingSquad[lowestAlly.id].hp = lowestAlly.hp;
              }
              floatingTextsRef.current.push({
                text: `+${actualHeal} (Wilds Heal)`,
                x: lowestAlly.posX,
                y: lowestAlly.posY - 12,
                color: '#4ade80',
                life: 1.2
              });
              visualEffectsRef.current.push({
                type: 'leaf',
                x1: ent.posX,
                y1: ent.posY,
                x2: lowestAlly.posX,
                y2: lowestAlly.posY,
                color: '#22c55e',
                life: 0.4,
                maxLife: 0.4
              });
            }
          }
        }
      }

      // 15. Frostmourne's Edge slowing aura slow
      if (equippedLegendaries.has("Frostmourne's Edge")) {
        entities.forEach(e => {
          if (!e.isDead && !heroTypes.has(e.type) && e.type !== 'chest' && e.type !== 'cage' && e.type !== 'portal' && e.type !== 'item_loot') {
            const dist = Math.hypot(e.posX - ent.posX, e.posY - ent.posY);
            if (dist <= 2.6 * tileSize) {
              e.frostSlowed = true;
            }
          }
        });
      }

      // 16. Sunfire Sabatons magma trail spawning
      if (equippedLegendaries.has('Sunfire Sabatons')) {
        if (ent.legSunfireTrailTimer === undefined) ent.legSunfireTrailTimer = 0;
        ent.legSunfireTrailTimer += dt;
        if (ent.legSunfireTrailTimer >= 0.15) {
          ent.legSunfireTrailTimer -= 0.15;
          sunfireTrailsRef.current.push({
            x: ent.posX,
            y: ent.posY,
            life: 3.0, // Trail lasts 3 seconds
            damage: 8
          });
        }
      }

      // 19. Astral Spaulders falling stars spawning
      if (equippedLegendaries.has('Astral Spaulders')) {
        if (ent.legAstralSpauldersTimer === undefined) ent.legAstralSpauldersTimer = 0;
        ent.legAstralSpauldersTimer += dt;
        if (ent.legAstralSpauldersTimer >= 4.0) {
          ent.legAstralSpauldersTimer -= 4.0;
          // Spawn a falling star targeting a random enemy
          const target = entities.find(e => !e.isDead && !heroTypes.has(e.type) && e.type !== 'chest' && e.type !== 'cage' && e.type !== 'portal' && e.type !== 'item_loot');
          if (target) {
            fallingStarsRef.current.push({
              x: target.posX + (Math.random() - 0.5) * 60,
              y: -50, // Starts above screen
              targetX: target.posX,
              targetY: target.posY,
              speed: 250,
              damage: 20,
              life: 1.0
            });
            // Visual falling star path
            visualEffectsRef.current.push({
              type: 'star',
              x1: target.posX,
              y1: target.posY,
              color: '#facc15',
              life: 0.5,
              maxLife: 0.5
            });
          }
        }
      }

      // 21. Shadowflame Cowl (Emit shadow flames)
      if (equippedLegendaries.has('Shadowflame Cowl')) {
        if (ent.legShadowflameTimer === undefined) ent.legShadowflameTimer = 0;
        ent.legShadowflameTimer += dt;
        if (ent.legShadowflameTimer >= 2.0) {
          ent.legShadowflameTimer -= 2.0;
          const nearbyEnemies = entities.filter(e => !e.isDead && !heroTypes.has(e.type) && e.type !== 'chest' && e.type !== 'cage' && e.type !== 'portal' && e.type !== 'item_loot' && Math.hypot(e.posX - ent.posX, e.posY - ent.posY) <= 4 * tileSize);
          const selected = nearbyEnemies.slice(0, 2);
          selected.forEach(target => {
            target.hp = Math.max(0, target.hp - 12);
            visualEffectsRef.current.push({
              type: 'ghost',
              x1: ent.posX,
              y1: ent.posY,
              x2: target.posX,
              y2: target.posY,
              color: '#c084fc',
              life: 0.35,
              maxLife: 0.35
            });
            floatingTextsRef.current.push({
              text: `-12 (Shadowflame)`,
              x: target.posX,
              y: target.posY - 12,
              color: '#a855f7',
              life: 1.0
            });
            if (target.hp <= 0) {
              target.isDead = true;
              setCombatLog(log => [...log, `💀 ${target.name} evaporated in shadow flames.`].slice(-40));
            }
          });
        }
      }

      // 22. Gale-Force Leggings (Knockback nearby enemies every 4s)
      if (equippedLegendaries.has('Gale-Force Leggings')) {
        if (ent.legGaleTimer === undefined) ent.legGaleTimer = 0;
        ent.legGaleTimer += dt;
        if (ent.legGaleTimer >= 4.0) {
          ent.legGaleTimer -= 4.0;
          entities.forEach(e => {
            if (!e.isDead && !heroTypes.has(e.type) && e.type !== 'chest' && e.type !== 'cage' && e.type !== 'portal' && e.type !== 'item_loot') {
              const dist = Math.hypot(e.posX - ent.posX, e.posY - ent.posY);
              if (dist <= 2.0 * tileSize) {
                const angle = Math.atan2(e.posY - ent.posY, e.posX - ent.posX);
                const pushDist = 1.0 * tileSize;
                e.posX += Math.cos(angle) * pushDist;
                e.posY += Math.sin(angle) * pushDist;
                floatingTextsRef.current.push({
                  text: `Repelled!`,
                  x: e.posX,
                  y: e.posY - 12,
                  color: '#93c5fd',
                  life: 1.0
                });
              }
            }
          });
          visualEffectsRef.current.push({
            type: 'nova',
            x1: ent.posX,
            y1: ent.posY,
            color: '#e2e8f0',
            size: 2.0 * tileSize,
            life: 0.3,
            maxLife: 0.3
          });
        }
      }

      // 23. Vortex Pauldrons (Pull nearby enemy closer)
      if (equippedLegendaries.has('Vortex Pauldrons')) {
        if (ent.legVortexTimer === undefined) ent.legVortexTimer = 0;
        ent.legVortexTimer += dt;
        if (ent.legVortexTimer >= 3.5) {
          ent.legVortexTimer -= 3.5;
          const targets = entities.filter(e => !e.isDead && !heroTypes.has(e.type) && e.type !== 'chest' && e.type !== 'cage' && e.type !== 'portal' && e.type !== 'item_loot' && Math.hypot(e.posX - ent.posX, e.posY - ent.posY) <= 4 * tileSize);
          if (targets.length > 0) {
            const target = targets[Math.floor(Math.random() * targets.length)];
            const angle = Math.atan2(ent.posY - target.posY, ent.posX - target.posX);
            const pullDist = 1.5 * tileSize;
            target.posX += Math.cos(angle) * pullDist;
            target.posY += Math.sin(angle) * pullDist;
            visualEffectsRef.current.push({
              type: 'lightning',
              x1: ent.posX,
              y1: ent.posY,
              x2: target.posX,
              y2: target.posY,
              color: '#06b6d4',
              life: 0.25,
              maxLife: 0.25
            });
            floatingTextsRef.current.push({
              text: `Pulled!`,
              x: target.posX,
              y: target.posY - 12,
              color: '#06b6d4',
              life: 1.0
            });
          }
        }
      }

      // 25. Frozen Treads ice trail spawning
      if (equippedLegendaries.has('Frozen Treads')) {
        if (ent.legFrozenTrailTimer === undefined) ent.legFrozenTrailTimer = 0;
        ent.legFrozenTrailTimer += dt;
        if (ent.legFrozenTrailTimer >= 0.15) {
          ent.legFrozenTrailTimer -= 0.15;
          frozenTrailsRef.current.push({
            x: ent.posX,
            y: ent.posY,
            life: 3.0
          });
        }
      }

      // 31. Duskwalker Boots (Decrement invisibility timer)
      if (ent.legDuskwalkerInvisible && ent.legDuskwalkerInvulnTimer !== undefined) {
        ent.legDuskwalkerInvulnTimer -= dt;
        if (ent.legDuskwalkerInvulnTimer <= 0) {
          ent.legDuskwalkerInvisible = false;
        }
      }

      // 37. Tome of Lost Souls (Wandering ghostly wisps)
      if (equippedLegendaries.has('Tome of Lost Souls')) {
        if (ent.legTomeTimer === undefined) ent.legTomeTimer = 0;
        ent.legTomeTimer += dt;
        if (ent.legTomeTimer >= 3.0) {
          ent.legTomeTimer -= 3.0;
          const target = entities.find(e => !e.isDead && !heroTypes.has(e.type) && e.type !== 'chest' && e.type !== 'cage' && e.type !== 'portal' && e.type !== 'item_loot');
          if (target) {
            projectilesRef.current.push({
              x: ent.posX,
              y: ent.posY,
              startX: ent.posX,
              startY: ent.posY,
              attackerId: ent.id,
              targetId: target.id,
              speed: 160,
              damage: 15,
              isMitigated: false,
              color: '#c084fc',
              size: 3.5,
              trail: [],
              life: 3.0,
              isAoE: false
            });
            visualEffectsRef.current.push({
              type: 'ghost',
              x1: ent.posX,
              y1: ent.posY,
              x2: target.posX,
              y2: target.posY,
              color: '#d8b4fe',
              life: 0.3,
              maxLife: 0.3
            });
          }
        }
      }

      // 39. Scepter of Light (Judgement beam from heaven)
      if (equippedLegendaries.has('Scepter of Light')) {
        if (ent.legScepterTimer === undefined) ent.legScepterTimer = 0;
        ent.legScepterTimer += dt;
        if (ent.legScepterTimer >= 4.0) {
          ent.legScepterTimer -= 4.0;
          let maxHPEnt: SimulatedEntity | null = null;
          entities.forEach(e => {
            if (!e.isDead && !heroTypes.has(e.type) && e.type !== 'chest' && e.type !== 'cage' && e.type !== 'portal' && e.type !== 'item_loot') {
              if (!maxHPEnt || e.hp > maxHPEnt.hp) {
                maxHPEnt = e;
              }
            }
          });
          if (maxHPEnt) {
            const target = maxHPEnt as SimulatedEntity;
            target.hp = Math.max(0, target.hp - 20);
            visualEffectsRef.current.push({
              type: 'laser',
              x1: target.posX,
              y1: 0,
              x2: target.posX,
              y2: target.posY,
              color: '#fef08a',
              life: 0.4,
              maxLife: 0.4
            });
            floatingTextsRef.current.push({
              text: `-20 (Judgement)`,
              x: target.posX,
              y: target.posY - 12,
              color: '#facc15',
              life: 1.2
            });
            if (target.hp <= 0) {
              target.isDead = true;
              setCombatLog(log => [...log, `💀 ${target.name} was judged by the Light.`].slice(-40));
            }
          }
        }
      }
    });

    // Update & Collision check for Sunfire Sabatons Trails
    sunfireTrailsRef.current.forEach(trail => {
      trail.life -= dt;
      // Check collision with all enemies
      entities.forEach(e => {
        if (!e.isDead && !heroTypes.has(e.type) && e.type !== 'chest' && e.type !== 'cage' && e.type !== 'portal' && e.type !== 'item_loot') {
          const dist = Math.hypot(e.posX - trail.x, e.posY - trail.y);
          if (dist <= 14) {
            // Apply burning damage tick if cooldown (let's say they take damage once per trail instance per 0.5s)
            if (trail.life % 0.5 < dt) {
              e.hp = Math.max(0, e.hp - Math.round(trail.damage * dt * 2)); // scale up a bit to feel impactful
            }
          }
        }
      });
    });
    sunfireTrailsRef.current = sunfireTrailsRef.current.filter(t => t.life > 0);

    // Update & Collision check for Frozen Treads Trails
    frozenTrailsRef.current.forEach(trail => {
      trail.life -= dt;
      entities.forEach(e => {
        if (!e.isDead && !heroTypes.has(e.type) && e.type !== 'chest' && e.type !== 'cage' && e.type !== 'portal' && e.type !== 'item_loot') {
          const dist = Math.hypot(e.posX - trail.x, e.posY - trail.y);
          if (dist <= 14) {
            e.frostSlowed = true;
          }
        }
      });
    });
    frozenTrailsRef.current = frozenTrailsRef.current.filter(t => t.life > 0);

    // Update & Collision check for Falling Stars
    fallingStarsRef.current.forEach(star => {
      const angle = Math.atan2(star.targetY - star.y, star.targetX - star.x);
      const dist = Math.hypot(star.targetX - star.x, star.targetY - star.y);
      const step = star.speed * dt;
      if (dist <= step) {
        star.x = star.targetX;
        star.y = star.targetY;
        star.life = 0; // explode!
        
        // Explode: deal damage to all enemies in 1.5 tiles radius
        entities.forEach(e => {
          if (!e.isDead && !heroTypes.has(e.type) && e.type !== 'chest' && e.type !== 'cage' && e.type !== 'portal' && e.type !== 'item_loot') {
            const d = Math.hypot(e.posX - star.targetX, e.posY - star.targetY);
            if (d <= 1.5 * tileSize) {
              e.hp = Math.max(0, e.hp - star.damage);
              floatingTextsRef.current.push({
                text: `-${star.damage} (Starfall)`,
                x: e.posX,
                y: e.posY - 10,
                color: '#eab308',
                life: 1.2
              });
              if (e.hp <= 0) {
                e.isDead = true;
                setCombatLog(log => [...log, `💀 ${e.name} crushed by a star.`].slice(-40));
              }
            }
          }
        });
        
        // Exploding star particles
        for (let i = 0; i < 8; i++) {
          const a = Math.random() * Math.PI * 2;
          const s = 30 + Math.random() * 50;
          particlesRef.current.push({
            x: star.targetX,
            y: star.targetY,
            vx: Math.cos(a) * s,
            vy: Math.sin(a) * s,
            color: '#facc15',
            size: 2 + Math.random() * 2,
            life: 0.4 + Math.random() * 0.3
          });
        }
      } else {
        star.x += Math.cos(angle) * step;
        star.y += Math.sin(angle) * step;
      }
    });
    fallingStarsRef.current = fallingStarsRef.current.filter(s => s.life > 0);

    // Update visualEffects Ref
    visualEffectsRef.current.forEach(fx => {
      fx.life -= dt;
    });
    visualEffectsRef.current = visualEffectsRef.current.filter(fx => fx.life > 0);

    // Poison tick damage processing
    poisonStacksRef.current.forEach((poison, entityId) => {
      const ent = entities.find(e => e.id === entityId);
      if (!ent || ent.isDead) {
        poisonStacksRef.current.delete(entityId);
        return;
      }
      poison.timer += dt;
      if (poison.timer >= 2.0) {
        poison.timer -= 2.0;
        // Damage per tick per stack: min(10, 1 + 1.5*(level-1))
        const dmgPerStack = Math.min(10, 1 + 1.5 * (poison.level - 1));
        const totalDmg = Math.round(dmgPerStack * poison.stacks);
        if (totalDmg > 0) {
          ent.hp = Math.max(ent.hp - totalDmg, 0);
          floatingTextsRef.current.push({
            text: `☠ -${totalDmg}`,
            x: ent.posX,
            y: ent.posY - 10,
            color: '#22c55e',
            life: 1.2
          });
          // Green poison particles
          for (let k = 0; k < 4; k++) {
            particlesRef.current.push({
              x: ent.posX,
              y: ent.posY,
              vx: (Math.random() - 0.5) * 40,
              vy: (Math.random() - 0.5) * 40,
              color: '#22c55e',
              size: 1.5 + Math.random() * 1.5,
              life: 0.6
            });
          }
          // Sync HP to livingSquad if it's a hero (shouldn't be, but safety)
          if (run.livingSquad[ent.id]) {
            run.livingSquad[ent.id].hp = ent.hp;
          }
          // Death from poison
          if (ent.hp <= 0) {
            ent.isDead = true;
            poisonStacksRef.current.delete(entityId);
            setCombatLog(log => [...log, `💀 ${ent.name} has fallen to poison.`].slice(-40));
            if (run.livingSquad[ent.id]) {
              run.livingSquad[ent.id].hp = 0;
              triggerToast(`💀 ${ent.name} has fallen!`, 'death');
            }
            if (!heroTypes.has(ent.type)) {
              const xpDropped = 25 + Math.round(Math.random() * 15) + run.currentBiome * 5;
              addRunXp(xpDropped);
              floatingTextsRef.current.push({
                text: `+${xpDropped} XP`,
                x: ent.posX + 8,
                y: ent.posY - 12,
                color: '#c084fc',
                life: 1.2
              });
            }
          }
        }
      }
    });

    // Update projectiles
    projectilesRef.current.forEach(proj => {
      const target = entities.find(e => e.id === proj.targetId && !e.isDead);
      if (!target) {
        proj.life = 0;
        return;
      }
      const attacker = entities.find(e => e.id === proj.attackerId);
      const isFriendlyProj = attacker ? heroTypes.has(attacker.type) : true;
      if (timeStopTimerRef.current > 0 && isFriendlyProj) {
        return; // Frozen in time!
      }
      // Track toward target's current position
      const tdx = target.posX - proj.x;
      const tdy = target.posY - proj.y;
      const tdist = Math.hypot(tdx, tdy);
      if (tdist < 8) {
        // Impact! Apply damage
        const attacker = entities.find(e => e.id === proj.attackerId && !e.isDead);
        const attackerHero = attacker && heroTypes.has(attacker.type) ? roster.find(r => r.character_id === attacker.id) : null;
        const attackerLegendaries = new Set<string>();
        if (attackerHero && attackerHero.equipment) {
          for (const slot in attackerHero.equipment) {
            const item = attackerHero.equipment[slot as EquipmentSlot];
            if (item && item.rarity === 'Legendary') {
              attackerLegendaries.add(item.name);
            }
          }
        }

        let damageToApply = proj.damage;
        if (attackerLegendaries.has('Zephyr Bow')) {
          damageToApply = Math.round(damageToApply * 1.25);
          // Knockback target
          const angle = Math.atan2(target.posY - proj.startY, target.posX - proj.startX);
          const pushDist = 12;
          const testX = target.posX + Math.cos(angle) * pushDist;
          const testY = target.posY + Math.sin(angle) * pushDist;
          const testGX = Math.floor(testX / tileSize);
          const testGY = Math.floor(testY / tileSize);
          if (grid[testGY]?.[testGX] === 0) {
            target.posX = testX;
            target.posY = testY;
            target.gridX = testGX;
            target.gridY = testGY;
          }
        }

        const targetLegendaries = new Set<string>();
        const targetHero = heroTypes.has(target.type) ? roster.find(h => h.character_id === target.id) : null;
        if (targetHero && targetHero.equipment) {
          for (const slot in targetHero.equipment) {
            const item = targetHero.equipment[slot as EquipmentSlot];
            if (item && item.rarity === 'Legendary') targetLegendaries.add(item.name);
          }
        }

        // Gale-force dodge
        if (targetLegendaries.has('Gale-Force Leggings') && Math.random() < 0.10) {
          damageToApply = 0;
          proj.isMitigated = true;
          floatingTextsRef.current.push({
            text: `Evaded!`,
            x: target.posX,
            y: target.posY - 12,
            color: '#60a5fa',
            life: 1.0
          });
        }

        // Runic Shielding absorption
        if (target.runicShield && target.runicShield > 0 && damageToApply > 0) {
          if (damageToApply >= target.runicShield) {
            damageToApply -= target.runicShield;
            target.runicShield = 0;
          } else {
            target.runicShield -= damageToApply;
            damageToApply = 0;
          }
        }

        let isEvadedRogue = false;
        if (target.type === 'rogue') {
          const powerups = run?.selectedPowerups ?? [];
          const evasiveCount = powerups.filter(p => p === 'Evasive Maneuvers').length;
          if (evasiveCount > 0 && Math.random() < 0.15 * evasiveCount) {
            isEvadedRogue = true;
          }
        }

        const isInvuln = !!target.legDivineBulwarkActive || !!target.legDuskwalkerInvisible;
        if (isInvuln || isEvadedRogue) {
          proj.isMitigated = true;
          damageToApply = 0;
          
          if (isEvadedRogue) {
            floatingTextsRef.current.push({
              text: `Evaded!`,
              x: target.posX,
              y: target.posY - 12,
              color: '#60a5fa',
              life: 1.0
            });
            setCombatLog(log => [...log, `${target.name} evaded projectile.`].slice(-40));
          }
        }

        // Paladin Aura defense bonus (applied as damage reduction)
        if (heroTypes.has(target.type) && damageToApply > 0) {
          const paladin = entities.find(e => e.type === 'paladin' && !e.isDead);
          if (paladin) {
            const dist = Math.hypot(target.posX - paladin.posX, target.posY - paladin.posY);
            const paladinPowerups = run.selectedPowerups ?? [];
            const devotionCount = paladinPowerups.filter(p => p === 'Devotion Aura').length;
            const auraRadius = (4 + devotionCount * 2) * tileSize;
            if (dist <= auraRadius) {
              let defBonus = 0.10; // 10% base damage reduction
              const auraMasteryCount = paladinPowerups.filter(p => p === 'Aura Mastery').length;
              defBonus += 0.05 * auraMasteryCount;
              defBonus += 0.10 * devotionCount;
              damageToApply = Math.round(damageToApply * (1 - Math.min(0.75, defBonus)));
            }
          }
        }

        const oldHp = target.hp;
        target.hp = Math.max(target.hp - damageToApply, 0);
        const dmgTaken = oldHp - target.hp;

        if (target.type === 'rogue' && dmgTaken > 0) {
          target.isStealthed = false;
          target.stealthTimer = 6.0;
        }

        // Paladin Retribution Aura reflection
        if (heroTypes.has(target.type) && attacker && !attacker.isDead && dmgTaken > 0) {
          const paladin = entities.find(e => e.type === 'paladin' && !e.isDead);
          if (paladin) {
            const dist = Math.hypot(target.posX - paladin.posX, target.posY - paladin.posY);
            const paladinPowerups = run.selectedPowerups ?? [];
            const retributionCount = paladinPowerups.filter(p => p === 'Retribution Aura').length;
            const devotionCount = paladinPowerups.filter(p => p === 'Devotion Aura').length;
            const auraRadius = (4 + devotionCount * 2) * tileSize;
            if (retributionCount > 0 && dist <= auraRadius) {
              const reflectDmg = Math.round(dmgTaken * (0.15 + 0.10 * (retributionCount - 1)));
              if (reflectDmg > 0) {
                attacker.hp = Math.max(0, attacker.hp - reflectDmg);
                floatingTextsRef.current.push({
                  text: `-${reflectDmg} (Retribution)`,
                  x: attacker.posX,
                  y: attacker.posY - 12,
                  color: '#eab308',
                  life: 1.0
                });
                
                visualEffectsRef.current.push({
                  type: 'lightning',
                  x1: target.posX,
                  y1: target.posY,
                  x2: attacker.posX,
                  y2: attacker.posY,
                  color: '#fbbf24',
                  life: 0.15,
                  maxLife: 0.15
                });

                if (attacker.hp <= 0) {
                  attacker.isDead = true;
                  setCombatLog(log => [...log, `💀 ${attacker.name} was slain by Retribution Aura.`].slice(-40));
                }
              }
            }
          }
        }

        // Duskwalker Boots invisibility trigger
        if (targetLegendaries.has('Duskwalker Boots') && target.hp < target.maxHp * 0.40 && !target.legDuskwalkerInvisible && !target.isDead) {
          target.legDuskwalkerInvisible = true;
          target.legDuskwalkerInvulnTimer = 1.5;
          floatingTextsRef.current.push({
            text: `Invisibility!`,
            x: target.posX,
            y: target.posY - 16,
            color: '#c084fc',
            life: 1.5
          });
        }

        // Iron Retaliation (Carapace of the Iron Core) reflect damage
        if (targetLegendaries.has('Carapace of the Iron Core') && attacker && !attacker.isDead && dmgTaken > 0) {
          const reflectDmg = Math.round(dmgTaken * 0.20);
          if (reflectDmg > 0) {
            attacker.hp = Math.max(0, attacker.hp - reflectDmg);
            floatingTextsRef.current.push({
              text: `-${reflectDmg} (Retaliate)`,
              x: attacker.posX,
              y: attacker.posY - 12,
              color: '#94a3b8',
              life: 1.0
            });
            visualEffectsRef.current.push({
              type: 'lightning',
              x1: target.posX,
              y1: target.posY,
              x2: attacker.posX,
              y2: attacker.posY,
              color: '#94a3b8',
              life: 0.15,
              maxLife: 0.15
            });
            if (attacker.hp <= 0) {
              attacker.isDead = true;
              setCombatLog(log => [...log, `💀 ${attacker.name} was crushed by Iron Retaliation.`].slice(-40));
            }
          }
        }

        // Static Discharge (Lightning-Rod Vambraces) reflect shock
        if (targetLegendaries.has('Lightning-Rod Vambraces') && Math.random() < 0.15 && attacker && !attacker.isDead && dmgTaken > 0) {
          attacker.hp = Math.max(0, attacker.hp - 18);
          floatingTextsRef.current.push({
            text: `-18 (Static Shock)`,
            x: attacker.posX,
            y: attacker.posY - 12,
            color: '#eab308',
            life: 1.0
          });
          visualEffectsRef.current.push({
            type: 'lightning',
            x1: target.posX,
            y1: target.posY,
            x2: attacker.posX,
            y2: attacker.posY,
            color: '#eab308',
            life: 0.25,
            maxLife: 0.25
          });
          if (attacker.hp <= 0) {
            attacker.isDead = true;
            setCombatLog(log => [...log, `💀 ${attacker.name} was electrocuted by Static Discharge.`].slice(-40));
          }
        }

        // Frigid Shell (Glacial Girdle) shatter
        if (targetLegendaries.has('Glacial Girdle') && dmgTaken > 0) {
          if (target.glacialShield === undefined) target.glacialShield = 20;
          if (target.glacialShield > 0) {
            target.glacialShield -= dmgTaken;
            if (target.glacialShield <= 0) {
              entities.forEach(e => {
                if (!e.isDead && !heroTypes.has(e.type) && e.type !== 'chest' && e.type !== 'cage' && e.type !== 'portal' && e.type !== 'item_loot') {
                  const dist = Math.hypot(e.posX - target.posX, e.posY - target.posY);
                  if (dist <= 2.0 * tileSize) {
                    e.hp = Math.max(0, e.hp - 12);
                    e.frostSlowed = true;
                    floatingTextsRef.current.push({
                      text: `-12 (Frigid Burst)`,
                      x: e.posX,
                      y: e.posY - 12,
                      color: '#06b6d4',
                      life: 1.0
                    });
                    if (e.hp <= 0) {
                      e.isDead = true;
                      setCombatLog(log => [...log, `💀 ${e.name} died in Frigid Shell explosion.`].slice(-40));
                    }
                  }
                }
              });
              visualEffectsRef.current.push({
                type: 'nova',
                x1: target.posX,
                y1: target.posY,
                color: '#06b6d4',
                size: 2.0 * tileSize,
                life: 0.35,
                maxLife: 0.35
              });
            }
          }
        }

        if (dmgTaken > 0) {
          if (attackerLegendaries.has('Maelstrom Staff')) {
            const chainTargets = entities.filter(e => !e.isDead && e.id !== target.id && !heroTypes.has(e.type) && e.type !== 'chest' && e.type !== 'cage' && e.type !== 'portal' && e.type !== 'item_loot' && Math.hypot(e.posX - target.posX, e.posY - target.posY) <= 3.5 * tileSize).slice(0, 2);
            chainTargets.forEach(ct => {
              ct.hp = Math.max(0, ct.hp - 10);
              visualEffectsRef.current.push({
                type: 'lightning',
                x1: target.posX,
                y1: target.posY,
                x2: ct.posX,
                y2: ct.posY,
                color: '#22d3ee',
                life: 0.2,
                maxLife: 0.2
              });
              floatingTextsRef.current.push({
                text: `-10 (Chain)`,
                x: ct.posX,
                y: ct.posY - 10,
                color: '#22d3ee',
                life: 1.0
              });
              if (ct.hp <= 0) {
                ct.isDead = true;
                setCombatLog(log => [...log, `💀 ${ct.name} was zapped by Maelstrom.`].slice(-40));
              }
            });
          }

          // Talon Bow pierce
          if (attackerLegendaries.has('Talon Bow') && Math.random() < 0.30) {
            const nextTarget = entities.find(e => e.id !== target.id && !e.isDead && !heroTypes.has(e.type) && e.type !== 'chest' && e.type !== 'cage' && e.type !== 'portal' && e.type !== 'item_loot' && e.posX > target.posX);
            if (nextTarget) {
              projectilesRef.current.push({
                x: target.posX,
                y: target.posY,
                startX: target.posX,
                startY: target.posY,
                attackerId: proj.attackerId,
                targetId: nextTarget.id,
                speed: proj.speed,
                damage: Math.round(proj.damage * 0.8),
                isMitigated: false,
                color: '#4ade80',
                size: proj.size,
                trail: [],
                life: 2.0,
                isAoE: false
              });
            }
          }

          // Blighted Bow toxic spread
          if (attackerLegendaries.has('Blighted Bow')) {
            target.poisonLevel = (target.poisonLevel || 0) + 1;
            target.isPoisoned = true;
            const otherEnemy = entities.find(e => e.id !== target.id && !e.isDead && !heroTypes.has(e.type) && e.type !== 'chest' && e.type !== 'cage' && e.type !== 'portal' && e.type !== 'item_loot' && Math.hypot(e.posX - target.posX, e.posY - target.posY) <= 2 * tileSize);
            if (otherEnemy) {
              otherEnemy.poisonLevel = (otherEnemy.poisonLevel || 0) + 1;
              otherEnemy.isPoisoned = true;
              visualEffectsRef.current.push({
                type: 'ghost',
                x1: target.posX,
                y1: target.posY,
                x2: otherEnemy.posX,
                y2: otherEnemy.posY,
                color: '#10b981',
                life: 0.25,
                maxLife: 0.25
              });
            }
          }

          // Staff of Everlasting Winter frost nova
          if (attackerLegendaries.has('Staff of Everlasting Winter')) {
            entities.forEach(e => {
              if (!e.isDead && !heroTypes.has(e.type) && e.type !== 'chest' && e.type !== 'cage' && e.type !== 'portal' && e.type !== 'item_loot') {
                const dist = Math.hypot(e.posX - target.posX, e.posY - target.posY);
                if (dist <= 2.0 * tileSize) {
                  e.hp = Math.max(0, e.hp - 5);
                  e.frostSlowed = true;
                  floatingTextsRef.current.push({
                    text: `-5 (Blizzard)`,
                    x: e.posX,
                    y: e.posY - 12,
                    color: '#38bdf8',
                    life: 1.0
                  });
                  if (e.hp <= 0) {
                    e.isDead = true;
                    setCombatLog(log => [...log, `💀 ${e.name} was frozen to death.`].slice(-40));
                  }
                }
              }
            });
            visualEffectsRef.current.push({
              type: 'nova',
              x1: target.posX,
              y1: target.posY,
              color: '#38bdf8',
              size: 2.0 * tileSize,
              life: 0.35,
              maxLife: 0.35
            });
          }
        }

        if (target.hp <= 0 && dmgTaken > 0) {
          if (attackerLegendaries.has("Gravekeeper's Scythe") && attacker) {
            const heal = Math.round(attacker.maxHp * 0.10);
            attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal);
            if (run.livingSquad[attacker.id]) {
              run.livingSquad[attacker.id].hp = attacker.hp;
            }
            floatingTextsRef.current.push({
              text: `+${heal} (Soul Feast)`,
              x: attacker.posX,
              y: attacker.posY - 12,
              color: '#a855f7',
              life: 1.2
            });
            visualEffectsRef.current.push({
              type: 'ghost',
              x1: target.posX,
              y1: target.posY,
              x2: attacker.posX,
              y2: attacker.posY,
              color: '#a855f7',
              life: 0.4,
              maxLife: 0.4
            });
          }

          // Grip of the Undead skeleton minion rise
          if (attackerHero && attackerLegendaries.has('Grip of the Undead')) {
            entitiesRef.current.push({
              id: `skeleton-${Date.now()}-${Math.random()}`,
              name: 'Skeleton Minion',
              type: 'skeleton',
              gridX: target.gridX,
              gridY: target.gridY,
              posX: target.posX,
              posY: target.posY,
              hp: 12,
              maxHp: 12,
              speed: 1.84,
              attackRange: 1.2,
              attackCooldown: 0,
              damage: 5,
              lifeSteal: 0,
              tempBuffs: [],
              color: '#e5e7eb',
              isDead: false,
              summonerId: attacker?.id
            });
            setCombatLog(log => [...log, `💀 Grip of the Undead raised a Skeleton Minion.`].slice(-40));
          }

          // Soul-Eater Vestment healing wielder
          if (attackerHero && attackerLegendaries.has('Soul-Eater Vestment') && attacker) {
            const healAmt = 3 + Math.round(attacker.maxHp * 0.01);
            attacker.hp = Math.min(attacker.maxHp, attacker.hp + healAmt);
            if (run.livingSquad[attacker.id]) {
              run.livingSquad[attacker.id].hp = attacker.hp;
            }
            floatingTextsRef.current.push({
              text: `+${healAmt} (Soul Eater)`,
              x: attacker.posX,
              y: attacker.posY - 12,
              color: '#4ade80',
              life: 1.0
            });
            visualEffectsRef.current.push({
              type: 'leaf',
              x1: attacker.posX,
              y1: attacker.posY + 10,
              x2: attacker.posX,
              y2: attacker.posY - 10,
              color: '#4ade80',
              life: 0.3,
              maxLife: 0.3
            });
          }
        }

        if (dmgTaken > 0 && heroTypes.has(target.type)) {
          const heroRec = roster.find(r => r.character_id === target.id);
          if (heroRec && heroRec.equipment) {
            const equippedLegendaries = new Set<string>();
            for (const slot in heroRec.equipment) {
              const item = heroRec.equipment[slot as EquipmentSlot];
              if (item && item.rarity === 'Legendary') {
                equippedLegendaries.add(item.name);
              }
            }
            if (equippedLegendaries.has('Phoenix Rebirth Ring') && Math.random() < 0.25) {
              entities.forEach(e => {
                if (!e.isDead && !heroTypes.has(e.type) && e.type !== 'chest' && e.type !== 'cage' && e.type !== 'portal' && e.type !== 'item_loot') {
                  const dist = Math.hypot(e.posX - target.posX, e.posY - target.posY);
                  if (dist <= 2.0 * tileSize) {
                    e.hp = Math.max(0, e.hp - 15);
                    floatingTextsRef.current.push({
                      text: `-15 (Phoenix Burst)`,
                      x: e.posX,
                      y: e.posY - 12,
                      color: '#f97316',
                      life: 1.0
                    });
                    if (e.hp <= 0) {
                      e.isDead = true;
                      setCombatLog(log => [...log, `💀 ${e.name} fell to Phoenix Rebirth Ring.`].slice(-40));
                    }
                  }
                }
              });
              visualEffectsRef.current.push({
                type: 'nova',
                x1: target.posX,
                y1: target.posY,
                color: '#f97316',
                size: 2.0 * tileSize,
                life: 0.3,
                maxLife: 0.3
              });
            }

            if (equippedLegendaries.has('Volcanic Cuirass')) {
              const attackerEnt = entities.find(e => e.id === proj.attackerId && !e.isDead);
              if (attackerEnt && !heroTypes.has(attackerEnt.type) && attackerEnt.type !== 'chest' && attackerEnt.type !== 'cage' && attackerEnt.type !== 'portal' && attackerEnt.type !== 'item_loot') {
                attackerEnt.hp = Math.max(0, attackerEnt.hp - 12);
                floatingTextsRef.current.push({
                  text: `-12 (Lava Burst)`,
                  x: attackerEnt.posX,
                  y: attackerEnt.posY - 12,
                  color: '#ef4444',
                  life: 1.0
                });
                visualEffectsRef.current.push({
                  type: 'nova',
                  x1: target.posX,
                  y1: target.posY,
                  color: '#ef4444',
                  size: 40,
                  life: 0.2,
                  maxLife: 0.2
                });
                if (attackerEnt.hp <= 0) {
                  attackerEnt.isDead = true;
                  setCombatLog(log => [...log, `💀 ${attackerEnt.name} was melted by Volcanic Cuirass.`].slice(-40));
                }
              }
            }
          }
        }

        // Fire Armor synergy: enemy projectile hits warrior, attacker takes fire damage back
        if (target.type === 'warrior') {
          const attacker = entitiesRef.current.find(e => e.id === proj.attackerId && !e.isDead);
          const isAttackerHostile = attacker && !heroTypes.has(attacker.type) && attacker.type !== 'chest' && attacker.type !== 'cage' && attacker.type !== 'portal' && attacker.type !== 'item_loot';
          if (isAttackerHostile) {
            const fireArmorLevel = (run.selectedPowerups ?? []).filter(p => p === 'Fire Armor').length;
            if (fireArmorLevel > 0) {
              const retDmg = 15 + 10 * (fireArmorLevel - 1);
              attacker.hp = Math.max(0, attacker.hp - retDmg);

              // Floating text on the attacker
              floatingTextsRef.current.push({
                text: `-${retDmg} (Fire Armor)`,
                x: attacker.posX,
                y: attacker.posY - 12,
                color: '#ff6a00',
                life: 1.0
              });

              // Fire particles on the attacker
              for (let k = 0; k < 4; k++) {
                particlesRef.current.push({
                  x: attacker.posX,
                  y: attacker.posY,
                  vx: (Math.random() - 0.5) * 50,
                  vy: (Math.random() - 0.5) * 50,
                  color: '#f97316',
                  size: 2 + Math.random() * 2,
                  life: 0.4
                });
              }

              if (attacker.hp <= 0) {
                attacker.isDead = true;
                setCombatLog(log => [...log, `💀 ${attacker.name} was consumed by Fire Armor.`].slice(-40));
              }
            }
          }
        }

        // Floating text at impact
        floatingTextsRef.current.push({
          text: proj.isMitigated ? `Blocked!` : `-${proj.damage}`,
          x: target.posX,
          y: target.posY - 8,
          color: proj.isMitigated ? '#60a5fa' : '#fbbf24',
          life: 1.0
        });

        // Poison Arrow: apply poison stacks on impact
        if (proj.isPoisoned && !heroTypes.has(target.type)) {
          const existing = poisonStacksRef.current.get(target.id);
          const newStacks = existing ? Math.min(existing.stacks + 1, 5) : 1;
          poisonStacksRef.current.set(target.id, {
            stacks: newStacks,
            timer: existing?.timer ?? 0,
            level: proj.poisonLevel ?? 1
          });
          floatingTextsRef.current.push({
            text: `☠ Poison (${newStacks})`,
            x: target.posX,
            y: target.posY - 16,
            color: '#22c55e',
            life: 1.2
          });
        }

        // Impact particles
        for (let k = 0; k < 8; k++) {
          let pCol = proj.color;
          if (proj.isAoE) {
            const rand = Math.random();
            if (proj.isMagiAoE) {
              pCol = rand < 0.4 ? '#a855f7' : rand < 0.8 ? '#c084fc' : '#e9d5ff'; // Purple
            } else if (proj.isOwlAoE) {
              pCol = rand < 0.4 ? '#0891b2' : rand < 0.8 ? '#06b6d4' : '#22d3ee'; // Ice blue
            } else {
              pCol = rand < 0.4 ? '#ef4444' : rand < 0.8 ? '#f97316' : '#fbbf24'; // Red, orange, yellow (fire)
            }
          }
          particlesRef.current.push({
            x: target.posX,
            y: target.posY,
            vx: (Math.random() - 0.5) * 100,
            vy: (Math.random() - 0.5) * 100,
            color: pCol,
            size: 2 + Math.random() * 2,
            life: 0.5
          });
        }

        // Wizard/Sorceress/Magi/Owl AoE explosion visual effect and splash damage
        if (proj.isAoE) {
          // Circular explosion blast particles (wow factor!)
          const numExplosionParticles = 24;
          for (let k = 0; k < numExplosionParticles; k++) {
            const angle = (k / numExplosionParticles) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
            const speed = 60 + Math.random() * 80;
            const rand = Math.random();
            let pCol;
            if (proj.isMagiAoE) {
              pCol = rand < 0.4 ? '#a855f7' : rand < 0.8 ? '#c084fc' : '#e9d5ff';
            } else if (proj.isOwlAoE) {
              pCol = rand < 0.4 ? '#0891b2' : rand < 0.8 ? '#06b6d4' : '#22d3ee';
            } else {
              pCol = rand < 0.4 ? '#ef4444' : rand < 0.8 ? '#f97316' : '#fbbf24'; // Red, orange, yellow (fire)
            }
            particlesRef.current.push({
              x: target.posX,
              y: target.posY,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              color: pCol,
              size: 2 + Math.random() * 3,
              life: 0.6 + Math.random() * 0.3
            });
          }

          let aoeRadius = 1.0 * tileSize;
          if (proj.isOwlAoE) {
            aoeRadius = 1.2 * tileSize;
          } else if (!proj.isMagiAoE) {
            const fireballCount = (run.selectedPowerups ?? []).filter(p => p === 'Fireball Strike').length;
            aoeRadius = (1.5 + fireballCount * 0.5) * tileSize;
          }
          entities.forEach(other => {
            if (other.id === target.id || other.isDead) return;

            const isTargetHero = heroTypes.has(target.type);
            const isOtherHero = heroTypes.has(other.type);
            if (isTargetHero !== isOtherHero) return;
            if (other.type === 'chest' || other.type === 'cage' || other.type === 'portal' || other.type === 'item_loot') return;

            const dx = other.posX - target.posX;
            const dy = other.posY - target.posY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist <= aoeRadius) {
              const splashDmg = proj.isMagiAoE ? Math.round(proj.damage * 0.6) : proj.damage;
              other.hp = Math.max(other.hp - splashDmg, 0);

              floatingTextsRef.current.push({
                text: proj.isMitigated ? `Blocked!` : `-${splashDmg}`,
                x: other.posX,
                y: other.posY - 8,
                color: proj.isMitigated ? '#60a5fa' : (proj.isMagiAoE ? '#c084fc' : proj.isOwlAoE ? '#22d3ee' : '#fbbf24'),
                life: 1.0
              });

              for (let k = 0; k < 4; k++) {
                let pCol = proj.color;
                if (proj.isAoE) {
                  const rand = Math.random();
                  if (proj.isMagiAoE) {
                    pCol = rand < 0.4 ? '#a855f7' : rand < 0.8 ? '#c084fc' : '#e9d5ff';
                  } else if (proj.isOwlAoE) {
                    pCol = rand < 0.4 ? '#0891b2' : rand < 0.8 ? '#06b6d4' : '#22d3ee';
                  } else {
                    pCol = rand < 0.4 ? '#ef4444' : rand < 0.8 ? '#f97316' : '#fbbf24'; // Red, orange, yellow (fire)
                  }
                }
                particlesRef.current.push({
                  x: other.posX,
                  y: other.posY,
                  vx: (Math.random() - 0.5) * 80,
                  vy: (Math.random() - 0.5) * 80,
                  color: pCol,
                  size: 2 + Math.random() * 1.5,
                  life: 0.4
                });
              }

              if (proj.attackerId) {
                if (!run.heroDamageDealt) {
                  run.heroDamageDealt = {};
                }
                // Attribute AoE splash damage to the summoner if the attacker is a minion
                const splashAttacker = entities.find(e => e.id === proj.attackerId);
                const splashOwnerId = splashAttacker?.summonerId ?? proj.attackerId;
                run.heroDamageDealt[splashOwnerId] = (run.heroDamageDealt[splashOwnerId] || 0) + proj.damage;
                chamberDamageDealtRef.current[splashOwnerId] = (chamberDamageDealtRef.current[splashOwnerId] || 0) + proj.damage;
              }

              if (other.hp <= 0) {
                other.isDead = true;
                setCombatLog(log => [...log, `💀 ${other.name} has fallen to splash damage.`].slice(-40));

                if (other.type === 'boss') {
                  const item = generateRandomItem(run.currentBiome, undefined, true, getOwnedLegendaries());
                  entitiesRef.current.push({
                    id: `loot-${Date.now()}-${Math.random()}`,
                    name: item.name,
                    type: 'item_loot',
                    gridX: other.gridX,
                    gridY: other.gridY,
                    posX: other.posX,
                    posY: other.posY,
                    hp: 1,
                    maxHp: 1,
                    speed: 2,
                    attackRange: 0,
                    attackCooldown: 0,
                    damage: 0,
                    lifeSteal: 0,
                    tempBuffs: [],
                    color: item.rarity === 'Legendary' ? '#ff8000' : item.rarity === 'Epic' ? '#a335ee' : item.rarity === 'Rare' ? '#0070dd' : item.rarity === 'Uncommon' ? '#1eff00' : '#ffffff',
                    isDead: false,
                    lootItem: item,
                    velX: (Math.random() - 0.5) * 10,
                    velY: -5 - Math.random() * 8,
                  });
                }

                if (run.livingSquad[other.id]) {
                  run.livingSquad[other.id].hp = 0;
                  triggerToast(`💀 ${other.name} has fallen!`, 'death');
                }

                if (!heroTypes.has(other.type)) {
                  let goldDropped = 0;
                  if (Math.random() < 0.50) {
                    goldDropped = 4 + Math.round(Math.random() * 8) + run.currentBiome * 2;
                    addRunGold(goldDropped);
                    setCombatLog(log => [...log, `💰 ${other.name} dropped ${goldDropped} Gold!`].slice(-40));
                    floatingTextsRef.current.push({
                      text: `+${goldDropped}g`,
                      x: other.posX - 8,
                      y: other.posY - 12,
                      color: '#facc15',
                      life: 1.2
                    });
                  }
                  const xpDropped = 25 + Math.round(Math.random() * 15) + run.currentBiome * 5;
                  addRunXp(xpDropped);
                  setCombatLog(log => [...log, `✨ Squad gained +${xpDropped} Team XP!`].slice(-40));
                  floatingTextsRef.current.push({
                    text: `+${xpDropped} XP`,
                    x: other.posX + 8,
                    y: other.posY - 12,
                    color: '#c084fc',
                    life: 1.2
                  });
                  if (goldDropped > 0) {
                    triggerToast(`💰 +${goldDropped}g   ✨ +${xpDropped} XP`, 'gold');
                  } else {
                    triggerToast(`✨ +${xpDropped} XP`, 'xp');
                  }
                  handleEnemyDeath(other);
                }
              } else {
                if (run.livingSquad[other.id]) {
                  run.livingSquad[other.id].hp = other.hp;
                }
              }
            }
          });
        }

        // Lifesteal for ranged attackers on projectile impact
        if (proj.attackerId) {
          const shooter = entities.find(e => e.id === proj.attackerId && !e.isDead);
          const vampBladeCountRanged = (run.selectedPowerups ?? []).filter(p => p === 'Vampiric Blade').length;
          const effectiveRangedLifeSteal = (shooter?.lifeSteal ?? 0) + 0.03 * vampBladeCountRanged;
          if (shooter && effectiveRangedLifeSteal > 0) {
            const healAmount = Math.round(proj.damage * effectiveRangedLifeSteal);
            if (healAmount > 0) {
              const oldHp = shooter.hp;
              shooter.hp = Math.min(shooter.hp + healAmount, shooter.maxHp);
              const actualHeal = shooter.hp - oldHp;
              if (actualHeal > 0) {
                if (run.livingSquad[shooter.id]) {
                  run.livingSquad[shooter.id].hp = shooter.hp;
                }
                floatingTextsRef.current.push({
                  text: `+${actualHeal}`,
                  x: shooter.posX,
                  y: shooter.posY - 10,
                  color: '#4ade80',
                  life: 1.0
                });
              }
            }
          }
        }

        // Death handling for projectile-killed targets
        if (target.hp <= 0) {
          target.isDead = true;
          setCombatLog(log => [...log, `💀 ${target.name} has fallen.`].slice(-40));

          if (proj.attackerId) {
            const shooter = entities.find(e => e.id === proj.attackerId && !e.isDead);
            if (shooter && shooter.type === 'rogue') {
              const rushLvl = (run.selectedPowerups ?? []).filter(p => p === 'Adrenaline Rush').length;
              if (rushLvl > 0) {
                shooter.adrenalineTimer = 4.0;
                shooter.adrenalineLevel = rushLvl;
                floatingTextsRef.current.push({
                  text: `Adrenaline Rush!`,
                  x: shooter.posX,
                  y: shooter.posY - 15,
                  color: '#f43f5e',
                  life: 1.0
                });
              }
            }
          }

          if (target.type === 'boss') {
            const item = generateRandomItem(run.currentBiome, undefined, true, getOwnedLegendaries());
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
              color: item.rarity === 'Legendary' ? '#ff8000' : item.rarity === 'Epic' ? '#a335ee' : item.rarity === 'Rare' ? '#0070dd' : item.rarity === 'Uncommon' ? '#1eff00' : '#ffffff',
              isDead: false,
              lootItem: item,
              velX: (Math.random() - 0.5) * 10,
              velY: -5 - Math.random() * 8,
            });
          }

          if (run.livingSquad[target.id]) {
            run.livingSquad[target.id].hp = 0;
            triggerToast(`💀 ${target.name} has fallen!`, 'death');
          }

          // Drops on enemy monster defeat
          if (!heroTypes.has(target.type) && target.type !== 'chest' && target.type !== 'cage' && target.type !== 'portal') {
            let goldDropped = 0;
            if (Math.random() < 0.50) {
              goldDropped = 4 + Math.round(Math.random() * 8) + run.currentBiome * 2;
              addRunGold(goldDropped);
              setCombatLog(log => [...log, `💰 ${target.name} dropped ${goldDropped} Gold!`].slice(-40));
              floatingTextsRef.current.push({
                text: `+${goldDropped}g`,
                x: target.posX - 8,
                y: target.posY - 12,
                color: '#facc15',
                life: 1.2
              });
            }
            const xpDropped = 25 + Math.round(Math.random() * 15) + run.currentBiome * 5;
            addRunXp(xpDropped);
            setCombatLog(log => [...log, `✨ Squad gained +${xpDropped} Team XP!`].slice(-40));
            floatingTextsRef.current.push({
              text: `+${xpDropped} XP`,
              x: target.posX + 8,
              y: target.posY - 12,
              color: '#c084fc',
              life: 1.2
            });
            if (goldDropped > 0) {
              triggerToast(`💰 +${goldDropped}g   ✨ +${xpDropped} XP`, 'gold');
            } else {
              triggerToast(`✨ +${xpDropped} XP`, 'xp');
            }
            handleEnemyDeath(target);
          }
        } else {
          if (run.livingSquad[target.id]) {
            run.livingSquad[target.id].hp = target.hp;
          }
        }

        proj.life = 0;
      } else {
        // Move toward target
        const vx = (tdx / tdist) * proj.speed;
        const vy = (tdy / tdist) * proj.speed;
        // Store trail point before moving
        proj.trail.push({ x: proj.x, y: proj.y });
        if (proj.trail.length > 4) proj.trail.shift();
        proj.x += vx * dt;
        proj.y += vy * dt;
      }
      proj.life -= dt;
    });
    projectilesRef.current = projectilesRef.current.filter(p => p.life > 0);

    // Update slash effects
    slashEffectsRef.current.forEach(s => {
      s.life -= dt * 3.5;
    });
    slashEffectsRef.current = slashEffectsRef.current.filter(s => s.life > 0);

    const heroes = entities.filter(e => !e.isDead && heroTypes.has(e.type));
    const hostiles = entities.filter(e => !e.isDead && !heroTypes.has(e.type));

    // Check if squad is wiped (all playable heroes are dead, regardless of minions)
    const playableHeroes = heroes.filter(e => e.type !== 'skeleton' && e.type !== 'wolf');
    if (playableHeroes.length === 0) {
      setCombatLog(log => [...log, `Expedition wiped. Squad eliminated in Biome ${run.currentBiome}.`]);
      setDeathSequencePhase(1); // kick off animation
      return;
    }

    // Detect boss death — show hero unlock dialogues immediately in-dungeon (only on first kill of each biome boss)
    const boss = entities.find(e => e.type === 'boss');
    if (boss && boss.isDead && !bossDialogueShownRef.current && run.currentChamber === 5) {
      if (run.currentBiome === 1) {
        const wizardAlreadyUnlocked = roster.find(h => h.character_id === 'hero_wizard')?.unlocked;
        if (!wizardAlreadyUnlocked) {
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
      } else if (run.currentBiome === 2) {
        const necromancerAlreadyUnlocked = roster.find(h => h.character_id === 'hero_necromancer')?.unlocked;
        if (!necromancerAlreadyUnlocked) {
          bossDialogueShownRef.current = true;
          setRoster(prev => prev.map(h =>
            h.character_id === 'hero_necromancer' ? { ...h, unlocked: true } : h
          ));
          enqueueDialogue([
            { speaker: "Necromancer", portrait: import.meta.env.BASE_URL + "wizard.png", text: "Death is but a mirror... and you have shattered the frame." },
            { speaker: "Necromancer", portrait: import.meta.env.BASE_URL + "wizard.png", text: "I was basking in the delicious, sweet embrace of the shadows, and you ruined it with your obnoxious heroism." },
            { speaker: "Necromancer", portrait: import.meta.env.BASE_URL + "wizard.png", text: "Very well. If I must walk this pathetic mortal coil a little longer, I shall command the dead to crawl beside us. Do not mistake my compliance for friendship." }
          ]);
          setCombatLog(log => [...log, `✨ The Necromancer has joined your guild!`]);
        }
      } else if (run.currentBiome === 3) {
        const druidAlreadyUnlocked = roster.find(h => h.character_id === 'hero_druid')?.unlocked;
        if (!druidAlreadyUnlocked) {
          bossDialogueShownRef.current = true;
          setRoster(prev => prev.map(h =>
            h.character_id === 'hero_druid' ? { ...h, unlocked: true } : h
          ));
          enqueueDialogue([
            { speaker: "Druid", portrait: import.meta.env.BASE_URL + "druid.png", text: "Whoa, dudes... that was some seriously bad vibe you just cleared out. The soil is, like, totally breathing again." },
            { speaker: "Druid", portrait: import.meta.env.BASE_URL + "druid.png", text: "I was just meditating in the roots, feeling the cosmic alignment of the moss, you know? But then that boss was blocking my third eye." },
            { speaker: "Druid", portrait: import.meta.env.BASE_URL + "druid.png", text: "Let's spread some peace, love, and giant angry oak trees. I'm down to roll with your squad, man. Groovy." }
          ]);
          setCombatLog(log => [...log, `✨ The Druid has joined your guild!`]);
        }
      } else if (run.currentBiome === 4) {
        const paladinAlreadyUnlocked = roster.find(h => h.character_id === 'hero_paladin')?.unlocked;
        if (!paladinAlreadyUnlocked) {
          bossDialogueShownRef.current = true;
          setRoster(prev => prev.map(h =>
            h.character_id === 'hero_paladin' ? { ...h, unlocked: true } : h
          ));
          enqueueDialogue([
            { speaker: "Paladin", portrait: import.meta.env.BASE_URL + "warrior.png", text: "Naturally, you succeeded. But let us be honest—my divine presence and spectacular hair were the true catalysts of this victory." },
            { speaker: "Paladin", portrait: import.meta.env.BASE_URL + "warrior.png", text: "I allow you to gaze upon my radiant shield. Marvelous, isn't it? Truly, the gods outdid themselves when they sculpted me." },
            { speaker: "Paladin", portrait: import.meta.env.BASE_URL + "warrior.png", text: "I suppose I can grace your little guild with my peerless majesty. Try not to embarrass yourselves in front of my adoring fans." }
          ]);
          setCombatLog(log => [...log, `✨ The Paladin has joined your guild!`]);
        }
      } else if (run.currentBiome === 5) {
        const rogueAlreadyUnlocked = roster.find(h => h.character_id === 'hero_rogue')?.unlocked;
        if (!rogueAlreadyUnlocked) {
          bossDialogueShownRef.current = true;
          setRoster(prev => prev.map(h =>
            h.character_id === 'hero_rogue' ? { ...h, unlocked: true } : h
          ));
          enqueueDialogue([
            { speaker: "Rogue", portrait: import.meta.env.BASE_URL + "rogue.png", text: "Psst... hey. You looking for a deal? Keep it down, the walls have ears. And teeth." },
            { speaker: "Rogue", portrait: import.meta.env.BASE_URL + "rogue.png", text: "I was just... uh... inspectin' the structural integrity of this boss's pockets. Purely educational, I swear." },
            { speaker: "Rogue", portrait: import.meta.env.BASE_URL + "rogue.png", text: "Look, I need to disappear for a bit, and your guild looks like the perfect hiding spot. I won't steal from you. Much. Deal?" }
          ]);
          setCombatLog(log => [...log, `✨ The Rogue has joined your guild!`]);
        }
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

      // Decrement petrification and frozen tomb timers
      if (ent.petrifiedTimer && ent.petrifiedTimer > 0) {
        ent.petrifiedTimer = Math.max(0, ent.petrifiedTimer - dt);
        if (ent.petrifiedTimer <= 0) {
          ent.tempBuffs = ent.tempBuffs.filter(b => b !== 'petrified');
        }
        continue;
      }
      if (ent.frozenTombTimer && ent.frozenTombTimer > 0) {
        ent.frozenTombTimer = Math.max(0, ent.frozenTombTimer - dt);
        if (ent.frozenTombTimer <= 0) {
          ent.tempBuffs = ent.tempBuffs.filter(b => b !== 'frozen');
        }
        continue;
      }
      if (ent.stunTimer && ent.stunTimer > 0) {
        ent.stunTimer = Math.max(0, ent.stunTimer - dt);
        continue;
      }

      // Freeze all hero-related friendly entities during time stop
      const isHeroOrFriendly = heroTypes.has(ent.type);
      if (timeStopTimerRef.current > 0 && isHeroOrFriendly) {
        continue;
      }

      // passive heal over time for warrior:
      if (ent.type === 'warrior') {
        const secondWindCount = (run.selectedPowerups ?? []).filter(p => p === 'Second Wind').length;
        if (secondWindCount > 0) {
          if (ent.healTimer === undefined) {
            ent.healTimer = 0;
          }
          ent.healTimer += dt;
          if (ent.healTimer >= 1.0) {
            ent.healTimer -= 1.0;
            // 2% max HP per stack
            const healPerSec = Math.round(ent.maxHp * 0.02 * secondWindCount);
            const maxSecondWindHp = Math.round(ent.maxHp * 0.5);
            if (healPerSec > 0 && ent.hp < maxSecondWindHp) {
              const oldHp = ent.hp;
              ent.hp = Math.min(maxSecondWindHp, ent.hp + healPerSec);
              const actualHeal = ent.hp - oldHp;
              if (actualHeal > 0) {
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
        }
      }

      // Charge: Warrior-only dash ability
      if (ent.type === 'warrior') {
        const chargeCount = (run.selectedPowerups ?? []).filter(p => p === 'Charge').length;
        if (chargeCount > 0) {
          if (ent.chargeTimer === undefined) ent.chargeTimer = 0;
          ent.chargeTimer -= dt;

          if (ent.chargeTimer <= 0) {
            // Check: no enemies within melee range (1.2 tiles)
            const meleeRangeTiles = 1.2;
            let enemyInMelee = false;
            for (const e of hostiles) {
              if (e.isDead) continue;
              if (e.type === 'chest' || e.type === 'cage' || e.type === 'portal' || e.type === 'item_loot') continue;
              const mdx = e.posX - ent.posX;
              const mdy = e.posY - ent.posY;
              const mDist = Math.sqrt(mdx * mdx + mdy * mdy) / tileSize;
              if (mDist < meleeRangeTiles) {
                enemyInMelee = true;
                break;
              }
            }

            if (!enemyInMelee) {
              // Find nearest enemy in LoS within 10 tiles
              let bestTarget: SimulatedEntity | null = null;
              let bestDist = 9999;
              for (const e of hostiles) {
                if (e.isDead) continue;
                if (e.type === 'chest' || e.type === 'cage' || e.type === 'portal' || e.type === 'item_loot') continue;
                const cdx = e.posX - ent.posX;
                const cdy = e.posY - ent.posY;
                const cDist = Math.sqrt(cdx * cdx + cdy * cdy) / tileSize;
                if (cDist > 10 || cDist < 1.5) continue;

                // Simple LoS raycast: step from warrior to target, check for walls
                const steps = Math.ceil(cDist * 2);
                let blocked = false;
                for (let s = 1; s < steps; s++) {
                  const t = s / steps;
                  const rx = Math.floor((ent.gridX + (e.gridX - ent.gridX) * t));
                  const ry = Math.floor((ent.gridY + (e.gridY - ent.gridY) * t));
                  if (grid[ry]?.[rx] === 1) {
                    blocked = true;
                    break;
                  }
                }
                if (!blocked && cDist < bestDist) {
                  bestDist = cDist;
                  bestTarget = e;
                }
              }

              if (bestTarget) {
                // Charge: begin dash toward target
                const angle = Math.atan2(bestTarget.posY - ent.posY, bestTarget.posX - ent.posX);
                const chargeDist = 1.0 * tileSize;

                // Try multiple distances to find a valid (open) destination
                let finalDestPx = ent.posX;
                let finalDestPy = ent.posY;
                for (const distMult of [1.0, 1.2, 1.5, 2.0]) {
                  const tryPx = bestTarget.posX - Math.cos(angle) * chargeDist * distMult;
                  const tryPy = bestTarget.posY - Math.sin(angle) * chargeDist * distMult;
                  const tryGX = Math.floor(tryPx / tileSize);
                  const tryGY = Math.floor(tryPy / tileSize);
                  if (grid[tryGY]?.[tryGX] === 0) {
                    finalDestPx = tryPx;
                    finalDestPy = tryPy;
                    break;
                  }
                }

                // Also ensure start position is valid
                const startGX = Math.floor(ent.posX / tileSize);
                const startGY = Math.floor(ent.posY / tileSize);
                if (grid[startGY]?.[startGX] !== 0) {
                  // Snap to nearest open tile before charging
                  for (const [dx, dy] of [[0,0],[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]) {
                    const nx = startGX + dx;
                    const ny = startGY + dy;
                    if (grid[ny]?.[nx] === 0) {
                      ent.posX = nx * tileSize + tileSize / 2;
                      ent.posY = ny * tileSize + tileSize / 2;
                      ent.gridX = nx;
                      ent.gridY = ny;
                      break;
                    }
                  }
                }

                ent.charging = true;
                ent.chargeStartX = ent.posX;
                ent.chargeStartY = ent.posY;
                ent.chargeEndX = finalDestPx;
                ent.chargeEndY = finalDestPy;
                ent.chargeProgress = 0;
                ent.chargeTargetId = bestTarget.id;
                ent.chargeDamage = Math.round(ent.damage * 1.5);

                // Reset cooldown: 20 - (chargeCount - 1) * 2, min 5s
                ent.chargeTimer = Math.max(5, 20 - (chargeCount - 1) * 2);

                setCombatLog(log => [...log, `⚡ Warrior charges ${bestTarget.name}!`].slice(-40));
              }
            }
          }
        }
      }

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
          if (h.isStealthed) continue;
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

          // Alert other sentries in a 4-tile radius or the same group/swarm
          entities.forEach(other => {
            if (other.id !== ent.id && (other.type === 'enemy' || other.type === 'elite' || other.type === 'archer') && !other.aggroed) {
              const odx = other.gridX - ent.gridX;
              const ody = other.gridY - ent.gridY;
              const isSameSwarm = ent.id.startsWith('enemy-') && other.id.startsWith('enemy-') && ent.id.split('-')[1] === other.id.split('-')[1];
              if (isSameSwarm || (odx*odx + ody*ody <= 16)) {
                other.aggroed = true;
                floatingTextsRef.current.push({
                  text: isSameSwarm ? 'Swarm!' : 'Alerted!',
                  x: other.posX,
                  y: other.posY - 10,
                  color: isSameSwarm ? '#a3e635' : '#f87171',
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

      // Necromancer Corpse Explosion / Skeletal Detonation cooldown decrement
      if (ent.type === 'necromancer' && ent.necroExplosionCooldown && ent.necroExplosionCooldown > 0) {
        ent.necroExplosionCooldown -= dt;
      }

      // Skeletal Detonation implementation
      if (ent.type === 'necromancer' && !ent.isDead) {
        const detLevel = (run.selectedPowerups ?? []).filter(p => p === 'Skeletal Detonation').length;
        if (detLevel > 0) {
          if (!ent.necroExplosionCooldown || ent.necroExplosionCooldown <= 0) {
            const minions = entitiesRef.current.filter(m => m.type === 'skeleton' && m.isNecroMinion && !m.isDead);
            const meleeRange = 1.2 * tileSize;
            const hostilesList = entitiesRef.current.filter(h => 
              !h.isDead && 
              h.type !== 'chest' && 
              h.type !== 'cage' && 
              h.type !== 'portal' && 
              h.type !== 'item_loot' &&
              (h.type === 'enemy' || h.type === 'elite' || h.type === 'boss' || h.type === 'archer')
            );

            let minionToExplode: SimulatedEntity | null = null;
            for (const minion of minions) {
              const inMelee = hostilesList.some(h => Math.hypot(h.posX - minion.posX, h.posY - minion.posY) < meleeRange);
              if (inMelee) {
                minionToExplode = minion;
                break;
              }
            }

            if (minionToExplode) {
              const cooldown = Math.max(10, 20 - 2 * (detLevel - 1));
              ent.necroExplosionCooldown = cooldown;
              minionToExplode.isDead = true;

              const blastDmg = 50 + 50 * (detLevel - 1);
              const blastRadius = 2.0 * tileSize;

              floatingTextsRef.current.push({
                text: `Skeletal Detonation!`,
                x: minionToExplode.posX,
                y: minionToExplode.posY - 15,
                color: '#dc2626',
                life: 1.2
              });

              const numParticles = 24;
              for (let k = 0; k < numParticles; k++) {
                const angle = (k / numParticles) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
                const speed = 70 + Math.random() * 90;
                const rand = Math.random();
                const pCol = rand < 0.3 ? '#7f1d1d' : rand < 0.6 ? '#dc2626' : '#1e293b'; 
                particlesRef.current.push({
                  x: minionToExplode.posX,
                  y: minionToExplode.posY,
                  vx: Math.cos(angle) * speed,
                  vy: Math.sin(angle) * speed,
                  color: pCol,
                  size: 3 + Math.random() * 4,
                  life: 0.5 + Math.random() * 0.3
                });
              }

              visualEffectsRef.current.push({
                type: 'nova',
                x1: minionToExplode.posX,
                y1: minionToExplode.posY,
                color: '#dc2626',
                size: blastRadius,
                life: 0.3,
                maxLife: 0.3
              });

              hostilesList.forEach(h => {
                const dist = Math.hypot(h.posX - minionToExplode!.posX, h.posY - minionToExplode!.posY);
                if (dist <= blastRadius) {
                  h.hp = Math.max(0, h.hp - blastDmg);
                  if (!run.heroDamageDealt) run.heroDamageDealt = {};
                  run.heroDamageDealt[ent.id] = (run.heroDamageDealt[ent.id] || 0) + blastDmg;
                  chamberDamageDealtRef.current[ent.id] = (chamberDamageDealtRef.current[ent.id] || 0) + blastDmg;

                  floatingTextsRef.current.push({
                    text: `-${blastDmg}`,
                    x: h.posX,
                    y: h.posY - 10,
                    color: '#dc2626',
                    life: 1.0
                  });

                  if (h.hp <= 0) {
                    h.isDead = true;
                    setCombatLog(log => [...log, `💀 ${h.name} died in Skeletal Detonation.`].slice(-40));
                    handleEnemyDeath(h);
                  }
                }
              });
            }
          }
        }
      }

      // Druid Wolf Pack summoning
      if (ent.type === 'druid' && !ent.isDead) {
        const wolfPackLvl = (run.selectedPowerups ?? []).filter(p => p === 'Wolf Pack').length;
        if (wolfPackLvl > 0) {
          if (ent.druidWolfCooldown === undefined) ent.druidWolfCooldown = 0;
          if (ent.druidWolfCooldown > 0) {
            ent.druidWolfCooldown -= dt;
          }

          if (ent.druidWolfCooldown <= 0) {
            const maxWolves = wolfPackLvl * 2;
            const activeWolves = entitiesRef.current.filter(w => w.type === 'wolf' && !w.isDead && w.summonerId === ent.id).length;
            if (activeWolves < maxWolves) {
              const toSummon = maxWolves - activeWolves;
              const teamLevel = run.teamLevel || 1;
              for (let i = 0; i < toSummon; i++) {
                const wolfId = `druid-wolf-${Date.now()}-${Math.random()}`;
                const wolf: SimulatedEntity = {
                  id: wolfId,
                  name: 'Dire Wolf',
                  type: 'wolf',
                  gridX: ent.gridX,
                  gridY: ent.gridY,
                  posX: ent.posX + (Math.random() - 0.5) * 15,
                  posY: ent.posY + (Math.random() - 0.5) * 15,
                  hp: 25 + 6 * teamLevel,
                  maxHp: 25 + 6 * teamLevel,
                  speed: 1.8,
                  attackRange: 1.2,
                  attackCooldown: 0,
                  damage: 7 + 1.2 * teamLevel,
                  lifeSteal: 0,
                  tempBuffs: [],
                  color: '#b5a642',
                  isDead: false,
                  summonerId: ent.id
                };
                entitiesRef.current.push(wolf);

                for (let k = 0; k < 8; k++) {
                  particlesRef.current.push({
                    x: ent.posX,
                    y: ent.posY,
                    vx: (Math.random() - 0.5) * 50,
                    vy: -20 - Math.random() * 30,
                    color: '#b5a642',
                    size: 2 + Math.random() * 2,
                    life: 0.5
                  });
                }
              }

              floatingTextsRef.current.push({
                text: `Wolf Pack!`,
                x: ent.posX,
                y: ent.posY - 15,
                color: '#b5a642',
                life: 1.2
              });

              setCombatLog(log => [...log, `🐺 Druid summoned ${toSummon} wolves!`].slice(-40));
              ent.druidWolfCooldown = 60; // 1 minute cooldown
            }
          }
        }
      }

      // Druid smart shapeshifting — context-aware form selection
      // Bear: when enemies are actively targeting or close to the druid (tank mode)
      // Werewolf: when safe and party lacks melee DPS (warrior / rogue)
      // Owl: when safe and melee is covered (fill ranged / magic role)
      if (ent.type === 'druid' && !ent.isDead) {
        if (ent.druidForm === undefined) {
          ent.druidForm = 'bear';
          ent.druidFormTimer = 3.0; // Minimum hold time before first evaluation
        }

        // Tick down the minimum-hold timer (prevents rapid flickering)
        ent.druidFormTimer = (ent.druidFormTimer ?? 3.0) - dt;

        if (ent.druidFormTimer <= 0) {
          // --- Threat evaluation ---
          // The druid is "under threat" if any aggroed hostile is within 3.5 tiles of it
          // OR if the druid is the nearest hero to any aggroed hostile (i.e., it's their target)
          const THREAT_RANGE_TILES = 3.5;
          let underThreat = false;
          for (const hostile of hostiles) {
            if (hostile.isDead) continue;
            if (hostile.type === 'chest' || hostile.type === 'cage' || hostile.type === 'portal' || hostile.type === 'item_loot') continue;
            if (!hostile.aggroed) continue;

            const hdx = hostile.posX - ent.posX;
            const hdy = hostile.posY - ent.posY;
            const hDistTiles = Math.sqrt(hdx * hdx + hdy * hdy) / tileSize;

            // Close enough to be a direct threat?
            if (hDistTiles <= THREAT_RANGE_TILES) {
              underThreat = true;
              break;
            }

            // Is the druid the nearest hero to this hostile? (enemy would naturally target it)
            let druidIsNearest = true;
            for (const hero of heroes) {
              if (hero.id === ent.id) continue;
              const odx = hostile.posX - hero.posX;
              const ody = hostile.posY - hero.posY;
              if (Math.sqrt(odx * odx + ody * ody) < Math.sqrt(hdx * hdx + hdy * hdy)) {
                druidIsNearest = false;
                break;
              }
            }
            if (druidIsNearest && hDistTiles <= 6.0) {
              underThreat = true;
              break;
            }
          }

          // --- Group composition evaluation (for safe-state form) ---
          // Melee DPS = warrior or rogue in the living squad (excluding druid itself)
          const hasMeleeDPS = heroes.some(h => h.id !== ent.id && (h.type === 'warrior' || h.type === 'rogue'));

          // --- Pick desired form ---
          let desiredForm: 'bear' | 'werewolf' | 'owl';
          const hasTank = heroes.some(h => h.id !== ent.id && (h.type === 'warrior' || h.type === 'paladin'));
          const inCombat = hostiles.some(h => h.aggroed && h.type !== 'chest' && h.type !== 'cage' && h.type !== 'portal');

          if (!hasTank && inCombat) {
            desiredForm = 'bear';
          } else if (underThreat) {
            desiredForm = 'bear';
          } else if (!hasMeleeDPS) {
            desiredForm = 'werewolf'; // Fill missing melee role
          } else {
            desiredForm = 'owl'; // Melee covered — contribute as ranged/magic
          }

          // Only shapeshift if the desired form differs from current
          if (desiredForm !== ent.druidForm) {
            const prevForm = ent.druidForm;
            const nextForm = desiredForm;
            ent.druidForm = nextForm;
            ent.color = nextForm === 'bear' ? '#8b4513' : nextForm === 'werewolf' ? '#ef4444' : '#06b6d4';

            // Set attack range dynamically based on form
            ent.attackRange = nextForm === 'owl' ? 3.2 : 1.2;

            // --- Bear form max HP scaling ---
            // Entering bear: save natural maxHp, scale dynamically (factor of 2.0 + Ursine Fortitude)
            if (nextForm === 'bear') {
              const pct = ent.hp / ent.maxHp;
              ent.druidBaseMaxHp = ent.maxHp;
              const ursineCount = (run.selectedPowerups ?? []).filter(p => p === 'Ursine Fortitude').length;
              const bearMaxHp = Math.round(ent.maxHp * 2.0 * (1 + 0.20 * ursineCount));
              ent.maxHp = bearMaxHp;
              ent.hp = Math.round(pct * bearMaxHp);
              if (ent.hp <= 0 && pct > 0) ent.hp = 1;
              if (run.livingSquad[ent.id]) {
                run.livingSquad[ent.id].maxHp = bearMaxHp;
                run.livingSquad[ent.id].hp = ent.hp;
              }
            }
            // Leaving bear: restore saved maxHp, scale current HP by percentage
            if (prevForm === 'bear' && ent.druidBaseMaxHp !== undefined) {
              const restored = ent.druidBaseMaxHp;
              const pct = ent.hp / ent.maxHp;
              ent.maxHp = restored;
              ent.hp = Math.round(pct * restored);
              if (ent.hp <= 0 && pct > 0) ent.hp = 1;
              if (run.livingSquad[ent.id]) {
                run.livingSquad[ent.id].maxHp = restored;
                run.livingSquad[ent.id].hp = ent.hp;
              }
              ent.druidBaseMaxHp = undefined;
            }

            // Quick Shift powerup: heals 5% max HP per level on shifting
            const quickShiftCount = (run.selectedPowerups ?? []).filter(p => p === 'Quick Shift').length;
            if (quickShiftCount > 0) {
              const heal = Math.round(ent.maxHp * 0.05 * quickShiftCount);
              ent.hp = Math.min(ent.maxHp, ent.hp + heal);
              if (run.livingSquad[ent.id]) {
                run.livingSquad[ent.id].hp = ent.hp;
              }
              floatingTextsRef.current.push({
                text: `+${heal} (Shift)`,
                x: ent.posX,
                y: ent.posY - 12,
                color: '#22c55e',
                life: 1.0
              });
            }

            const formLabel = nextForm === 'bear' ? '🐻 BEAR (Tank)' : nextForm === 'werewolf' ? '🐺 WOLF (Melee)' : '🦉 OWL (Ranged)';
            setCombatLog(log => [...log, `🌿 Druid shifted to ${formLabel}!`].slice(-40));

            // Burst particles on shapeshifting
            for (let k = 0; k < 12; k++) {
              particlesRef.current.push({
                x: ent.posX,
                y: ent.posY,
                vx: (Math.random() - 0.5) * 80,
                vy: (Math.random() - 0.5) * 80,
                color: nextForm === 'bear' ? '#8b4513' : nextForm === 'werewolf' ? '#ef4444' : '#06b6d4',
                size: 2.5 + Math.random() * 2.5,
                life: 0.5
              });
            }
          }

          // Minimum hold time before re-evaluating: base 3.0s, reduced by Quick Shift
          const quickShiftCount = (run.selectedPowerups ?? []).filter(p => p === 'Quick Shift').length;
          const holdDuration = 3.0 * Math.pow(0.75, quickShiftCount);
          ent.druidFormTimer = holdDuration;
        }
      }

      // Rogue Vanish Passive & Stealth Regeneration Ticks
      if (ent.type === 'rogue' && !ent.isDead) {
        // Vanish threshold passive (below 50% HP)
        if (ent.hp > 0 && ent.hp <= ent.maxHp * 0.50 && !ent.hasVanishedThisChamber) {
          ent.isStealthed = true;
          ent.hasVanishedThisChamber = true;
          ent.stealthTimer = 6.0;
          ent.vanishLockTimer = 2.0;

          floatingTextsRef.current.push({
            text: `Vanished!`,
            x: ent.posX,
            y: ent.posY - 16,
            color: '#c084fc',
            life: 1.5
          });

          // Puff of smoke particles
          for (let k = 0; k < 12; k++) {
            particlesRef.current.push({
              x: ent.posX,
              y: ent.posY,
              vx: (Math.random() - 0.5) * 60,
              vy: (Math.random() - 0.5) * 60,
              color: '#334155',
              size: 2.0 + Math.random() * 3.0,
              life: 0.6
            });
          }
        }

        if (ent.vanishLockTimer !== undefined && ent.vanishLockTimer > 0) {
          ent.vanishLockTimer -= dt;
        }

        // Stealth regen if out of combat / not attacking/damaged
        if (!ent.isStealthed) {
          if (ent.stealthTimer !== undefined && ent.stealthTimer > 0) {
            ent.stealthTimer -= dt;
          } else {
            ent.isStealthed = true;
            floatingTextsRef.current.push({
              text: `Stealthed`,
              x: ent.posX,
              y: ent.posY - 12,
              color: '#94a3b8',
              life: 1.0
            });
          }
        }

        // Decrement buff timers
        if (ent.adrenalineTimer !== undefined && ent.adrenalineTimer > 0) {
          ent.adrenalineTimer -= dt;
        }
      }

      // Charge dash: interpolate position toward destination
      if (ent.charging && ent.chargeProgress !== undefined) {
        ent.chargeProgress = Math.min(1, ent.chargeProgress + dt * 4.0);
        const t = ent.chargeProgress;
        ent.posX = ent.chargeStartX! + (ent.chargeEndX! - ent.chargeStartX!) * t;
        ent.posY = ent.chargeStartY! + (ent.chargeEndY! - ent.chargeStartY!) * t;
        ent.gridX = Math.floor(ent.posX / tileSize);
        ent.gridY = Math.floor(ent.posY / tileSize);

        if (ent.chargeProgress >= 1) {
          ent.charging = false;

          // Safety net: snap to nearest open tile if stuck in a wall
          const finalGX = Math.floor(ent.posX / tileSize);
          const finalGY = Math.floor(ent.posY / tileSize);
          if (grid[finalGY]?.[finalGX] !== 0) {
            for (const [dx, dy] of [[0,0],[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]) {
              const nx = finalGX + dx;
              const ny = finalGY + dy;
              if (grid[ny]?.[nx] === 0) {
                ent.posX = nx * tileSize + tileSize / 2;
                ent.posY = ny * tileSize + tileSize / 2;
                ent.gridX = nx;
                ent.gridY = ny;
                break;
              }
            }
          }
          const target = entities.find(e => e.id === ent.chargeTargetId && !e.isDead);
          if (target) {
            const chargeDmg = ent.chargeDamage ?? 0;
            target.hp = Math.max(target.hp - chargeDmg, 0);

            floatingTextsRef.current.push({
              text: `CHARGE! -${chargeDmg}`,
              x: target.posX,
              y: target.posY - 12,
              color: '#fbbf24',
              life: 1.5
            });

            const slashAngle = Math.atan2(target.posY - ent.posY, target.posX - ent.posX);
            slashEffectsRef.current.push({
              x: ent.posX,
              y: ent.posY,
              angle: slashAngle,
              color: '#0070dd',
              life: 1.0,
              radius: 48
            });

            for (let k = 0; k < 8; k++) {
              particlesRef.current.push({
                x: target.posX,
                y: target.posY,
                vx: (Math.random() - 0.5) * 100,
                vy: (Math.random() - 0.5) * 100,
                color: '#fbbf24',
                size: 2 + Math.random() * 2,
                life: 0.5
              });
            }

            if (!run.heroDamageDealt) run.heroDamageDealt = {};
            run.heroDamageDealt[ent.id] = (run.heroDamageDealt[ent.id] || 0) + chargeDmg;
            chamberDamageDealtRef.current[ent.id] = (chamberDamageDealtRef.current[ent.id] || 0) + chargeDmg;

            if (target.hp <= 0) {
              target.isDead = true;
              setCombatLog(log => [...log, `💀 ${target.name} has fallen to Charge.`].slice(-40));
              if (run.livingSquad[target.id]) {
                run.livingSquad[target.id].hp = 0;
                triggerToast(`💀 ${target.name} has fallen!`, 'death');
              }
              if (!heroTypes.has(target.type)) {
                const xpDropped = 25 + Math.round(Math.random() * 15) + run.currentBiome * 5;
                addRunXp(xpDropped);
                floatingTextsRef.current.push({
                  text: `+${xpDropped} XP`,
                  x: target.posX + 8,
                  y: target.posY - 12,
                  color: '#c084fc',
                  life: 1.2
                });
              }
            } else {
              if (run.livingSquad[target.id]) {
                run.livingSquad[target.id].hp = target.hp;
              }
            }
          }
          ent.chargeTargetId = undefined;
          ent.chargeDamage = undefined;
        }
        continue;
      }

      // Boss mechanics update
      if (ent.type === 'boss') {
        if (ent.bossSkillCooldown === undefined) ent.bossSkillCooldown = 3.0; // Initial delay
        if (ent.bossState === undefined) ent.bossState = 'idle';

        // Update skill cooldown
        if (ent.bossState === 'idle' && ent.bossSkillCooldown > 0) {
          ent.bossSkillCooldown -= dt;
        }

        // Find targets
        const livingHeroes = heroes.filter(h => !h.isDead && !h.isStealthed);
        const randomHero = livingHeroes[Math.floor(Math.random() * livingHeroes.length)];

        // Choose and initiate a skill!
        if (ent.bossState === 'idle' && ent.bossSkillCooldown <= 0 && randomHero) {
          const skills: ('firebreath' | 'earthquake' | 'timestop' | 'stonegaze' | 'summon' | 'vortex' | 'icetomb' | 'meteor' | 'lightning' | 'shadowclone')[] = [
            'firebreath', 'earthquake', 'timestop', 'stonegaze', 'summon', 'vortex', 'icetomb', 'meteor', 'lightning', 'shadowclone'
          ];
          const chosen = skills[Math.floor(Math.random() * skills.length)];
          ent.bossCurrentSkill = chosen;
          ent.bossState = 'telegraphing';

          if (chosen === 'firebreath' || chosen === 'stonegaze') {
            ent.bossCastTimer = 1.0; // 1s telegraph
            ent.bossSkillAngle = Math.atan2(randomHero.posY - ent.posY, randomHero.posX - ent.posX);
          } else if (chosen === 'earthquake') {
            ent.bossCastTimer = 1.2;
            ent.bossEarthquakeZones = livingHeroes.map(h => ({
              x: h.posX + (Math.random() - 0.5) * 15,
              y: h.posY + (Math.random() - 0.5) * 15,
              radius: 1.5 * tileSize
            }));
          } else if (chosen === 'timestop') {
            ent.bossCastTimer = 0.8;
          } else if (chosen === 'summon') {
            ent.bossCastTimer = 0.8;
          } else if (chosen === 'vortex') {
            ent.bossCastTimer = 1.0;
            // Target the middle of the squad
            const avgX = livingHeroes.reduce((sum, h) => sum + h.posX, 0) / livingHeroes.length;
            const avgY = livingHeroes.reduce((sum, h) => sum + h.posY, 0) / livingHeroes.length;
            ent.bossSkillTargetX = avgX;
            ent.bossSkillTargetY = avgY;
          } else if (chosen === 'icetomb') {
            ent.bossCastTimer = 1.0;
            ent.bossSkillTargetX = randomHero.posX;
            ent.bossSkillTargetY = randomHero.posY;
            ent.currentTargetId = randomHero.id;
          } else if (chosen === 'meteor') {
            ent.bossCastTimer = 1.4;
            ent.bossMeteorZones = livingHeroes.slice(0, 3).map((h, i) => ({
              x: h.posX,
              y: h.posY,
              radius: 1.8 * tileSize,
              delay: i * 0.3
            }));
          } else if (chosen === 'lightning') {
            ent.bossCastTimer = 0.8;
          } else if (chosen === 'shadowclone') {
            ent.bossCastTimer = 0.8;
          }
        }

        // Handle Telegraph Phase
        if (ent.bossState === 'telegraphing') {
          ent.bossCastTimer = (ent.bossCastTimer ?? 0) - dt;

          if ((ent.bossCurrentSkill === 'firebreath' || ent.bossCurrentSkill === 'stonegaze') && randomHero) {
            ent.bossSkillAngle = Math.atan2(randomHero.posY - ent.posY, randomHero.posX - ent.posX);
          }

          if (ent.bossCastTimer <= 0) {
            const skill = ent.bossCurrentSkill;
            ent.bossCastTimer = 0;

            if (skill === 'firebreath') {
              ent.bossState = 'casting';
              ent.bossCastTimer = 1.5; // channel breath for 1.5s
              setCombatLog(log => [...log, `🔥 Gorgon Overlord breathes fire!`].slice(-40));
            } else if (skill === 'stonegaze') {
              ent.bossState = 'idle';
              ent.bossSkillCooldown = 6.0;
              setCombatLog(log => [...log, `👁️ Gorgon Overlord uses Stone Gaze!`].slice(-40));

              const angle = ent.bossSkillAngle ?? 0;
              const range = 5.0 * tileSize;
              const coneHalfAngle = Math.PI / 6;

              livingHeroes.forEach(h => {
                const dx = h.posX - ent.posX;
                const dy = h.posY - ent.posY;
                const dist = Math.hypot(dx, dy);
                if (dist <= range) {
                  const hAngle = Math.atan2(dy, dx);
                  let angleDiff = Math.abs(hAngle - angle);
                  if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;
                  if (angleDiff <= coneHalfAngle) {
                    h.tempBuffs.push('petrified');
                    h.petrifiedTimer = 3.0;
                    floatingTextsRef.current.push({
                      text: `🗿 Petrified!`,
                      x: h.posX,
                      y: h.posY - 12,
                      color: '#94a3b8',
                      life: 1.5
                    });
                  }
                }
              });
            } else if (skill === 'earthquake') {
              ent.bossState = 'idle';
              ent.bossSkillCooldown = 5.0;
              setCombatLog(log => [...log, `🪨 Earthquake shakes the ground!`].slice(-40));
              const zones = ent.bossEarthquakeZones ?? [];
              zones.forEach(zone => {
                livingHeroes.forEach(h => {
                  if (Math.hypot(h.posX - zone.x, h.posY - zone.y) <= zone.radius) {
                    const dmg = Math.round(ent.damage * 1.5);
                    h.hp = Math.max(0, h.hp - dmg);
                    if (run.livingSquad[h.id]) run.livingSquad[h.id].hp = h.hp;
                    floatingTextsRef.current.push({
                      text: `-${dmg} (Earthquake)`,
                      x: h.posX,
                      y: h.posY - 10,
                      color: '#fbbf24',
                      life: 1.2
                    });
                  }
                });

                // Particles
                for (let i = 0; i < 15; i++) {
                  const pAngle = Math.random() * Math.PI * 2;
                  const speed = 40 + Math.random() * 60;
                  particlesRef.current.push({
                    x: zone.x + (Math.random() - 0.5) * zone.radius,
                    y: zone.y + (Math.random() - 0.5) * zone.radius,
                    vx: Math.cos(pAngle) * speed,
                    vy: Math.sin(pAngle) * speed,
                    color: '#78716c',
                    size: 3 + Math.random() * 3,
                    life: 0.6 + Math.random() * 0.4
                  });
                }
              });
            } else if (skill === 'timestop') {
              ent.bossState = 'idle';
              ent.bossSkillCooldown = 8.0;
              timeStopTimerRef.current = 2.5;
              setCombatLog(log => [...log, `⏱️ Gorgon Overlord SHATTERS time!`].slice(-40));
              triggerToast('⏱️ TIME STOP ACTIVATED!', 'alert');
            } else if (skill === 'summon') {
              ent.bossState = 'idle';
              ent.bossSkillCooldown = 6.0;
              setCombatLog(log => [...log, `💀 Gorgon Overlord summons stone helpers!`].slice(-40));

              for (let i = 0; i < 3; i++) {
                const pAngle = (i / 3) * Math.PI * 2;
                const dist = 1.5 * tileSize;
                const sx = ent.posX + Math.cos(pAngle) * dist;
                const sy = ent.posY + Math.sin(pAngle) * dist;
                const sgx = Math.floor(sx / tileSize);
                const sgy = Math.floor(sy / tileSize);

                if (grid[sgy]?.[sgx] === 0) {
                  entitiesRef.current.push({
                    id: `boss-minion-${Date.now()}-${i}`,
                    name: 'Stone Cultist',
                    type: 'enemy',
                    gridX: sgx,
                    gridY: sgy,
                    posX: sx,
                    posY: sy,
                    hp: Math.round(60 * Math.pow(1.3, run.currentBiome)),
                    maxHp: Math.round(60 * Math.pow(1.3, run.currentBiome)),
                    speed: 1.2,
                    attackRange: 1.2,
                    attackCooldown: 1.0,
                    damage: Math.round(10 * Math.pow(1.2, run.currentBiome)),
                    lifeSteal: 0,
                    tempBuffs: [],
                    color: '#78716c',
                    isDead: false,
                    aggroed: true
                  });
                }
              }
            } else if (skill === 'vortex') {
              ent.bossState = 'casting';
              ent.bossCastTimer = 2.0; // Channel vortex pull for 2s
              setCombatLog(log => [...log, `🌀 Gorgon Overlord creates a gravity well!`].slice(-40));
            } else if (skill === 'icetomb') {
              ent.bossState = 'idle';
              ent.bossSkillCooldown = 6.0;
              const targetHero = entities.find(h => h.id === ent.currentTargetId && !h.isDead);
              if (targetHero) {
                targetHero.tempBuffs.push('frozen');
                targetHero.frozenTombTimer = 3.0;
                setCombatLog(log => [...log, `❄️ ${targetHero.name} is encased in an Ice Tomb!`].slice(-40));
                floatingTextsRef.current.push({
                  text: `❄️ Ice Tomb!`,
                  x: targetHero.posX,
                  y: targetHero.posY - 12,
                  color: '#38bdf8',
                  life: 1.5
                });
              }
            } else if (skill === 'meteor') {
              ent.bossState = 'idle';
              ent.bossSkillCooldown = 7.0;
              setCombatLog(log => [...log, `☄️ Gorgon Overlord summons a Meteor Shower!`].slice(-40));
              const zones = ent.bossMeteorZones ?? [];
              zones.forEach(zone => {
                // Spawn meteor attack effect after delay
                setTimeout(() => {
                  // Apply splash damage
                  entitiesRef.current.forEach(h => {
                    if (heroTypes.has(h.type) && !h.isDead) {
                      if (Math.hypot(h.posX - zone.x, h.posY - zone.y) <= zone.radius) {
                        const dmg = Math.round(ent.damage * 1.8);
                        h.hp = Math.max(0, h.hp - dmg);
                        if (run.livingSquad[h.id]) run.livingSquad[h.id].hp = h.hp;
                        floatingTextsRef.current.push({
                          text: `-${dmg} (Meteor)`,
                          x: h.posX,
                          y: h.posY - 10,
                          color: '#f97316',
                          life: 1.2
                        });
                      }
                    }
                  });

                  // Explosion visual effect
                  visualEffectsRef.current.push({
                    type: 'nova',
                    x1: zone.x,
                    y1: zone.y,
                    color: '#f97316',
                    size: zone.radius,
                    life: 0.4,
                    maxLife: 0.4
                  });
                }, zone.delay * 1000 + 400);
              });
            } else if (skill === 'lightning') {
              ent.bossState = 'idle';
              ent.bossSkillCooldown = 5.0;
              setCombatLog(log => [...log, `⚡ Gorgon Overlord channels Chain Lightning!`].slice(-40));

              let currentChain: SimulatedEntity | null = randomHero;
              let jumps = 0;
              const hitIds = new Set<string>();

              while (currentChain && jumps < 4) {
                hitIds.add(currentChain.id);
                const dmg = Math.round(ent.damage * 0.8);
                currentChain.hp = Math.max(0, currentChain.hp - dmg);
                if (run.livingSquad[currentChain.id]) run.livingSquad[currentChain.id].hp = currentChain.hp;

                floatingTextsRef.current.push({
                  text: `-${dmg} (⚡)`,
                  x: currentChain.posX,
                  y: currentChain.posY - 10,
                  color: '#60a5fa',
                  life: 1.0
                });

                // Find next closest hero within chain range
                let nextChain: SimulatedEntity | null = null;
                let nextDist = 4.0 * tileSize;

                for (const h of livingHeroes) {
                  if (hitIds.has(h.id)) continue;
                  const dist = Math.hypot(h.posX - currentChain.posX, h.posY - currentChain.posY);
                  if (dist < nextDist) {
                    nextDist = dist;
                    nextChain = h;
                  }
                }

                // Push electric arc visual
                if (nextChain) {
                  visualEffectsRef.current.push({
                    type: 'lightning',
                    x1: currentChain.posX,
                    y1: currentChain.posY,
                    x2: nextChain.posX,
                    y2: nextChain.posY,
                    color: '#60a5fa',
                    life: 0.3,
                    maxLife: 0.3
                  });
                } else {
                  // final lightning blast visual
                  visualEffectsRef.current.push({
                    type: 'nova',
                    x1: currentChain.posX,
                    y1: currentChain.posY,
                    color: '#3b82f6',
                    size: 16,
                    life: 0.25,
                    maxLife: 0.25
                  });
                }

                currentChain = nextChain;
                jumps++;
              }
            } else if (skill === 'shadowclone') {
              ent.bossState = 'idle';
              ent.bossSkillCooldown = 8.0;
              setCombatLog(log => [...log, `👥 Gorgon Overlord creates two mirrors!`].slice(-40));

              for (let i = 0; i < 2; i++) {
                const pAngle = (i === 0 ? 1 : -1) * (Math.PI / 2);
                const cloneX = ent.posX + Math.cos((ent.bossSkillAngle ?? 0) + pAngle) * tileSize * 1.5;
                const cloneY = ent.posY + Math.sin((ent.bossSkillAngle ?? 0) + pAngle) * tileSize * 1.5;
                const cgx = Math.floor(cloneX / tileSize);
                const cgy = Math.floor(cloneY / tileSize);

                if (grid[cgy]?.[cgx] === 0) {
                  entitiesRef.current.push({
                    id: `boss-clone-${Date.now()}-${i}`,
                    name: 'Gorgon Mirror',
                    type: 'elite',
                    gridX: cgx,
                    gridY: cgy,
                    posX: cloneX,
                    posY: cloneY,
                    hp: 50,
                    maxHp: 50,
                    speed: 1.2,
                    attackRange: 1.8,
                    attackCooldown: 1.0,
                    damage: Math.round(ent.damage * 0.5),
                    lifeSteal: 0,
                    tempBuffs: [],
                    color: '#fda4af',
                    isDead: false,
                    aggroed: true,
                    isBossClone: true
                  });
                }
              }
            }
          }
          continue; // stands still while telegraphing
        }

        // Handle Active Casting/Channeling Phase
        if (ent.bossState === 'casting') {
          ent.bossCastTimer = (ent.bossCastTimer ?? 0) - dt;

          if (ent.bossCurrentSkill === 'firebreath') {
            const angle = ent.bossSkillAngle ?? 0;
            const range = 4.5 * tileSize;
            const coneHalfAngle = Math.PI / 8; // 22.5 deg either side

            // Spawns fire particles
            for (let i = 0; i < 3; i++) {
              const pAngle = angle + (Math.random() - 0.5) * (coneHalfAngle * 2);
              const pSpeed = 90 + Math.random() * 110;
              particlesRef.current.push({
                x: ent.posX,
                y: ent.posY,
                vx: Math.cos(pAngle) * pSpeed,
                vy: Math.sin(pAngle) * pSpeed,
                color: Math.random() > 0.5 ? '#ef4444' : '#f97316',
                size: 2.5 + Math.random() * 3,
                life: 0.4 + Math.random() * 0.2
              });
            }

            // Damage tick
            if ((ent.bossCastTimer ?? 0) % 0.15 < dt) {
              livingHeroes.forEach(h => {
                const dx = h.posX - ent.posX;
                const dy = h.posY - ent.posY;
                const dist = Math.hypot(dx, dy);
                if (dist <= range) {
                  const hAngle = Math.atan2(dy, dx);
                  let angleDiff = Math.abs(hAngle - angle);
                  if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;
                  if (angleDiff <= coneHalfAngle) {
                    const dmg = Math.round(ent.damage * 0.3);
                    h.hp = Math.max(0, h.hp - dmg);
                    if (run.livingSquad[h.id]) run.livingSquad[h.id].hp = h.hp;
                    floatingTextsRef.current.push({
                      text: `-${dmg}`,
                      x: h.posX,
                      y: h.posY - 10,
                      color: '#ef4444',
                      life: 0.8
                    });
                  }
                }
              });
            }
          } else if (ent.bossCurrentSkill === 'vortex') {
            const tx = ent.bossSkillTargetX ?? ent.posX;
            const ty = ent.bossSkillTargetY ?? ent.posY;
            const radius = 3.0 * tileSize;

            // Swirl particles
            const angleOffset = Date.now() / 200;
            for (let i = 0; i < 2; i++) {
              const pAngle = angleOffset + (i * Math.PI);
              particlesRef.current.push({
                x: tx + Math.cos(pAngle) * (radius * (0.3 + Math.random() * 0.7)),
                y: ty + Math.sin(pAngle) * (radius * (0.3 + Math.random() * 0.7)),
                vx: -Math.cos(pAngle) * 50 - Math.sin(pAngle) * 80,
                vy: -Math.sin(pAngle) * 50 + Math.cos(pAngle) * 80,
                color: '#8b5cf6',
                size: 2.0,
                life: 0.5
              });
            }

            // Drag heroes
            livingHeroes.forEach(h => {
              const dx = tx - h.posX;
              const dy = ty - h.posY;
              const dist = Math.hypot(dx, dy);
              if (dist <= radius) {
                // Drag pull speed
                const pullPower = 40 * (1 - dist / radius) * dt;
                const nextX = h.posX + (dx / dist) * pullPower;
                const nextY = h.posY + (dy / dist) * pullPower;
                const ngx = Math.floor(nextX / tileSize);
                const ngy = Math.floor(nextY / tileSize);
                if (grid[ngy]?.[ngx] === 0) {
                  h.posX = nextX;
                  h.posY = nextY;
                  h.gridX = ngx;
                  h.gridY = ngy;
                }

                // tick damage
                if ((ent.bossCastTimer ?? 0) % 0.2 < dt) {
                  const dmg = Math.round(ent.damage * 0.25);
                  h.hp = Math.max(0, h.hp - dmg);
                  if (run.livingSquad[h.id]) run.livingSquad[h.id].hp = h.hp;
                  floatingTextsRef.current.push({
                    text: `-${dmg}`,
                    x: h.posX,
                    y: h.posY - 10,
                    color: '#8b5cf6',
                    life: 0.8
                  });
                }
              }
            });
          }

          if (ent.bossCastTimer <= 0) {
            ent.bossState = 'idle';
            ent.bossSkillCooldown = 4.0;
          }
          continue; // stands still while casting/channeling
        }
      }

      // 2. Target Selection
      let target: SimulatedEntity | null = null;

      if (isHostile) {
        // Find the closest living non-stealthed hero
        let closestHero: SimulatedEntity | null = null;
        let minDist = 9999;
        for (const h of heroes) {
          if (h.isStealthed) continue;
          const dx = h.posX - ent.posX;
          const dy = h.posY - ent.posY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < minDist) {
            minDist = dist;
            closestHero = h;
          }
        }

        // Check if closest hero is a tank class (warrior or paladin)
        const isClosestHeroTank = closestHero && (closestHero.type === 'warrior' || closestHero.type === 'paladin');

        if (closestHero && isClosestHeroTank) {
          // Pseudo-taunt: swap to the tank since they are closest
          ent.currentTargetId = closestHero.id;
          target = closestHero;
        } else {
          // Stick to current locked target if valid
          let lockedTarget: SimulatedEntity | null = null;
          if (ent.currentTargetId) {
            const candidate = entities.find(e => e.id === ent.currentTargetId);
            if (candidate && !candidate.isDead && !candidate.isStealthed) {
              lockedTarget = candidate;
            }
          }

          if (lockedTarget) {
            target = lockedTarget;
          } else if (closestHero) {
            // Lock onto closest hero (since current lock was invalid/none)
            ent.currentTargetId = closestHero.id;
            target = closestHero;
          } else {
            ent.currentTargetId = undefined;
          }
        }

        // Override target if target is Necromancer but a skeleton is in melee range
        if (target && target.type === 'necromancer') {
          let closestSkeleton: SimulatedEntity | null = null;
          let minSkelDist = 9999;
          for (const h of heroes) {
            if (h.type === 'skeleton' && !h.isDead) {
              const dx = h.posX - ent.posX;
              const dy = h.posY - ent.posY;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist <= 1.5 * tileSize && dist < minSkelDist) {
                minSkelDist = dist;
                closestSkeleton = h;
              }
            }
          }
          if (closestSkeleton) {
            target = closestSkeleton;
            ent.currentTargetId = closestSkeleton.id;
          }
        }
      } else {
        // Find anchor (Warrior/Paladin, or teammate furthest behind)
        const teammates = heroes.filter(h => h.id !== ent.id && h.type !== 'skeleton' && h.type !== 'wolf');
        let anchor: SimulatedEntity | null = null;
        if (ent.type === 'skeleton') {
          anchor = heroes.find(h => h.type === 'necromancer') || null;
        }
        if (!anchor && teammates.length > 0) {
          anchor = teammates.find(t => t.type === 'warrior' || t.type === 'paladin') || null;
          if (!anchor) {
            anchor = teammates.reduce((furthest, curr) => curr.posX < furthest.posX ? curr : furthest, teammates[0]);
          }
        }

        // Minion catch-up/stuck prevention teleport logic
        if ((ent.type === 'skeleton' || ent.type === 'wolf') && anchor) {
          const distToAnchor = Math.hypot(ent.posX - anchor.posX, ent.posY - anchor.posY) / tileSize;
          if (distToAnchor > 10.0) {
            ent.posX = anchor.posX;
            ent.posY = anchor.posY;
            ent.gridX = anchor.gridX;
            ent.gridY = anchor.gridY;
            for (let k = 0; k < 5; k++) {
              particlesRef.current.push({
                x: ent.posX,
                y: ent.posY,
                vx: (Math.random() - 0.5) * 50,
                vy: (Math.random() - 0.5) * 50,
                color: ent.type === 'skeleton' ? '#e5e7eb' : '#a1a1aa',
                size: 2 + Math.random() * 2,
                life: 0.4
              });
            }
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
        
        // Skeletons/Wolves do not group up during active combat (prevents erratic back-and-forth movement)
        if ((ent.type === 'skeleton' || ent.type === 'wolf') && activeEnemies.length > 0) {
          ent.groupingMode = false;
          ent.groupingModeTimer = 0;
        }

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
          // Skeletons/Wolves follow the anchor when not in combat to stick with the squad
          if ((ent.groupingMode || ent.type === 'skeleton' || ent.type === 'wolf') && anchor) {
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

        // Shadowstep skill trigger
        if (ent.type === 'rogue' && !ent.isDead && !target.isDead && (target.type === 'enemy' || target.type === 'elite' || target.type === 'boss' || target.type === 'archer')) {
          const powerups = activeRun?.selectedPowerups ?? [];
          const shadowstepCount = powerups.filter(p => p === 'Shadowstep').length;
          if (shadowstepCount > 0) {
            if (ent.shadowstepTimer !== undefined && ent.shadowstepTimer > 0) {
              ent.shadowstepTimer -= dt;
            } else {
              // Trigger Shadowstep: Teleport directly behind the target
              const cooldown = Math.max(4, 10 - 2 * (shadowstepCount - 1));
              ent.shadowstepTimer = cooldown;

              // Calculate position behind the target (opposite direction from target to ent)
              const angle = Math.atan2(target.posY - ent.posY, target.posX - ent.posX);
              const pushDist = 0.8 * tileSize;
              const destX = target.posX + Math.cos(angle) * pushDist;
              const destY = target.posY + Math.sin(angle) * pushDist;
              const destGX = Math.floor(destX / tileSize);
              const destGY = Math.floor(destY / tileSize);

              if (gridMapRef.current[destGY]?.[destGX] === 0) {
                // Teleport!
                ent.posX = destX;
                ent.posY = destY;
                ent.gridX = destGX;
                ent.gridY = destGY;

                floatingTextsRef.current.push({
                  text: `Shadowstep!`,
                  x: ent.posX,
                  y: ent.posY - 15,
                  color: '#7c3aed',
                  life: 1.2
                });

                // Deal instant shadowstep bonus damage (2.0 * normal damage)
                const shadowstepDmg = Math.round(ent.damage * 2.0);
                target.hp = Math.max(0, target.hp - shadowstepDmg);
                
                // Shadow slash effect
                slashEffectsRef.current.push({
                  x: ent.posX,
                  y: ent.posY,
                  angle: angle + Math.PI,
                  color: '#7c3aed',
                  life: 0.6,
                  radius: 36
                });

                for (let k = 0; k < 6; k++) {
                  particlesRef.current.push({
                    x: target.posX,
                    y: target.posY,
                    vx: (Math.random() - 0.5) * 70,
                    vy: (Math.random() - 0.5) * 70,
                    color: '#6d28d9',
                    size: 2 + Math.random() * 2,
                    life: 0.4
                  });
                }

                if (!run.heroDamageDealt) {
                  run.heroDamageDealt = {};
                }
                run.heroDamageDealt[ent.id] = (run.heroDamageDealt[ent.id] || 0) + shadowstepDmg;
                chamberDamageDealtRef.current[ent.id] = (chamberDamageDealtRef.current[ent.id] || 0) + shadowstepDmg;

                if (target.hp <= 0) {
                  target.isDead = true;
                  setCombatLog(log => [...log, `💀 ${target!.name} was assassinated by Shadowstep.`].slice(-40));
                  handleEnemyDeath(target);
                }
              }
            }
          }
        }

        // 3. Attack / Interaction Check
        const isTeammate = !isHostile && heroTypes.has(target.type);
        const effectiveRange = target.type === 'portal' 
          ? 0.1 
          : (target.type === 'chest' || target.type === 'cage') 
            ? 0.9 
            : isTeammate 
              ? 1.5 
              : ent.attackRange;

        if (tileDist <= effectiveRange) {
          // If rogue has recently vanished, they must wait at least 2 full seconds before re-opening
          if (ent.type === 'rogue' && ent.isStealthed && ent.vanishLockTimer !== undefined && ent.vanishLockTimer > 0) {
            continue;
          }

          // Rogue patience: if stealthed and the target is not currently focused on a teammate
          // (or is not yet within attack range of that teammate), hold the attack and stay hidden.
          // Skip if the rogue is the last hero alive — can't wait forever.
          if (ent.type === 'rogue' && ent.isStealthed && !isTeammate && heroes.length > 1 && (target.type === 'enemy' || target.type === 'archer' || target.type === 'elite' || target.type === 'boss')) {
            // Find who the target enemy is actually targeting
            let hostileTarget: SimulatedEntity | null = null;
            let minDist = 9999;
            for (const h of heroes) {
              if (h.isStealthed || h.isDead) continue;
              const dist = Math.hypot(target.posX - h.posX, target.posY - h.posY);
              if (dist < minDist) {
                minDist = dist;
                hostileTarget = h;
              }
            }

            // Target must be aggroed, targeting a teammate, and within attack range of that teammate
            if (!target.aggroed || !hostileTarget || hostileTarget.id === ent.id) {
              continue;
            }

            const distToTarget = Math.hypot(target.posX - hostileTarget.posX, target.posY - hostileTarget.posY) / tileSize;
            if (distToTarget > target.attackRange) {
              continue; // Wait until they are in range and attacking the target teammate
            }
          }

          if (!isTeammate && ent.attackCooldown <= 0) {
            // Base attack cooldown per class
            let baseAtkCooldown = 1.2;
            if (ent.type === 'ranger') baseAtkCooldown = 1.0;
            else if (ent.type === 'wizard') baseAtkCooldown = 1.8;
            else if (ent.type === 'necromancer') baseAtkCooldown = 1.5;
            else if (ent.type === 'paladin') baseAtkCooldown = 1.2;
            else if (ent.type === 'rogue') baseAtkCooldown = 0.9;
            else if (ent.type === 'druid') {
              if (ent.druidForm === 'werewolf') baseAtkCooldown = 0.8;
              else if (ent.druidForm === 'owl') baseAtkCooldown = 1.6;
              else baseAtkCooldown = 1.4; // Bear
            }

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
            let weaponAtkSpeed = Math.max(combinedAtkSpeed, 0.5);
            
            // Feral Swiftness: Druid werewolf atk speed +25% per stack
            if (ent.type === 'druid' && ent.druidForm === 'werewolf') {
              const swiftnessCount = (run.selectedPowerups ?? []).filter(p => p === 'Feral Swiftness').length;
              weaponAtkSpeed *= (1 + 0.25 * swiftnessCount);
            }

            // Adrenaline Rush: Rogue gains +30% attack speed per stack after a kill
            if (ent.type === 'rogue' && ent.adrenalineTimer && ent.adrenalineTimer > 0) {
              const rushMult = 1 + 0.30 * (ent.adrenalineLevel ?? 1);
              weaponAtkSpeed *= rushMult;
            }

            if (heroRec && heroRec.equipment) {
              const hasBloodrage = Object.values(heroRec.equipment).some(item => item?.name === 'Bloodrage Cleaver');
              if (hasBloodrage) {
                const hpPct = ent.hp / ent.maxHp;
                const bonusAtkSpeed = 0.50 * (1 - hpPct);
                weaponAtkSpeed *= (1 + bonusAtkSpeed);
              }
              const hasBerserker = Object.values(heroRec.equipment).some(item => item?.name === 'Treads of the Berserker');
              if (hasBerserker) {
                const nearbyEnemiesCount = entities.filter(e => !e.isDead && !heroTypes.has(e.type) && e.type !== 'chest' && e.type !== 'cage' && e.type !== 'portal' && e.type !== 'item_loot' && Math.hypot(e.posX - ent.posX, e.posY - ent.posY) <= 3 * tileSize).length;
                const berserkBonus = Math.min(0.30, nearbyEnemiesCount * 0.10);
                weaponAtkSpeed *= (1 + berserkBonus);
              }
            }

            // Sum attack cooldown reduction from all equipped items
            let atkCdReduction = 0;
            if (heroRec?.equipment) {
              for (const key in heroRec.equipment) {
                const item = heroRec.equipment[key as EquipmentSlot];
                if (item?.stats?.atkCooldownReduction) atkCdReduction += item.stats.atkCooldownReduction;
              }
            }
            atkCdReduction = Math.min(atkCdReduction, 0.40); // Cap at 40% CDR

            // Count stacks of Double Shot (diminishing returns, capped at 75% reduction)
            const doubleShotStacks = run.selectedPowerups?.filter(p => p === 'Double Shot').length ?? 0;
            let atkCooldownMult = 1.0;
            if (ent.type === 'ranger') {
              atkCooldownMult = Math.max(0.25, Math.pow(0.70, doubleShotStacks));
            } else if (ent.type === 'wizard') {
              const quickBurnLevel = run.selectedPowerups?.filter(p => p === 'Quick Burn').length ?? 0;
              if (quickBurnLevel > 0) {
                const rangerReduction = 1 - Math.max(0.25, Math.pow(0.70, doubleShotStacks));
                const wizardBenefitRatio = 0.50 + 0.10 * (quickBurnLevel - 1);
                const wizardReduction = rangerReduction * wizardBenefitRatio;
                atkCooldownMult = 1 - wizardReduction;
              }
            }
            ent.attackCooldown = (baseAtkCooldown / weaponAtkSpeed) * atkCooldownMult * (1 - atkCdReduction);

            // Handle chest unlock / cage breaking
            if (target.type === 'chest' || target.type === 'cage') {
              target.hp = 0;
              target.isDead = true;
              
              if (target.type === 'chest') {
                const item = generateRandomItem(run.currentBiome, undefined, true, getOwnedLegendaries());
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
                  color: item.rarity === 'Legendary' ? '#ff8000' : item.rarity === 'Epic' ? '#a335ee' : item.rarity === 'Rare' ? '#0070dd' : item.rarity === 'Uncommon' ? '#1eff00' : '#ffffff',
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
            // Owl Clarity: Druid Owl +20% per stack
            if (ent.type === 'druid' && ent.druidForm === 'owl') dmgMult += 0.20 * countOf('Owl Clarity');
            // Elixir of Wrath: +10% damage from purchased buff
            if (ent.tempBuffs?.includes('damage')) dmgMult += 0.10;

            // Paladin Aura damage bonus (+10% base + 5% per level of Aura Mastery)
            if (heroTypes.has(ent.type)) {
              const paladin = entities.find(e => e.type === 'paladin' && !e.isDead);
              if (paladin) {
                const dist = Math.hypot(ent.posX - paladin.posX, ent.posY - paladin.posY);
                const devotionCount = countOf('Devotion Aura');
                const auraRadius = (4 + devotionCount * 2) * tileSize;
                if (dist <= auraRadius) {
                  let auraDmgBonus = 0.10;
                  const auraMasteryCount = countOf('Aura Mastery');
                  auraDmgBonus += 0.05 * auraMasteryCount;
                  dmgMult += auraDmgBonus;
                }
              }
            }

            // Rogue Shadowstrike: 2.5x damage from stealth
            let isRogueCrit = false;
            if (ent.type === 'rogue' && ent.isStealthed) {
              dmgMult += 1.5; // +150% (makes it 2.5x total damage)
              isRogueCrit = true;
              ent.isStealthed = false;
              ent.stealthTimer = 6.0;
            }

            let blockChance = 0;
            if (target.type === 'warrior') {
              blockChance = 0.25 + 0.07 * countOf('Block Mastery');
            } else if (target.type === 'druid' && target.druidForm === 'bear') {
              const ursineCount = countOf('Ursine Fortitude');
              blockChance = 0.20 + 0.10 * ursineCount;
            }
            
            let isMitigated = Math.random() < blockChance;
            let isEvadedRogue = false;
            if (target.type === 'rogue') {
              const evasiveCount = countOf('Evasive Maneuvers');
              if (evasiveCount > 0 && Math.random() < 0.15 * evasiveCount) {
                isEvadedRogue = true;
              }
            }

            const rawDmg = Math.round(ent.damage * dmgMult);
            const blockDmgMult = target.type === 'warrior' ? 0.25 : 0.40;
            let dmg = isEvadedRogue ? 0 : (isMitigated ? Math.round(rawDmg * blockDmgMult) : rawDmg);

            // Paladin Aura defense bonus (applied as damage reduction)
            if (heroTypes.has(target.type) && !isEvadedRogue) {
              const paladin = entities.find(e => e.type === 'paladin' && !e.isDead);
              if (paladin) {
                const dist = Math.hypot(target.posX - paladin.posX, target.posY - paladin.posY);
                const devotionCount = countOf('Devotion Aura');
                const auraRadius = (4 + devotionCount * 2) * tileSize;
                if (dist <= auraRadius) {
                  let defBonus = 0.10; // 10% base damage reduction
                  const auraMasteryCount = countOf('Aura Mastery');
                  defBonus += 0.05 * auraMasteryCount;
                  defBonus += 0.10 * devotionCount;
                  dmg = Math.round(dmg * (1 - Math.min(0.75, defBonus)));
                }
              }
            }

            // Track damage dealt by heroes (on fire, before projectile travel)
            // Minion damage is attributed to the summoner hero
            if (!isHostile) {
              if (!run.heroDamageDealt) {
                run.heroDamageDealt = {};
              }
              const dmgOwnerId = ent.summonerId ?? ent.id;
              run.heroDamageDealt[dmgOwnerId] = (run.heroDamageDealt[dmgOwnerId] || 0) + dmg;
              chamberDamageDealtRef.current[dmgOwnerId] = (chamberDamageDealtRef.current[dmgOwnerId] || 0) + dmg;
            }

            if (Math.random() < 0.35 || ent.type === 'boss') {
              setCombatLog(log => [
                ...log,
                isEvadedRogue
                  ? `${target.name} evaded attack from ${ent.name}!`
                  : isMitigated 
                    ? `${ent.name} attacks Warrior (Shield Block!)`
                    : `${ent.name} attacks ${target!.name} dealing ${dmg} dmg.`
              ].slice(-40));
            }

            if (isEvadedRogue) {
              floatingTextsRef.current.push({
                text: `Evaded!`,
                x: target.posX,
                y: target.posY - 12,
                color: '#60a5fa',
                life: 1.0
              });
            }

            if (isRogueCrit) {
              floatingTextsRef.current.push({
                text: `💥 Shadowstrike!`,
                x: target.posX,
                y: target.posY - 15,
                color: '#ef4444',
                life: 1.2
              });
              
              // Shadow slash particles
              for (let k = 0; k < 12; k++) {
                particlesRef.current.push({
                  x: target.posX,
                  y: target.posY,
                  vx: (Math.random() - 0.5) * 100,
                  vy: (Math.random() - 0.5) * 100,
                  color: '#475569',
                  size: 2.5 + Math.random() * 2.5,
                  life: 0.5
                });
              }
            }

            // Dagger Poisoning: Rogue attacks apply poison
            if (ent.type === 'rogue' && !isEvadedRogue && !heroTypes.has(target.type)) {
              const poisonLvl = countOf('Dagger Poisoning');
              if (poisonLvl > 0) {
                const existing = poisonStacksRef.current.get(target.id);
                const newStacks = existing ? Math.min(existing.stacks + 1, 5) : 1;
                poisonStacksRef.current.set(target.id, {
                  stacks: newStacks,
                  timer: existing?.timer ?? 0,
                  level: poisonLvl
                });
                floatingTextsRef.current.push({
                  text: `☠ Poison (${newStacks})`,
                  x: target.posX,
                  y: target.posY - 16,
                  color: '#22c55e',
                  life: 1.2
                });
              }
            }

            // --- Ranged attack: spawn projectile (damage applied on impact) ---
            const isOwl = ent.type === 'druid' && ent.druidForm === 'owl';
            const isMagi = ent.type === 'skeleton' && ent.isSkeletalMagi;
            const isNecro = ent.type === 'necromancer';
            const isRangedAttacker = ent.type === 'ranger' || ent.type === 'wizard' || ent.type === 'archer' || isOwl || isMagi || isNecro;
            if (isRangedAttacker) {
              const pColor =
                ent.type === 'ranger' ? '#1eff00' :
                ent.type === 'wizard' ? '#ff6a00' :
                isOwl ? '#06b6d4' : // Ice blue
                isMagi ? '#c084fc' : // Magic purple
                isNecro ? '#d946ef' : // Fuchsia death bolt
                '#ef4444';
              const pSize = (ent.type === 'wizard' || isOwl || isMagi || isNecro) ? 5 : 1.5;
              const pSpeed = (ent.type === 'wizard' || isOwl || isMagi || isNecro) ? 220 : 320;
              projectilesRef.current.push({
                x: ent.posX,
                y: ent.posY,
                startX: ent.posX,
                startY: ent.posY,
                attackerId: ent.id,
                targetId: target.id,
                speed: pSpeed,
                damage: dmg,
                isMitigated,
                color: pColor,
                size: pSize,
                trail: [],
                life: 2.0,
                isAoE: ent.type === 'wizard' || isOwl || isMagi, // Necro is single-target only
                isMagiAoE: isMagi,
                isOwlAoE: isOwl,
                isPoisoned: ent.type === 'ranger' && (run.selectedPowerups ?? []).includes('Poison Arrow'),
                poisonLevel: ent.type === 'ranger' ? (run.selectedPowerups ?? []).filter(p => p === 'Poison Arrow').length : 0
              });

              // Marked for Death synergy: Ranger attacks split to all marked targets
              if (ent.type === 'ranger' && (run.selectedPowerups ?? []).includes('Marked for Death')) {
                entitiesRef.current.forEach(other => {
                  if (other.id !== target.id && !other.isDead && other.isMarked) {
                    const isOtherHero = heroTypes.has(other.type);
                    if (!isOtherHero && other.type !== 'chest' && other.type !== 'cage' && other.type !== 'portal' && other.type !== 'item_loot') {
                      projectilesRef.current.push({
                        x: ent.posX,
                        y: ent.posY,
                        startX: ent.posX,
                        startY: ent.posY,
                        attackerId: ent.id,
                        targetId: other.id,
                        speed: pSpeed,
                        damage: dmg,
                        isMitigated: false,
                        color: '#d946ef', // Fuchsia
                        size: 2.2,
                        trail: [],
                        life: 2.0,
                        isAoE: false,
                        isPoisoned: (run.selectedPowerups ?? []).includes('Poison Arrow'),
                        poisonLevel: (run.selectedPowerups ?? []).filter(p => p === 'Poison Arrow').length
                      });
                    }
                  }
                });
              }
            } else {
              // --- Melee attack: apply damage instantly + slash VFX ---
              let finalDmg = dmg;
              const attackerHero = heroTypes.has(ent.type) ? roster.find(r => r.character_id === ent.id) : null;
              const equippedLegendaries = new Set<string>();
              if (attackerHero && attackerHero.equipment) {
                for (const slot in attackerHero.equipment) {
                  const item = attackerHero.equipment[slot as EquipmentSlot];
                  if (item && item.rarity === 'Legendary') equippedLegendaries.add(item.name);
                }
              }
                
                if (equippedLegendaries.has('Void Blade') && Math.random() < 0.20) {
                  finalDmg *= 2;
                  floatingTextsRef.current.push({
                    text: `Void Crit!`,
                    x: target.posX,
                    y: target.posY - 16,
                    color: '#c084fc',
                    life: 1.0
                  });
                  visualEffectsRef.current.push({
                    type: 'ghost',
                    x1: ent.posX,
                    y1: ent.posY,
                    x2: target.posX,
                    y2: target.posY,
                    color: '#a855f7',
                    life: 0.2,
                    maxLife: 0.2
                  });
                }
                if (equippedLegendaries.has('Glinting Goggles')) {
                  finalDmg += 5;
                  visualEffectsRef.current.push({
                    type: 'laser',
                    x1: ent.posX,
                    y1: ent.posY,
                    x2: target.posX,
                    y2: target.posY,
                    color: '#ef4444',
                    life: 0.15,
                    maxLife: 0.15
                  });
                }
                if (equippedLegendaries.has("Titan's Grips")) {
                  // Splash 50% damage to other enemies in 1.5 tiles
                  entities.forEach(other => {
                    if (other.id === target.id || other.isDead) return;
                    if (heroTypes.has(other.type)) return; // Only damage enemies
                    if (other.type === 'chest' || other.type === 'cage' || other.type === 'portal' || other.type === 'item_loot') return;
                    
                    const dist = Math.hypot(other.posX - target.posX, other.posY - target.posY);
                    if (dist <= 1.5 * tileSize) {
                      const splash = Math.round(finalDmg * 0.5);
                      other.hp = Math.max(0, other.hp - splash);
                      floatingTextsRef.current.push({
                        text: `-${splash}`,
                        x: other.posX,
                        y: other.posY - 8,
                        color: '#fbbf24',
                        life: 1.0
                      });
                      if (other.hp <= 0) {
                        other.isDead = true;
                        setCombatLog(log => [...log, `💀 ${other.name} was crushed by Seismic Slam.`].slice(-40));
                      }
                    }
                  });
                  visualEffectsRef.current.push({
                    type: 'shockwave',
                    x1: target.posX,
                    y1: target.posY,
                    color: '#a1a1aa',
                    size: 1.5 * tileSize,
                    life: 0.25,
                    maxLife: 0.25
                  });
                }
                if (equippedLegendaries.has('Death-Touch Grips')) {
                  // Apply 2 poison stacks
                  const existing = poisonStacksRef.current.get(target.id);
                  const newStacks = existing ? Math.min(existing.stacks + 2, 5) : 2;
                  poisonStacksRef.current.set(target.id, {
                    stacks: newStacks,
                    timer: existing?.timer ?? 0,
                    level: 2
                  });
                  floatingTextsRef.current.push({
                    text: `☠ Poison (${newStacks})`,
                    x: target.posX,
                    y: target.posY - 16,
                    color: '#22c55e',
                    life: 1.2
                  });
                }

              // Melee offensive legendary modifications
              if (equippedLegendaries.has('Demon-Slayer Greatsword')) {
                finalDmg += 10;
                visualEffectsRef.current.push({
                  type: 'nova',
                  x1: target.posX,
                  y1: target.posY,
                  color: '#f87171',
                  size: 25,
                  life: 0.2,
                  maxLife: 0.2
                });
              }

              if (equippedLegendaries.has('Runic Warmace')) {
                ent.runicAttackCount = (ent.runicAttackCount || 0) + 1;
                if (ent.runicAttackCount >= 3) {
                  ent.runicAttackCount = 0;
                  ent.runicShield = (ent.runicShield || 0) + 15;
                  floatingTextsRef.current.push({
                    text: `+15 Shield (Runic)`,
                    x: ent.posX,
                    y: ent.posY - 16,
                    color: '#22d3ee',
                    life: 1.2
                  });
                }
              }

              // Apply Gale-Force dodge and Runic Shield
              const targetLegendaries = new Set<string>();
              const targetHero = heroTypes.has(target.type) ? roster.find(h => h.character_id === target.id) : null;
              if (targetHero && targetHero.equipment) {
                for (const slot in targetHero.equipment) {
                  const item = targetHero.equipment[slot as EquipmentSlot];
                  if (item && item.rarity === 'Legendary') targetLegendaries.add(item.name);
                }
              }

              let finalDmgBlocked = finalDmg;
              let isEvaded = false;
              if (targetLegendaries.has('Gale-Force Leggings') && Math.random() < 0.10) {
                finalDmgBlocked = 0;
                isEvaded = true;
                floatingTextsRef.current.push({
                  text: `Evaded!`,
                  x: target.posX,
                  y: target.posY - 12,
                  color: '#60a5fa',
                  life: 1.0
                });
              }

              if (target.runicShield && target.runicShield > 0 && finalDmgBlocked > 0) {
                if (finalDmgBlocked >= target.runicShield) {
                  finalDmgBlocked -= target.runicShield;
                  target.runicShield = 0;
                } else {
                  target.runicShield -= finalDmgBlocked;
                  finalDmgBlocked = 0;
                }
              }

              const isInvuln = !!target.legDivineBulwarkActive || !!target.legDuskwalkerInvisible;
              
              // Paladin Aura defense bonus (applied as damage reduction)
              if (heroTypes.has(target.type) && finalDmgBlocked > 0) {
                const paladin = entities.find(e => e.type === 'paladin' && !e.isDead);
                if (paladin) {
                  const dist = Math.hypot(target.posX - paladin.posX, target.posY - paladin.posY);
                  const paladinPowerups = run.selectedPowerups ?? [];
                  const devotionCount = paladinPowerups.filter(p => p === 'Devotion Aura').length;
                  const auraRadius = (4 + devotionCount * 2) * tileSize;
                  if (dist <= auraRadius) {
                    let defBonus = 0.10; // 10% base damage reduction
                    const auraMasteryCount = paladinPowerups.filter(p => p === 'Aura Mastery').length;
                    defBonus += 0.05 * auraMasteryCount;
                    defBonus += 0.10 * devotionCount;
                    finalDmgBlocked = Math.round(finalDmgBlocked * (1 - Math.min(0.75, defBonus)));
                  }
                }
              }

              const dmgApplied = isInvuln || isEvaded ? 0 : finalDmgBlocked;
              const oldHp = target.hp;
              target.hp = Math.max(target.hp - dmgApplied, 0);
              const dmgTaken = oldHp - target.hp;

              // Shield Slam: Warrior attacks stun targets for 1.5s per stack (bosses are immune)
              if (ent.type === 'warrior' && !target.isDead && dmgApplied > 0 && target.type !== 'item_loot' && target.type !== 'boss') {
                const shieldSlamCount = countOf('Shield Slam');
                if (shieldSlamCount > 0) {
                  const stunDuration = 1.5 * shieldSlamCount;
                  target.stunTimer = Math.max(target.stunTimer ?? 0, stunDuration);
                  floatingTextsRef.current.push({
                    text: `💫 Stunned (${stunDuration.toFixed(1)}s)`,
                    x: target.posX,
                    y: target.posY - 20,
                    color: '#facc15',
                    life: 1.2
                  });
                }
              }

              // Paladin Retribution Aura reflection
              if (heroTypes.has(target.type) && ent && !ent.isDead && dmgTaken > 0) {
                const paladin = entities.find(e => e.type === 'paladin' && !e.isDead);
                if (paladin) {
                  const dist = Math.hypot(target.posX - paladin.posX, target.posY - paladin.posY);
                  const paladinPowerups = run.selectedPowerups ?? [];
                  const retributionCount = paladinPowerups.filter(p => p === 'Retribution Aura').length;
                  const devotionCount = paladinPowerups.filter(p => p === 'Devotion Aura').length;
                  const auraRadius = (4 + devotionCount * 2) * tileSize;
                  if (retributionCount > 0 && dist <= auraRadius) {
                    const reflectDmg = Math.round(dmgTaken * (0.15 + 0.10 * (retributionCount - 1)));
                    if (reflectDmg > 0) {
                      ent.hp = Math.max(0, ent.hp - reflectDmg);
                      floatingTextsRef.current.push({
                        text: `-${reflectDmg} (Retribution)`,
                        x: ent.posX,
                        y: ent.posY - 12,
                        color: '#eab308',
                        life: 1.0
                      });

                      visualEffectsRef.current.push({
                        type: 'lightning',
                        x1: target.posX,
                        y1: target.posY,
                        x2: ent.posX,
                        y2: ent.posY,
                        color: '#fbbf24',
                        life: 0.15,
                        maxLife: 0.15
                      });

                      if (ent.hp <= 0) {
                        ent.isDead = true;
                        setCombatLog(log => [...log, `💀 ${ent.name} was slain by Retribution Aura.`].slice(-40));
                      }
                    }
                  }
                }
              }

              if (isInvuln && !isEvaded) {
                floatingTextsRef.current.push({
                  text: `Blocked!`,
                  x: target.posX,
                  y: target.posY - 8,
                  color: '#60a5fa',
                  life: 1.0
                });
              }

              // Duskwalker Boots invisibility trigger
              if (targetLegendaries.has('Duskwalker Boots') && target.hp < target.maxHp * 0.40 && !target.legDuskwalkerInvisible && !target.isDead) {
                target.legDuskwalkerInvisible = true;
                target.legDuskwalkerInvulnTimer = 1.5;
                floatingTextsRef.current.push({
                  text: `Invisibility!`,
                  x: target.posX,
                  y: target.posY - 16,
                  color: '#c084fc',
                  life: 1.5
                });
              }

              // Iron Retaliation (Carapace of the Iron Core) reflect damage
              if (targetLegendaries.has('Carapace of the Iron Core') && ent && !ent.isDead && dmgTaken > 0) {
                const reflectDmg = Math.round(dmgTaken * 0.20);
                if (reflectDmg > 0) {
                  ent.hp = Math.max(0, ent.hp - reflectDmg);
                  floatingTextsRef.current.push({
                    text: `-${reflectDmg} (Retaliate)`,
                    x: ent.posX,
                    y: ent.posY - 12,
                    color: '#94a3b8',
                    life: 1.0
                  });
                  visualEffectsRef.current.push({
                    type: 'lightning',
                    x1: target.posX,
                    y1: target.posY,
                    x2: ent.posX,
                    y2: ent.posY,
                    color: '#94a3b8',
                    life: 0.15,
                    maxLife: 0.15
                  });
                  if (ent.hp <= 0) {
                    ent.isDead = true;
                    setCombatLog(log => [...log, `💀 ${ent.name} was crushed by Iron Retaliation.`].slice(-40));
                  }
                }
              }

              // Static Discharge (Lightning-Rod Vambraces) reflect shock
              if (targetLegendaries.has('Lightning-Rod Vambraces') && Math.random() < 0.15 && ent && !ent.isDead && dmgTaken > 0) {
                ent.hp = Math.max(0, ent.hp - 18);
                floatingTextsRef.current.push({
                  text: `-18 (Static Shock)`,
                  x: ent.posX,
                  y: ent.posY - 12,
                  color: '#eab308',
                  life: 1.0
                });
                visualEffectsRef.current.push({
                  type: 'lightning',
                  x1: target.posX,
                  y1: target.posY,
                  x2: ent.posX,
                  y2: ent.posY,
                  color: '#eab308',
                  life: 0.25,
                  maxLife: 0.25
                });
                if (ent.hp <= 0) {
                  ent.isDead = true;
                  setCombatLog(log => [...log, `💀 ${ent.name} was electrocuted by Static Discharge.`].slice(-40));
                }
              }

              // Frigid Shell (Glacial Girdle) shatter
              if (targetLegendaries.has('Glacial Girdle') && dmgTaken > 0) {
                if (target.glacialShield === undefined) target.glacialShield = 20;
                if (target.glacialShield > 0) {
                  target.glacialShield -= dmgTaken;
                  if (target.glacialShield <= 0) {
                    entities.forEach(e => {
                      if (!e.isDead && !heroTypes.has(e.type) && e.type !== 'chest' && e.type !== 'cage' && e.type !== 'portal' && e.type !== 'item_loot') {
                        const dist = Math.hypot(e.posX - target.posX, e.posY - target.posY);
                        if (dist <= 2.0 * tileSize) {
                          e.hp = Math.max(0, e.hp - 12);
                          e.frostSlowed = true;
                          floatingTextsRef.current.push({
                            text: `-12 (Frigid Burst)`,
                            x: e.posX,
                            y: e.posY - 12,
                            color: '#06b6d4',
                            life: 1.0
                          });
                          if (e.hp <= 0) {
                            e.isDead = true;
                            setCombatLog(log => [...log, `💀 ${e.name} died in Frigid Shell explosion.`].slice(-40));
                          }
                        }
                      }
                    });
                    visualEffectsRef.current.push({
                      type: 'nova',
                      x1: target.posX,
                      y1: target.posY,
                      color: '#06b6d4',
                      size: 2.0 * tileSize,
                      life: 0.35,
                      maxLife: 0.35
                    });
                  }
                }
              }

              // Gravekeeper's Scythe heal on wielder
              if (target.hp <= 0 && dmgTaken > 0) {
                if (attackerHero && attackerHero.equipment) {
                  const equippedLegendaries = new Set<string>();
                  for (const slot in attackerHero.equipment) {
                    const item = attackerHero.equipment[slot as EquipmentSlot];
                    if (item && item.rarity === 'Legendary') equippedLegendaries.add(item.name);
                  }
                  if (equippedLegendaries.has("Gravekeeper's Scythe") && ent) {
                    const heal = Math.round(ent.maxHp * 0.10);
                    ent.hp = Math.min(ent.maxHp, ent.hp + heal);
                    if (run.livingSquad[ent.id]) {
                      run.livingSquad[ent.id].hp = ent.hp;
                    }
                    floatingTextsRef.current.push({
                      text: `+${heal} (Soul Feast)`,
                      x: ent.posX,
                      y: ent.posY - 12,
                      color: '#a855f7',
                      life: 1.2
                    });
                    visualEffectsRef.current.push({
                      type: 'ghost',
                      x1: target.posX,
                      y1: target.posY,
                      x2: ent.posX,
                      y2: ent.posY,
                      color: '#a855f7',
                      life: 0.4,
                      maxLife: 0.4
                    });
                  }

                  // Grip of the Undead skeleton minion rise
                  if (equippedLegendaries.has('Grip of the Undead') && ent) {
                    entitiesRef.current.push({
                      id: `skeleton-${Date.now()}-${Math.random()}`,
                      name: 'Skeleton Minion',
                      type: 'skeleton',
                      gridX: target.gridX,
                      gridY: target.gridY,
                      posX: target.posX,
                      posY: target.posY,
                      hp: 12,
                      maxHp: 12,
                      speed: 1.84,
                      attackRange: 1.2,
                      attackCooldown: 0,
                      damage: 5,
                      lifeSteal: 0,
                      tempBuffs: [],
                      color: '#e5e7eb',
                      isDead: false,
                      summonerId: ent.id
                    });
                    setCombatLog(log => [...log, `💀 Grip of the Undead raised a Skeleton Minion.`].slice(-40));
                  }

                  // Soul-Eater Vestment healing wielder
                  if (equippedLegendaries.has('Soul-Eater Vestment') && ent) {
                    const healAmt = 3 + Math.round(ent.maxHp * 0.01);
                    ent.hp = Math.min(ent.maxHp, ent.hp + healAmt);
                    if (run.livingSquad[ent.id]) {
                      run.livingSquad[ent.id].hp = ent.hp;
                    }
                    floatingTextsRef.current.push({
                      text: `+${healAmt} (Soul Eater)`,
                      x: ent.posX,
                      y: ent.posY - 12,
                      color: '#4ade80',
                      life: 1.0
                    });
                    visualEffectsRef.current.push({
                      type: 'leaf',
                      x1: ent.posX,
                      y1: ent.posY + 10,
                      x2: ent.posX,
                      y2: ent.posY - 10,
                      color: '#4ade80',
                      life: 0.3,
                      maxLife: 0.3
                    });
                  }
                }
              }

              // Process on-hit triggers for the target taking damage
              if (dmgTaken > 0 && heroTypes.has(target.type)) {
                const targetHero = roster.find(r => r.character_id === target.id);
                if (targetHero && targetHero.equipment) {
                  const targetLegendaries = new Set<string>();
                  for (const slot in targetHero.equipment) {
                    const item = targetHero.equipment[slot as EquipmentSlot];
                    if (item && item.rarity === 'Legendary') targetLegendaries.add(item.name);
                  }
                  
                  if (targetLegendaries.has('Phoenix Rebirth Ring') && Math.random() < 0.25) {
                    entities.forEach(e => {
                      if (!e.isDead && !heroTypes.has(e.type) && e.type !== 'chest' && e.type !== 'cage' && e.type !== 'portal' && e.type !== 'item_loot') {
                        const dist = Math.hypot(e.posX - target.posX, e.posY - target.posY);
                        if (dist <= 2.0 * tileSize) {
                          e.hp = Math.max(0, e.hp - 15);
                          floatingTextsRef.current.push({
                            text: `-15 (Phoenix Burst)`,
                            x: e.posX,
                            y: e.posY - 12,
                            color: '#f97316',
                            life: 1.0
                          });
                          if (e.hp <= 0) {
                            e.isDead = true;
                            setCombatLog(log => [...log, `💀 ${e.name} fell to Phoenix Rebirth Ring.`].slice(-40));
                          }
                        }
                      }
                    });
                    visualEffectsRef.current.push({
                      type: 'nova',
                      x1: target.posX,
                      y1: target.posY,
                      color: '#f97316',
                      size: 2.0 * tileSize,
                      life: 0.3,
                      maxLife: 0.3
                    });
                  }

                  if (targetLegendaries.has('Volcanic Cuirass')) {
                    if (ent && !ent.isDead && !heroTypes.has(ent.type)) {
                      ent.hp = Math.max(0, ent.hp - 12);
                      floatingTextsRef.current.push({
                        text: `-12 (Lava Burst)`,
                        x: ent.posX,
                        y: ent.posY - 12,
                        color: '#ef4444',
                        life: 1.0
                      });
                      visualEffectsRef.current.push({
                        type: 'nova',
                        x1: target.posX,
                        y1: target.posY,
                        color: '#ef4444',
                        size: 40,
                        life: 0.2,
                        maxLife: 0.2
                      });
                      if (ent.hp <= 0) {
                        ent.isDead = true;
                        setCombatLog(log => [...log, `💀 ${ent.name} was melted by Volcanic Cuirass.`].slice(-40));
                      }
                    }
                  }
                }
              }

              if (ent.type === 'warrior' && (run.selectedPowerups ?? []).includes('Marked for Death')) {
                markEntityForDeath(target);
              }

              // Fire Armor synergy: enemy hits warrior, takes fire damage back
              if (target.type === 'warrior' && isHostile) {
                const fireArmorLevel = (run.selectedPowerups ?? []).filter(p => p === 'Fire Armor').length;
                if (fireArmorLevel > 0) {
                  const retDmg = 15 + 10 * (fireArmorLevel - 1);
                  ent.hp = Math.max(0, ent.hp - retDmg);
                  
                  // Floating text on the attacker
                  floatingTextsRef.current.push({
                    text: `-${retDmg} (Fire Armor)`,
                    x: ent.posX,
                    y: ent.posY - 12,
                    color: '#ff6a00',
                    life: 1.0
                  });

                  // Add some fire particles on the attacker
                  for (let k = 0; k < 4; k++) {
                    particlesRef.current.push({
                      x: ent.posX,
                      y: ent.posY,
                      vx: (Math.random() - 0.5) * 50,
                      vy: (Math.random() - 0.5) * 50,
                      color: '#f97316',
                      size: 2 + Math.random() * 2,
                      life: 0.4
                    });
                  }

                  if (ent.hp <= 0) {
                    ent.isDead = true;
                    setCombatLog(log => [...log, `💀 ${ent.name} was consumed by Fire Armor.`].slice(-40));
                  }
                }
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

              // Warrior slash AoE damage to non-primary targets
              if (ent.type === 'warrior') {
                const slashRadius = 1.5 * tileSize;
                entities.forEach(other => {
                  if (other.id === target.id || other.isDead) return;

                  const isTargetHero = heroTypes.has(target.type);
                  const isOtherHero = heroTypes.has(other.type);
                  if (isTargetHero !== isOtherHero) return;
                  if (other.type === 'chest' || other.type === 'cage' || other.type === 'portal' || other.type === 'item_loot') return;

                  const dx = other.posX - ent.posX;
                  const dy = other.posY - ent.posY;
                  const dist = Math.sqrt(dx * dx + dy * dy);

                  if (dist <= slashRadius) {
                    const secondaryDmg = Math.round(dmg * 0.15);
                    if (secondaryDmg > 0) {
                      other.hp = Math.max(other.hp - secondaryDmg, 0);

                      if ((run.selectedPowerups ?? []).includes('Marked for Death')) {
                        markEntityForDeath(other);
                      }

                      floatingTextsRef.current.push({
                        text: `-${secondaryDmg}`,
                        x: other.posX,
                        y: other.posY - 8,
                        color: isHostile ? '#ef4444' : '#fbbf24',
                        life: 1.0
                      });

                      for (let k = 0; k < 3; k++) {
                        particlesRef.current.push({
                          x: other.posX,
                          y: other.posY,
                          vx: (Math.random() - 0.5) * 50,
                          vy: (Math.random() - 0.5) * 50,
                          color: isHostile ? '#ef4444' : '#fbbf24',
                          size: 1.5 + Math.random() * 1.5,
                          life: 0.3
                        });
                      }

                      // Track damage dealt by heroes
                      if (!isHostile) {
                        if (!run.heroDamageDealt) {
                          run.heroDamageDealt = {};
                        }
                        run.heroDamageDealt[ent.id] = (run.heroDamageDealt[ent.id] || 0) + secondaryDmg;
                        chamberDamageDealtRef.current[ent.id] = (chamberDamageDealtRef.current[ent.id] || 0) + secondaryDmg;
                      }

                      if (other.hp <= 0) {
                        other.isDead = true;
                        setCombatLog(log => [...log, `💀 ${other.name} has fallen to splash damage.`].slice(-40));

                        if (other.type === 'boss') {
                          const item = generateRandomItem(run.currentBiome, undefined, true, getOwnedLegendaries());
                          entitiesRef.current.push({
                            id: `loot-${Date.now()}-${Math.random()}`,
                            name: item.name,
                            type: 'item_loot',
                            gridX: other.gridX,
                            gridY: other.gridY,
                            posX: other.posX,
                            posY: other.posY,
                            hp: 1,
                            maxHp: 1,
                            speed: 2,
                            attackRange: 0,
                            attackCooldown: 0,
                            damage: 0,
                            lifeSteal: 0,
                            tempBuffs: [],
                            color: item.rarity === 'Legendary' ? '#ff8000' : item.rarity === 'Epic' ? '#a335ee' : item.rarity === 'Rare' ? '#0070dd' : item.rarity === 'Uncommon' ? '#1eff00' : '#ffffff',
                            isDead: false,
                            lootItem: item,
                            velX: (Math.random() - 0.5) * 10,
                            velY: -5 - Math.random() * 8,
                          });
                        }
                      }
                    }
                  }
                });
              }

              // Warrior slash VFX
              if (ent.type === 'warrior' || ent.type === 'paladin') {
                const slashAngle = Math.atan2(target.posY - ent.posY, target.posX - ent.posX);
                slashEffectsRef.current.push({
                  x: ent.posX,
                  y: ent.posY,
                  angle: slashAngle,
                  color: ent.type === 'warrior' ? '#0070dd' : '#fbbf24',
                  life: 1.0,
                  radius: ent.type === 'warrior' ? 48 : 26
                });
              }

              // --- Lifesteal: heal attacker based on lifeSteal % of damage dealt ---
              const vampBladeCountMelee = (run.selectedPowerups ?? []).filter(p => p === 'Vampiric Blade').length;
              const effectiveLifeSteal = ent.lifeSteal + 0.03 * vampBladeCountMelee;
              if (!isHostile && effectiveLifeSteal > 0) {
                const healAmount = Math.round(dmg * effectiveLifeSteal);
                if (healAmount > 0) {
                  const oldHp = ent.hp;
                  ent.hp = Math.min(ent.hp + healAmount, ent.maxHp);
                  const actualHeal = ent.hp - oldHp;
                  if (actualHeal > 0) {
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
            }

            // --- Death handling (shared by melee and projectile impact) ---
            if (target.hp <= 0) {
              target.isDead = true;
              setCombatLog(log => [...log, `💀 ${target!.name} has fallen.`].slice(-40));

              if (ent.type === 'rogue') {
                const rushLvl = countOf('Adrenaline Rush');
                if (rushLvl > 0) {
                  ent.adrenalineTimer = 4.0;
                  ent.adrenalineLevel = rushLvl;
                  floatingTextsRef.current.push({
                    text: `Adrenaline Rush!`,
                    x: ent.posX,
                    y: ent.posY - 15,
                    color: '#f43f5e',
                    life: 1.0
                  });
                }
              }
              
              if (target.type === 'boss') {
                const item = generateRandomItem(run.currentBiome, undefined, true, getOwnedLegendaries());
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
                  color: item.rarity === 'Legendary' ? '#ff8000' : item.rarity === 'Epic' ? '#a335ee' : item.rarity === 'Rare' ? '#0070dd' : item.rarity === 'Uncommon' ? '#1eff00' : '#ffffff',
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
                handleEnemyDeath(target);
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
        const isRangedHero = ent.type === 'ranger' || ent.type === 'wizard' || ent.type === 'necromancer';
        const entHero = heroTypes.has(ent.type) ? roster.find(r => r.character_id === ent.id) : null;
        const entLegendaries = new Set<string>();
        if (entHero && entHero.equipment) {
          for (const slot in entHero.equipment) {
            const item = entHero.equipment[slot as EquipmentSlot];
            if (item && item.rarity === 'Legendary') entLegendaries.add(item.name);
          }
        }

        let speedMult = 1.0;
        if (ent.frostSlowed) speedMult *= 0.75;
        if (entLegendaries.has('Treads of the Berserker')) {
          const nearbyEnemiesCount = entities.filter(e => !e.isDead && !heroTypes.has(e.type) && e.type !== 'chest' && e.type !== 'cage' && e.type !== 'portal' && e.type !== 'item_loot' && Math.hypot(e.posX - ent.posX, e.posY - ent.posY) <= 3 * tileSize).length;
          const berserkBonus = Math.min(0.30, nearbyEnemiesCount * 0.10);
          speedMult += berserkBonus;
        }

        // Adrenaline Rush: Rogue gains +30% movement speed per stack after a kill
        if (ent.type === 'rogue' && ent.adrenalineTimer && ent.adrenalineTimer > 0) {
          speedMult += 0.30 * (ent.adrenalineLevel ?? 1);
        }

        const moveSpeed = ent.speed * speedMult;

        // Archer enemies kite away from heroes when they close into melee range
        if (isArcher && target) {
          const adx = target.posX - ent.posX;
          const ady = target.posY - ent.posY;
          const adist = Math.sqrt(adx * adx + ady * ady) / tileSize;
          // If hero is too close, back away
          if (adist < 3.0) {
            const mdx = -(adx / (adist * tileSize));
            const mdy = -(ady / (adist * tileSize));
            const nextX = ent.posX + mdx * moveSpeed * tileSize * dt;
            const nextY = ent.posY + mdy * moveSpeed * tileSize * dt;
            const nextGridX = Math.floor(nextX / tileSize);
            const nextGridY = Math.floor(nextY / tileSize);
            if (grid[nextGridY]?.[nextGridX] === 0) {
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
            const teammates = heroes.filter(h => h.id !== ent.id && h.type !== 'skeleton' && h.type !== 'wolf');
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
                const nextX = ent.posX + (mdx / stepDist) * moveSpeed * 0.375 * tileSize * dt;
                const nextY = ent.posY + (mdy / stepDist) * moveSpeed * 0.375 * tileSize * dt;
                const nextGridX = Math.floor(nextX / tileSize);
                const nextGridY = Math.floor(nextY / tileSize);
 
                if (grid[nextGridY]?.[nextGridX] === 0) {
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
          const teammates = heroes.filter(h => h.id !== ent.id && h.type !== 'skeleton' && h.type !== 'wolf');
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
            const nextX = ent.posX + (mdx / stepDist) * moveSpeed * tileSize * dt;
            const nextY = ent.posY + (mdy / stepDist) * moveSpeed * tileSize * dt;
            const nextGridX = Math.floor(nextX / tileSize);
            const nextGridY = Math.floor(nextY / tileSize);
 
            if (grid[nextGridY]?.[nextGridX] === 0) {
              ent.posX = nextX;
              ent.posY = nextY;
              ent.gridX = nextGridX;
              ent.gridY = nextGridY;
            } else {
              // Sliding logic: try moving along X or Y individually if diagonal/direct path is blocked by a wall
              const nextXOnly = ent.posX + (mdx / stepDist) * moveSpeed * tileSize * dt;
              const nextGridXOnly = Math.floor(nextXOnly / tileSize);
              if (grid[ent.gridY]?.[nextGridXOnly] === 0) {
                ent.posX = nextXOnly;
                ent.gridX = nextGridXOnly;
              } else {
                const nextYOnly = ent.posY + (mdy / stepDist) * moveSpeed * tileSize * dt;
                const nextGridYOnly = Math.floor(nextYOnly / tileSize);
                if (grid[nextGridYOnly]?.[ent.gridX] === 0) {
                  ent.posY = nextYOnly;
                  ent.gridY = nextGridYOnly;
                }
              }
            }
          }
        }
      }
    }

    // Apply natural boid separation to avoid units grouping into a single dot
    const getEntityRadius = (type: string) => {
      return type === 'boss' ? 24 : type === 'chest' || type === 'cage' ? 16 : (type === 'skeleton' || type === 'wolf') ? 6 : 11;
    };

    const movingTypes = new Set([
      'ranger', 'warrior', 'wizard', 'rogue', 'paladin', 'druid', 'necromancer', 'skeleton',
      'enemy', 'archer', 'elite', 'boss'
    ]);

    const activeMovingEntities = entities.filter(e => !e.isDead && movingTypes.has(e.type));
    const separations = new Map<string, { dx: number; dy: number }>();

    for (let i = 0; i < activeMovingEntities.length; i++) {
      const ent1 = activeMovingEntities[i];
      let totalPushX = 0;
      let totalPushY = 0;
      let count = 0;
      const r1 = getEntityRadius(ent1.type);

      for (let j = 0; j < activeMovingEntities.length; j++) {
        if (i === j) continue;
        const ent2 = activeMovingEntities[j];
        const r2 = getEntityRadius(ent2.type);

        const dx = ent1.posX - ent2.posX;
        const dy = ent1.posY - ent2.posY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        const targetDist = r1 + r2;

        if (dist < targetDist) {
          count++;
          if (dist > 0.01) {
            const force = (targetDist - dist) / targetDist;
            totalPushX += (dx / dist) * force;
            totalPushY += (dy / dist) * force;
          } else {
            const angle = Math.random() * Math.PI * 2;
            totalPushX += Math.cos(angle);
            totalPushY += Math.sin(angle);
          }
        }
      }

      if (count > 0) {
        // Apply a gentle nudging force (speed in pixels per second)
        const pushX = (totalPushX / count) * 45 * dt;
        const pushY = (totalPushY / count) * 45 * dt;
        separations.set(ent1.id, { dx: pushX, dy: pushY });
      }
    }

    for (const ent of activeMovingEntities) {
      const sep = separations.get(ent.id);
      if (sep && (Math.abs(sep.dx) > 0.01 || Math.abs(sep.dy) > 0.01)) {
        const nextX = ent.posX + sep.dx;
        const nextY = ent.posY + sep.dy;
        const nextGridX = Math.floor(nextX / tileSize);
        const nextGridY = Math.floor(nextY / tileSize);

        if (grid[nextGridY]?.[nextGridX] === 0) {
          ent.posX = nextX;
          ent.posY = nextY;
          ent.gridX = nextGridX;
          ent.gridY = nextGridY;
        } else {
          // Slide along X or Y if diagonal push meets a wall
          const nextGridXOnly = Math.floor(nextX / tileSize);
          if (grid[ent.gridY]?.[nextGridXOnly] === 0) {
            ent.posX = nextX;
            ent.gridX = nextGridXOnly;
          } else {
            const nextGridYOnly = Math.floor(nextY / tileSize);
            if (grid[nextGridYOnly]?.[ent.gridX] === 0) {
              ent.posY = nextY;
              ent.gridY = nextGridYOnly;
            }
          }
        }
      }
    }

    draw();
    setTick(t => t + 1);

    loopRef.current = requestAnimationFrame(updateSimulation);
  };

  // Canvas drawing
  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate camera offset following the squad average position
    const heroes = entitiesRef.current.filter(e => !e.isDead && ['ranger', 'warrior', 'wizard', 'rogue', 'paladin', 'druid', 'necromancer'].includes(e.type));
    let avgX = 2 * tileSize;
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

    if (timeStopTimerRef.current > 0) {
      ctx.filter = 'grayscale(60%) hue-rotate(180deg)';
    }

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

      const radius = ent.type === 'boss' ? 24 : ent.type === 'chest' || ent.type === 'cage' ? 16 : (ent.type === 'skeleton' || ent.type === 'wolf') ? 6 : 11;

      // Draw status effects on entities
      if (ent.petrifiedTimer && ent.petrifiedTimer > 0) {
        ctx.save();
        ctx.fillStyle = 'rgba(148, 163, 184, 0.45)'; // gray stone shield
        ctx.beginPath();
        ctx.arc(drawX, drawY, radius + 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2.0;
        ctx.stroke();
        ctx.restore();
      }
      if (ent.frozenTombTimer && ent.frozenTombTimer > 0) {
        ctx.save();
        ctx.fillStyle = 'rgba(56, 189, 248, 0.45)'; // ice shield
        ctx.beginPath();
        ctx.arc(drawX, drawY, radius + 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 2.0;
        ctx.stroke();
        ctx.restore();
      }
      if (ent.stunTimer && ent.stunTimer > 0) {
        ctx.save();
        const time = Date.now() / 150; // rotation angle
        ctx.strokeStyle = '#eab308'; // yellow-gold stun ring
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(drawX, drawY - radius - 6, radius * 0.7, radius * 0.25, Math.PI / 8, 0, Math.PI * 2);
        ctx.stroke();

        // Draw 3 small orbiting yellow stars
        for (let i = 0; i < 3; i++) {
          const angle = time + (i * Math.PI * 2) / 3;
          const starX = drawX + Math.cos(angle) * (radius * 0.7);
          const starY = drawY - radius - 6 + Math.sin(angle) * (radius * 0.25);

          ctx.fillStyle = '#fef08a'; // bright light yellow star
          ctx.beginPath();
          ctx.arc(starX, starY, 2.0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // Draw boss telegraph indicators
      if (ent.type === 'boss' && ent.bossState) {
        ctx.save();
        if (ent.bossState === 'telegraphing') {
          const skill = ent.bossCurrentSkill;
          if (skill === 'firebreath' || skill === 'stonegaze') {
            const angle = ent.bossSkillAngle ?? 0;
            const range = (skill === 'firebreath' ? 4.5 : 5.0) * tileSize;
            const coneHalfAngle = skill === 'firebreath' ? Math.PI / 8 : Math.PI / 6;

            ctx.beginPath();
            ctx.moveTo(drawX, drawY);
            ctx.arc(drawX, drawY, range, angle - coneHalfAngle, angle + coneHalfAngle);
            ctx.closePath();
            ctx.fillStyle = skill === 'firebreath' ? 'rgba(239, 68, 68, 0.18)' : 'rgba(234, 179, 8, 0.18)';
            ctx.fill();
            ctx.strokeStyle = skill === 'firebreath' ? '#ef4444' : '#eab308';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          } else if (skill === 'earthquake') {
            const zones = ent.bossEarthquakeZones ?? [];
            zones.forEach(zone => {
              const zx = zone.x - camX;
              const zy = zone.y - camY;
              ctx.beginPath();
              ctx.arc(zx, zy, zone.radius, 0, Math.PI * 2);
              ctx.fillStyle = 'rgba(120, 113, 108, 0.2)';
              ctx.fill();
              ctx.strokeStyle = '#78716c';
              ctx.lineWidth = 1.5;
              ctx.setLineDash([4, 4]);
              ctx.stroke();
            });
          } else if (skill === 'vortex') {
            const vx = (ent.bossSkillTargetX ?? ent.posX) - camX;
            const vy = (ent.bossSkillTargetY ?? ent.posY) - camY;
            const radius = 3.0 * tileSize;
            ctx.beginPath();
            ctx.arc(vx, vy, radius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(139, 92, 246, 0.2)';
            ctx.fill();
            ctx.strokeStyle = '#8b5cf6';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([3, 3]);
            ctx.stroke();
          } else if (skill === 'icetomb') {
            const vx = (ent.bossSkillTargetX ?? ent.posX) - camX;
            const vy = (ent.bossSkillTargetY ?? ent.posY) - camY;
            ctx.beginPath();
            ctx.arc(vx, vy, 16, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
            ctx.fill();
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          } else if (skill === 'meteor') {
            const zones = ent.bossMeteorZones ?? [];
            zones.forEach(zone => {
              const zx = zone.x - camX;
              const zy = zone.y - camY;
              ctx.beginPath();
              ctx.arc(zx, zy, zone.radius, 0, Math.PI * 2);
              ctx.fillStyle = 'rgba(249, 115, 22, 0.2)';
              ctx.fill();
              ctx.strokeStyle = '#f97316';
              ctx.lineWidth = 1.5;
              ctx.setLineDash([4, 4]);
              ctx.stroke();
            });
          } else if (skill === 'timestop') {
            // Draw a clock outline shrinking/pulsing around boss
            ctx.beginPath();
            ctx.arc(drawX, drawY, 32 + (ent.bossCastTimer ?? 0) * 20, 0, Math.PI * 2);
            ctx.strokeStyle = '#a855f7';
            ctx.lineWidth = 2.0;
            ctx.stroke();
          } else if (skill === 'summon') {
            ctx.beginPath();
            ctx.arc(drawX, drawY, 40, 0, Math.PI * 2);
            ctx.strokeStyle = '#64748b';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([5, 5]);
            ctx.stroke();
          } else if (skill === 'lightning') {
            ctx.beginPath();
            ctx.arc(drawX, drawY, 30, 0, Math.PI * 2);
            ctx.strokeStyle = '#60a5fa';
            ctx.lineWidth = 2.0;
            ctx.stroke();
          } else if (skill === 'shadowclone') {
            ctx.beginPath();
            ctx.arc(drawX, drawY, 24, 0, Math.PI * 2);
            ctx.strokeStyle = '#fda4af';
            ctx.lineWidth = 2.0;
            ctx.stroke();
          }
        } else if (ent.bossState === 'casting') {
          const skill = ent.bossCurrentSkill;
          if (skill === 'firebreath') {
            const angle = ent.bossSkillAngle ?? 0;
            const range = 4.5 * tileSize;
            const coneHalfAngle = Math.PI / 8;

            ctx.beginPath();
            ctx.moveTo(drawX, drawY);
            ctx.arc(drawX, drawY, range, angle - coneHalfAngle, angle + coneHalfAngle);
            ctx.closePath();
            ctx.fillStyle = 'rgba(239, 68, 68, 0.08)';
            ctx.fill();
          } else if (skill === 'vortex') {
            const vx = (ent.bossSkillTargetX ?? ent.posX) - camX;
            const vy = (ent.bossSkillTargetY ?? ent.posY) - camY;
            const radius = 3.0 * tileSize;
            ctx.beginPath();
            ctx.arc(vx, vy, radius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(139, 92, 246, 0.08)';
            ctx.fill();
          }
        }
        ctx.restore();
      }

      if (ent.isStealthed || ent.legDuskwalkerInvisible) {
        ctx.globalAlpha = 0.35;
      } else {
        ctx.globalAlpha = 1.0;
      }
      const img = imagesRef.current[ent.type];
      if (img && img.complete) {
        // Draw cropped avatar circle
        ctx.save();
        ctx.beginPath();
        ctx.arc(drawX, drawY, radius, 0, 2 * Math.PI);
        ctx.clip();
        ctx.drawImage(img, drawX - radius, drawY - radius, radius * 2, radius * 2);
        ctx.restore();

        // Draw Druid shape overlay
        if (ent.type === 'druid' && ent.druidForm) {
          ctx.save();
          ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
          ctx.beginPath();
          ctx.arc(drawX, drawY, radius, 0, 2 * Math.PI);
          ctx.fill();

          ctx.font = '10px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const emoji = ent.druidForm === 'bear' ? '🐻' : ent.druidForm === 'werewolf' ? '🐺' : '🦉';
          ctx.fillText(emoji, drawX, drawY);
          ctx.restore();
        }

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
        } else if (ent.type === 'skeleton') {
          ctx.fillStyle = ent.isSkeletalMagi ? '#fff' : '#000';
          ctx.fillText(ent.isSkeletalMagi ? '🔮' : '💀', drawX, drawY);
        } else if (ent.type === 'wolf') {
          ctx.fillStyle = '#b5a642';
          ctx.fillText('🐺', drawX, drawY);
        }
      }

      // Draw fuchsia dashed target marker for Marked for Death
      if (ent.isMarked && !ent.isDead) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(drawX, drawY, radius + 4, 0, 2 * Math.PI);
        ctx.strokeStyle = '#d946ef'; // Fuchsia
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.restore();
      }

      // Draw Fire Armor synergy visual effect around Warrior
      if (ent.type === 'warrior' && !ent.isDead) {
        const fireArmorLevel = (activeRun?.selectedPowerups ?? []).filter(p => p === 'Fire Armor').length;
        if (fireArmorLevel > 0) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(drawX, drawY, radius + 4, 0, 2 * Math.PI);
          ctx.strokeStyle = '#ef4444'; // Bright orange-red
          ctx.lineWidth = 1.5;
          ctx.stroke();
          
          ctx.beginPath();
          ctx.arc(drawX, drawY, radius + 6, 0, 2 * Math.PI);
          ctx.strokeStyle = '#f97316'; // Orange
          ctx.lineWidth = 1.0;
          ctx.stroke();
          ctx.restore();
        }
      }

      // Draw Paladin Aura visual indicator
      if (ent.type === 'paladin' && !ent.isDead) {
        const paladinPowerups = activeRun?.selectedPowerups ?? [];
        const devotionCount = paladinPowerups.filter(p => p === 'Devotion Aura').length;
        const auraRadius = (4 + devotionCount * 2) * tileSize;
        
        ctx.save();
        ctx.beginPath();
        ctx.arc(drawX, drawY, auraRadius, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.12)'; // faint golden glow
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 10]);
        ctx.stroke();
        ctx.restore();
      }
 
      // Draw unique visual indicators around heroes wearing legendary gear
      if (['ranger','warrior','wizard','rogue','paladin','druid','necromancer'].includes(ent.type) && !ent.isDead) {
        const hero = roster.find(h => h.character_id === ent.id);
        if (hero && hero.equipment) {
          const equippedLegendaries = new Set<string>();
          for (const slot in hero.equipment) {
            const item = hero.equipment[slot as EquipmentSlot];
            if (item && item.rarity === 'Legendary') {
              equippedLegendaries.add(item.name);
            }
          }

          // 1. Aegis of the Sun (Rotating golden shield/aura around wielder)
          if (equippedLegendaries.has('Aegis of the Sun')) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(drawX, drawY, radius + 5, 0, 2 * Math.PI);
            ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
            ctx.lineWidth = 1.8;
            ctx.stroke();
            
            const angle = (Date.now() / 350) % (Math.PI * 2);
            const dotX = drawX + Math.cos(angle) * (radius + 5);
            const dotY = drawY + Math.sin(angle) * (radius + 5);
            ctx.beginPath();
            ctx.arc(dotX, dotY, 2.5, 0, 2 * Math.PI);
            ctx.fillStyle = '#fbbf24';
            ctx.fill();
            ctx.restore();
          }

          // 2. Cindermaw's Guard (Swirling fire shield outline)
          if (equippedLegendaries.has("Cindermaw's Guard")) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(drawX, drawY, radius + 3, 0, 2 * Math.PI);
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            
            const angle1 = (Date.now() / 250) % (Math.PI * 2);
            const angle2 = angle1 + Math.PI;
            ctx.beginPath();
            ctx.arc(drawX + Math.cos(angle1) * (radius + 3), drawY + Math.sin(angle1) * (radius + 3), 2, 0, 2 * Math.PI);
            ctx.fillStyle = '#ef4444';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(drawX + Math.cos(angle2) * (radius + 3), drawY + Math.sin(angle2) * (radius + 3), 2, 0, 2 * Math.PI);
            ctx.fillStyle = '#f97316';
            ctx.fill();
            ctx.restore();
          }

          // 6. Will of the Mountain (3 rotating brown stones)
          if (equippedLegendaries.has('Will of the Mountain')) {
            ctx.save();
            const angleSpeed = Date.now() / 500;
            for (let i = 0; i < 3; i++) {
              const angle = angleSpeed + (i * Math.PI * 2 / 3);
              const stoneX = drawX + Math.cos(angle) * (radius + 7);
              const stoneY = drawY + Math.sin(angle) * (radius + 7);
              ctx.beginPath();
              ctx.arc(stoneX, stoneY, 2.2, 0, 2 * Math.PI);
              ctx.fillStyle = '#78350f'; // Brown stone
              ctx.fill();
              ctx.strokeStyle = '#451a03';
              ctx.stroke();
            }
            ctx.restore();
          }

          // 12. Divine Bulwark Bubble
          if (equippedLegendaries.has('Divine Bulwark') && ent.legDivineBulwarkActive) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(drawX, drawY, radius + 4, 0, 2 * Math.PI);
            ctx.strokeStyle = '#eab308'; // Bright yellow
            ctx.lineWidth = 2.0;
            ctx.stroke();
            ctx.fillStyle = 'rgba(234, 179, 8, 0.15)';
            ctx.fill();
            ctx.restore();
          }

          // 15. Frostmourne's Edge (Frost ring under hero)
          if (equippedLegendaries.has("Frostmourne's Edge")) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(drawX, drawY, radius + 6, 0, 2 * Math.PI);
            ctx.strokeStyle = 'rgba(14, 165, 233, 0.4)'; // Sky blue
            ctx.lineWidth = 1.2;
            ctx.stroke();
            ctx.restore();
          }

          // 32. Crown of the Mad King (Small golden/red crown above wielder)
          if (equippedLegendaries.has('Crown of the Mad King')) {
            ctx.save();
            ctx.fillStyle = '#fbbf24'; // Gold
            ctx.strokeStyle = '#dc2626'; // Red outline
            ctx.lineWidth = 1;
            ctx.beginPath();
            const cx = drawX;
            const cy = drawY - radius - 20;
            ctx.moveTo(cx - 6, cy + 3);
            ctx.lineTo(cx - 8, cy - 2);
            ctx.lineTo(cx - 3, cy + 1);
            ctx.lineTo(cx, cy - 5);
            ctx.lineTo(cx + 3, cy + 1);
            ctx.lineTo(cx + 8, cy - 2);
            ctx.lineTo(cx + 6, cy + 3);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
          }

          // 30. Runic Warmace shield overlay
          if (equippedLegendaries.has('Runic Warmace') && ent.runicShield && ent.runicShield > 0) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(drawX, drawY, radius + 3, 0, 2 * Math.PI);
            ctx.strokeStyle = 'rgba(34, 211, 238, 0.5)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.restore();
          }

          // 35. Glacial Girdle shield outline
          if (equippedLegendaries.has('Glacial Girdle') && (ent.glacialShield === undefined || ent.glacialShield > 0)) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(drawX, drawY, radius + 4, 0, 2 * Math.PI);
            ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
            ctx.lineWidth = 1.2;
            ctx.stroke();
            ctx.restore();
          }

          // 21. Shadowflame Cowl purple aura
          if (equippedLegendaries.has('Shadowflame Cowl')) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(drawX, drawY, radius + 2, 0, 2 * Math.PI);
            ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
            ctx.lineWidth = 1.0;
            ctx.stroke();
            ctx.restore();
          }
        }
      }

      // Draw health bar
      const barW = ent.type === 'boss' ? 44 : (ent.type === 'skeleton' || ent.type === 'wolf') ? 12 : 22;
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

      // Reset alpha for safety
      ctx.globalAlpha = 1.0;
    });

    // Draw slash effects — sword swing trail arc
    slashEffectsRef.current.forEach(s => {
      const sx = s.x - camX;
      const sy = s.y - camY;
      const alpha = Math.max(0, s.life);
      const sweep = Math.PI * 0.4;
      const radius = s.radius ?? 26;

      // Trailing glow arc (offset behind the blade)
      ctx.beginPath();
      ctx.arc(sx, sy, radius, s.angle - sweep / 2 - 0.2, s.angle + sweep / 2 - 0.2);
      ctx.lineWidth = 7;
      ctx.strokeStyle = s.color;
      ctx.globalAlpha = alpha * 0.25;
      ctx.stroke();
      ctx.globalAlpha = 1.0;

      // Main blade trail arc
      ctx.beginPath();
      ctx.arc(sx, sy, radius, s.angle - sweep / 2, s.angle + sweep / 2);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#ffffff';
      ctx.globalAlpha = alpha * 0.85;
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    });

    // Draw projectiles with trail
    projectilesRef.current.forEach(proj => {
      const px = proj.x - camX;
      const py = proj.y - camY;
      // Draw trail
      for (let i = 0; i < proj.trail.length; i++) {
        const t = proj.trail[i];
        const tx = t.x - camX;
        const ty = t.y - camY;
        const trailAlpha = (i + 1) / (proj.trail.length + 1) * 0.5;
        const trailSize = proj.size * ((i + 1) / (proj.trail.length + 1));
        ctx.beginPath();
        ctx.arc(tx, ty, trailSize, 0, 2 * Math.PI);
        if (proj.isAoE) {
          // Dynamic fire trail: transition from yellow-orange near head to deep red/orange at the end
          const ratio = i / Math.max(1, proj.trail.length - 1);
          ctx.fillStyle = ratio < 0.3 ? '#ef4444' : ratio < 0.7 ? '#ff6a00' : '#fbbf24';
        } else {
          ctx.fillStyle = proj.color;
        }
        ctx.globalAlpha = trailAlpha;
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;
      // Draw projectile head with glow
      ctx.beginPath();
      ctx.arc(px, py, proj.size + 2, 0, 2 * Math.PI);
      if (proj.isAoE) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.4)'; // Red/Orange fire glow
      } else {
        ctx.fillStyle = proj.color + '44';
      }
      ctx.fill();
      ctx.beginPath();
      ctx.arc(px, py, proj.size, 0, 2 * Math.PI);
      if (proj.isAoE) {
        ctx.fillStyle = '#ff6a00'; // Orange head
      } else {
        ctx.fillStyle = proj.color;
      }
      ctx.fill();
    });

    // Draw particles with offset
    particlesRef.current.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x - camX, p.y - camY, p.size * 1.5, 0, 2 * Math.PI);
      ctx.fillStyle = p.color;
      ctx.fill();
    });

    // Draw Sunfire Sabatons Magma Trails
    sunfireTrailsRef.current.forEach(trail => {
      const tx = trail.x - camX;
      const ty = trail.y - camY;
      const alpha = Math.max(0.1, trail.life / 3.0);
      
      ctx.save();
      ctx.beginPath();
      ctx.arc(tx, ty, 6 + Math.sin(trail.life * 4) * 2, 0, 2 * Math.PI);
      ctx.fillStyle = '#f97316';
      ctx.globalAlpha = alpha * 0.7;
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(tx, ty, 4, 0, 2 * Math.PI);
      ctx.fillStyle = '#facc15';
      ctx.globalAlpha = alpha * 0.9;
      ctx.fill();
      ctx.restore();
    });

    // Draw Frozen Treads Ice Trails
    frozenTrailsRef.current.forEach(trail => {
      const tx = trail.x - camX;
      const ty = trail.y - camY;
      const alpha = Math.max(0.1, trail.life / 3.0);
      
      ctx.save();
      ctx.beginPath();
      ctx.arc(tx, ty, 6 + Math.cos(trail.life * 4) * 1.5, 0, 2 * Math.PI);
      ctx.fillStyle = '#0ea5e9';
      ctx.globalAlpha = alpha * 0.5;
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(tx, ty, 3.5, 0, 2 * Math.PI);
      ctx.fillStyle = '#7dd3fc';
      ctx.globalAlpha = alpha * 0.8;
      ctx.fill();
      ctx.restore();
    });

    // Draw Falling Stars
    fallingStarsRef.current.forEach(star => {
      const sx = star.x - camX;
      const sy = star.y - camY;
      
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx - 15, sy - 30);
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.4)';
      ctx.lineWidth = 3;
      ctx.stroke();
      
      ctx.beginPath();
      ctx.arc(sx, sy, 5, 0, 2 * Math.PI);
      ctx.fillStyle = '#facc15';
      ctx.fill();
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    });

    // Draw Custom Visual Effects
    visualEffectsRef.current.forEach(fx => {
      const x1 = fx.x1 - camX;
      const y1 = fx.y1 - camY;
      
      ctx.save();
      if (fx.type === 'lightning' && fx.x2 !== undefined && fx.y2 !== undefined) {
        const x2 = fx.x2 - camX;
        const y2 = fx.y2 - camY;
        const alpha = Math.max(0.1, fx.life / fx.maxLife);
        
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        
        const dist = Math.hypot(x2 - x1, y2 - y1);
        const steps = Math.floor(dist / 12);
        for (let i = 1; i < steps; i++) {
          const t = i / steps;
          const px = x1 + (x2 - x1) * t + (Math.random() - 0.5) * 8;
          const py = y1 + (y2 - y1) * t + (Math.random() - 0.5) * 8;
          ctx.lineTo(px, py);
        }
        ctx.lineTo(x2, y2);
        
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#ffffff';
        ctx.globalAlpha = alpha;
        ctx.stroke();
        
        ctx.lineWidth = 4.5;
        ctx.strokeStyle = fx.color;
        ctx.globalAlpha = alpha * 0.45;
        ctx.stroke();
      } else if (fx.type === 'laser' && fx.x2 !== undefined && fx.y2 !== undefined) {
        const x2 = fx.x2 - camX;
        const y2 = fx.y2 - camY;
        const alpha = Math.max(0.1, fx.life / fx.maxLife);
        
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#ffffff';
        ctx.globalAlpha = alpha;
        ctx.stroke();
        
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = fx.color;
        ctx.globalAlpha = alpha * 0.5;
        ctx.stroke();
      } else if (fx.type === 'nova' && fx.size) {
        const alpha = Math.max(0.1, fx.life / fx.maxLife);
        const currentSize = fx.size * (1 - fx.life / fx.maxLife);
        
        ctx.beginPath();
        ctx.arc(x1, y1, currentSize, 0, 2 * Math.PI);
        ctx.strokeStyle = fx.color;
        ctx.lineWidth = 3;
        ctx.globalAlpha = alpha * 0.7;
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(x1, y1, currentSize, 0, 2 * Math.PI);
        ctx.fillStyle = fx.color;
        ctx.globalAlpha = alpha * 0.2;
        ctx.fill();
      } else if (fx.type === 'shockwave' && fx.size) {
        const alpha = Math.max(0.1, fx.life / fx.maxLife);
        const currentSize = fx.size * (1 - fx.life / fx.maxLife);
        
        ctx.beginPath();
        ctx.arc(x1, y1, currentSize, 0, 2 * Math.PI);
        ctx.strokeStyle = '#d4d4d8';
        ctx.lineWidth = 2.0;
        ctx.globalAlpha = alpha * 0.6;
        ctx.stroke();
      } else if (fx.type === 'leaf' && fx.x2 !== undefined && fx.y2 !== undefined) {
        const x2 = fx.x2 - camX;
        const y2 = fx.y2 - camY;
        const progress = 1 - fx.life / fx.maxLife;
        const px = x1 + (x2 - x1) * progress;
        const py = y1 + (y2 - y1) * progress + Math.sin(progress * Math.PI * 2) * 15;
        
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, 2 * Math.PI);
        ctx.fillStyle = '#22c55e';
        ctx.fill();
      } else if (fx.type === 'ghost' && fx.x2 !== undefined && fx.y2 !== undefined) {
        const x2 = fx.x2 - camX;
        const y2 = fx.y2 - camY;
        const progress = 1 - fx.life / fx.maxLife;
        const px = x1 + (x2 - x1) * progress;
        const py = y1 + (y2 - y1) * progress;
        
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#a855f7';
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(px - (x2 - x1) * 0.05, py - (y2 - y1) * 0.05, 2.5, 0, 2 * Math.PI);
        ctx.fillStyle = '#c084fc';
        ctx.fill();
      }
      ctx.restore();
    });

    // Draw floating texts with offset
    floatingTextsRef.current.forEach(t => {
      ctx.font = 'bold 13px sans-serif';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.textAlign = 'center';
      ctx.strokeText(t.text, t.x - camX, t.y - camY);
      ctx.fillStyle = t.color;
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
      // Rebuild the squad entities so that any newly revived or updated squad members are correctly included and synced.
      const nonSquadEntities = entitiesRef.current.filter(ent => !squad.includes(ent.id));
      const squadEntities: SimulatedEntity[] = [];
      const startX = 2;
      const startY = 20;

      squad.forEach((heroId, idx) => {
        const hero = roster.find(h => h.character_id === heroId);
        const runStatus = activeRun.livingSquad[heroId];
        if (!hero || !runStatus || runStatus.hp <= 0) return;

        const type = hero.class.toLowerCase() as any;
        let combinedSpeed = hero.base_stats.speed_mult * (hero.class === 'RANGER' ? 1.2 : 0.9);

        // Sum speed from all equipped items
        if (hero.equipment) {
          for (const key in hero.equipment) {
            const item = hero.equipment[key as EquipmentSlot];
            if (item?.stats?.speed) combinedSpeed *= (1 + item.stats.speed / 100);
          }
        }

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

        squadEntities.push({
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
          attackRange: hero.class === 'RANGER' ? 4.5 : hero.class === 'WIZARD' ? 3.5 : hero.class === 'NECROMANCER' ? 2.0 : 1.2,
          attackCooldown: 0,
          damage: classBaseDmg + weaponDmg,
          lifeSteal,
          tempBuffs: runStatus.tempBuffs ?? [],
          color: hero.class === 'WARRIOR' ? '#0070dd' : hero.class === 'WIZARD' ? '#a335ee' : '#1eff00',
          isDead: false,
        });
      });

      entitiesRef.current = [...squadEntities, ...nonSquadEntities];
    }
    // Reset chamber-specific damage tracking
    chamberDamageDealtRef.current = {};
    squad.forEach(id => {
      chamberDamageDealtRef.current[id] = 0;
    });
    setChamberDamageDealt({ ...chamberDamageDealtRef.current });

    setRunStarted(true);
    setCombatLog(log => [...log, `Squad coordinates locked. Commencing exploration.`]);
  };

  // 1. Reset/initialize auto camp countdown if conditions change
  useEffect(() => {
    if (runStarted || !isAutoCampActive || !activeRun || showReviveModal) {
      setAutoCampCountdown(null);
      setAutoCampAction(null);
      return;
    }

    const targetAction = healedHeroes.length === 0 ? 'heal' : 'deploy';
    
    if (autoCampAction !== targetAction) {
      setAutoCampAction(targetAction);
      setAutoCampCountdown(3);
    }
  }, [runStarted, isAutoCampActive, activeRun, showReviveModal, healedHeroes, autoCampAction]);

  // 2. Countdown ticking mechanism
  useEffect(() => {
    if (autoCampCountdown === null) return;

    if (autoCampCountdown === 0) {
      if (autoCampAction === 'heal') {
        handleHealAll();
      } else if (autoCampAction === 'deploy') {
        handleStartSimulation();
      }
      setAutoCampCountdown(null);
      setAutoCampAction(null);
      return;
    }

    const timer = setTimeout(() => {
      setAutoCampCountdown(prev => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [autoCampCountdown, autoCampAction]);

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

        <button 
          className="exit-btn-pronounced flex items-center gap-1.5"
          onClick={() => setShowExitModal(true)}
        >
          <LogOut size={14} />
          Leave to Town
        </button>

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
                {healedHeroes.length > 0 ? (
                  <div className="campfire-rested-label">Rested</div>
                ) : (
                  <div className="campfire-instruction-label animate-pulse">Click Fire to Heal Party</div>
                )}
              </div>

              {/* Deploy + Exit buttons underneath fire pit */}
              <div className="campfire-deploy-wrapper">
                <label className={`auto-camp-toggle-container ${isAutoCampActive ? 'active' : ''}`}>
                  <input
                    type="checkbox"
                    className="auto-camp-checkbox"
                    checked={isAutoCampActive}
                    onChange={(e) => setIsAutoCampActive(e.target.checked)}
                  />
                  <span>
                    Auto-Heal & Deploy
                    {autoCampCountdown !== null && (
                      <span className="text-amber-400/80 text-[10px] ml-1 font-mono">
                        ({autoCampAction === 'heal' ? 'Healing' : 'Deploying'} in {autoCampCountdown}s...)
                      </span>
                    )}
                  </span>
                </label>

                <button className="deploy-btn-pronounced wide-deploy" onClick={handleStartSimulation}>
                  Deploy Squad <Compass size={14} className="inline ml-1" />
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
                        Revive<br />Ally
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

                {/* Stacked Layout: Loot Bag on top, Chamber Damage Recap underneath */}
                <div className="camp-interactive-col" style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: '1', minHeight: 0 }}>
                  {/* Scavenged Loot Bag */}
                  <div className="camp-loot-sheet" style={{ flex: '1', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    <h4 className="panel-title-yellow" style={{ borderBottom: '1px solid rgba(234, 179, 8, 0.25)', paddingBottom: '4px', margin: '0 0 8px 0' }}>
                      Loot Bag
                    </h4>
                    <div className="camp-loot-list-scroll">
                      {activeRun.runBag.length === 0 ? (
                        <div className="loot-empty-text">Empty.</div>
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
                                    ? `Swap [${item.type}]`
                                    : `Equip [${item.type}]`}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Chamber Damage Recap (Positioned underneath, small height) */}
                  <div className="camp-damage-recap-sheet" style={{
                    background: 'rgba(239, 68, 68, 0.05)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    borderRadius: '6px',
                    padding: '10px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    flexShrink: 0,
                    maxHeight: '120px'
                  }}>
                    <h4 className="panel-title-red" style={{
                      color: '#f87171',
                      borderBottom: '1px solid rgba(239, 68, 68, 0.25)',
                      paddingBottom: '4px',
                      margin: '0 0 6px 0',
                      fontFamily: "'Almendra', serif",
                      fontSize: '0.82rem',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      letterSpacing: '1px'
                    }}>
                      Chamber damage
                    </h4>
                    <div className="camp-damage-list-scroll" style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {Object.keys(chamberDamageDealt).length === 0 ? (
                        <div className="loot-empty-text" style={{ fontSize: '0.75rem' }}>No damage recorded.</div>
                      ) : (
                        Object.entries(chamberDamageDealt).map(([heroId, dmg]) => {
                          const hero = roster.find(h => h.character_id === heroId);
                          const className = hero ? hero.class.charAt(0) + hero.class.slice(1).toLowerCase() : 'Hero';
                          return (
                            <div key={heroId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', padding: '3px 6px', background: 'rgba(0,0,0,0.25)', borderRadius: '4px' }}>
                              <span style={{ color: '#fff', fontWeight: 'bold' }}>✦ {className}</span>
                              <span style={{ color: '#a0aec0', fontFamily: 'monospace' }}>
                                {dmg.toLocaleString()}<span style={{ fontSize: '0.65rem', color: '#718096' }}> dmg</span>
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
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
                className="dungeon-control-btn speed-btn"
                onClick={() => setSpeedMultiplier(prev => prev === 10 ? 5 : prev === 5 ? 3 : prev === 3 ? 2 : 1)}
                disabled={speedMultiplier <= 1}
                title="Decrease Speed"
              >
                <Rewind size={12} fill="currentColor" />
              </button>

              <button 
                className={`dungeon-control-btn play-pause-btn ${isPaused ? 'paused' : 'playing'}`}
                onClick={() => setIsPaused(!isPaused)}
                title={isPaused ? "Resume" : "Pause"}
              >
                {isPaused ? <Play size={14} fill="currentColor" style={{ marginLeft: '2px' }} /> : <Pause size={14} fill="currentColor" />}
              </button>
              
              <button 
                className="dungeon-control-btn speed-btn"
                onClick={() => setSpeedMultiplier(prev => prev === 1 ? 2 : prev === 2 ? 3 : prev === 3 ? 5 : prev === 5 ? 10 : 10)}
                disabled={speedMultiplier >= 10}
                title="Increase Speed"
              >
                <FastForward size={12} fill="currentColor" />
              </button>
              
              <span className="dungeon-controls-status">
                {isPaused ? 'Paused' : speedMultiplier > 1 ? `Playing (${speedMultiplier}x)` : 'Playing'}
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
                    const isSynergy = ['Marked for Death', 'Quick Burn', 'Fire Armor'].includes(powerup);
                    const isDefense = !isSynergy && (powerup.includes('Shield') || powerup.includes('Defense') || powerup.includes('Will') || powerup.includes('Iron') || powerup.includes('Block'));
                    const isAttack = !isSynergy && (powerup.includes('Shot') || powerup.includes('Sharpshooter') || powerup.includes('Slam') || powerup.includes('Blade') || powerup.includes('Poison') || powerup.includes('Charge') || powerup === 'Shadowstep');
                    const isMagic = !isSynergy && (powerup.includes('Mana') || powerup.includes('Fireball') || powerup.includes('Strike') || powerup === 'Skeletal Detonation');
                    const isHeal = !isSynergy && (powerup.includes('Rejuvenate') || powerup.includes('Second Wind'));

                    const baseDesc = powerupDescriptions[powerup] || 'Active team enhancement';
                    const tooltipText = count > 1 ? `${baseDesc} (${count}x total)` : baseDesc;

                    // Calculate cooldown remaining percentage
                    let cooldownPercent = 0;
                    if (powerup === 'Charge') {
                      const warrior = entitiesRef.current.find(e => e.type === 'warrior' && !e.isDead);
                      if (warrior && warrior.chargeTimer && warrior.chargeTimer > 0) {
                        const maxCd = Math.max(5, 20 - (count - 1) * 2);
                        cooldownPercent = (warrior.chargeTimer / maxCd) * 100;
                      }
                    } else if (powerup === 'Shadowstep') {
                      const rogue = entitiesRef.current.find(e => e.type === 'rogue' && !e.isDead);
                      if (rogue && rogue.shadowstepTimer && rogue.shadowstepTimer > 0) {
                        const maxCd = Math.max(4, 10 - 2 * (count - 1));
                        cooldownPercent = (rogue.shadowstepTimer / maxCd) * 100;
                      }
                    } else if (powerup === 'Skeletal Detonation') {
                      const necro = entitiesRef.current.find(e => e.type === 'necromancer' && !e.isDead);
                      if (necro && necro.necroExplosionCooldown && necro.necroExplosionCooldown > 0) {
                        const maxCd = Math.max(10, 20 - 2 * (count - 1));
                        cooldownPercent = (necro.necroExplosionCooldown / maxCd) * 100;
                      }
                    } else if (powerup === 'Wolf Pack') {
                       const druid = entitiesRef.current.find(e => e.type === 'druid' && !e.isDead);
                       if (druid && druid.druidWolfCooldown && druid.druidWolfCooldown > 0) {
                         cooldownPercent = (druid.druidWolfCooldown / 60) * 100;
                       }
                     }

                    return (
                      <div 
                        key={`${powerup}-${idx}`} 
                        className={`dungeon-powerup-item ${cooldownPercent > 0 ? 'on-cooldown' : ''}`}
                        style={cooldownPercent > 0 ? { 
                          borderColor: 'rgba(234, 88, 12, 0.75)',
                          boxShadow: '0 0 6px rgba(234, 88, 12, 0.35)'
                        } : undefined}
                      >
                        {cooldownPercent > 0 && (
                          <div 
                            className="dungeon-powerup-cooldown-overlay" 
                            style={{ width: `${cooldownPercent}%` }} 
                          />
                        )}
                        <span style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: '6px', width: '100%' }}>
                          {isSynergy && <Layers className="text-fuchsia-400" size={13} />}
                          {isDefense && <Shield className="text-blue-400" size={13} />}
                          {isAttack && <Sword className="text-green-400" size={13} />}
                          {isMagic && <Flame className="text-purple-400" size={13} />}
                          {isHeal && <Heart className="text-red-400" size={13} />}
                          {!isSynergy && !isDefense && !isAttack && !isMagic && !isHeal && <Sparkles className="text-amber-400" size={13} />}
                          <span className="powerup-name-text">{powerup}</span>
                          {count > 1 && <span className="powerup-stack-badge">x{count}</span>}
                          {(() => {
                            const isNecroSummon = ['Increase Horde', 'Skeleton Magi', 'Skeletal Detonation'].includes(powerup);
                            const isWolfSummon = powerup === 'Wolf Pack';
                            if (isNecroSummon) {
                              const activeSkeletons = entitiesRef.current.filter(e => e.type === 'skeleton' && !e.isDead).length;
                              return (
                                <span className="powerup-active-badge">
                                  💀 {activeSkeletons}
                                </span>
                              );
                            }
                            if (isWolfSummon) {
                              const activeWolves = entitiesRef.current.filter(e => e.type === 'wolf' && !e.isDead).length;
                              return (
                                <span className="powerup-active-badge wolf-theme">
                                  🐺 {activeWolves}
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </span>
                        
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
