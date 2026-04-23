(function () {
  "use strict";

  console.log("[JAP] Content script loaded v2.1");

  const ext = typeof browser !== "undefined" ? browser : chrome;

  function $(selector) {
    return document.querySelector(selector);
  }

  function $$(selector) {
    return Array.from(document.querySelectorAll(selector));
  }

  function isVisible(el) {
    if (!el || !(el instanceof Element)) return false;
    try {
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    } catch { return false; }
  }

  function getLabelText(el) {
    const forAttr = el.getAttribute("for");
    if (forAttr) {
      const label = document.getElementById(forAttr);
      if (label) return label.textContent.trim();
    }
    const parent = el.parentElement;
    if (parent) {
      const labels = parent.querySelectorAll("label");
      for (const label of labels) {
        if (label.contains(el)) {
          const text = label.textContent.replace(el.textContent, "").trim();
          if (text) return text;
        }
      }
      const prev = parent.querySelector(":scope > label, :scope > span, :scope > p");
      if (prev) return prev.textContent.trim();
      const legend = parent.querySelector("legend");
      if (legend) return legend.textContent.trim();
    }
    return "";
  }

  function getFieldId(el, idx) {
    const id = el.getAttribute("id");
    const name = el.getAttribute("name");
    if (id) return "id:" + id;
    if (name) return "name:" + name;
    return "idx:" + idx;
  }

  function extractFields() {
    const selectors = [
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"])',
      "textarea",
      "select"
    ];
    
    const allEls = [];
    for (const sel of selectors) {
      allEls.push(...document.querySelectorAll(sel));
    }

    const seen = new Set();
    const fields = [];

    for (let i = 0; i < allEls.length; i++) {
      const el = allEls[i];
      if (el.disabled || el.readOnly) continue;
      if (!isVisible(el)) continue;

      const fieldId = getFieldId(el, i);
      if (seen.has(fieldId)) continue;
      seen.add(fieldId);

      const label = getLabelText(el);
      const type = el.type || el.tagName.toLowerCase();

      let options = [];
      if (type === "select" || type === "select-one") {
        options = Array.from(el.options).map(opt => ({
          value: opt.value || opt.textContent,
          label: opt.textContent.trim()
        }));
      }

      fields.push({
        id: fieldId,
        name: el.getAttribute("name") || "",
        label: label,
        type: type,
        required: el.required || el.hasAttribute("required"),
        options: options
      });
    }

    console.log("[JAP] Extracted fields:", fields.length);
    return fields;
  }

  function findElement(fieldId) {
    if (!fieldId) return null;
    
    if (fieldId.startsWith("id:")) {
      const el = document.getElementById(fieldId.slice(3));
      if (el && isVisible(el)) return el;
    }
    if (fieldId.startsWith("name:")) {
      const el = document.querySelector(`[name="${CSS.escape(fieldId.slice(5))}"]`);
      if (el && isVisible(el)) return el;
    }
    if (fieldId.startsWith("idx:")) {
      const idx = parseInt(fieldId.slice(4), 10);
      const allEls = document.querySelectorAll('input:not([type="hidden"]), textarea, select');
      if (!isNaN(idx) && idx < allEls.length && isVisible(allEls[idx])) return allEls[idx];
    }
    return null;
  }

  function applyValue(el, value) {
    if (!el) return false;
    
    const type = el.type || el.tagName.toLowerCase();
    
    try {
      if (type === "checkbox") {
        const boolVal = typeof value === "boolean" ? value : String(value).toLowerCase() === "true";
        el.checked = boolVal;
      } else if (type === "radio") {
        const sel = document.querySelector(`input[name="${CSS.escape(el.name)}"][value="${CSS.escape(String(value))}"]`);
        if (sel) sel.checked = true;
      } else if (type === "select-one" || type === "select") {
        const options = Array.from(el.options);
        const match = options.find(opt => opt.value === String(value) || opt.textContent.toLowerCase() === String(value).toLowerCase());
        if (match) el.value = match.value;
        else el.value = value;
      } else {
        el.value = value;
      }
      
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      el.dispatchEvent(new Event("blur", { bubbles: true }));
      return true;
    } catch (e) {
      console.error("[JAP] Apply error:", e);
      return false;
    }
  }

  function applySuggestion(item) {
    const el = findElement(item.fieldId);
    if (!el) {
      console.warn("[JAP] Not found:", item.fieldId);
      return false;
    }
    return applyValue(el, item.value);
  }

  function applyBatch(items) {
    let applied = 0, failed = 0;
    for (const item of items) {
      if (applySuggestion(item)) applied++;
      else failed++;
    }
    return { appliedCount: applied, skippedCount: failed };
  }

  function findFileInputs() {
    const inputs = document.querySelectorAll('input[type="file"]');
    return Array.from(inputs).filter(el => isVisible(el));
  }

  function findResumeInput() {
    const inputs = findFileInputs();
    const resumeNames = ["resume", "cv", "file", "attachment", "document"];
    
    for (const input of inputs) {
      const name = (input.name || input.id || "").toLowerCase();
      const label = getLabelText(input).toLowerCase();
      const accept = (input.accept || "").toLowerCase();
      
      for (const kw of resumeNames) {
        if (name.includes(kw) || label.includes(kw) || accept.includes("pdf")) {
          return input;
        }
      }
    }
    return inputs[0] || null;
  }

  function attachResumeFile() {
    const input = findResumeInput();
    if (!input) {
      setError("No resume upload field found.");
      return;
    }
    
    try {
      input.click();
      setStatus("Select your resume PDF", "info");
    } catch (e) {
      setError("Error: " + e.message);
    }
  }

  function showOverlay() {
    let overlay = $("#jap-overlay");
    if (overlay) {
      overlay.classList.remove("hidden");
      return overlay;
    }

    overlay = document.createElement("div");
    overlay.id = "jap-overlay";
    overlay.className = "jap-overlay";
    overlay.innerHTML = `
      <div class="jap-header">
        <span class="jap-title">Job Autofill Pro</span>
        <div class="jap-btns">
          <button id="jap-scan" class="jap-btn jap-btn-primary">Scan</button>
          <button id="jap-fill" class="jap-btn jap-btn-success">Fill</button>
          <button id="jap-resume" class="jap-btn jap-btn-resume">Resume</button>
          <button id="jap-close" class="jap-btn jap-btn-ghost">✕</button>
        </div>
      </div>
      <div class="jap-body">
        <div id="jap-status" class="jap-status">Click Scan to detect form fields</div>
        <div id="jap-fields" class="jap-fields"></div>
        <div id="jap-error" class="jap-error hidden"></div>
      </div>
    `;

    document.body.appendChild(overlay);

    $("#jap-close").onclick = () => overlay.classList.add("hidden");
    $("#jap-scan").onclick = () => scanAndResolve();
    $("#jap-fill").onclick = () => applyAllSuggestions();
    $("#jap-resume").onclick = () => attachResumeFile();

    return overlay;
  }

  function setStatus(text, type = "info") {
    const el = $("#jap-status");
    if (el) {
      el.className = "jap-status jap-status-" + type;
      el.textContent = text;
    }
  }

  function setError(msg) {
    const el = $("#jap-error");
    if (el) {
      if (msg) {
        el.textContent = msg;
        el.classList.remove("hidden");
      } else {
        el.classList.add("hidden");
      }
    }
  }

  function renderSuggestions(fields, suggestions) {
    const container = $("#jap-fields");
    if (!container) return;
    
    container.innerHTML = "";
    
    if (!fields.length) {
      container.innerHTML = '<div class="jap-empty">No form fields found</div>';
      return;
    }

    const suggestionMap = new Map();
    for (const s of suggestions) {
      suggestionMap.set(s.fieldId, s);
    }

    for (const field of fields) {
      const suggestion = suggestionMap.get(field.id) || {};
      const item = document.createElement("div");
      item.className = "jap-field";
      item.dataset.fieldId = field.id;
      
      const hasValue = suggestion.value && suggestion.confidence > 0.3;
      const badge = hasValue ? "Ready" : "Empty";
      const badgeClass = hasValue ? "jap-badge-ready" : "jap-badge-empty";
      
      item.innerHTML = `
        <div class="jap-field-header">
          <span class="jap-field-label">${field.label || field.name || field.id}</span>
          <span class="jap-field-badge ${badgeClass}">${badge}</span>
        </div>
        <input type="text" class="jap-field-input" placeholder="No suggestion" value="${suggestion.value || ''}" data-field-id="${field.id}">
      `;
      
      container.appendChild(item);
    }
  }

  function getInputValues() {
    const container = $("#jap-fields");
    if (!container) return [];
    
    const items = [];
    for (const input of container.querySelectorAll(".jap-field-input")) {
      const val = input.value.trim();
      if (val) {
        items.push({
          fieldId: input.dataset.fieldId,
          value: val
        });
      }
    }
    return items;
  }

  async function scanAndResolve() {
    setStatus("Scanning and getting suggestions...", "loading");
    setError("");
    
    try {
      const response = await ext.runtime.sendMessage({ type: "scanAndResolve" });
      
      if (!response.ok) {
        // Fallback: just extract fields locally
        const fields = extractFields();
        renderSuggestions(fields, []);
        setStatus("Proxy unavailable - enter values manually", "error");
        return;
      }
      
      const session = response.session;
      if (session && session.fields) {
        renderSuggestions(session.fields, session.suggestions || []);
        const readyCount = (session.suggestions || []).filter(s => s.suggested && s.value).length;
        setStatus(`Found ${session.fields.length} fields, ${readyCount} ready to fill`, "success");
      } else {
        setStatus("No suggestions", "error");
      }
    } catch (e) {
      const fields = extractFields();
      renderSuggestions(fields, []);
      setError("Error: " + e.message);
      setStatus("Error occurred", "error");
    }
  }

  async function applyAllSuggestions() {
    const items = getInputValues();
    if (!items.length) {
      setError("No values to fill. Enter values or run scan first.");
      return;
    }
    
    setStatus("Filling fields...", "loading");
    setError("");
    
    try {
      const result = await ext.runtime.sendMessage({ type: "applyAll" });
      
      if (result?.ok) {
        setStatus(`Filled ${result.result?.appliedCount || 0} fields`, "success");
      } else {
        // Apply locally if background fails
        const res = applyBatch(items);
        setStatus(`Filled ${res.appliedCount} fields locally`, "success");
      }
    } catch (e) {
      // Fallback to local apply
      const res = applyBatch(items);
      setStatus(`Filled ${res.appliedCount} fields locally`, "success");
    }
  }

  function init() {
    showOverlay();
    setStatus("Ready - click Scan", "info");
    
    // Auto-scan on load if form detected
    setTimeout(() => {
      const allEls = document.querySelectorAll('input[name], input[id], textarea, select');
      if (allEls.length > 3) {
        scanAndResolve();
      }
    }, 800);
  }

  ext.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    try {
      if (msg.type === "extractFields") {
        sendResponse({ ok: true, fields: extractFields() });
        return true;
      }
      if (msg.type === "applyAll" && msg.items) {
        const result = applyBatch(msg.items);
        sendResponse({ ok: true, ...result });
        return true;
      }
      if (msg.type === "showOverlay") {
        showOverlay();
        sendResponse({ ok: true });
        return true;
      }
      if (msg.type === "hideOverlay") {
        const o = $("#jap-overlay");
        if (o) o.classList.add("hidden");
        sendResponse({ ok: true });
        return true;
      }
    } catch (e) {
      sendResponse({ ok: false, error: e.message });
      return true;
    }
    sendResponse({ ok: false, error: "Unknown" });
    return true;
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  console.log("[JAP] Ready");
})();