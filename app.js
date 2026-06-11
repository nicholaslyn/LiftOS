(function(){
  "use strict";

  const KEY_SETS = "lo_sets_v1";
  const KEY_SETTINGS = "lo_settings_v1";
  const KEY_PROGRAM = "lo_program_v1";
  const KEY_BESTS = "lo_bests_v1";

  const DEFAULT_SETTINGS = {
    unit: "kg",
    rest: { main: 180, accessory: 90 },
    bar: 20,
    plates: [25, 20, 15, 10, 5, 2.5, 1.25]
  };

  const STARTER_PROGRAM = {
    days: [
      {
        name: "Push",
        exercises: [
          { name: "Chest Press", type: "main" },
          { name: "Incline Press", type: "main" },
          { name: "Overhead Press", type: "main" },
          { name: "Chest Flys", type: "main" },
          { name: "Lateral Raises", type: "accessory" },
          { name: "Cable Tricep Pushdown", type: "accessory" },
          { name: "Overhead Tricep Extensions", type: "accessory" }
        ]
      },
      {
        name: "Pull",
        exercises: [
          { name: "Barbell Row", type: "main" },
          { name: "Lat Pulldown", type: "main" },
          { name: "Seated Cable Rows", type: "main" },
          { name: "Face Pulls", type: "main" },
          { name: "Reverse Flys", type: "accessory" },
          { name: "Dumbbell Curls", type: "accessory" },
          { name: "Cable Curls", type: "accessory" }
        ]
      },
      {
        name: "Legs",
        exercises: [
          { name: "Back Squat", type: "main" },
          { name: "Cable Crunches", type: "main" },
          { name: "Leg Press", type: "accessory" },
          { name: "Leg Curl", type: "accessory" },
          { name: "Standing Calf Raise", type: "accessory" }
        ]
      },
      {
        name: "Upper",
        exercises: [
          { name: "Chest Press", type: "main" },
          { name: "Barbell Row", type: "main" },
          { name: "Incline Press", type: "main" },
          { name: "Lat Pulldown", type: "main" },
          { name: "Overhead Press", type: "main" },
          { name: "Seated Cable Rows", type: "main" },
          { name: "Lateral Raises", type: "accessory" },
          { name: "Face Pulls", type: "accessory" },
          { name: "Cable Tricep Pushdown", type: "accessory" },
          { name: "Dumbbell Curls", type: "accessory" }
        ]
      },
      {
        name: "Lower",
        exercises: [
          { name: "Back Squat", type: "main" },
          { name: "Leg Press", type: "main" },
          { name: "Leg Curl", type: "accessory" },
          { name: "Standing Calf Raise", type: "accessory" },
          { name: "Cable Crunches", type: "accessory" }
        ]
      }
    ]
  };

  let settings = mergeSettings(DEFAULT_SETTINGS, load(KEY_SETTINGS));
  let program = sanitizeProgram(load(KEY_PROGRAM)) || clone(STARTER_PROGRAM);
  let sets = Array.isArray(load(KEY_SETS)) ? load(KEY_SETS) : [];
  let bests = load(KEY_BESTS) || {};

  const $ = selector => document.querySelector(selector);
  const $$ = selector => Array.from(document.querySelectorAll(selector));

  const uuid = () => {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const daySelect = $("#daySelect");
  const startSessionBtn = $("#startSession");
  const clearTodayBtn = $("#clearToday");
  const exerciseWrap = $("#exerciseWrap");
  const noProgram = $("#noProgram");
  const todaySummary = $("#todaySummary");
  const sessionStats = $("#sessionStats");

  const restDrawer = $("#restDrawer");
  const restTimeEl = $("#restTime");
  const add15 = $("#add15");
  const add30 = $("#add30");
  const stopRestBtn = $("#stopRest");
  let restTick = null;
  let restEnd = 0;

  const filterLift = $("#filterLift");
  const fromDate = $("#fromDate");
  const toDate = $("#toDate");
  const applyFilters = $("#applyFilters");
  const clearFilters = $("#clearFilters");
  const exportCsv = $("#exportCsv");
  const logBody = $("#logBody");

  const trendWrap = $("#trendWrap");
  const volumeBars = $("#volumeBars");
  const historySummary = $("#historySummary");

  const wuTarget = $("#wuTarget");
  const wuReps = $("#wuReps");
  const makeWarmupBtn = $("#makeWarmup");
  const warmupList = $("#warmupList");

  const pvTarget = $("#pvTarget");
  const pvBar = $("#pvBar");
  const calcPlatesBtn = $("#calcPlates");
  const platesOut = $("#platesOut");

  const rmWeight = $("#rmWeight");
  const rmReps = $("#rmReps");
  const calcRmBtn = $("#calcRm");
  const rmOut = $("#rmOut");

  const unitSel = $("#unitSel");
  const restMain = $("#restMain");
  const restAcc = $("#restAcc");
  const saveSettingsBtn = $("#saveSettings");
  const barWeight = $("#barWeight");
  const plateChecks = $("#plateChecks");
  const savePlatesBtn = $("#savePlates");

  const programJson = $("#programJson");
  const saveProgramBtn = $("#saveProgram");
  const resetProgramBtn = $("#resetProgram");
  const exportBackupBtn = $("#exportBackup");
  const importBackupInput = $("#importBackup");

  let programEditor = $("#programEditor");
  let addDayBtn = $("#addDay");
  let saveProgramVisualBtn = $("#saveProgramVisual");

  injectProgramEditorIfMissing();

  $$(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      $$(".nav-btn").forEach(b => b.classList.remove("active"));
      $$(".panel").forEach(p => p.classList.remove("show"));

      btn.classList.add("active");

      const id = btn.dataset.tab;
      const panel = $(`#${id}`);
      if (panel) panel.classList.add("show");

      if (id === "today") {
        renderTodayStats();
      }

      if (id === "log") {
        renderLog();
      }

      if (id === "history") {
        renderHistory();
      }

      if (id === "tools") {
        initToolsDefaults();
      }

      if (id === "settings") {
        renderSettings();
      }
    });
  });

  function populateDays(){
    if (!program?.days?.length){
      if (noProgram) noProgram.classList.remove("hide");
      if (daySelect) daySelect.innerHTML = "";
      if (exerciseWrap) exerciseWrap.innerHTML = "";
      renderTodayStats();
      return;
    }

    if (noProgram) noProgram.classList.add("hide");

    const previousValue = daySelect?.value || "0";

    if (daySelect) {
      daySelect.innerHTML = program.days
        .map((day, index) => `<option value="${index}">${esc(day.name)}</option>`)
        .join("");

      if (program.days[+previousValue]) {
        daySelect.value = previousValue;
      }
    }
  }

  function startSession(){
    if (!daySelect || !exerciseWrap) return;

    const index = parseInt(daySelect.value || "0", 10);
    const day = program.days[index];

    if (!day){
      exerciseWrap.innerHTML = "";
      renderTodayStats();
      return;
    }

    exerciseWrap.innerHTML = day.exercises
      .map(exercise => exCardHTML(exercise.name, exercise.type))
      .join("");

    renderTodayStats();
  }

  function exCardHTML(exercise, type){
    const last = lastSetForExercise(exercise);
    const lastText = last
      ? `Last: ${round2(last.weight)}${last.unit} × ${last.reps}${last.rpe != null ? ` @RPE ${last.rpe}` : ""} — ${fmtDateShort(last.dateISO)}`
      : "No previous set logged.";

    return `
      <article class="ex" data-exercise="${escAttr(exercise)}" data-type="${escAttr(type)}">
        <header>
          <div>
            <div class="title">${esc(exercise)}</div>
            <div class="last-set">${esc(lastText)}</div>
          </div>

          <div class="badges">
            <span class="badge">${type === "main" ? "Main" : "Accessory"}</span>
            <span class="badge pr">PR watch</span>
          </div>
        </header>

        <div class="sets">
          <div class="set-row">
            <input class="in-weight" type="number" inputmode="decimal" min="0" step="0.5" placeholder="Weight (${esc(settings.unit)})" />
            <input class="in-reps" type="number" min="1" max="50" placeholder="Reps" />
            <input class="in-rpe" type="number" step="0.5" min="5" max="10" placeholder="RPE (opt)" />
            <div class="chip">${esc(settings.unit)}</div>
            <button type="button" class="btn save-set">Save Set</button>
          </div>

          <ul class="set-list"></ul>
        </div>
      </article>
    `;
  }

  if (exerciseWrap) {
    exerciseWrap.addEventListener("click", event => {
      const btn = event.target.closest(".save-set");
      if (!btn) return;

      const card = event.target.closest(".ex");
      const weightInput = card.querySelector(".in-weight");
      const repsInput = card.querySelector(".in-reps");
      const rpeInput = card.querySelector(".in-rpe");

      const weight = +weightInput.value || 0;
      const reps = +repsInput.value || 0;
      const rpeRaw = rpeInput.value.trim();
      const rpe = rpeRaw === "" ? null : +rpeRaw;

      if (weight <= 0 || reps <= 0) {
        alert("Enter weight and reps.");
        return;
      }

      if (rpe !== null && (rpe < 1 || rpe > 10)) {
        alert("RPE should be between 1 and 10.");
        return;
      }

      const exercise = card.dataset.exercise;
      const type = card.dataset.type;
      const selectedDay = program.days[parseInt(daySelect.value || "0", 10)]?.name || "";

      const row = {
        id: uuid(),
        dateISO: new Date().toISOString(),
        day: selectedDay,
        exercise,
        weight,
        reps,
        rpe,
        unit: settings.unit,
        type
      };

      sets.push(row);
      save(KEY_SETS, sets);

      const pr = detectPR(exercise, weight, reps);

      if (pr.isPR) {
        confetti(card.querySelector(".title"));
      }

      const list = card.querySelector(".set-list");
      list.insertAdjacentHTML("afterbegin", setListItemHTML(row, pr.e1RM));

      weightInput.select();
      repsInput.value = "";
      rpeInput.value = "";

      updateExerciseLastSet(card, exercise);
      renderTodayStats();
      startRest(type === "main" ? settings.rest.main : settings.rest.accessory);
    });
  }

  function setListItemHTML(row, estimated){
    return `
      <li>
        ${fmtDateTime(row.dateISO)} —
        <strong>${round2(row.weight)}${esc(row.unit)} × ${row.reps}</strong>
        ${row.rpe != null ? ` @RPE ${row.rpe}` : ""}
        · e1RM ${round1(estimated)}${esc(row.unit)}
      </li>
    `;
  }

  function updateExerciseLastSet(card, exercise){
    const last = lastSetForExercise(exercise);
    const el = card.querySelector(".last-set");

    if (!el || !last) return;

    el.textContent = `Last: ${round2(last.weight)}${last.unit} × ${last.reps}${last.rpe != null ? ` @RPE ${last.rpe}` : ""} — ${fmtDateShort(last.dateISO)}`;
  }

  if (startSessionBtn) {
    startSessionBtn.addEventListener("click", startSession);
  }

  if (daySelect) {
    daySelect.addEventListener("change", startSession);
  }

  if (clearTodayBtn) {
    clearTodayBtn.addEventListener("click", () => {
      if (!confirm("Delete all sets logged today?")) return;

      const today = new Date().toISOString().slice(0, 10);
      sets = sets.filter(set => set.dateISO.slice(0, 10) !== today);

      save(KEY_SETS, sets);
      recalcBests();

      $$(".set-list").forEach(ul => ul.innerHTML = "");
      startSession();
      renderTodayStats();
    });
  }

  function renderTodayStats(){
    if (!sessionStats) return;

    const today = new Date().toISOString().slice(0, 10);
    const todaySets = sets.filter(set => set.dateISO.slice(0, 10) === today);
    const volume = todaySets.reduce((sum, set) => sum + set.weight * set.reps, 0);
    const uniqueExercises = new Set(todaySets.map(set => set.exercise)).size;
    const top = todaySets.reduce((best, set) => {
      const estimated = e1RM(set.weight, set.reps);
      return estimated > best.value ? { value: estimated, label: set.exercise } : best;
    }, { value: 0, label: "-" });

    sessionStats.innerHTML = `
      <div class="stat"><strong>${todaySets.length}</strong><span>Sets Today</span></div>
      <div class="stat"><strong>${Math.round(volume)}</strong><span>${esc(settings.unit)}·reps Volume</span></div>
      <div class="stat"><strong>${uniqueExercises}</strong><span>Exercises Hit</span></div>
      <div class="stat"><strong>${top.value ? round1(top.value) : "-"}</strong><span>Top e1RM${top.label !== "-" ? `, ${esc(top.label)}` : ""}</span></div>
    `;

    if (todaySummary) {
      const selected = program.days[parseInt(daySelect?.value || "0", 10)]?.name || "Program";
      todaySummary.textContent = `${selected} loaded. Log sets and LiftOS will track rest, PRs, and volume.`;
    }
  }

  function e1RM(weight, reps){
    if (reps >= 37) return weight * (1 + reps / 30);

    const epley = weight * (1 + reps / 30);
    const brzycki = weight * 36 / (37 - reps);

    return (epley + brzycki) / 2;
  }

  function detectPR(exercise, weight, reps){
    const estimated = e1RM(weight, reps);
    const currentBest = bests[exercise] || { e1RM: 0, maxWeight: 0, maxReps: 0 };
    let isPR = false;

    if (estimated > (currentBest.e1RM || 0)) {
      currentBest.e1RM = estimated;
      isPR = true;
    }

    if (weight > (currentBest.maxWeight || 0)) {
      currentBest.maxWeight = weight;
      isPR = true;
    }

    if (reps > (currentBest.maxReps || 0) && weight >= (currentBest.maxWeight || weight) * 0.8) {
      currentBest.maxReps = reps;
      isPR = true;
    }

    bests[exercise] = currentBest;
    save(KEY_BESTS, bests);

    return { isPR, e1RM: estimated };
  }

  function recalcBests(){
    bests = {};

    sets.forEach(set => {
      const estimated = e1RM(set.weight, set.reps);
      const current = bests[set.exercise] || { e1RM: 0, maxWeight: 0, maxReps: 0 };

      current.e1RM = Math.max(current.e1RM || 0, estimated);
      current.maxWeight = Math.max(current.maxWeight || 0, set.weight);
      current.maxReps = Math.max(current.maxReps || 0, set.reps);

      bests[set.exercise] = current;
    });

    save(KEY_BESTS, bests);
  }

  function startRest(seconds){
    if (!restDrawer || !restTimeEl) return;

    restEnd = Date.now() + seconds * 1000;
    showRest();

    if (restTick) clearInterval(restTick);

    const tick = () => {
      const left = Math.max(0, restEnd - Date.now());
      restTimeEl.textContent = fmtMMSS(left);

      if (left === 0) {
        clearInterval(restTick);
        restTick = null;
        beep();
      }
    };

    tick();
    restTick = setInterval(tick, 200);
  }

  function showRest(){
    if (restDrawer) restDrawer.classList.add("show");
  }

  function hideRest(){
    if (restDrawer) restDrawer.classList.remove("show");
    if (restTick) clearInterval(restTick);
    restTick = null;
  }

  if (add15) {
    add15.addEventListener("click", () => {
      restEnd += 15000;
    });
  }

  if (add30) {
    add30.addEventListener("click", () => {
      restEnd += 30000;
    });
  }

  if (stopRestBtn) {
    stopRestBtn.addEventListener("click", hideRest);
  }

  function beep(){
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContextClass();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.type = "square";
      oscillator.frequency.value = 880;
      gain.gain.value = 0.06;

      oscillator.connect(gain);
      gain.connect(ctx.destination);

      oscillator.start();

      setTimeout(() => {
        oscillator.stop();
        ctx.close();
      }, 250);
    } catch {
      // Audio can fail if the browser blocks sound. Safe to ignore.
    }
  }

  function renderLog(){
    if (!filterLift || !logBody) return;

    const previous = filterLift.value;
    const lifts = Array.from(new Set(sets.map(set => set.exercise))).sort();

    filterLift.innerHTML = `<option value="">All exercises</option>` +
      lifts.map(lift => `<option value="${escAttr(lift)}">${esc(lift)}</option>`).join("");

    if (lifts.includes(previous)) filterLift.value = previous;

    drawLog();
  }

  function currentLogRows(){
    const liftFilter = filterLift?.value || "";
    const from = fromDate?.value ? new Date(fromDate.value) : null;
    const to = toDate?.value ? new Date(toDate.value) : null;

    return sets
      .filter(set => {
        if (liftFilter && set.exercise !== liftFilter) return false;

        const date = new Date(set.dateISO);

        if (from && date < new Date(from.toDateString())) return false;

        if (to) {
          const endOfDay = new Date(new Date(to.toDateString()).getTime() + 86399000);
          if (date > endOfDay) return false;
        }

        return true;
      })
      .sort((a, b) => b.dateISO.localeCompare(a.dateISO));
  }

  function drawLog(){
    if (!logBody) return;

    const rows = currentLogRows();

    logBody.innerHTML = rows.map(set => `
      <tr>
        <td>${fmtDateTime(set.dateISO)}</td>
        <td>${esc(set.exercise)}</td>
        <td>${round2(set.weight)} ${esc(set.unit)}</td>
        <td>${set.reps}</td>
        <td>${set.rpe ?? ""}</td>
        <td>${round1(e1RM(set.weight, set.reps))} ${esc(set.unit)}</td>
        <td class="actions">
          <button type="button" class="btn ghost danger delete-set" data-set-id="${escAttr(set.id)}">Delete</button>
        </td>
      </tr>
    `).join("") || `<tr><td colspan="7" class="muted">No sets yet.</td></tr>`;
  }

  if (logBody) {
    logBody.addEventListener("click", event => {
      const btn = event.target.closest(".delete-set");
      if (!btn) return;

      const id = btn.dataset.setId;

      if (!confirm("Delete this set?")) return;

      sets = sets.filter(set => set.id !== id);
      save(KEY_SETS, sets);
      recalcBests();

      drawLog();
      startSession();
      renderTodayStats();
    });
  }

  if (applyFilters) {
    applyFilters.addEventListener("click", drawLog);
  }

  if (clearFilters) {
    clearFilters.addEventListener("click", () => {
      if (filterLift) filterLift.value = "";
      if (fromDate) fromDate.value = "";
      if (toDate) toDate.value = "";
      drawLog();
    });
  }

  if (exportCsv) {
    exportCsv.addEventListener("click", () => {
      const rows = currentLogRows();

      const csv = ["date,day,exercise,weight,reps,rpe,unit,type,e1rm"].concat(
        rows.map(row => [
          row.dateISO,
          row.day || "",
          row.exercise,
          row.weight,
          row.reps,
          row.rpe ?? "",
          row.unit,
          row.type || "",
          round1(e1RM(row.weight, row.reps))
        ].map(csvCell).join(","))
      ).join("\n");

      download(csv, "liftos-log.csv", "text/csv");
    });
  }

  function renderHistory(){
    if (!trendWrap || !volumeBars) return;

    const mainLifts = program.days
      .flatMap(day => day.exercises || [])
      .filter(exercise => exercise.type === "main")
      .map(exercise => exercise.name);

    const uniqueMainLifts = Array.from(new Set(mainLifts));

    trendWrap.innerHTML = uniqueMainLifts
      .map(lift => trendCard(lift))
      .join("") || `<p class="muted">Log some main lifts to see trends.</p>`;

    const volumes = weeklyVolume(6);
    const maxVolume = Math.max(1, ...volumes.map(volume => volume.total));

    volumeBars.innerHTML = volumes.map(volume => `
      <div class="bar">
        <div style="width:120px">${esc(volume.week)}</div>
        <div class="meter">
          <div class="fill" style="width:${Math.round(volume.total / maxVolume * 100)}%"></div>
        </div>
        <div style="width:130px;text-align:right">${Math.round(volume.total)} ${esc(settings.unit)}·reps</div>
      </div>
    `).join("");

    renderHistorySummary();
  }

  function renderHistorySummary(){
    if (!historySummary) return;

    const totalSets = sets.length;
    const totalVolume = sets.reduce((sum, set) => sum + set.weight * set.reps, 0);
    const exerciseCount = new Set(sets.map(set => set.exercise)).size;

    const best = Object.entries(bests).reduce((top, [name, value]) => {
      return (value.e1RM || 0) > top.e1RM ? { name, e1RM: value.e1RM } : top;
    }, { name: "-", e1RM: 0 });

    historySummary.innerHTML = `
      <div class="stat"><strong>${totalSets}</strong><span>Total Sets</span></div>
      <div class="stat"><strong>${Math.round(totalVolume)}</strong><span>Total ${esc(settings.unit)}·reps</span></div>
      <div class="stat"><strong>${exerciseCount}</strong><span>Exercises Logged</span></div>
      <div class="stat"><strong>${best.e1RM ? round1(best.e1RM) : "-"}</strong><span>Best e1RM${best.name !== "-" ? `, ${esc(best.name)}` : ""}</span></div>
    `;
  }

  function trendCard(lift){
    const points = lastNBestE1RM(lift, 8);
    const max = Math.max(1, ...points.map(point => point.e1rm));

    const bars = points.map(point => `
      <div class="bar">
        <div style="width:120px">${esc(point.label)}</div>
        <div class="meter">
          <div class="fill" style="width:${Math.round(point.e1rm / max * 100)}%"></div>
        </div>
        <div style="width:90px;text-align:right">${point.e1rm ? round1(point.e1rm) : "-"} ${esc(settings.unit)}</div>
      </div>
    `).join("");

    return `
      <div class="card">
        <h3>${esc(lift)} — e1RM</h3>
        ${bars || `<p class="muted">No data yet.</p>`}
      </div>
    `;
  }

  function lastNBestE1RM(lift, count){
    const map = {};

    sets
      .filter(set => set.exercise === lift)
      .forEach(set => {
        const label = weekLabel(new Date(set.dateISO));
        const value = e1RM(set.weight, set.reps);
        map[label] = Math.max(map[label] || 0, value);
      });

    return Object.entries(map)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-count)
      .map(([label, value]) => ({ label, e1rm: Math.round(value) }));
  }

  function weeklyVolume(count){
    const now = new Date();
    const output = [];

    for (let index = count - 1; index >= 0; index--) {
      const date = new Date(now);
      date.setDate(now.getDate() - index * 7);

      const label = weekLabel(date);
      const total = sets
        .filter(set => weekLabel(new Date(set.dateISO)) === label)
        .reduce((sum, set) => sum + set.weight * set.reps, 0);

      output.push({ week: label, total });
    }

    return output;
  }

  function initToolsDefaults(){
    if (pvBar) pvBar.value = settings.bar;
  }

  if (makeWarmupBtn) {
    makeWarmupBtn.addEventListener("click", () => {
      const target = +wuTarget.value || 0;
      const reps = +wuReps.value || 5;

      if (!target) {
        alert("Enter target set weight.");
        return;
      }

      const percentages = [0.4, 0.55, 0.7, 0.8, 0.9, 1.0];
      const repsSequence = [5, 3, 3, 2, 1, reps];

      warmupList.innerHTML = percentages.map((percentage, index) => {
        const weight = roundToPlateable(target * percentage);
        const plan = platePlan(weight);

        return `
          <li>
            ${weight} ${esc(settings.unit)} × ${repsSequence[index]}
            — <span class="line">${plan.html}</span>
          </li>
        `;
      }).join("");
    });
  }

  if (calcPlatesBtn) {
    calcPlatesBtn.addEventListener("click", () => {
      const target = +pvTarget.value || 0;
      const bar = +pvBar.value || settings.bar;

      if (!target) {
        alert("Enter target weight.");
        return;
      }

      const plan = platePlan(target, bar);
      platesOut.innerHTML = plan.html || `<p class="muted">Cannot match weight with current plates.</p>`;
    });
  }

  if (calcRmBtn) {
    calcRmBtn.addEventListener("click", () => {
      const weight = +rmWeight.value || 0;
      const reps = +rmReps.value || 1;

      if (!weight || !reps) {
        rmOut.textContent = "Enter weight and reps.";
        return;
      }

      rmOut.textContent = `Epley: ${round1(weight * (1 + reps / 30))} ${settings.unit} · Brzycki: ${round1(weight * 36 / (37 - reps))} ${settings.unit}`;
    });
  }

  function platePlan(target, barWeight = settings.bar){
    const perSide = (target - barWeight) / 2;

    if (perSide < 0) {
      return { html: `<span class="muted">Target &lt; bar</span>` };
    }

    let remain = perSide;
    const used = [];
    const available = [...settings.plates].sort((a, b) => b - a);

    for (const plate of available) {
      let count = 0;

      while (remain + 1e-6 >= plate) {
        remain = round2(remain - plate);
        count++;
      }

      if (count) used.push({ plate, count });
    }

    const matched = Math.abs(remain) < 0.01;

        const html = `
      <div class="line">
        <span class="plate small">Bar ${round2(barWeight)}${esc(settings.unit)}</span>
        ${used.map(item => `<span class="plate">${round2(item.plate)}${esc(settings.unit)} × ${item.count} / side</span>`).join("")}
        ${matched ? "" : `<span class="muted">(≈ off by ${round2(remain)}${esc(settings.unit)} per side)</span>`}
      </div>
    `;

    return { html };
  }

  function roundToPlateable(value){
    return settings.unit === "kg" ? Math.round(value * 2) / 2 : Math.round(value);
  }

  function renderSettings(){
    if (unitSel) unitSel.value = settings.unit;
    if (restMain) restMain.value = settings.rest.main;
    if (restAcc) restAcc.value = settings.rest.accessory;
    if (barWeight) barWeight.value = settings.bar;

    if (plateChecks) {
      const defaultPlates = settings.unit === "kg"
        ? [25, 20, 15, 10, 5, 2.5, 1.25]
        : [45, 35, 25, 10, 5, 2.5];

      plateChecks.innerHTML = defaultPlates.map(plate => {
        const checked = settings.plates.includes(plate);

        return `
          <label class="chip">
            <input type="checkbox" value="${plate}" ${checked ? "checked" : ""}/>
            ${plate}${esc(settings.unit)}
          </label>
        `;
      }).join("");
    }

    renderProgramEditor();

    if (programJson) {
      programJson.value = JSON.stringify(program, null, 2);
    }
  }

  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener("click", () => {
      settings.unit = unitSel.value;
      settings.rest.main = Math.max(0, +restMain.value || 180);
      settings.rest.accessory = Math.max(0, +restAcc.value || 90);

      save(KEY_SETTINGS, settings);
      alert("Settings saved.");

      startSession();
      renderSettings();
      renderTodayStats();
    });
  }

  if (savePlatesBtn) {
    savePlatesBtn.addEventListener("click", () => {
      settings.bar = Math.max(0, +barWeight.value || settings.bar);

      const selected = Array.from(plateChecks.querySelectorAll("input[type=checkbox]:checked"))
        .map(input => +input.value)
        .sort((a, b) => b - a);

      settings.plates = selected.length ? selected : settings.plates;

      save(KEY_SETTINGS, settings);
      alert("Bar & plates saved.");

      renderSettings();
    });
  }

  function injectProgramEditorIfMissing(){
    if (!programJson) return;

    const card = programJson.closest(".card");
    if (!card) return;

    if (!$("#programEditor")) {
      const wrapper = document.createElement("div");

      wrapper.innerHTML = `
        <div id="programEditor" class="program-editor"></div>

        <div class="program-actions">
          <button type="button" id="addDay" class="btn ghost">Add Day</button>
          <button type="button" id="saveProgramVisual" class="btn">Save Visual Program</button>
        </div>

        <details class="advanced-program" open>
          <summary>Advanced JSON editor</summary>
        </details>
      `;

      const editor = wrapper.querySelector("#programEditor");
      const actions = wrapper.querySelector(".program-actions");
      const details = wrapper.querySelector(".advanced-program");

      card.insertBefore(editor, programJson);
      card.insertBefore(actions, programJson);

      details.appendChild(programJson);

      const existingRight = card.querySelector(".right");
      if (existingRight) details.appendChild(existingRight);

      card.appendChild(details);
    }

    programEditor = $("#programEditor");
    addDayBtn = $("#addDay");
    saveProgramVisualBtn = $("#saveProgramVisual");
  }

  function renderProgramEditor(){
    if (!programEditor) return;

    if (!program?.days) program = { days: [] };

    programEditor.innerHTML = program.days.map((day, dayIndex) => `
      <div class="program-day" data-day-index="${dayIndex}">
        <div class="program-day-head">
          <label class="field program-day-name">
            <span>Day Name</span>
            <input class="program-day-input" value="${escAttr(day.name)}" />
          </label>

          <button type="button" class="btn ghost danger remove-day">Delete Day</button>
        </div>

        <div class="program-exercises">
          ${(day.exercises || []).map((exercise, exerciseIndex) => `
            <div class="program-exercise" data-ex-index="${exerciseIndex}">
              <input class="program-ex-name" value="${escAttr(exercise.name)}" placeholder="Exercise name" />

              <select class="program-ex-type">
                <option value="main" ${exercise.type === "main" ? "selected" : ""}>Main</option>
                <option value="accessory" ${exercise.type === "accessory" ? "selected" : ""}>Accessory</option>
              </select>

              <button type="button" class="btn ghost danger remove-exercise">Remove</button>
            </div>
          `).join("")}
        </div>

        <button type="button" class="btn ghost add-exercise">Add Exercise</button>
      </div>
    `).join("") || `<p class="muted">No days yet. Add a day to start building your program.</p>`;
  }

  function syncProgramFromEditor(){
    const next = { days: [] };

    $$(".program-day").forEach(dayEl => {
      const name = dayEl.querySelector(".program-day-input").value.trim();
      if (!name) return;

      const exercises = [];

      dayEl.querySelectorAll(".program-exercise").forEach(exEl => {
        const exName = exEl.querySelector(".program-ex-name").value.trim();
        const type = exEl.querySelector(".program-ex-type").value;

        if (!exName) return;

        exercises.push({
          name: exName,
          type: type === "main" ? "main" : "accessory"
        });
      });

      next.days.push({ name, exercises });
    });

    program = sanitizeProgram(next) || { days: [] };

    save(KEY_PROGRAM, program);
    populateDays();
    startSession();

    if (programJson) {
      programJson.value = JSON.stringify(program, null, 2);
    }
  }

  if (programEditor) {
    programEditor.addEventListener("click", event => {
      const dayEl = event.target.closest(".program-day");
      if (!dayEl) return;

      const dayIndex = +dayEl.dataset.dayIndex;

      if (event.target.closest(".add-exercise")) {
        syncProgramFromEditor();

        program.days[dayIndex].exercises.push({
          name: "New Exercise",
          type: "accessory"
        });

        renderProgramEditor();
        return;
      }

      if (event.target.closest(".remove-exercise")) {
        syncProgramFromEditor();

        const exEl = event.target.closest(".program-exercise");
        const exIndex = +exEl.dataset.exIndex;

        program.days[dayIndex].exercises.splice(exIndex, 1);
        renderProgramEditor();
        return;
      }

      if (event.target.closest(".remove-day")) {
        if (!confirm("Delete this day and all its exercises?")) return;

        syncProgramFromEditor();
        program.days.splice(dayIndex, 1);
        renderProgramEditor();
      }
    });
  }

  if (addDayBtn) {
    addDayBtn.addEventListener("click", () => {
      syncProgramFromEditor();

      program.days.push({
        name: "New Day",
        exercises: [
          { name: "New Exercise", type: "main" }
        ]
      });

      renderProgramEditor();
    });
  }

  if (saveProgramVisualBtn) {
    saveProgramVisualBtn.addEventListener("click", () => {
      syncProgramFromEditor();
      alert("Program saved.");
    });
  }

  if (saveProgramBtn) {
    saveProgramBtn.addEventListener("click", () => {
      try {
        const parsed = JSON.parse(programJson.value);
        const clean = sanitizeProgram(parsed);

        if (!clean) {
          throw new Error("Program must have a days array.");
        }

        program = clean;
        save(KEY_PROGRAM, program);

        populateDays();
        startSession();
        renderSettings();

        alert("Program saved.");
      } catch (error) {
        alert("Invalid JSON: " + error.message);
      }
    });
  }

  if (resetProgramBtn) {
    resetProgramBtn.addEventListener("click", () => {
      if (!confirm("Reset to starter program? This will replace your current program.")) return;

      program = clone(STARTER_PROGRAM);
      save(KEY_PROGRAM, program);

      populateDays();
      startSession();
      renderSettings();

      alert("Reset.");
    });
  }

  if (exportBackupBtn) {
    exportBackupBtn.addEventListener("click", () => {
      const backup = {
        app: "LiftOS",
        version: 1,
        exportedAt: new Date().toISOString(),
        settings,
        program,
        sets,
        bests
      };

      download(JSON.stringify(backup, null, 2), "liftos-backup.json", "application/json");
    });
  }

  if (importBackupInput) {
    importBackupInput.addEventListener("change", async event => {
      const file = event.target.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (!confirm("Import this backup? This will replace your current LiftOS data.")) {
          importBackupInput.value = "";
          return;
        }

        const importedSettings = mergeSettings(DEFAULT_SETTINGS, data.settings);
        const importedProgram = sanitizeProgram(data.program);
        const importedSets = Array.isArray(data.sets) ? data.sets : [];
        const importedBests = data.bests && typeof data.bests === "object" ? data.bests : {};

        if (!importedProgram) {
          throw new Error("Backup is missing a valid program.");
        }

        settings = importedSettings;
        program = importedProgram;
        sets = importedSets;
        bests = importedBests;

        save(KEY_SETTINGS, settings);
        save(KEY_PROGRAM, program);
        save(KEY_SETS, sets);
        save(KEY_BESTS, bests);

        recalcBests();
        populateDays();
        startSession();
        renderSettings();
        renderTodayStats();

        alert("Backup imported.");
      } catch (error) {
        alert("Could not import backup: " + error.message);
      } finally {
        importBackupInput.value = "";
      }
    });
  }

  function lastSetForExercise(exercise){
    return sets
      .filter(set => set.exercise === exercise)
      .sort((a, b) => b.dateISO.localeCompare(a.dateISO))[0] || null;
  }

  function sanitizeProgram(value){
    if (!value || !Array.isArray(value.days)) return null;

    const days = value.days
      .map(day => {
        const name = String(day.name || "").trim();
        const exercises = Array.isArray(day.exercises) ? day.exercises : [];

        return {
          name,
          exercises: exercises
            .map(exercise => ({
              name: String(exercise.name || "").trim(),
              type: exercise.type === "main" ? "main" : "accessory"
            }))
            .filter(exercise => exercise.name)
        };
      })
      .filter(day => day.name);

    return { days };
  }

  function mergeSettings(defaults, incoming){
    const safe = incoming && typeof incoming === "object" ? incoming : {};

    return {
      unit: safe.unit === "lb" ? "lb" : "kg",
      rest: {
        main: Number.isFinite(+safe.rest?.main) ? +safe.rest.main : defaults.rest.main,
        accessory: Number.isFinite(+safe.rest?.accessory) ? +safe.rest.accessory : defaults.rest.accessory
      },
      bar: Number.isFinite(+safe.bar) ? +safe.bar : defaults.bar,
      plates: Array.isArray(safe.plates) && safe.plates.length
        ? safe.plates.map(Number).filter(Number.isFinite).sort((a, b) => b - a)
        : [...defaults.plates]
    };
  }

  function load(key){
    try {
      return JSON.parse(localStorage.getItem(key) || "null");
    } catch {
      return null;
    }
  }

  function save(key, value){
    localStorage.setItem(key, JSON.stringify(value));
  }

  function clone(value){
    if (window.structuredClone) return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function esc(value){
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escAttr(value){
    return esc(value).replace(/'/g, "&#039;");
  }

  function csvCell(value){
    return `"${String(value).replace(/"/g, '""')}"`;
  }

  function download(text, name, type = "text/plain"){
    const blob = new Blob([text], { type });
    const anchor = document.createElement("a");

    anchor.href = URL.createObjectURL(blob);
    anchor.download = name;
    anchor.click();

    URL.revokeObjectURL(anchor.href);
  }

  function fmtDateTime(iso){
    const date = new Date(iso);

    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "2-digit"
    }) + " " + date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function fmtDateShort(iso){
    const date = new Date(iso);

    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "2-digit"
    });
  }

  function fmtMMSS(ms){
    const seconds = Math.round(ms / 1000);
    const minutes = String(Math.floor(seconds / 60)).padStart(2, "0");
    const remainingSeconds = String(seconds % 60).padStart(2, "0");

    return `${minutes}:${remainingSeconds}`;
  }

  function round1(value){
    return Math.round(value * 10) / 10;
  }

  function round2(value){
    return Math.round(value * 100) / 100;
  }

  function weekLabel(date){
    const year = date.getFullYear();
    const first = new Date(year, 0, 1);
    const days = Math.floor((date - first) / 86400000);
    const week = Math.ceil((days + first.getDay() + 1) / 7);

    return `${year}-W${String(week).padStart(2, "0")}`;
  }

  function confetti(anchor){
    if (!anchor) return;

    const box = anchor.getBoundingClientRect();

    for (let index = 0; index < 12; index++) {
      const sparkle = document.createElement("span");

      sparkle.textContent = "✦";
      sparkle.style.position = "fixed";
      sparkle.style.left = `${box.left + box.width / 2}px`;
      sparkle.style.top = `${box.top + 6}px`;
      sparkle.style.fontSize = "12px";
      sparkle.style.color = index % 2 ? "#f59e0b" : "#38bdf8";
      sparkle.style.pointerEvents = "none";
      sparkle.style.transition = "transform .7s ease, opacity .7s ease";
      sparkle.style.zIndex = "999";

      document.body.appendChild(sparkle);

      requestAnimationFrame(() => {
        const dx = (Math.random() * 2 - 1) * 80;
        const dy = 60 + Math.random() * 40;

        sparkle.style.transform = `translate(${dx}px, ${-dy}px) rotate(${Math.random() * 180}deg)`;
        sparkle.style.opacity = "0";
      });

      setTimeout(() => sparkle.remove(), 800);
    }
  }

  populateDays();
  startSession();
  renderSettings();
  renderTodayStats();
  recalcBests();

  const todayPanel = $("#today");
  if (todayPanel) todayPanel.classList.add("show");
})();
