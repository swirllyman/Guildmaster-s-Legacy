# Plan: Mobile Gear Layout Optimization

## Goal
Rearrange the mobile gear/equipment screen in portrait mode to:
1. Make equipment slot icons smaller and tighter, shifted left (red box)
2. Add a stats display window on the right for the selected item (yellow box)
3. Reduce hero selector row height (orange box)

## Current Layout (vertical stack)
```
[Hero Selector Row - full width, ~56px height]
[Paperdoll Section - centered, 3-column grid, ~320px max-width]
[Gear Selection - full width, stacked below]
[Shared Inventory - full width]
```

## Proposed Layout (side-by-side paperdoll + stats)
```
[Hero Selector Row - full width, compact ~40px height]
[Paperdoll (left ~55%) | Stats Panel (right ~45%)]  <- NEW flex row
[Gear Selection - full width, stacked below]
[Shared Inventory - full width]
```

---

## Changes

### 1. `src/index.css` — Hero Selector Compact
**Lines 6082-6128**: Reduce size of hero selector row
- `.mobile-hero-selector`: reduce `padding-bottom: 12px` → `6px`, `margin-bottom: 16px` → `10px`
- `.mobile-hero-select-btn`: reduce `padding: 8px 14px` → `5px 10px`, `gap: 8px` → `5px`
- `.hero-btn-avatar`: reduce `width/height: 20px` → `16px`
- `.mobile-hero-select-btn span`: reduce `font-size: 0.8rem` → `0.7rem`

### 2. `src/index.css` — Paperdoll Compact + Left-Align
**Lines 6131-6147**: Override mobile paperdoll to be smaller and left-aligned
- `.mobile-paperdoll-section`: change `justify-content: center` → `flex-start`, reduce `padding: 12px 0 20px 0` → `8px 0`
- `.mobile-paperdoll-section .paperdoll-columns-container`: reduce `gap: 16px` → `8px`, `max-width: 320px` → `none`

### 3. `src/index.css` — New Flex Row Container
Add new class `.mobile-gear-row` to hold paperdoll + stats side by side:
```css
.mobile-gear-row {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
  align-items: flex-start;
}
```

### 4. `src/index.css` — New Mobile Stats Panel
Add new class `.mobile-slot-stats-panel` for the right-side stats display:
```css
.mobile-slot-stats-panel {
  flex: 1;
  min-width: 0;
  background: rgba(16, 26, 20, 0.75);
  border: 2px solid #22c55e;
  border-radius: 8px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 200px;
  overflow-y: auto;
}
```
With child `.mobile-stat-row` styled as compact stat rows (name + value, flex between).

### 5. `src/index.css` — Override Paperdoll Slot Size for Mobile
Inside existing `@media (max-width: 768px), (orientation: portrait)` block (line 6283+), add:
```css
.mobile-paperdoll-section .paperdoll-slot {
  width: 36px;
  height: 36px;
}
.mobile-paperdoll-section .chest-slot {
  width: 40px;
  height: 40px;
}
.mobile-paperdoll-section .paperdoll-side-column {
  margin-top: 32px;
  gap: 6px;
}
.mobile-paperdoll-section .paperdoll-center-column {
  gap: 3px;
}
.mobile-paperdoll-section .paperdoll-slot svg {
  width: 16px;
  height: 16px;
}
```

### 6. `src/components/Hub/TownScene.tsx` — Restructure JSX
**Lines 522-646**: Wrap paperdoll and add stats panel in a new flex row

Replace the current structure:
```
<div className="mobile-hero-management">
  <div className="mobile-paperdoll-section"> ... paperdoll ... </div>
  <div className="mobile-gear-selection"> ... gear list ... </div>
</div>
```

With:
```
<div className="mobile-hero-management">
  <div className="mobile-gear-row">
    <div className="mobile-paperdoll-section"> ... paperdoll ... </div>
    <div className="mobile-slot-stats-panel">
      {selectedSlot ? (
        <>
          <h4 className="panel-title-green" style={{fontSize:'0.75rem'}}>{selectedSlot} Stats</h4>
          {equippedItem ? (
            <>
              <div className="mobile-stat-item-name">{equippedItem.name}</div>
              <div className="mobile-stat-item-rarity">{equippedItem.rarity}</div>
              {equippedItem.stats.hp && <div className="mobile-stat-row"><span>HP</span><span>+{equippedItem.stats.hp}</span></div>}
              {equippedItem.stats.damage && <div className="mobile-stat-row"><span>ATK</span><span>+{equippedItem.stats.damage}</span></div>}
              {equippedItem.stats.armor && <div className="mobile-stat-row"><span>ARM</span><span>+{equippedItem.stats.armor}</span></div>}
              {equippedItem.stats.atkSpeed && <div className="mobile-stat-row"><span>Rate</span><span>+{Math.round((equippedItem.stats.atkSpeed - 1) * 100)}%</span></div>}
              {equippedItem.stats.speed && <div className="mobile-stat-row"><span>SPD</span><span>+{equippedItem.stats.speed}%</span></div>}
              {equippedItem.stats.magic && <div className="mobile-stat-row"><span>Magic</span><span>+{equippedItem.stats.magic}</span></div>}
              {equippedItem.stats.atkCooldownReduction && <div className="mobile-stat-row"><span>CDR</span><span>{Math.round(equippedItem.stats.atkCooldownReduction * 100)}%</span></div>}
            </>
          ) : (
            <div className="mobile-stat-empty">Empty slot</div>
          )}
        </>
      ) : (
        <div className="mobile-stat-empty">Select a slot</div>
      )}
    </div>
  </div>
  <div className="mobile-gear-selection"> ... gear list (unchanged) ... </div>
</div>
```

The stats panel shows the **combined hero stats** (from `getCombinedStats`) plus the **equipped item name** for the selected slot. This gives the user a quick overview of how the selected slot contributes to the hero's total stats.

### 7. `src/index.css` — Stats Panel Mobile Styles
Add inside the media query block:
```css
.mobile-stat-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.7rem;
  font-family: monospace;
  color: #718096;
  padding: 2px 0;
  border-bottom: 1px solid rgba(255,255,255,0.04);
}
.mobile-stat-row span:last-child {
  color: #fff;
  font-weight: bold;
}
.mobile-stat-item-name {
  font-family: 'Almendra', serif;
  font-size: 0.7rem;
  color: var(--accent-gold);
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px solid rgba(197, 168, 128, 0.2);
  text-align: center;
}
.mobile-stat-item-rarity {
  font-size: 0.6rem;
  color: #718096;
  text-align: center;
  text-transform: capitalize;
}
.mobile-stat-empty {
  font-size: 0.7rem;
  color: #4a5568;
  text-align: center;
  padding: 12px 0;
}
```

---

## Files Modified
1. `src/index.css` — Hero selector sizing, paperdoll sizing, new flex row + stats panel classes, media query overrides
2. `src/components/Hub/TownScene.tsx` — Restructure mobile gear JSX to wrap paperdoll + stats in flex row

## Verification
- Open the app on a mobile device or resize browser to portrait width (< 768px)
- Navigate to Gear tab
- Confirm: hero row is shorter, paperdoll icons are smaller and left-aligned, stats panel appears on the right
- Confirm: clicking a slot updates the stats panel
- Confirm: desktop layout is unchanged (all changes scoped to mobile classes)
