(function () {
  "use strict";
  console.log("[JAP] Loading...");

  const ext = typeof browser !== "undefined" ? browser : chrome;

  function $(selector) {
    return document.querySelector(selector);
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

  function getLabel(el) {
    // Check for id based label
    const id = el.getAttribute("id");
    if (id) {
      const label = $('label[for="' + id + '"]');
      if (label) return label.textContent.trim();
    }
    // Check parent containers
    const parent = el.parentElement;
    if (parent) {
      // Check for upload-label
      const uploadLabel = parent.querySelector("[class*='upload-label'], [id*='upload-label']");
      if (uploadLabel) return uploadLabel.textContent.replace(/[\*\n]/g, "").trim();
      // Check for label in parent
      const label = parent.querySelector("label");
      if (label) return label.textContent.replace(el.textContent || "", "").trim();
    }
    // Check grandparent
    const gp = parent?.parentElement;
    if (gp) {
      const label = gp.querySelector(".label:not(.visually-hidden)");
      if (label) return label.textContent.replace(/[\*\n]/g, "").trim();
    }
    return "";
  }

  function getId(el, idx) {
    return el.getAttribute("id") || el.getAttribute("name") || "field" + idx;
  }

  function extractFields() {
    // Regular inputs
    const textInputs = document.querySelectorAll('input:not([type="hidden"]):not([type="file"]), textarea, select');
    const fileInputs = document.querySelectorAll('input[type="file"]');
    
    const allEls = [...textInputs, ...fileInputs];
    const fields = [];
    const seen = new Set();

    allEls.forEach((el, i) => {
      if (el.disabled || el.readOnly) return;
      
      const isFile = el.type === "file";
      
      // Skip invisible file inputs (visually-hidden class means clickable)
      if (isFile && !isVisible(el) && !el.classList.contains("visually-hidden")) return;
      
      const id = getId(el, i);
      if (seen.has(id)) return;
      seen.add(id);

      const type = el.type || el.tagName.toLowerCase();
      let options = [];
      if (type === "select-one" || type === "select") {
        options = Array.from(el.options).map(o => ({ value: o.value, label: o.textContent.trim() }));
      }

      let label = getLabel(el);
      
      // If file input, use the parent container's label
      if (isFile) {
        const parent = el.closest(".file-upload");
        if (parent) {
          const uploadLabel = parent.querySelector(".upload-label");
          if (uploadLabel) {
            label = uploadLabel.textContent.replace(/[\*\n]/g, "").trim();
          }
        }
        // Map to readable names
        const lowerId = id.toLowerCase();
        if (lowerId.includes("resume") || lowerId.includes("cv")) {
          label = "Resume/CV";
        } else if (lowerId.includes("cover")) {
          label = "Cover Letter";
        }
      }

      fields.push({ 
        id, 
        name: el.name || "", 
        label: label || (isFile ? "File Upload" : ""), 
        type, 
        required: el.required, 
        options,
        isFile: isFile
      });
    });
    
    console.log("[JAP] Found", fields.length, "fields");
    return fields;
  }

  function findEl(fieldId) {
    let el = document.getElementById(fieldId);
    if (el && isVisible(el)) return el;
    el = document.querySelector('[name="' + fieldId + '"]');
    if (el && isVisible(el)) return el;
    return null;
  }

  // Find file input by type (resume or cover letter)
  function findFileInput(type) {
    const files = document.querySelectorAll('input[type="file"]');
    for (const el of files) {
      const id = (el.id || "").toLowerCase();
      const name = (el.name || "").toLowerCase();
      if (type === "resume" && (id.includes("resume") || name.includes("resume"))) return el;
      if (type === "cover" && (id.includes("cover") || name.includes("cover"))) return el;
    }
    // Fallback: first file input
    return files[0];
  }

  function apply(item) {
    const el = findEl(item.fieldId);
    if (!el) return false;
    try {
      const type = el.type;
      if (type === "checkbox") el.checked = String(item.value).toLowerCase() === "true";
      else if (type === "radio") {
        const radios = document.querySelectorAll('input[name="' + el.name + '"][value="' + item.value + '"]');
        if (radios[0]) radios[0].checked = true;
      } else if (type === "select-one" || type === "select") {
        el.value = item.value;
      } else {
        el.value = item.value;
      }
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    } catch { return false; }
  }

  function applyBatch(items) {
    let ok = 0, fail = 0;
    items.forEach(item => apply(item) ? ok++ : fail++);
    return { appliedCount: ok, skippedCount: fail };
  }

  function showOverlay() {
    let o = $("#jap-overlay");
    if (o) { o.classList.remove("hidden"); return o; }

    o = document.createElement("div");
    o.id = "jap-overlay";
    o.className = "jap-overlay";
    o.innerHTML = `
      <div class="jap-header">
        <span class="jap-title">Job Autofill Pro</span>
        <div class="jap-btns">
          <button id="jap-scan" class="jap-btn jap-btn-primary">Scan</button>
          <button id="jap-fill" class="jap-btn jap-btn-success">Fill</button>
          <button id="jap-resume" class="jap-btn jap-btn-resume">Resume</button>
          <button id="jap-cover" class="jap-btn jap-btn-resume">Cover</button>
          <button id="jap-close" class="jap-btn jap-btn-ghost">✕</button>
        </div>
      </div>
      <div class="jap-body">
        <div id="jap-status" class="jap-status">Click Scan</div>
        <div id="jap-fields" class="jap-fields"></div>
      </div>
    `;
    document.body.appendChild(o);

    $("#jap-scan").onclick = runScan;
    $("#jap-fill").onclick = runFill;
    $("#jap-resume").onclick = () => triggerFileUpload("resume");
    $("#jap-cover").onclick = () => triggerFileUpload("cover");
    $("#jap-close").onclick = () => o.classList.add("hidden");

    return o;
  }

  function setStatus(text) {
    const s = $("#jap-status");
    if (s) s.textContent = text;
  }

  function render(fields, suggestions) {
    const c = $("#jap-fields");
    if (!c) return;
    c.innerHTML = "";
    if (!fields.length) { c.innerHTML = "<div>No fields</div>"; return; }

    const smap = new Map();
    suggestions?.forEach(s => smap.set(s.fieldId, s));

    fields.forEach(f => {
      // Skip file inputs in regular render
      if (f.isFile) return;
      
      const s = smap.get(f.id) || {};
      const div = document.createElement("div");
      div.className = "jap-field";
      div.innerHTML = `
        <div class="jap-field-label">${f.label || f.id}${f.required ? ' *' : ''}</div>
        <input class="jap-field-input" value="${s.value || ''}" data-id="${f.id}">
      `;
      c.appendChild(div);
    });
  }

  async function runScan() {
    setStatus("Scanning...");
    try {
      const fields = extractFields();
      const res = await ext.runtime.sendMessage({ type: "scanAndResolve" });
      if (res?.ok) {
        render(fields, res.session?.suggestions || []);
        setStatus("Done - edit & Fill");
      } else {
        render(fields, []);
        setStatus("Proxy error - edit manually");
      }
    } catch (e) {
      render(extractFields(), []);
      setStatus("Error: " + e.message);
    }
  }

  function runFill() {
    const items = [];
    $("#jap-fields").querySelectorAll(".jap-field-input").forEach(input => {
      if (input.value.trim()) {
        items.push({ fieldId: input.dataset.id, value: input.value.trim() });
      }
    });
    if (!items.length) { setStatus("No values to fill"); return; }
    const result = applyBatch(items);
    setStatus("Filled " + result.appliedCount + " fields");
  }

  function triggerFileUpload(type) {
    const input = findFileInput(type);
    if (input) {
      input.click();
      setStatus("Select your " + type + " file");
    } else {
      setStatus("No " + type + " field found");
    }
  }

  // Initialize
  showOverlay();
  setTimeout(runScan, 500);

  // Message handler
  ext.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "extractFields") {
      sendResponse({ ok: true, fields: extractFields() });
      return true;
    }
    if (msg.type === "applyAll" && msg.items) {
      sendResponse({ ok: true, ...applyBatch(msg.items) });
      return true;
    }
    if (msg.type === "showOverlay" || msg.type === "toggleOverlay") {
      showOverlay();
      sendResponse({ ok: true });
      return true;
    }
    return false;
  });

  console.log("[JAP] Ready");
})();