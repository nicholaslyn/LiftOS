// LiftOS — robust, no-libs, localStorage-only
(function(){
  /* ---------- Storage & defaults ---------- */
  const KEY_SETS = "lo_sets_v1";
  const KEY_SETTINGS = "lo_settings_v1";
  const KEY_PROGRAM = "lo_program_v1";
  const KEY_BESTS = "lo_bests_v1";

  const DEFAULT_SETTINGS = {
    unit: "kg",
    rest: { main: 180, accessory: 90 },
    bar: 20,
    plates: [25,20,15,10,5,2.5,1.25] // per side
  };

  const STARTER_PROGRAM = {
    days: [
      { name: "Upper", exercises: [
        { name: "Bench Press", type: "main" },
        { name: "Barbell Row", type: "main" },
        { name: "Incline DB Press", type: "accessory" },
        { name: "Lateral Raise", type: "accessory" },
      ]},
      { name: "Lower", exercises: [
        { name: "Back Squat", type: "main" },
        { name: "Romanian Deadlift", type: "main" },
        { name: "Leg Press", type: "accessory" },
        { name: "Calf Raise", type: "accessory" },
      ]},
    ]
  };

  // state
  let settings = load(KEY_SETTINGS) || { ...DEFAULT_SETTINGS };
  let program  = load(KEY_PROGRAM)  || { ...STARTER_PROGRAM };
  let sets     = load(KEY_SETS)     || [];   // {id,dateISO,day,exercise,weight,reps,rpe,unit,type}
  let bests    = load(KEY_BESTS)    || {};   // { [exercise]: { e1RM, repsPR } }

  /* ---------- DOM helpers ---------- */
  const $  = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const uuid = () => (crypto && crypto.randomUUID) ? crypto.randomUUID() : (Date.now()+"-"+Math.random().toString(16).slice(2));

  const yearEl = $("#year"); if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Tabs ---------- */
  $$(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      $$(".nav-btn").forEach(b => b.classList.remove("active"));
      $$(".panel").forEach(p => p.classList.remove("show"));
      btn.classList.add("active");
      const id = btn.dataset.tab;
      $("#"+id).classList.add("show");
      if (id === "log") renderLog();
      if (id === "history") renderHistory();
      if (id === "tools") initToolsDefaults();
      if (id === "settings") renderSettings();
    });
  });

  /* ---------- TODAY ---------- */
  const daySelect = $("#daySelect");
  const startSessionBtn = $("#startSession");
  const clearTodayBtn = $("#clearToday");
  const exerciseWrap = $("#exerciseWrap");
  const noProgram = $("#noProgram");

  function populateDays(){
    if (!program?.days?.length){ noProgram.classList.remove("hide"); daySelect.innerHTML=""; return; }
    noProgram.classList.add("hide");
    daySelect.innerHTML = program.days.map((d,i)=>`<option value="${i}">${esc(d.name)}</option>`).join("");
  }

  function exCardHTML(exercise, type){
    const typeBadge = `<span class="badge">${type==="main"?"Main":"Accessory"}</span>`;
    const prBadge   = `<span class="badge pr">PR watch</span>`;
    return `
      <article class="ex" data-exercise="${esc(exercise)}" data-type="${esc(type)}">
        <header>
          <div class="title">${esc(exercise)}</div>
          <div class="badges">${typeBadge} ${prBadge}</div>
        </header>
        <div class="sets">
          <div class="set-row">
            <input class="in-weight" type="number" inputmode="decimal" placeholder="Weight (${settings.unit})" />
            <input class="in-reps"   type="number" min="1" max="50" placeholder="Reps" />
            <input class="in-rpe"    type="number" step="0.5" min="5" max="10" placeholder="RPE (opt)" />
            <div class="chip">${esc(settings.unit)}</div>
            <button type="button" class="btn save-set">Save Set</button>
          </div>
          <ul class="set-list"></ul>
        </div>
      </article>
    `;
  }

  function startSession(){
    const idx = parseInt(daySelect.value || "0", 10);
    const day = program.days[idx];
    if (!day){ exerciseWrap.innerHTML=""; return; }
    exerciseWrap.innerHTML = day.exercises.map(e => exCardHTML(e.name, e.type)).join("");
  }

  // delegate clicks for Save Set (so it always works)
  exerciseWrap.addEventListener("click", (ev) => {
    const btn = ev.target.closest(".save-set");
    if (!btn) return;
    const card = ev.target.closest(".ex");
    const weight = +card.querySelector(".in-weight").value || 0;
    const reps   = +card.querySelector(".in-reps").value   || 0;
    const rpeRaw = card.querySelector(".in-rpe").value.trim();
    const rpe    = rpeRaw === "" ? null : +rpeRaw;
    const exercise = card.dataset.exercise;
    const type     = card.dataset.type;

    if (weight <= 0 || reps <= 0) { alert("Enter weight and reps."); return; }

    const row = {
      id: uuid(),
      dateISO: new Date().toISOString(),
      day: program.days[parseInt(daySelect.value||"0",10)]?.name || "",
      exercise, weight, reps, rpe, unit: settings.unit, type
    };
    sets.push(row); save(KEY_SETS, sets);

    const pr = detectPR(exercise, weight, reps);
    if (pr.isPR) confetti(card.querySelector(".title"));

    const list = card.querySelector(".set-list");
    list.insertAdjacentHTML("afterbegin",
      `<li>${fmtDateTime(row.dateISO)} — <strong>${row.weight}${row.unit} × ${row.reps}</strong>${row.rpe!=null?` @RPE ${row.rpe}`:""} · e1RM ${round1(pr.e1RM)}${row.unit}</li>`
    );

    startRest(type === "main" ? settings.rest.main : settings.rest.accessory);
  });

  startSessionBtn.addEventListener("click", startSession);
  clearTodayBtn.addEventListener("click", () => {
    if (!confirm("Delete all sets logged today?")) return;
    const today = new Date().toISOString().slice(0,10);
    sets = sets.filter(s => s.dateISO.slice(0,10) !== today);
    save(KEY_SETS, sets);
    $$(".set-list").forEach(ul => ul.innerHTML = "");
  });

  /* ---------- PR / e1RM ---------- */
  function e1RM(weight, reps){
    const epley = weight * (1 + reps/30);
    const brzy  = weight * 36 / (37 - reps);
    return (epley + brzy) / 2;
  }
  function detectPR(exercise, weight, reps){
    const est = e1RM(weight, reps);
    const b = bests[exercise] || { e1RM: 0, repsPR: 0 };
    let isPR = false;
    if (est > (b.e1RM||0)) { b.e1RM = est; isPR = true; }
    const topW = sets.filter(s=>s.exercise===exercise).reduce((m,s)=>Math.max(m,s.weight),0);
    if (reps > (b.repsPR||0) && weight >= topW*0.98) { b.repsPR = reps; isPR = true; }
    bests[exercise] = b; save(KEY_BESTS, bests);
    return { isPR, e1RM: est };
  }

  /* ---------- Rest timer ---------- */
  const restDrawer = $("#restDrawer");
  const restTimeEl = $("#restTime");
  const add15 = $("#add15"), add30 = $("#add30"), stopRestBtn = $("#stopRest");
  let restTick = null, restEnd = 0;

  function startRest(seconds){
    restEnd = Date.now() + seconds*1000;
    showRest();
    if (restTick) clearInterval(restTick);
    restTick = setInterval(() => {
      const left = Math.max(0, restEnd - Date.now());
      restTimeEl.textContent = fmtMMSS(left);
      if (left === 0) { clearInterval(restTick); beep(); }
    }, 200);
  }
  function showRest(){ restDrawer.classList.add("show"); }
  function hideRest(){ restDrawer.classList.remove("show"); if (restTick) clearInterval(restTick); }
  add15.addEventListener("click", () => restEnd += 15000);
  add30.addEventListener("click", () => restEnd += 30000);
  stopRestBtn.addEventListener("click", hideRest);

  function beep(){ try{
    const ctx = new (window.AudioContext||window.webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type="square"; o.frequency.value=880; o.connect(g); g.connect(ctx.destination);
    g.gain.value=.06; o.start(); setTimeout(()=>{o.stop();ctx.close();},250);
  }catch{} }

  /* ---------- LOG ---------- */
  const filterLift = $("#filterLift");
  const fromDate = $("#fromDate"), toDate = $("#toDate");
  const applyFilters = $("#applyFilters"), clearFilters = $("#clearFilters"), exportCsv = $("#exportCsv");
  const logBody = $("#logBody");

  function renderLog(){
    const lifts = Array.from(new Set(sets.map(s=>s.exercise))).sort();
    filterLift.innerHTML = `<option value="">All exercises</option>` + lifts.map(l=>`<option>${esc(l)}</option>`).join("");
    drawLog();
  }
  function currentLogRows(){
    const lf = filterLift.value;
    const f = fromDate.value ? new Date(fromDate.value) : null;
    const t = toDate.value ? new Date(toDate.value) : null;
    return sets.filter(s=>{
      if (lf && s.exercise!==lf) return false;
      const d = new Date(s.dateISO);
      if (f && d < new Date(f.toDateString())) return false;
      if (t && d > new Date(new Date(t.toDateString()).getTime()+86399000)) return false;
      return true;
    }).sort((a,b)=> b.dateISO.localeCompare(a.dateISO));
  }
  function drawLog(){
    const rows = currentLogRows();
    logBody.innerHTML = rows.map(s=>`
      <tr>
        <td>${fmtDateTime(s.dateISO)}</td>
        <td>${esc(s.exercise)}</td>
        <td>${s.weight} ${s.unit}</td>
        <td>${s.reps}</td>
        <td>${s.rpe ?? ""}</td>
        <td>${round1(e1RM(s.weight,s.reps))} ${s.unit}</td>
      </tr>
    `).join("") || `<tr><td colspan="6" class="muted">No sets yet.</td></tr>`;
  }
  applyFilters.addEventListener("click", drawLog);
  clearFilters.addEventListener("click", () => { filterLift.value=""; fromDate.value=""; toDate.value=""; drawLog(); });
  exportCsv.addEventListener("click", () => {
    const rows = currentLogRows();
    const csv = ["date,exercise,weight,reps,rpe,unit,e1rm"].concat(
      rows.map(r => [r.dateISO, r.exercise, r.weight, r.reps, r.rpe ?? "", r.unit, round1(e1RM(r.weight,r.reps))].map(csvCell).join(","))
    ).join("\n");
    download(csv, "liftos-log.csv", "text/csv");
  });

  /* ---------- HISTORY ---------- */
  const trendWrap = $("#trendWrap");
  const volumeBars = $("#volumeBars");

  function renderHistory(){
    const mains = program.days.flatMap(d => d.exercises.filter(e=>e.type==="main").map(e=>e.name));
    const uniq = Array.from(new Set(mains));
    trendWrap.innerHTML = uniq.map(lift => trendCard(lift)).join("") || `<p class="muted">Log some main lifts to see trends.</p>`;

    const vols = weeklyVolume(6);
    const max = Math.max(1, ...vols.map(v=>v.total));
    volumeBars.innerHTML = vols.map(v=>`
      <div class="bar">
        <div style="width:120px">${esc(v.week)}</div>
        <div class="meter"><div class="fill" style="width:${Math.round(v.total/max*100)}%"></div></div>
        <div style="width:110px;text-align:right">${Math.round(v.total)} ${esc(settings.unit)}·reps</div>
      </div>
    `).join("");
  }
  function trendCard(lift){
    const pts = lastNBestE1RM(lift, 8);
    const max = Math.max(1, ...pts.map(p=>p.e1rm));
    const bars = pts.map(p=>`
      <div class="bar">
        <div style="width:120px">${esc(p.label)}</div>
        <div class="meter"><div class="fill" style="width:${Math.round(p.e1rm/max*100)}%"></div></div>
        <div style="width:90px;text-align:right">${p.e1rm?round1(p.e1rm):"-"} ${esc(settings.unit)}</div>
      </div>
    `).join("");
    return `<div class="card"><h3>${esc(lift)} — e1RM</h3>${bars || '<p class="muted">No data yet.</p>'}</div>`;
  }
  function lastNBestE1RM(lift, n){
    const map = {};
    sets.filter(s=>s.exercise===lift).forEach(s=>{
      const lbl = weekLabel(new Date(s.dateISO));
      const val = e1RM(s.weight, s.reps);
      map[lbl] = Math.max(map[lbl]||0, val);
    });
    return Object.entries(map).sort((a,b)=>a[0].localeCompare(b[0])).slice(-n).map(([label,e])=>({label, e1rm: Math.round(e)}));
  }
  function weeklyVolume(n){
    const now = new Date(), out=[];
    for(let i=n-1;i>=0;i--){
      const d = new Date(now); d.setDate(now.getDate() - i*7);
      const label = weekLabel(d);
      const total = sets.filter(s=>weekLabel(new Date(s.dateISO))===label).reduce((sum,s)=>sum + s.weight*s.reps,0);
      out.push({week: label, total});
    }
    return out;
  }

  /* ---------- TOOLS ---------- */
  const wuTarget = $("#wuTarget"), wuReps = $("#wuReps"), makeWarmupBtn = $("#makeWarmup"), warmupList = $("#warmupList");
  const pvTarget = $("#pvTarget"), pvBar = $("#pvBar"), calcPlatesBtn = $("#calcPlates"), platesOut = $("#platesOut");
  const rmWeight = $("#rmWeight"), rmReps = $("#rmReps"), calcRmBtn = $("#calcRm"), rmOut = $("#rmOut");

  function initToolsDefaults(){ pvBar.value = settings.bar; }

  makeWarmupBtn.addEventListener("click", () => {
    const t = +wuTarget.value || 0; const reps = +wuReps.value || 5;
    if (!t) return alert("Enter target set weight.");
    const perc = [0.4,0.55,0.7,0.8,0.9,1.0];
    const repsSeq = [5,3,3,2,1,reps];
    warmupList.innerHTML = perc.map((p,i)=>{
      const w = roundToPlateable(t*p);
      const plan = platePlan(w);
      return `<li>${w} ${esc(settings.unit)} × ${repsSeq[i]} — <span class="line">${plan.html}</span></li>`;
    }).join("");
  });

  calcPlatesBtn.addEventListener("click", () => {
    const t = +pvTarget.value || 0; const bar = +pvBar.value || settings.bar;
    if (!t) return alert("Enter target weight.");
    const plan = platePlan(t, bar);
    platesOut.innerHTML = plan.html || `<p class="muted">Cannot match weight with current plates.</p>`;
  });

  calcRmBtn.addEventListener("click", () => {
    const w = +rmWeight.value || 0; const r = +rmReps.value || 1;
    if (!w || !r) return rmOut.textContent = "Enter weight and reps.";
    rmOut.textContent = `Epley: ${round1(w*(1+r/30))} ${settings.unit} · Brzycki: ${round1(w*36/(37-r))} ${settings.unit}`;
  });

  // Correct plate math (greedy)
  function platePlan(target, barWeight = settings.bar){
    const perSide = (target - barWeight)/2;
    if (perSide < 0) return { html:`<span class="muted">Target &lt; bar</span>` };
    let remain = perSide;
    const used = []; // [{plate, count}]
    const avail = [...settings.plates].sort((a,b)=>b-a);
    for (const p of avail){
      let count = 0;
      while (remain + 1e-6 >= p){
        remain = round2(remain - p);
        count++;
      }
      if (count) used.push({ plate: p, count });
    }
    const matched = Math.abs(remain) < 0.01;
    const html = `
      <div class="line">
        <span class="plate small">Bar ${barWeight}${esc(settings.unit)}</span>
        ${used.map(u=>`<span class="plate">${u.plate}${esc(settings.unit)} × ${u.count} / side</span>`).join("")}
        ${matched? "" : `<span class="muted">(≈ off by ${round2(remain)}${esc(settings.unit)} per side)</span>`}
      </div>
    `;
    return { html };
  }
  function roundToPlateable(x){ return settings.unit==="kg" ? Math.round(x*2)/2 : Math.round(x); }

  /* ---------- SETTINGS ---------- */
  const unitSel = $("#unitSel"), restMain = $("#restMain"), restAcc = $("#restAcc"), saveSettingsBtn = $("#saveSettings");
  const barWeight = $("#barWeight"), plateChecks = $("#plateChecks"), savePlatesBtn = $("#savePlates");
  const programJson = $("#programJson"), saveProgramBtn = $("#saveProgram"), resetProgramBtn = $("#resetProgram");

  function renderSettings(){
    unitSel.value = settings.unit;
    restMain.value = settings.rest.main; restAcc.value = settings.rest.accessory;
    barWeight.value = settings.bar;
    plateChecks.innerHTML = DEFAULT_SETTINGS.plates.map(p=>{
      const on = settings.plates.includes(p);
      return `<label class="chip"><input type="checkbox" value="${p}" ${on?"checked":""}/> ${p}${esc(settings.unit)}</label>`;
    }).join("");
    programJson.value = JSON.stringify(program, null, 2);
  }
  saveSettingsBtn.addEventListener("click", () => {
    settings.unit = unitSel.value;
    settings.rest.main = +restMain.value || 180;
    settings.rest.accessory = +restAcc.value || 90;
    save(KEY_SETTINGS, settings);
    alert("Settings saved.");
  });
  savePlatesBtn.addEventListener("click", () => {
    settings.bar = +barWeight.value || settings.bar;
    const vals = Array.from(plateChecks.querySelectorAll("input[type=checkbox]:checked")).map(i=>+i.value);
    settings.plates = vals.sort((a,b)=>b-a);
    save(KEY_SETTINGS, settings);
    alert("Bar & plates saved.");
  });
  saveProgramBtn.addEventListener("click", () => {
    try{
      const obj = JSON.parse(programJson.value);
      if (!obj.days || !Array.isArray(obj.days)) throw new Error("Program must have a 'days' array.");
      program = obj; save(KEY_PROGRAM, program); populateDays(); alert("Program saved.");
    }catch(e){ alert("Invalid JSON: " + e.message); }
  });
  resetProgramBtn.addEventListener("click", () => {
    if (!confirm("Reset to starter program?")) return;
    program = STARTER_PROGRAM; save(KEY_PROGRAM, program); renderSettings(); populateDays(); alert("Reset.");
  });

  /* ---------- Utils ---------- */
  function load(k){ try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; } }
  function save(k,v){ localStorage.setItem(k, JSON.stringify(v)); }
  function esc(s){ return String(s).replace(/[&<>"]/g, c=>({"&":"&amp;","<":"&gt;",">":"&gt;"}[c]||c)).replace(/"/g,"&quot;"); }
  function csvCell(v){ return `"${String(v).replace(/"/g,'""')}"`; }
  function download(text, name, type="text/plain"){ const b=new Blob([text],{type}); const a=document.createElement("a"); a.href=URL.createObjectURL(b); a.download=name; a.click(); URL.revokeObjectURL(a.href); }
  function fmtDateTime(iso){ const d=new Date(iso); return d.toLocaleDateString(undefined,{month:"short",day:"2-digit"})+" "+d.toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit"}); }
  function fmtMMSS(ms){ const s=Math.round(ms/1000); const m=String(Math.floor(s/60)).padStart(2,"0"); const ss=String(s%60).padStart(2,"0"); return `${m}:${ss}`; }
  function round1(x){ return Math.round(x*10)/10; }
  function round2(x){ return Math.round(x*100)/100; }
  function weekLabel(d){ const y=d.getFullYear(); const w=Math.ceil((((d - new Date(y,0,1))/86400000) + new Date(y,0,1).getDay()+1)/7); return `${y}-W${String(w).padStart(2,"0")}`; }

  function confetti(anchor){
    if (!anchor) return;
    const b = anchor.getBoundingClientRect();
    for(let i=0;i<12;i++){
      const s=document.createElement("span");
      s.textContent="✦";
      s.style.position="fixed"; s.style.left=(b.left+b.width/2)+"px"; s.style.top=(b.top+6)+"px";
      s.style.fontSize="12px"; s.style.color= i%2? "#f59e0b" : "#38bdf8";
      s.style.pointerEvents="none"; s.style.transition="transform .7s ease, opacity .7s ease";
      document.body.appendChild(s);
      requestAnimationFrame(()=>{
        const dx=(Math.random()*2-1)*80, dy=60+Math.random()*40;
        s.style.transform=`translate(${dx}px, ${-dy}px) rotate(${Math.random()*180}deg)`; s.style.opacity="0";
      });
      setTimeout(()=>s.remove(), 800);
    }
  }

  /* ---------- boot ---------- */
  populateDays();
  startSession();
  renderSettings();
  // make Today visible by default even if someone clicks around before JS is ready
  $("#today").classList.add("show");
})();


