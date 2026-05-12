"use strict";

const fs = require("fs/promises");
const path = require("path");
const { spawn } = require("child_process");

const OUT_DIR = "/tmp/applied-ats-research";
const CHROME = process.env.CHROME || "/usr/bin/chromium";
const PORT = Number(process.env.CDP_PORT || 9222);
const USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const TARGETS = [
  {
    id: "greenhouse",
    url: "https://job-boards.greenhouse.io/greenhouse/jobs/7763582?gh_jid=7763582",
  },
  {
    id: "lever",
    url: "https://jobs.lever.co/lirvanalabs/c8b23e42-48bb-457c-97a9-9068b4d4dce5/apply",
  },
  {
    id: "workday",
    url: "https://visa.wd5.myworkdayjobs.com/en-US/Visa/job/Software-Engineer_REF080636W",
  },
  {
    id: "smartrecruiters",
    url: "https://jobs.smartrecruiters.com/oneclick-ui/company/smartrecruiters/publication/63bf2a19-0355-4b99-a686-8d733f0b3382?dcr_ci=smartrecruiters",
  },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`${url} failed: ${response.status}`);
  }
  return response.json();
}

class Cdp {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.nextId = 1;
    this.pending = new Map();
    this.events = [];
  }

  async open() {
    await new Promise((resolve, reject) => {
      this.ws.addEventListener("open", resolve, { once: true });
      this.ws.addEventListener("error", reject, { once: true });
    });

    this.ws.addEventListener("message", (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) {
          reject(new Error(msg.error.message || JSON.stringify(msg.error)));
        } else {
          resolve(msg.result || {});
        }
        return;
      }
      if (msg.method) {
        this.events.push(msg);
      }
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
  }

  close() {
    this.ws.close();
  }
}

async function launchChrome() {
  const userDataDir = path.join(OUT_DIR, "chrome-profile");
  await fs.mkdir(userDataDir, { recursive: true });

  const child = spawn(CHROME, [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    `--user-agent=${USER_AGENT}`,
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${userDataDir}`,
    "about:blank",
  ], {
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.on("data", () => {});
  child.stderr.on("data", () => {});

  for (let i = 0; i < 50; i += 1) {
    try {
      await requestJson(`http://127.0.0.1:${PORT}/json/version`);
      return child;
    } catch {
      await sleep(100);
    }
  }

  child.kill("SIGTERM");
  throw new Error("Chromium did not expose CDP in time.");
}

