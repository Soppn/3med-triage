// script.js (ES5-kompatibel)
(function () {
  'use strict';

  // --- State & Storage ---
  function $(id) { return document.getElementById(id); }
  var state = { counts: { T1: 0, T2: 0, T3: 0, T4: 0 }, notes: "", orders: [] };
  var KEY = "milsim-triage-logi-v2";
  var HIST_KEY = "milsim-triage-logi-history-v2";

  // --- Utils ---
  function total() {
    return (state.counts.T1 || 0) + (state.counts.T2 || 0) + (state.counts.T3 || 0) + (state.counts.T4 || 0);
  }
  function ordersText() {
    var out = [];
    for (var i = 0; i < state.orders.length; i++) {
      out.push("- " + state.orders[i].item + " x" + state.orders[i].qty);
    }
    return out.join("\n");
  }
  function download(name, data) {
    var blob = new Blob([data], { type: "text/plain" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 500);
  }
  function loadFromLocal() {
    var raw = localStorage.getItem(KEY);
    if (raw) {
      try { 
        var obj = JSON.parse(raw);
        // enkel deep merge
        state.counts = obj.counts || state.counts;
        state.notes  = (typeof obj.notes === "string") ? obj.notes : state.notes;
        state.orders = obj.orders || state.orders;
      } catch (_e) {}
    }
  }
  function saveToLocal() {
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  // --- Renderers ---
  function renderCounts() {
    var cats = ["T1", "T2", "T3", "T4"];
    for (var i = 0; i < cats.length; i++) {
      var k = cats[i];
      var el = document.getElementById("count-" + k);
      if (el) el.textContent = state.counts[k] || 0;
    }
    var totEl = $("tot");
    if (totEl) totEl.textContent = total();
  }
  function renderOrders() {
    var tbody = document.querySelector("#ordersTable tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    for (var i = 0; i < state.orders.length; i++) {
      (function (idx) {
        var o = state.orders[idx];
        var tr = document.createElement("tr");

        var td1 = document.createElement("td"); td1.textContent = o.item;
        var td2 = document.createElement("td"); td2.textContent = o.qty;
        var td3 = document.createElement("td");
        var btn = document.createElement("button");
        btn.className = "btn small ghost";
        btn.textContent = "Remove";
        btn.addEventListener("click", function () {
          state.orders.splice(idx, 1);
          saveAndRender();
        });
        td3.appendChild(btn);

        tr.appendChild(td1); tr.appendChild(td2); tr.appendChild(td3);
        tbody.appendChild(tr);
      }(i));
    }
  }
  function md() {
    var t = total();
    var tri =
      "| Tier | Amount |\n" +
      "|---|---:|\n" +
      "| T1 | " + (state.counts.T1 || 0) + "|\n" +
      "| T2 | " + (state.counts.T2 || 0) + "|\n" +
      "| T3 | " + (state.counts.T3 || 0) + "|\n" +
      "| T4 | " + (state.counts.T4 || 0) + "|\n" +
      "| **Totalt** | **" + t + "** |";

    var orders = state.orders.length ? ("\n**Logistics orders**\n\n" + ordersText() + "\n") : "";
    var notes = state.notes ? ("**Notes:** " + state.notes + "\n") : "";
    return "### Treated Casualties Report\n\n" + tri + "\n\n" + orders + notes;
  }
  function renderPreview() {
    var prev = $("preview");
    if (prev) prev.value = md();
  }
  function renderAll() {
    renderCounts();
    renderOrders();
    renderPreview();
  }
  function saveAndRender() {
    saveToLocal();
    renderAll();
  }

  // --- Mutators ---
  function inc(cat, by) {
    if (by === void 0) by = 1;
    state.counts[cat] = Math.max(0, (state.counts[cat] || 0) + by);
    saveAndRender();
  }
  function dec(cat, by) {
    if (by === void 0) by = 1;
    state.counts[cat] = Math.max(0, (state.counts[cat] || 0) - by);
    saveAndRender();
  }

  // --- History ---
  function getHistory() {
    var raw = localStorage.getItem(HIST_KEY);
    return raw ? (JSON.parse(raw) || []) : [];
  }
  function setHistory(arr) {
    localStorage.setItem(HIST_KEY, JSON.stringify(arr));
  }
  function saveNight() {
    var rec = JSON.parse(JSON.stringify(state));
    rec.id = Date.now();
    rec.date = new Date().toLocaleString();
    var arr = getHistory();
    arr.push(rec);
    setHistory(arr);
    alert("Lagret i historikk!");
    renderHistory();
  }
  function renderHistory() {
    var hist = getHistory().slice().reverse();
    var tbody = document.querySelector("#histTable tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    var sum = { t1: 0, t2: 0, t3: 0, t4: 0, total: 0 };
    for (var i = 0; i < hist.length; i++) {
      (function (rec) {
        var tot = (rec.counts.T1 || 0) + (rec.counts.T2 || 0) + (rec.counts.T3 || 0) + (rec.counts.T4 || 0);
        sum.t1 += +rec.counts.T1 || 0;
        sum.t2 += +rec.counts.T2 || 0;
        sum.t3 += +rec.counts.T3 || 0;
        sum.t4 += +rec.counts.T4 || 0;
        sum.total += tot;

        var tr = document.createElement("tr");
        var tdD = document.createElement("td"); tdD.textContent = rec.date || "";
        var td1 = document.createElement("td"); td1.textContent = rec.counts.T1 || 0;
        var td2 = document.createElement("td"); td2.textContent = rec.counts.T2 || 0;
        var td3 = document.createElement("td"); td3.textContent = rec.counts.T3 || 0;
        var td4 = document.createElement("td"); td4.textContent = rec.counts.T4 || 0;
        var tdT = document.createElement("td"); tdT.textContent = tot;
        var tdO = document.createElement("td"); 
        var ordersList = [];
        for (var j = 0; j < (rec.orders || []).length; j++) {
          var o = rec.orders[j];
          ordersList.push(o.item + " x" + o.qty);
        }
        tdO.textContent = ordersList.join("; ");
        var tdA = document.createElement("td");
        var bV = document.createElement("button"); bV.className = "btn ghost small"; bV.textContent = "Show";
        bV.addEventListener("click", function () {
          state = JSON.parse(JSON.stringify(rec));
          saveAndRender();
          window.scrollTo(0, 0);
        });
        var bD = document.createElement("button"); bD.className = "btn ghost small"; bD.style.marginLeft = "6px"; bD.textContent = "Slett";
        bD.addEventListener("click", function () {
          if (confirm("Slette denne kvelden?")) {
            var cur = getHistory();
            var filt = [];
            for (var k = 0; k < cur.length; k++) {
              if (cur[k].id !== rec.id) filt.push(cur[k]);
            }
            setHistory(filt);
            renderHistory();
          }
        });
        tdA.appendChild(bV); tdA.appendChild(bD);
        tr.appendChild(tdD); tr.appendChild(td1); tr.appendChild(td2); tr.appendChild(td3); tr.appendChild(td4); tr.appendChild(tdT); tr.appendChild(tdO); tr.appendChild(tdA);
        tbody.appendChild(tr);
      }(hist[i]));
    }

    var hTotal = $("hTotal"); if (hTotal) hTotal.textContent = hist.length;
    var hs = $("histSummary");
    if (hs) hs.textContent = "Oppsummert – T1:" + sum.t1 + "  T2:" + sum.t2 + "  T3:" + sum.t3 + "  T4:" + sum.t4 + "  Totalt:" + sum.total;
  }

  // --- Event bindings ---
  function initEvents() {
    document.addEventListener("click", function (e) {
      var t = e.target;
      if (t && t.matches && t.matches("[data-inc]")) inc(t.getAttribute("data-inc"));
      if (t && t.matches && t.matches("[data-dec]")) dec(t.getAttribute("data-dec"));
    });

    window.addEventListener("keydown", function (e) {
      var tag = (document.activeElement && document.activeElement.tagName) || "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "1") inc("T1");
      if (e.key === "2") inc("T2");
      if (e.key === "3") inc("T3");
      if (e.key === "4") inc("T4");
    });

    var qAdd = $("quickAdd");
    if (qAdd) qAdd.addEventListener("click", function () {
      var catSel = $("quickCat");
      if (catSel) inc(catSel.value);
    });

    var addOrder = $("addOrder");
    if (addOrder) addOrder.addEventListener("click", function () {
      var itemEl = $("logItem");
      var qtyEl = $("logQty");
      var item = itemEl ? itemEl.value.trim() : "";
      var qty = qtyEl ? parseInt(qtyEl.value || "0", 10) : 0;
      if (!item) return alert("Item mangler");
      if (!(qty > 0)) return alert("Antall må være > 0");
      state.orders.push({ item: item, qty: qty });
      if (itemEl) itemEl.value = "";
      if (qtyEl) qtyEl.value = "";
      saveAndRender();
    });

    var clearOrders = $("clearOrders");
    if (clearOrders) clearOrders.addEventListener("click", function () {
      if (confirm("Tømme logistikk-listen?")) { state.orders = []; saveAndRender(); }
    });

    var copyOrders = $("copyOrders");
    if (copyOrders) copyOrders.addEventListener("click", function () {
      var text = ordersText();
      if (!text.trim()) return alert("No Item in the list");
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { alert("Kopiert!"); }, function () { download("logistics.txt", text); });
      } else {
        download("logistics.txt", text);
      }
    });

    var dlOrdersCsv = $("dlOrdersCsv");
    if (dlOrdersCsv) dlOrdersCsv.addEventListener("click", function () {
      if (!state.orders.length) return alert("Ingen items");
      var rows = [["item", "qty"]];
      for (var i = 0; i < state.orders.length; i++) rows.push([state.orders[i].item, state.orders[i].qty]);
      var csv = "";
      for (var r = 0; r < rows.length; r++) {
        var line = "";
        for (var c = 0; c < rows[r].length; c++) {
          var cell = String(rows[r][c]).replace(/"/g, '""');
          line += (c ? "," : "") + '"' + cell + '"';
        }
        csv += (r ? "\n" : "") + line;
      }
      download("logistics_orders.csv", csv);
    });

    var notesEl = $("notes");
    if (notesEl) notesEl.addEventListener("input", function (e) {
      state.notes = e.target.value;
      saveAndRender();
    });

    var copyBtn = $("copy");
    if (copyBtn) copyBtn.addEventListener("click", function () {
      var text = md();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { alert("Kopiert!"); }, function () { download("treated_report.md", text); });
      } else {
        download("treated_report.md", text);
      }
    });

    var dlMd = $("dlMd");
    if (dlMd) dlMd.addEventListener("click", function () { download("treated_report.md", md()); });

    var reset = $("reset");
    if (reset) reset.addEventListener("click", function () {
      if (confirm("Nullstille skjema?")) {
        state.counts = { T1: 0, T2: 0, T3: 0, T4: 0 };
        state.orders = [];
        state.notes = "";
        saveAndRender();
      }
    });

    var saveNightBtn = $("saveNight");
    if (saveNightBtn) saveNightBtn.addEventListener("click", saveNight);

    var newNight = $("newNight");
    if (newNight) newNight.addEventListener("click", function () {
      state.counts = { T1: 0, T2: 0, T3: 0, T4: 0 };
      state.orders = [];
      state.notes = "";
      saveAndRender();
    });

    var toggleHistory = $("toggleHistory");
    if (toggleHistory) toggleHistory.addEventListener("click", function () {
      var el = $("history");
      if (!el) return;
      el.style.display = (el.style.display === "none" || !el.style.display) ? "block" : "none";
    });

    var clearHistory = $("clearHistory");
    if (clearHistory) clearHistory.addEventListener("click", function () {
      if (confirm("Slette ALL historikk?")) { setHistory([]); renderHistory(); }
    });

    var exportAllCsv = $("exportAllCsv");
    if (exportAllCsv) exportAllCsv.addEventListener("click", function () {
      var hist = getHistory();
      if (!hist.length) return alert("Ingen historikk");
      var rows = [["id", "date", "t1", "t2", "t3", "t4", "orders", "notes"]];
      for (var i = 0; i < hist.length; i++) {
        var r = hist[i];
        var ordersFlat = [];
        for (var j = 0; j < (r.orders || []).length; j++) {
          var o = r.orders[j];
          ordersFlat.push(o.item + " x" + o.qty);
        }
        rows.push([
          r.id,
          r.date || "",
          r.counts.T1 || 0,
          r.counts.T2 || 0,
          r.counts.T3 || 0,
          r.counts.T4 || 0,
          ordersFlat.join("; "),
          (r.notes || "").replace(/\n/g, " ")
        ]);
      }
      var csv = "";
      for (var rr = 0; rr < rows.length; rr++) {
        var ln = "";
        for (var cc = 0; cc < rows[rr].length; cc++) {
          var cell2 = String(rows[rr][cc]).replace(/"/g, '""');
          ln += (cc ? "," : "") + '"' + cell2 + '"';
        }
        csv += (rr ? "\n" : "") + ln;
      }
      download("milsim_history.csv", csv);
    });
  }

  // --- Boot ---
  function boot() {
    loadFromLocal();
    renderAll();
    renderHistory();
    initEvents();
  }
  document.addEventListener("DOMContentLoaded", boot);
}());
