(function () {
  "use strict";

  console.log("[JAP] Background loaded v2.1");

  const ext = typeof browser !== "undefined" ? browser : chrome;

  const DEFAULT_CONFIG = {
    proxyBaseUrl: "http://127.0.0.1:8787",
    confidenceThreshold: 0.6,
  };

  const sessionStore = new Map();

  function clamp(val, min, max) {
    const n = Number(val);
    return Number.isNaN(n) ? min : Math.max(min, Math.min(max, n));
  }

  async function getConfig() {
    try {
      const s = await ext.storage.local.get("config");
      return { ...DEFAULT_CONFIG, ...(s.config || {}) };
    } catch { return DEFAULT_CONFIG; }
  }

  async function saveConfig(cfg) {
    await ext.storage.local.set({ config: cfg });
  }

  async function getActiveTab() {
    const tabs = await ext.tabs.query({ active: true, currentWindow: true });
    return tabs[0] || null;
  }

  async function callProxy(endpoint, payload, method = "POST") {
    const cfg = await getConfig();
    const url = cfg.proxyBaseUrl + endpoint;
    
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: method === "GET" ? undefined : JSON.stringify(payload || {}),
    });

    const text = await res.text();
    let data = null;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    if (!res.ok) {
      throw new Error(data.error || data.message || `Proxy error (${res.status})`);
    }
    return data;
  }

  async function resolveFields() {
    const tab = await getActiveTab();
    if (!tab || !tab.id) throw new Error("No active tab");

    console.log("[JAP] Resolving for:", tab.url);

    // Extract fields from page
    let scan;
    try {
      scan = await ext.tabs.sendMessage(tab.id, { type: "extractFields" });
    } catch (e) {
      throw new Error("Cannot scan page. Reload and try again.");
    }

    if (!scan || !scan.ok || !scan.fields) {
      throw new Error("No fields found on page");
    }

    console.log("[JAP] Found", scan.fields.length, "fields");

    // Get suggestions from proxy
    let result;
    try {
      result = await callProxy("/v1/resolve-form", {
        url: tab.url,
        fields: scan.fields,
        confidenceThreshold: 0.6,
      });
    } catch (e) {
      console.error("[JAP] Proxy error:", e.message);
      // Return fields without AI suggestions
      result = {
        ok: true,
        suggestions: scan.fields.map(f => ({
          fieldId: f.id,
          value: null,
          confidence: 0,
          suggested: false,
          reason: "AI unavailable",
        }))
      };
    }

    const session = {
      tabId: tab.id,
      fields: scan.fields,
      suggestions: result.suggestions || [],
      resolvedAt: new Date().toISOString(),
    };

    sessionStore.set(tab.id, session);
    return session;
  }

  async function applyAll() {
    const tab = await getActiveTab();
    if (!tab || !tab.id) throw new Error("No active tab");

    const session = sessionStore.get(tab.id);
    if (!session) throw new Error("Run scan first");

    const items = session.suggestions
      .filter(s => s.suggested && s.value !== null)
      .map(s => ({ fieldId: s.fieldId, value: s.value }));

    if (!items.length) throw new Error("No suggested values to fill");

    const res = await ext.tabs.sendMessage(tab.id, {
      type: "applyAll",
      items: items,
    });

    return { appliedCount: res?.appliedCount || 0 };
  }

  async function reloadProfile() {
    return callProxy("/reload-profile", {}, "POST");
  }

  async function getProxyHealth() {
    return callProxy("/health", null, "GET");
  }

  // Message handler
  ext.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    const type = msg?.type;
    console.log("[JAP] Message:", type);

    if (type === "scanAndResolve") {
      resolveFields()
        .then(s => sendResponse({ ok: true, session: s }))
        .catch(e => sendResponse({ ok: false, error: e.message }));
      return true;
    }

    if (type === "getActiveSession") {
      getActiveTab().then(tab => {
        const s = tab?.id ? sessionStore.get(tab.id) : null;
        sendResponse({ ok: true, session: s });
      });
      return true;
    }

    if (type === "applyAll") {
      applyAll()
        .then(r => sendResponse({ ok: true, result: r }))
        .catch(e => sendResponse({ ok: false, error: e.message }));
      return true;
    }

    if (type === "getConfig") {
      getConfig().then(c => sendResponse({ ok: true, config: c }));
      return true;
    }

    if (type === "saveConfig") {
      saveConfig(msg.config || {}).then(() => sendResponse({ ok: true }));
      return true;
    }

    if (type === "reloadProfile") {
      reloadProfile()
        .then(r => sendResponse({ ok: true, payload: r }))
        .catch(e => sendResponse({ ok: false, error: e.message }));
      return true;
    }

    if (type === "proxyHealth") {
      getProxyHealth()
        .then(r => sendResponse({ ok: true, payload: r }))
        .catch(e => sendResponse({ ok: false, error: e.message }));
      return true;
    }

    return undefined;
  });

  // Toolbar click
  ext.action.onClicked.addListener((tab) => {
    if (tab?.id) {
      ext.tabs.sendMessage(tab.id, { type: "showOverlay" }).catch(e => console.log("[JAP] showOverlay error:", e));
    }
  });

  // Command handler for keyboard shortcuts
  ext.commands.onCommand.addListener((command) => {
    if (command === "toggle-overlay") {
      ext.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
        if (tabs[0]?.id) {
          ext.tabs.sendMessage(tabs[0].id, { type: "toggleOverlay" });
        }
      });
    }
  });

  console.log("[JAP] Background ready");
})();