async function newPage() {
  const tab = await requestJson(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" });
  const cdp = new Cdp(tab.webSocketDebuggerUrl);
  await cdp.open();
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("DOM.enable");
  await cdp.send("Network.enable");
  await cdp.send("Network.setUserAgentOverride", { userAgent: USER_AGENT });
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  return cdp;
}

async function evaluate(cdp, expression, awaitPromise = true) {
  const result = await cdp.send("Runtime.evaluate", {
    expression,
    awaitPromise,
    returnByValue: true,
    timeout: 30000,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || "Runtime evaluation failed");
  }
  return result.result ? result.result.value : null;
}

function pageProbeScript(targetId) {
  return `(${async function probe(id) {
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const clean = (value) => String(value || "").replace(/\\s+/g, " ").trim();
    const visible = (el) => {
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) !== 0 && rect.width > 0 && rect.height > 0;
    };
    const textOf = (node) => clean(node && node.textContent);
    const labelFor = (el) => {
      const idAttr = el.getAttribute("id");
      const aria = clean(el.getAttribute("aria-label"));
      if (aria) return aria;
      const labelledBy = clean(el.getAttribute("aria-labelledby"));
      if (labelledBy) {
        const text = labelledBy.split(/\\s+/).map((part) => textOf(document.getElementById(part))).filter(Boolean).join(" ");
        if (text) return clean(text);
      }
      if (idAttr) {
        const label = document.querySelector("label[for=\"" + CSS.escape(idAttr) + "\"]");
        if (label) return textOf(label);
      }
      const closestLabel = el.closest("label");
      if (closestLabel) return textOf(closestLabel);
      let parent = el.parentElement;
      for (let depth = 0; parent && depth < 4; depth += 1, parent = parent.parentElement) {
        const label = parent.querySelector("label, legend, [data-automation-id*='label'], [class*='label']");
        if (label) return textOf(label);
      }
      return clean(el.getAttribute("name") || el.getAttribute("placeholder") || el.getAttribute("data-automation-id") || "");
    };
    const optionSnapshot = () => Array.from(document.querySelectorAll("[role='option'], [data-automation-id='promptOption'], [class*='select__option'], [class*='option'], li[aria-selected]"))
      .filter((el) => el instanceof HTMLElement && visible(el))
      .slice(0, 40)
      .map((el) => ({
        text: textOf(el),
        role: el.getAttribute("role") || "",
        dataAutomationId: el.getAttribute("data-automation-id") || "",
        className: String(el.className || "").slice(0, 160),
      }));

    const applyButton = Array.from(document.querySelectorAll("button, a"))
      .find((el) => visible(el) && (
        /\\bapply\\b|i'm interested/i.test(textOf(el)) ||
        String(el.getAttribute("data-sr-track") || "").toLowerCase() === "apply" ||
        String(el.id || "").toLowerCase() === "st-apply"
      ));
    if (applyButton && id !== "greenhouse" && id !== "lever" && id !== "smartrecruiters") {
      applyButton.click();
      if (applyButton.href) {
        location.href = applyButton.href;
      }
      await sleep(7000);
    }

    const fields = Array.from(document.querySelectorAll("input:not([type='hidden']), textarea, select, [role='combobox'], [aria-haspopup='listbox'], [data-automation-id='promptInput']"))
      .filter((el) => el instanceof HTMLElement && visible(el))
      .slice(0, 80);

    const beforeOptions = optionSnapshot();
    const inspected = [];

    for (const el of fields) {
      const tag = el.tagName.toLowerCase();
      const role = el.getAttribute("role") || "";
      const type = el.getAttribute("type") || "";
      const info = {
        tag,
        role,
        type,
        name: el.getAttribute("name") || "",
        id: el.getAttribute("id") || "",
        dataAutomationId: el.getAttribute("data-automation-id") || "",
        ariaExpanded: el.getAttribute("aria-expanded") || "",
        ariaControls: el.getAttribute("aria-controls") || "",
        className: String(el.className || "").slice(0, 220),
        label: labelFor(el).slice(0, 300),
        nativeOptions: tag === "select" ? Array.from(el.options).map((opt) => clean(opt.textContent || opt.label || opt.value)).filter(Boolean) : [],
        optionsAfterClick: [],
      };

      if (tag === "select" || role === "combobox" || el.getAttribute("aria-haspopup") === "listbox" || info.className.toLowerCase().includes("select")) {
        const control = el.closest("[class*='select__control'], [class*='select-container'], [role='combobox'], [aria-haspopup='listbox']") || el;
        const toggle = control.querySelector("button[aria-label*='toggle' i], button[aria-label*='open' i], [class*='indicator'], [class*='dropdown']");
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true, cancelable: true }));
        await sleep(100);
        control.scrollIntoView({ block: "center", inline: "nearest" });
        await sleep(200);
        if (toggle instanceof HTMLElement) {
          toggle.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, view: window }));
          toggle.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true, view: window }));
          toggle.click();
        } else {
          control.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, view: window }));
          control.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true, view: window }));
          control.click();
        }
        if ("focus" in el) el.focus();
        el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, view: window }));
        el.click();
        el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", code: "ArrowDown", bubbles: true, cancelable: true }));
        await sleep(1200);
        info.afterClickAriaExpanded = el.getAttribute("aria-expanded") || "";
        info.optionsAfterClick = optionSnapshot();
        document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true }));
        await sleep(150);
      }

      inspected.push(info);
    }

    return {
      url: location.href,
      title: document.title,
      h1: textOf(document.querySelector("h1")),
      readyState: document.readyState,
      fieldCount: fields.length,
      beforeOptions,
      fields: inspected,
      scripts: Array.from(document.scripts).map((script) => script.src).filter(Boolean).slice(0, 80),
      bodyTextSample: clean(document.body.innerText).slice(0, 3000),
    };
  }})( ${JSON.stringify(targetId)} )`;
}

async function inspectTarget(target) {
  const cdp = await newPage();
  await cdp.send("Page.navigate", { url: target.url });
  await sleep(8000);
  const probe = await evaluate(cdp, pageProbeScript(target.id));
  const html = await evaluate(cdp, "document.documentElement.outerHTML");
  const screenshot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });

  const dir = path.join(OUT_DIR, target.id);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "probe.json"), JSON.stringify(probe, null, 2));
  await fs.writeFile(path.join(dir, "page.html"), html || "");
  await fs.writeFile(path.join(dir, "screenshot.png"), Buffer.from(screenshot.data, "base64"));

  cdp.close();
  return {
    id: target.id,
    url: probe.url,
    title: probe.title,
    fieldCount: probe.fieldCount,
    selectLike: probe.fields.filter((field) => field.tag === "select" || field.role === "combobox" || field.className.toLowerCase().includes("select")).length,
    optionBearingFields: probe.fields.filter((field) => field.nativeOptions.length || field.optionsAfterClick.length).length,
  };
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const chrome = await launchChrome();
  const summary = [];

  try {
    for (const target of TARGETS) {
      summary.push(await inspectTarget(target));
    }
    await fs.writeFile(path.join(OUT_DIR, "summary.json"), JSON.stringify(summary, null, 2));
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  } finally {
    chrome.kill("SIGTERM");
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message || error}\n`);
  process.exit(1);
});
