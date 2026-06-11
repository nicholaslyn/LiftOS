(function () {
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

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  let settings = load(KEY_SETTINGS) || structuredCopy(DEFAULT_SETTINGS);
  settings = normalizeSettings(settings);

  let program = normalizeProgram(load(KEY_PROGRAM)) || structuredCopy(STARTER_PROGRAM);
  let sets = Array.isArray(load(KEY_SETS)) ? load(KEY_SETS) : [];
  let bests = load(KEY_BESTS) || {};

  let restTick = null;
  let restEnd = 0;

  const els = {
    year: $("#year"),

    daySelect: $("#daySelect"),
    startSession: $("#startSession"),
    clearToday: $("#clearToday"),
    exerciseWrap: $("#exerciseWrap"),
    noProgram: $("#noProgram"),
    todaySummary: $("#todaySummary"),
    sessionStats: $("#sessionStats"),

    restDrawer: $("#restDrawer"),
    restTime: $("#restTime"),
    add15: $("#add15"),
    add30: $("#add30"),
    stopRest: $("#stopRest"),

    filterLift: $("#filterLift"),
    fromDate: $("#fromDate"),
    toDate: $("#toDate"),
    applyFilters: $("#applyFilters"),
    clearFilters: $("#clearFilters"),
    exportCsv: $("#exportCsv"),
    logBody: $("#logBody"),

    trendWrap: $("#trendWrap"),
    volumeBars: $("#volumeBars"),
    historySummary: $("#historySummary"),

    wuTarget: $("#wuTarget"),
    wuReps: $("#wuReps"),
    makeWarmup: $("#makeWarmup"),
    warmupList: $("#warmupList"),

    pvTarget: $("#pvTarget"),
    pvBar: $("#pvBar"),
    calcPlates: $("#calcPlates"),
    platesOut: $("#platesOut"),

    rmWeight: $("#rmWeight"),
    rmReps: $("#rmReps"),
    calcRm: $("#calcRm"),
    rmOut: $("#rmOut"),

    unitSel: $("#unitSel"),
    restMain: $("#restMain"),
    restAcc: $("#restAcc"),
    saveSettings: $("#saveSettings"),
    barWeight: $("#barWeight"),
    plateChecks: $("#plateChecks"),
    savePlates: $("#savePlates"),

    programJson: $("#programJson"),
    saveProgram: $("#saveProgram"),
    resetProgram: $("#resetProgram"),

    exportBackup: $("#exportBackup"),
    importBackup: $("#importBackup")
  };

  if (els.year) els.year.textContent = new Date().getFullYear();

  setupNavigation();
  setupToday();
  setupRestTimer();
  setupLog();
  setupTools();
  setupSettings();
  setupProgramEditor();
  setupBackup();

  populateDays();
  startSession();
  renderSettings();
  renderTodayStats();
  recalcBests();

  function setupNavigation() {
    $$(".nav-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        $$(".nav-btn").forEach((b) => b.classList.remove("active"));
        $$(".panel").forEach((p) => p.classList.remove("show"));

        btn.classList.add("active");

        const panel = $("#" + btn.dataset.tab);
        if (panel) panel.classList.add("show");

        if (btn.dataset.tab === "today") renderTodayStats();
        if (btn.dataset.tab === "log") renderLog();
        if (btn.dataset.tab === "history") renderHistory();
        if (btn.dataset.tab === "tools") initToolsDefaults();
        if (btn.dataset.tab === "settings") renderSettings();
      });
    });
  }

  function setupToday() {
    if (els.startSession) els.startSession.addEventListener("click", startSession);
    if (els.daySelect) els.daySelect.addEventListener("change", startSession);

    if (els.clearToday) {
      els.clearToday.addEventListener("click", () => {
        if (!confirm("Delete all sets logged today?")) return;

        const today = new Date().toISOString().slice(0, 10);
        sets = sets.filter((s) => s.dateISO.slice(0, 10) !== today);
        save(KEY_SETS, sets);
        recalcBests();
        startSession();
        renderTodayStats();
      });
    }

    if (els.exerciseWrap) {
      els.exerciseWrap.addEventListener("click", (event) => {
        const button = event.target.closest(".save-set");
        if (!button) return;

        const card = event.target.closest(".ex");
        const weightEl = card.querySelector(".in-weight");
        const repsEl = card.querySelector(".in-reps");
        const rpeEl = card.querySelector(".in-rpe");

        const weight = Number(weightEl.value);
        const reps = Number(repsEl.value);
        const rpeText = rpeEl.value.trim();
        const rpe = rpeText === "" ? null : Number(rpeText);

        if (!weight || weight <= 0 || !reps || reps <= 0) {
          alert("Enter weight and reps.");
          return;
        }

        if (rpe !== null && (rpe < 1 || rpe > 10)) {
          alert("RPE should be between 1 and 10.");
          return;
        }

        const day = program.days[Number(els.daySelect.value || 0)];

        const row = {
          id: makeId(),
          dateISO: new Date().toISOString(),
          day: day ? day.name : "",
          exercise: card.dataset.exercise,
          weight,
          reps,
          rpe,
          unit: settings.unit,
          type: card.dataset.type
        };

        sets.push(row);
        save(KEY_SETS, sets);

        const pr = detectPR(row.exercise, weight, reps);
        if (pr.isPR) confetti(card.querySelector(".title"));

        const list = card.querySelector(".set-list");
        list.insertAdjacentHTML("afterbegin", setListItem(row, pr.e1RM));

        repsEl.value = "";
        rpeEl.value = "";
        weightEl.select();

        updateLastSet(card, row.exercise);
        renderTodayStats();

        startRest(row.type === "main" ? settings.rest.main : settings.rest.accessory);
      });
    }
  }

  function populateDays() {
    if (!els.daySelect) return;

    if (!program.days.length) {
      els.daySelect.innerHTML = "";
      if (els.noProgram) els.noProgram.classList.remove("hide");
      return;
    }

    if (els.noProgram) els.noProgram.classList.add("hide");

    const oldValue = els.daySelect.value || "0";
    els.daySelect.innerHTML = program.days
      .map((day, i) => `<option value="${i}">${esc(day.name)}</option>`)
      .join("");

    if (program.days[Number(oldValue)]) els.daySelect.value = oldValue;
  }

  function startSession() {
    if (!els.exerciseWrap || !els.daySelect) return;

    const day = program.days[Number(els.daySelect.value || 0)];

    if (!day) {
      els.exerciseWrap.innerHTML = "";
      renderTodayStats();
      return;
    }

    els.exerciseWrap.innerHTML = day.exercises
      .map((ex) => exerciseCard(ex.name, ex.type))
      .join("");

    renderTodayStats();
  }

  function exerciseCard(name, type) {
    const last = lastSetFor(name);
    const lastText = last
      ? `Last: ${round2(last.weight)}${last.unit} × ${last.reps}${last.rpe !== null && last.rpe !== undefined ? ` @RPE ${last.rpe}` : ""} — ${shortDate(last.dateISO)}`
      : "No previous set logged.";

    return `
      <article class="ex" data-exercise="${escAttr(name)}" data-type="${escAttr(type)}">
        <header>
          <div>
            <div class="title">${esc(name)}</div>
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
            <input class="in-rpe" type="number" step="0.5" min="1" max="10" placeholder="RPE (opt)" />
            <div class="chip">${esc(settings.unit)}</div>
            <button type="button" class="btn save-set">Save Set</button>
          </div>
          <ul class="set-list"></ul>
        </div>
      </article>
    `;
  }

  function setListItem(row, estimated) {
    return `
      <li>
        ${dateTime(row.dateISO)} —
        <strong>${round2(row.weight)}${esc(row.unit)} × ${row.reps}</strong>
        ${row.rpe !== null && row.rpe !== undefined ? ` @RPE ${row.rpe}` : ""}
        · e1RM ${round1(estimated)}${esc(row.unit)}
      </li>
    `;
  }

  function updateLastSet(card, exercise) {
    const last = lastSetFor(exercise);
    const el = card.querySelector(".last-set");
    if (!last || !el) return;

    el.textContent = `Last: ${round2(last.weight)}${last.unit} × ${last.reps}${last.rpe !== null && last.rpe !== undefined ? ` @RPE ${last.rpe}` : ""} — ${shortDate(last.dateISO)}`;
  }

  function renderTodayStats() {
    if (!els.sessionStats) return;

    const today = new Date().toISOString().slice(0, 10);
    const todaySets = sets.filter((s) => s.dateISO.slice(0, 10) === today);
    const volume = todaySets.reduce((sum, s) => sum + s.weight * s.reps, 0);
    const exercises = new Set(todaySets.map((s) => s.exercise)).size;

    const top = todaySets.reduce(
      (best, s) => {
        const estimate = e1RM(s.weight, s.reps);
        return estimate > best.value ? { value: estimate, exercise: s.exercise } : best;
      },
      { value: 0, exercise: "-" }
    );

    els.sessionStats.innerHTML = `
      <div class="stat"><strong>${todaySets.length}</strong><span>Sets Today</span></div>
      <div class="stat"><strong>${Math.round(volume)}</strong><span>${esc(settings.unit)}·reps Volume</span></div>
      <div class="stat"><strong>${exercises}</strong><span>Exercises Hit</span></div>
      <div class="stat"><strong>${top.value ? round1(top.value) : "-"}</strong><span>Top e1RM${top.exercise !== "-" ? `, ${esc(top.exercise)}` : ""}</span></div>
    `;

    if (els.todaySummary) {
      const day = program.days[Number(els.daySelect?.value || 0)];
      els.todaySummary.textContent = day
        ? `${day.name} loaded. Log sets and LiftOS will track rest, PRs, and volume.`
        : "Choose a program day and start logging.";
    }
  }

  function setupRestTimer() {
    if (els.add15) els.add15.addEventListener("click", () => (restEnd += 15000));
    if (els.add30) els.add30.addEventListener("click", () => (restEnd += 30000));
    if (els.stopRest) els.stopRest.addEventListener("click", hideRest);
  }

  function startRest(seconds) {
    if (!els.restDrawer || !els.restTime) return;

    restEnd = Date.now() + seconds * 1000;
    els.restDrawer.classList.add("show");

    if (restTick) clearInterval(restTick);

    const tick = () => {
      const left = Math.max(0, restEnd - Date.now());
      els.restTime.textContent = mmss(left);

      if (left <= 0) {
        clearInterval(restTick);
        restTick = null;
        beep();
      }
    };

    tick();
    restTick = setInterval(tick, 250);
  }

  function hideRest() {
    if (els.restDrawer) els.restDrawer.classList.remove("show");
    if (restTick) clearInterval(restTick);
    restTick = null;
  }

  function beep() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "square";
      osc.frequency.value = 880;
      gain.gain.value = 0.06;

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      setTimeout(() => {
        osc.stop();
        ctx.close();
      }, 250);
    } catch {}
  }

  function setupLog() {
    if (els.applyFilters) els.applyFilters.addEventListener("click", drawLog);

    if (els.clearFilters) {
      els.clearFilters.addEventListener("click", () => {
        if (els.filterLift) els.filterLift.value = "";
        if (els.fromDate) els.fromDate.value = "";
        if (els.toDate) els.toDate.value = "";
        drawLog();
      });
    }

    if (els.exportCsv) {
      els.exportCsv.addEventListener("click", () => {
        const rows = currentLogRows();
        const csv = ["date,day,exercise,weight,reps,rpe,unit,type,e1rm"]
          .concat(
            rows.map((r) =>
              [
                r.dateISO,
                r.day || "",
                r.exercise,
                r.weight,
                r.reps,
                r.rpe ?? "",
                r.unit,
                r.type || "",
                round1(e1RM(r.weight, r.reps))
              ]
                .map(csvCell)
                .join(",")
            )
          )
          .join("\n");

        download(csv, "liftos-log.csv", "text/csv");
      });
    }

    if (els.logBody) {
      els.logBody.addEventListener("click", (event) => {
        const btn = event.target.closest(".delete-set");
        if (!btn) return;

        if (!confirm("Delete this set?")) return;

        sets = sets.filter((s) => s.id !== btn.dataset.id);
        save(KEY_SETS, sets);
        recalcBests();

        drawLog();
        startSession();
        renderTodayStats();
      });
    }
  }

  function renderLog() {
    if (!els.filterLift) return;

    const current = els.filterLift.value;
    const lifts = Array.from(new Set(sets.map((s) => s.exercise))).sort();

    els.filterLift.innerHTML =
      `<option value="">All exercises</option>` +
      lifts.map((lift) => `<option value="${escAttr(lift)}">${esc(lift)}</option>`).join("");

    if (lifts.includes(current)) els.filterLift.value = current;

    drawLog();
  }

  function currentLogRows() {
    const lift = els.filterLift ? els.filterLift.value : "";
    const from = els.fromDate && els.fromDate.value ? new Date(els.fromDate.value) : null;
    const to = els.toDate && els.toDate.value ? new Date(els.toDate.value) : null;

    return sets
      .filter((s) => {
        if (lift && s.exercise !== lift) return false;

        const d = new Date(s.dateISO);

        if (from && d < new Date(from.toDateString())) return false;

        if (to) {
          const end = new Date(new Date(to.toDateString()).getTime() + 86399000);
          if (d > end) return false;
        }

        return true;
      })
      .sort((a, b) => b.dateISO.localeCompare(a.dateISO));
  }

  function drawLog() {
    if (!els.logBody) return;

    const rows = currentLogRows();

    els.logBody.innerHTML =
      rows
        .map(
          (s) => `
        <tr>
          <td>${dateTime(s.dateISO)}</td>
          <td>${esc(s.exercise)}</td>
          <td>${round2(s.weight)} ${esc(s.unit)}</td>
          <td>${s.reps}</td>
          <td>${s.rpe ?? ""}</td>
          <td>${round1(e1RM(s.weight, s.reps))} ${esc(s.unit)}</td>
          <td class="actions">
            <button type="button" class="btn ghost danger delete-set" data-id="${escAttr(s.id)}">Delete</button>
          </td>
        </tr>
      `
        )
        .join("") || `<tr><td colspan="7" class="muted">No sets yet.</td></tr>`;
  }

  function renderHistory() {
    if (!els.trendWrap || !els.volumeBars) return;

    const mainLifts = Array.from(
      new Set(
        program.days
          .flatMap((d) => d.exercises || [])
          .filter((e) => e.type === "main")
          .map((e) => e.name)
      )
    );

    els.trendWrap.innerHTML =
      mainLifts.map((lift) => trendCard(lift)).join("") ||
      `<p class="muted">Log some main lifts to see trends.</p>`;

    const vols = weeklyVolume(6);
    const max = Math.max(1, ...vols.map((v) => v.total));

    els.volumeBars.innerHTML = vols
      .map(
        (v) => `
      <div class="bar">
        <div style="width:120px">${esc(v.week)}</div>
        <div class="meter"><div class="fill" style="width:${Math.round((v.total / max) * 100)}%"></div></div>
        <div style="width:130px;text-align:right">${Math.round(v.total)} ${esc(settings.unit)}·reps</div>
      </div>
    `
      )
      .join("");

    if (els.historySummary) {
      const totalVolume = sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
      const exerciseCount = new Set(sets.map((s) => s.exercise)).size;

      const best = Object.entries(bests).reduce(
        (top, [name, value]) => ((value.e1RM || 0) > top.e1RM ? { name, e1RM: value.e1RM } : top),
        { name: "-", e1RM: 0 }
      );

      els.historySummary.innerHTML = `
        <div class="stat"><strong>${sets.length}</strong><span>Total Sets</span></div>
        <div class="stat"><strong>${Math.round(totalVolume)}</strong><span>Total ${esc(settings.unit)}·reps</span></div>
        <div class="stat"><strong>${exerciseCount}</strong><span>Exercises Logged</span></div>
        <div class="stat"><strong>${best.e1RM ? round1(best.e1RM) : "-"}</strong><span>Best e1RM${best.name !== "-" ? `, ${esc(best.name)}` : ""}</span></div>
      `;
    }
  }

  function trendCard(lift) {
    const points = lastNBestE1RM(lift, 8);
    const max = Math.max(1, ...points.map((p) => p.e1rm));

    const bars = points
      .map(
        (p) => `
      <div class="bar">
        <div style="width:120px">${esc(p.label)}</div>
        <div class="meter"><div class="fill" style="width:${Math.round((p.e1rm / max) * 100)}%"></div></div>
        <div style="width:90px;text-align:right">${p.e1rm ? round1(p.e1rm) : "-"} ${esc(settings.unit)}</div>
      </div>
    `
      )
      .join("");

    return `<div class="card"><h3>${esc(lift)} — e1RM</h3>${bars || `<p class="muted">No data yet.</p>`}</div>`;
  }

  function lastNBestE1RM(lift, n) {
    const map = {};

    sets
      .filter((s) => s.exercise === lift)
      .forEach((s) => {
        const label = weekLabel(new Date(s.dateISO));
        const val = e1RM(s.weight, s.reps);
        map[label] = Math.max(map[label] || 0, val);
      });

    return Object.entries(map)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-n)
      .map(([label, e1rm]) => ({ label, e1rm: Math.round(e1rm) }));
  }

  function weeklyVolume(n) {
    const now = new Date();
    const out = [];

    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i * 7);

      const label = weekLabel(d);
      const total = sets
        .filter((s) => weekLabel(new Date(s.dateISO)) === label)
        .reduce((sum, s) => sum + s.weight * s.reps, 0);

      out.push({ week: label, total });
    }

    return out;
  }

  function setupTools() {
    if (els.makeWarmup) {
      els.makeWarmup.addEventListener("click", () => {
        const target = Number(els.wuTarget.value);
        const reps = Number(els.wuReps.value || 5);

        if (!target) return alert("Enter target set weight.");

        const percents = [0.4, 0.55, 0.7, 0.8, 0.9, 1.0];
        const repsSeq = [5, 3, 3, 2, 1, reps];

        els.warmupList.innerHTML = percents
          .map((p, i) => {
            const w = roundToPlateable(target * p);
            const plan = platePlan(w);
            return `<li>${w} ${esc(settings.unit)} × ${repsSeq[i]} — ${plan.html}</li>`;
          })
          .join("");
      });
    }

    if (els.calcPlates) {
      els.calcPlates.addEventListener("click", () => {
        const target = Number(els.pvTarget.value);
        const bar = Number(els.pvBar.value || settings.bar);

        if (!target) return alert("Enter target weight.");

        els.platesOut.innerHTML = platePlan(target, bar).html;
      });
    }

    if (els.calcRm) {
      els.calcRm.addEventListener("click", () => {
        const w = Number(els.rmWeight.value);
        const r = Number(els.rmReps.value || 1);

        if (!w || !r) {
          els.rmOut.textContent = "Enter weight and reps.";
          return;
        }

        els.rmOut.textContent = `Epley: ${round1(w * (1 + r / 30))} ${settings.unit} · Brzycki: ${round1(w * 36 / (37 - r))} ${settings.unit}`;
      });
    }
  }

  function initToolsDefaults() {
    if (els.pvBar) els.pvBar.value = settings.bar;
  }

  function platePlan(target, barWeight = settings.bar) {
    const perSide = (target - barWeight) / 2;

    if (perSide < 0) {
      return { html: `<span class="muted">Target &lt; bar</span>` };
    }

    let remain = perSide;
    const used = [];

    [...settings.plates]
      .sort((a, b) => b - a)
      .forEach((plate) => {
        let count = 0;

        while (remain + 1e-6 >= plate) {
          remain = round2(remain - plate);
          count++;
        }

        if (count) used.push({ plate, count });
      });

    const matched = Math.abs(remain) < 0.01;

    return {
      html: `
        <div class="line">
          <span class="plate small">Bar ${round2(barWeight)}${esc(settings.unit)}</span>
          ${used.map((u) => `<span class="plate">${round2(u.plate)}${esc(settings.unit)} × ${u.count} / side</span>`).join("")}
          ${matched ? "" : `<span class="muted">(≈ off by ${round2(remain)}${esc(settings.unit)} per side)</span>`}
        </div>
      `
    };
  }

  function roundToPlateable(x) {
    return settings.unit === "kg" ? Math.round(x * 2) / 2 : Math.round(x);
  }

  function setupSettings() {
    if (els.saveSettings) {
      els.saveSettings.addEventListener("click", () => {
        settings.unit = els.unitSel.value;
        settings.rest.main = Number(els.restMain.value || 180);
        settings.rest.accessory = Number(els.restAcc.value || 90);

        save(KEY_SETTINGS, settings);
        alert("Settings saved.");

        renderSettings();
        startSession();
      });
    }

    if (els.savePlates) {
      els.savePlates.addEventListener("click", () => {
        settings.bar = Number(els.barWeight.value || settings.bar);

        const checked = Array.from(els.plateChecks.querySelectorAll("input:checked"))
          .map((input) => Number(input.value))
          .filter(Number.isFinite)
          .sort((a, b) => b - a);

        if (checked.length) settings.plates = checked;

        save(KEY_SETTINGS, settings);
        alert("Bar & plates saved.");
        renderSettings();
      });
    }

    if (els.saveProgram) {
      els.saveProgram.addEventListener("click", () => {
        try {
          const parsed = JSON.parse(els.programJson.value);
          const clean = normalizeProgram(parsed);

          if (!clean) throw new Error("Program must have a days array.");

          program = clean;
          save(KEY_PROGRAM, program);

          populateDays();
          startSession();
          renderSettings();

          alert("Program saved.");
        } catch (err) {
          alert("Invalid JSON: " + err.message);
        }
      });
    }

    if (els.resetProgram) {
      els.resetProgram.addEventListener("click", () => {
        if (!confirm("Reset to starter program? This replaces your current program.")) return;

        program = structuredCopy(STARTER_PROGRAM);
        save(KEY_PROGRAM, program);

        populateDays();
        startSession();
        renderSettings();

        alert("Reset.");
      });
    }
  }

  function renderSettings() {
    if (els.unitSel) els.unitSel.value = settings.unit;
    if (els.restMain) els.restMain.value = settings.rest.main;
    if (els.restAcc) els.restAcc.value = settings.rest.accessory;
    if (els.barWeight) els.barWeight.value = settings.bar;

    if (els.plateChecks) {
      const options = settings.unit === "kg" ? [25, 20, 15, 10, 5, 2.5, 1.25] : [45, 35, 25, 10, 5, 2.5];

      els.plateChecks.innerHTML = options
        .map(
          (p) => `
        <label class="chip">
          <input type="checkbox" value="${p}" ${settings.plates.includes(p) ? "checked" : ""}/>
          ${p}${esc(settings.unit)}
        </label>
      `
        )
        .join("");
    }

    renderProgramEditor();

    if (els.programJson) {
      els.programJson.value = JSON.stringify(program, null, 2);
    }
  }

  function setupProgramEditor() {
    const programCard = els.programJson ? els.programJson.closest(".card") : null;
    if (!programCard || $("#programEditor")) return;

    const editor = document.createElement("div");
    editor.id = "programEditor";
    editor.className = "program-editor";

    const actions = document.createElement("div");
    actions.className = "program-actions";
    actions.innerHTML = `
      <button type="button" id="addDay" class="btn ghost">Add Day</button>
      <button type="button" id="saveVisualProgram" class="btn">Save Visual Program</button>
    `;

    programCard.insertBefore(editor, els.programJson);
    programCard.insertBefore(actions, els.programJson);

    editor.addEventListener("click", (event) => {
      const dayEl = event.target.closest(".program-day");
      if (!dayEl) return;

      syncProgramFromEditor();

      const dayIndex = Number(dayEl.dataset.dayIndex);

      if (event.target.closest(".add-exercise")) {
        program.days[dayIndex].exercises.push({ name: "New Exercise", type: "accessory" });
        renderProgramEditor();
      }

      if (event.target.closest(".remove-exercise")) {
        const exIndex = Number(event.target.closest(".program-exercise").dataset.exIndex);
        program.days[dayIndex].exercises.splice(exIndex, 1);
        renderProgramEditor();
      }

      if (event.target.closest(".remove-day")) {
        if (!confirm("Delete this day?")) return;
        program.days.splice(dayIndex, 1);
        renderProgramEditor();
      }
    });

    $("#addDay").addEventListener("click", () => {
      syncProgramFromEditor();
      program.days.push({
        name: "New Day",
        exercises: [{ name: "New Exercise", type: "main" }]
      });
      renderProgramEditor();
    });

    $("#saveVisualProgram").addEventListener("click", () => {
      syncProgramFromEditor();
      save(KEY_PROGRAM, program);
      populateDays();
      startSession();
      renderSettings();
      alert("Program saved.");
    });
  }

  function renderProgramEditor() {
    const editor = $("#programEditor");
    if (!editor) return;

    editor.innerHTML =
      program.days
        .map(
          (day, dayIndex) => `
      <div class="program-day" data-day-index="${dayIndex}">
        <div class="program-day-head">
          <label class="field program-day-name">
            <span>Day Name</span>
            <input class="program-day-input" value="${escAttr(day.name)}" />
          </label>
          <button type="button" class="btn ghost danger remove-day">Delete Day</button>
        </div>

        <div class="program-exercises">
          ${day.exercises
            .map(
              (ex, exIndex) => `
            <div class="program-exercise" data-ex-index="${exIndex}">
              <input class="program-ex-name" value="${escAttr(ex.name)}" placeholder="Exercise name" />
              <select class="program-ex-type">
                <option value="main" ${ex.type === "main" ? "selected" : ""}>Main</option>
                <option value="accessory" ${ex.type === "accessory" ? "selected" : ""}>Accessory</option>
              </select>
              <button type="button" class="btn ghost danger remove-exercise">Remove</button>
            </div>
          `
            )
            .join("")}
        </div>

        <button type="button" class="btn ghost add-exercise">Add Exercise</button>
      </div>
    `
        )
        .join("") || `<p class="muted">No days yet. Add a day to begin.</p>`;
  }

  function syncProgramFromEditor() {
    const editor = $("#programEditor");
    if (!editor) return;

    const next = { days: [] };

    editor.querySelectorAll(".program-day").forEach((dayEl) => {
      const name = dayEl.querySelector(".program-day-input").value.trim();
      if (!name) return;

      const exercises = [];

      dayEl.querySelectorAll(".program-exercise").forEach((exEl) => {
        const exName = exEl.querySelector(".program-ex-name").value.trim();
        const type = exEl.querySelector(".program-ex-type").value === "main" ? "main" : "accessory";

        if (exName) exercises.push({ name: exName, type });
      });

      next.days.push({ name, exercises });
    });

    program = normalizeProgram(next) || { days: [] };

    if (els.programJson) {
      els.programJson.value = JSON.stringify(program, null, 2);
    }
  }

  function setupBackup() {
    if (els.exportBackup) {
      els.exportBackup.addEventListener("click", () => {
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

    if (els.importBackup) {
      els.importBackup.addEventListener("change", async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        try {
          const data = JSON.parse(await file.text());

          if (!confirm("Import this backup? This replaces your current LiftOS data.")) return;

          settings = normalizeSettings(data.settings || DEFAULT_SETTINGS);
          program = normalizeProgram(data.program) || structuredCopy(STARTER_PROGRAM);
          sets = Array.isArray(data.sets) ? data.sets : [];
          bests = data.bests || {};

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
        } catch (err) {
          alert("Could not import backup: " + err.message);
        } finally {
          els.importBackup.value = "";
        }
      });
    }
  }

  function e1RM(weight, reps) {
    if (reps >= 37) return weight * (1 + reps / 30);

    const epley = weight * (1 + reps / 30);
    const brzycki = weight * 36 / (37 - reps);
    return (epley + brzycki) / 2;
  }

  function detectPR(exercise, weight, reps) {
    const estimate = e1RM(weight, reps);
    const b = bests[exercise] || { e1RM: 0, maxWeight: 0, maxReps: 0 };
    let isPR = false;

    if (estimate > (b.e1RM || 0)) {
      b.e1RM = estimate;
      isPR = true;
    }

    if (weight > (b.maxWeight || 0)) {
      b.maxWeight = weight;
      isPR = true;
    }

    if (reps > (b.maxReps || 0) && weight >= (b.maxWeight || weight) * 0.8) {
      b.maxReps = reps;
      isPR = true;
    }

    bests[exercise] = b;
    save(KEY_BESTS, bests);

    return { isPR, e1RM: estimate };
  }

  function recalcBests() {
    bests = {};

    sets.forEach((s) => {
      const b = bests[s.exercise] || { e1RM: 0, maxWeight: 0, maxReps: 0 };
      b.e1RM = Math.max(b.e1RM, e1RM(s.weight, s.reps));
      b.maxWeight = Math.max(b.maxWeight, s.weight);
      b.maxReps = Math.max(b.maxReps, s.reps);
      bests[s.exercise] = b;
    });

    save(KEY_BESTS, bests);
  }

  function lastSetFor(exercise) {
    return sets
      .filter((s) => s.exercise === exercise)
      .sort((a, b) => b.dateISO.localeCompare(a.dateISO))[0] || null;
  }

  function normalizeProgram(value) {
    if (!value || !Array.isArray(value.days)) return null;

    return {
      days: value.days
        .map((day) => ({
          name: String(day.name || "").trim(),
          exercises: Array.isArray(day.exercises)
            ? day.exercises
                .map((ex) => ({
                  name: String(ex.name || "").trim(),
                  type: ex.type === "main" ? "main" : "accessory"
                }))
                .filter((ex) => ex.name)
            : []
        }))
        .filter((day) => day.name)
    };
  }

  function normalizeSettings(value) {
    const safe = value && typeof value === "object" ? value : DEFAULT_SETTINGS;

    return {
      unit: safe.unit === "lb" ? "lb" : "kg",
      rest: {
        main: Number(safe.rest?.main || DEFAULT_SETTINGS.rest.main),
        accessory: Number(safe.rest?.accessory || DEFAULT_SETTINGS.rest.accessory)
      },
      bar: Number(safe.bar || DEFAULT_SETTINGS.bar),
      plates: Array.isArray(safe.plates) && safe.plates.length
        ? safe.plates.map(Number).filter(Number.isFinite).sort((a, b) => b - a)
        : [...DEFAULT_SETTINGS.plates]
    };
  }

  function makeId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function load(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || "null");
    } catch {
      return null;
    }
  }

  function save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function structuredCopy(value) {
    if (window.structuredClone) return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function esc(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escAttr(value) {
    return esc(value).replace(/'/g, "&#039;");
  }

  function csvCell(value) {
    return `"${String(value).replace(/"/g, '""')}"`;
  }

  function download(text, name, type) {
    const blob = new Blob([text], { type });
    const a = document.createElement("a");

    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();

    URL.revokeObjectURL(a.href);
  }

  function dateTime(iso) {
    const d = new Date(iso);
    return (
      d.toLocaleDateString(undefined, { month: "short", day: "2-digit" }) +
      " " +
      d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    );
  }

  function shortDate(iso) {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "2-digit" });
  }

  function mmss(ms) {
    const total = Math.round(ms / 1000);
    const m = String(Math.floor(total / 60)).padStart(2, "0");
    const s = String(total % 60).padStart(2, "0");
    return `${m}:${s}`;
  }

  function round1(x) {
    return Math.round(x * 10) / 10;
  }

  function round2(x) {
    return Math.round(x * 100) / 100;
  }

  function weekLabel(d) {
    const year = d.getFullYear();
    const first = new Date(year, 0, 1);
    const days = Math.floor((d - first) / 86400000);
    const week = Math.ceil((days + first.getDay() + 1) / 7);
    return `${year}-W${String(week).padStart(2, "0")}`;
  }

  function confetti(anchor) {
    if (!anchor) return;

    const box = anchor.getBoundingClientRect();

    for (let i = 0; i < 12; i++) {
      const s = document.createElement("span");

      s.textContent = "✦";
      s.style.position = "fixed";
      s.style.left = `${box.left + box.width / 2}px`;
      s.style.top = `${box.top + 6}px`;
      s.style.fontSize = "12px";
      s.style.color = i % 2 ? "#f59e0b" : "#38bdf8";
      s.style.pointerEvents = "none";
      s.style.transition = "transform .7s ease, opacity .7s ease";
      s.style.zIndex = "999";

      document.body.appendChild(s);

      requestAnimationFrame(() => {
        const dx = (Math.random() * 2 - 1) * 80;
        const dy = 60 + Math.random() * 40;
        s.style.transform = `translate(${dx}px, ${-dy}px) rotate(${Math.random() * 180}deg)`;
        s.style.opacity = "0";
      });

      setTimeout(() => s.remove(), 800);
    }
  }
})();
