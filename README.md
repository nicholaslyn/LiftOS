# LiftOS
# LiftOS - Strength Logger + Smart Tools

Log sets fast, get an auto rest timer, see PRs & weekly volume, and use built-in tools (warm-up wizard, plate math, 1RM). Everything runs locally in your browser - no accounts, no uploads.

## Features
- **Fast logging:** weight × reps × optional RPE; timer starts automatically
- **PRs:** e1RM / reps PR detection with a subtle confetti pop
- **History:** simple 1RM trend bars and weekly volume (last 6 weeks)
- **Tools:** Warm-up Wizard (ramp sets), Plate Visualizer (bar/plates), 1RM calculator
- **Program template:** Upper/Lower starter, editable as JSON in Settings
- **Settings:** kg/lb, bar weight, available plates, default rest times
- **Exports:** CSV of all logged sets; JSON stays in `localStorage`

## Use
Open `index.html` in your browser. Pick a **Program Day** on **Today** → log a set → timer starts.  
See **Log** for filters + CSV export. **History** shows trends. **Tools** helps calculate warm-ups & plates.  
Customize in **Settings** (units, bar, plates, program).

## Data format (localStorage)
- `lo_settings_v1`: `{ unit, rest:{main, accessory}, bar, plates[] }`
- `lo_program_v1`: `{ days:[{ name, exercises:[{name, type:'main'|'accessory'}] }] }`
- `lo_sets_v1`: `[ { id, dateISO, day, exercise, weight, reps, rpe, unit, type } ]`
- `lo_bests_v1`: `{ [exercise]: { e1RM, repsPR } }`

## Notes
- e1RM = avg(Epley, Brzycki) for stability.
- Plate math uses a greedy match with your available plates per side and shows per-side counts.
- Everything is local-first; clear with your browser’s site data if you want a full reset.

## License
MIT
