// script.js (ES5 compatible)
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  var state = { counts: { T1: 0, T2: 0, T3: 0, T4: 0 }, notes: "", orders: [] };
  var KEY = "milsim-triage-logi-v2";

  function total() {
    return (state.counts.T1 || 0) + (state.counts.T2 || 0) + (state.counts.T3 || 0) + (state.counts.T4 || 0);
  }
  function ordersText() {
    var out = [];
    for (var i = 0; i < state.orders.length; i++) out.push("- " + state.orders[i].item + " x" + state.orders[i].qty);
    return out.join("\n");
  }
  function download(name, data) {
    var blob = new Blob([data], { type: "text/plain" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a"); a.href = url; a.download = name; a.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 500);
  }
  function loadFromLocal() {
    var raw = localStorage.getItem(KEY);
    if (raw) {
      try {
        var obj = JSON.parse(raw);
        state.counts = obj.counts || state.counts;
        state.notes  = (typeof obj.notes === "string") ? obj.notes : state.notes;
        state.orders = obj.orders || state.orders;
      } catch (_e) {}
    }
  }
  function saveToLocal() { localStorage.setItem(KEY, JSON.stringify(state)); }

  function renderCounts() {
    var cats = ["T1", "T2", "T3", "T4"];
    for (var i = 0; i < cats.length; i++) {
      var k = cats[i];
      var el = document.getElementById("count-" + k);
      if (el) el.textContent = state.counts[k] || 0;
    }
    var totEl = $("tot"); if (totEl) totEl.textContent = total();
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
        btn.addEventListener("click", function () { state.orders.splice(idx, 1); saveAndRender(); });
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
      "| **Total** | **" + t + "** |";
    var orders = state.orders.length ? ("\n**Logistics orders**\n\n" + ordersText() + "\n") : "";
    var notes  = state.notes ? ("**Notes:** " + state.notes + "\n") : "";
    return "### Treated Casualties Report\n\n" + tri + "\n\n" + orders + notes;
  }
  function renderPreview() { var prev = $("preview"); if (prev) prev.value = md(); }
  function renderAll() { renderCounts(); renderOrders(); renderPreview(); }
  function saveAndRender() { saveToLocal(); renderAll(); }

  function inc(cat, by) { if (by === void 0) by = 1; state.counts[cat] = Math.max(0, (state.counts[cat] || 0) + by); saveAndRender(); }
  function dec(cat, by) { if (by === void 0) by = 1; state.counts[cat] = Math.max(0, (state.counts[cat] || 0) - by); saveAndRender(); }

  // events
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

    // logistics
    var addOrder = $("addOrder");
    if (addOrder) addOrder.addEventListener("click", function () {
      var itemEl = $("logItem");
      var qtyEl = $("logQty");
      var item = itemEl ? itemEl.value.trim() : "";
      var qty = qtyEl ? parseInt(qtyEl.value || "0", 10) : 0;
      if (!item) return alert("Item missing");
      if (!(qty > 0)) return alert("Amount must be > 0");
      state.orders.push({ item: item, qty: qty });
      if (itemEl) itemEl.value = "";
      if (qtyEl) qtyEl.value = "";
      saveAndRender();
    });

    var clearOrders = $("clearOrders");
    if (clearOrders) clearOrders.addEventListener("click", function () {
      if (confirm("Empty the logistics list?")) { state.orders = []; saveAndRender(); }
    });

    var copyOrders = $("copyOrders");
    if (copyOrders) copyOrders.addEventListener("click", function () {
      var text = ordersText();
      if (!text.trim()) return alert("No items in the list");
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { alert("Copied!"); }, function () { download("logistics.txt", text); });
      } else {
        download("logistics.txt", text);
      }
    });

    // notes + PR
    var notesEl = $("notes");
    if (notesEl) notesEl.addEventListener("input", function (e) { state.notes = e.target.value; saveAndRender(); });

    var copyBtn = $("copy");
    if (copyBtn) copyBtn.addEventListener("click", function () {
      var text = md();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { alert("Copied!"); }, function () { download("treated_report.md", text); });
      } else {
        download("treated_report.md", text);
      }
    });

    var reset = $("reset");
    if (reset) reset.addEventListener("click", function () {
      if (confirm("Reset sheet?")) {
        state.counts = { T1: 0, T2: 0, T3: 0, T4: 0 };
        state.orders = [];
        state.notes = "";
        saveAndRender();
      }
    });
  }

  function boot() { loadFromLocal(); renderAll(); initEvents(); }
  document.addEventListener("DOMContentLoaded", boot);
}());
