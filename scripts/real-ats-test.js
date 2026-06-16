"use strict";

const fs = require("fs/promises");
const path = require("path");
const { spawn } = require("child_process");

const OUT_DIR = "/tmp/applied-real-ats-test";
const CHROME = process.env.CHROME || "/usr/bin/chromium";
const PORT = Number(process.env.CDP_PORT || 9224);
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const JOB_URLS = [
  // Greenhouse - verified application forms
  { ats: "greenhouse", url: "https://job-boards.greenhouse.io/formbio/jobs/4001910006", note: "Full form with First/Last/Email/Phone/Resume/CoverLetter/Education/LinkedIn/WorkAuth/Sponsorship" },
  { ats: "greenhouse", url: "https://job-boards.greenhouse.io/notion/jobs/7654321", note: "Notion job" },
  { ats: "greenhouse", url: "https://job-boards.greenhouse.io/anthropic/jobs/7238949", note: "Anthropic job" },
  { ats: "greenhouse", url: "https://job-boards.greenhouse.io/vercel/jobs/7600000", note: "Vercel job" },
  // Lever - direct apply pages
  { ats: "lever", url: "https://jobs.lever.co/enveda/c14d0b11-a2a5-4411-ae5f-52cc33c6707c/apply", note: "Enveda Software Engineer" },
  { ats: "lever", url: "https://jobs.lever.co/life/6f833512-e517-4095-83f1-c18d0b01f795/apply", note: "Life.Church Software Engineer" },
  { ats: "lever", url: "https://jobs.lever.co/renegade/a88f9d0e-036f-4e0c-84f2-b72ef2c94752/apply", note: "Renegade Software Engineer" },
  // Ashby - job pages with apply forms
  { ats: "ashby", url: "https://jobs.ashbyhq.com/notion", note: "Notion jobs page" },
  { ats: "ashby", url: "https://jobs.ashbyhq.com/cognition/e8086415-62bc-4cc0-96a4-84bb56182d35", note: "Cognition Software Engineer" },
  { ats: "ashby", url: "https://jobs.ashbyhq.com/brellium/8209ac68-d966-4d5f-a925-3b277f8583c3", note: "Brellium Software Engineer" },
  // Workable - direct job pages
  { ats: "workable", url: "https://apply.workable.com/walaris/j/B292336461", note: "Walaris Software Engineer" },
  { ats: "workable", url: "https://apply.workable.com/phocassoftware/j/00631B1EE5", note: "Phocas Software Engineer" },
  // SmartRecruiters
  { ats: "smartrecruiters", url: "https://jobs.smartrecruiters.com/sap", note: "SAP jobs page" },
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
async function rj(url, opts = {}) { const r = await fetch(url, opts); if (!r.ok) throw new Error(`${r.status}`); return r.json(); }

class Cdp {
  constructor(ws) { this.ws = ws; this.id = 1; this.p = new Map(); }
  async open() {
    await new Promise((ok, err) => { this.ws.addEventListener("open", ok, { once: true }); this.ws.addEventListener("error", err, { once: true }); });
    this.ws.addEventListener("message", e => {
      const m = JSON.parse(e.data);
      if (m.id && this.p.has(m.id)) {
        const { resolve, reject } = this.p.get(m.id); this.p.delete(m.id);
        m.error ? reject(new Error(m.error.message)) : resolve(m.result || {});
      }
    });
  }
  send(method, params = {}) {
    const id = this.id++;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.p.set(id, { resolve, reject });
      setTimeout(() => { if (this.p.has(id)) { this.p.delete(id); reject(new Error("CDP timeout")); } }, 12000);
    });
  }
  close() { try { this.ws.close(); } catch {} }
}

async function launchChrome() {
  const d = path.join(OUT_DIR, "chrome-" + PORT);
  await fs.mkdir(d, { recursive: true });
  const ch = spawn(CHROME, ["--headless=new","--disable-gpu","--no-sandbox","--disable-dev-shm-usage",
    `--user-agent=${UA}`,`--remote-debugging-port=${PORT}`,`--user-data-dir=${d}`,"about:blank"],
    { stdio: ["ignore","pipe","pipe"] });
  for (let i = 0; i < 50; i++) { try { await rj(`http://127.0.0.1:${PORT}/json/version`); return ch; } catch { await sleep(100); } }
  ch.kill("SIGTERM"); throw new Error("Chrome no ready");
}

async function newPage() {
  const tab = await rj(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" });
  const c = new Cdp(new WebSocket(tab.webSocketDebuggerUrl));
  await c.open();
  await c.send("Page.enable"); await c.send("Runtime.enable");
  await c.send("Network.setUserAgentOverride", { userAgent: UA });
  await c.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  return c;
}

async function ev(cdp, expr) {
  try {
    const r = await cdp.send("Runtime.evaluate", { expression: expr, awaitPromise: false, returnByValue: true, timeout: 10000 });
    return r.exceptionDetails ? null : (r.result ? r.result.value : null);
  } catch { return null; }
}

// Field extraction script - mirrors content-script.js logic
const EXTRACT = `(${function() {
  function n(s){return String(s||"").replace(/\\s+/g," ").trim()}
  function t(node){return node?n(node.textContent):""}
  function vis(el){if(!(el instanceof HTMLElement))return false;const s=getComputedStyle(el),r=el.getBoundingClientRect();return s.display!=="none"&&s.visibility!=="hidden"&&Number(s.opacity)!==0&&r.width>0&&r.height>0}
  function hi(h,s){return h===s||h.endsWith("."+s)}
  function qa(sel,r=document){return Array.from(r.querySelectorAll(sel))}
  function ne(el){if(!el)return null;if(el instanceof HTMLInputElement||el instanceof HTMLTextAreaElement||el instanceof HTMLSelectElement)return el;const rl=(el.getAttribute("role")||"").toLowerCase();if(rl==="combobox"||rl==="listbox"||el.getAttribute("aria-haspopup")==="listbox")return el;return null}
  function lbFor(el){const id=el.getAttribute("id");if(!id)return"";const l=document.querySelector('label[for="'+CSS.escape(id)+'"]');return l?t(l):""}
  function lbAria(el){const a=n(el.getAttribute("aria-label"));if(a)return a;const lb=el.getAttribute("aria-labelledby");if(!lb)return"";return lb.split(/\\s+/).map(i=>t(document.getElementById(i))).filter(Boolean).join(" ")}
  function lbCont(el){const pl=el.closest("label");if(pl){const v=t(pl);if(v)return v}let s=el.previousElementSibling;while(s){if(s.tagName==="LABEL"||(s.classList&&s.classList.contains("label"))){const v=t(s);if(v)return v}s=s.previousElementSibling}let p=el.parentElement,d=0;while(p&&d<3){const l=p.querySelector('label,.label,[data-testid*="label"]');if(l&&(l.contains(el)||l.nextElementSibling===el||el.previousElementSibling===l)){const v=t(l);if(v)return v}p=p.parentElement;d++}return""}
  function lbProx(el){let s=el.previousElementSibling,d=0;while(s&&d<5){const v=t(s);if(v&&v.length>2)return v;s=s.previousElementSibling;d++}let p=el.parentElement,pd=0;while(p&&pd<3){let ps=p.previousElementSibling;if(ps){const v=t(ps);if(v&&v.length>2)return v}p=p.parentElement;pd++}return""}
  function gfl(el){const fs=el.closest("fieldset");const lt=fs?t(fs.querySelector("legend")):"";return[lbFor(el),lbAria(el),lt,lbCont(el),lbProx(el),n(el.getAttribute("placeholder")),n(el.getAttribute("name")),n(el.getAttribute("id"))].find(Boolean)||""}
  function ft(el){const tg=el.tagName.toLowerCase();if(tg==="select")return"select";if(tg==="textarea")return"textarea";if(tg==="input"){const tp=(el.getAttribute("type")||"text").toLowerCase();if(["text","email","tel","url","number","date","search","password"].includes(tp))return tp;if(tp==="checkbox")return"checkbox";if(tp==="radio")return"radio";if(tp==="file")return"file";return"text"}const rl=(el.getAttribute("role")||"").toLowerCase();if(rl==="combobox"||rl==="listbox"||el.getAttribute("aria-haspopup")==="listbox")return"select";return"text"}

  const h=location.hostname;
  const am={greenhouse:h=>hi(h,"greenhouse.io"),lever:h=>hi(h,"lever.co"),ashby:h=>hi(h,"ashbyhq.com"),workday:h=>hi(h,"myworkday.com")||hi(h,"myworkdayjobs.com")||hi(h,"workday.com"),indeed:h=>hi(h,"indeed.com"),linkedin:h=>hi(h,"linkedin.com"),smartrecruiters:h=>hi(h,"smartrecruiters.com"),workable:h=>hi(h,"workable.com"),bamboohr:h=>hi(h,"bamboohr.com")};
  const aid=Object.keys(am).find(k=>am[k](h));
  if(!aid)return{adapter:null,hostname:h,fields:[],error:"No adapter"};

  const raw=qa('input:not([type="hidden"]):not([type="file"]), textarea, select, [role="combobox"], [aria-haspopup="listbox"]');
  const cands=raw.map(ne).filter(Boolean);
  const fields=[],si=new Set(),sr=new Set();

  for(const el of cands){
    if(!vis(el)||el.disabled||el.readOnly)continue;
    const type=ft(el),ia=(el.getAttribute("id")||"").trim(),nm=(el.getAttribute("name")||"").trim();
    if(type==="radio"&&nm){if(sr.has(nm))continue;sr.add(nm)}
    const label=gfl(el),ph=n(el.getAttribute("placeholder"));
    let fid;
    if(type==="radio"&&nm)fid="radio:"+nm;else if(ia)fid="id:"+ia;else if(nm)fid="name:"+nm;else fid="anon:"+(type+"::"+label+"::"+ph).replace(/[^a-z0-9]+/gi,"_").slice(0,60);
    if(si.has(fid))continue;si.add(fid);
    let opts=[];
    if(type==="select"&&el instanceof HTMLSelectElement)opts=Array.from(el.options).map(o=>({label:n(o.textContent||o.label),value:o.value})).filter(o=>o.label);
    fields.push({id:fid,name:nm,label,type,required:!!el.required||el.getAttribute("aria-required")==="true",options:opts,placeholder:ph,description:""});
  }
  return{adapter:aid,hostname:h,url:location.href,title:document.title,fieldCount:fields.length,fields,bodyTextSample:n(document.body.innerText).slice(0,1500)};
}})()`;

async function inspectJob(job, cdp) {
  const dir = path.join(OUT_DIR, job.ats);
  await fs.mkdir(dir, { recursive: true });
  try {
    await cdp.send("Page.navigate", { url: job.url });
    await sleep(6000);
    // Click apply button if present
    await ev(cdp, `(()=>{const b=[...document.querySelectorAll("button,a")].find(e=>{const tx=(e.textContent||"").trim().toLowerCase();return tx.includes("apply")||tx.includes("submit")});if(b)b.click();})()`);
    await sleep(4000);

    const result = await ev(cdp, EXTRACT);
    if (!result) return { ...job, adapter: null, fields: [], error: "Extraction failed" };

    const html = await ev(cdp, "document.documentElement.outerHTML");
    const slug = job.url.replace(/[^a-z0-9]/gi, "_").slice(0, 80);
    await fs.writeFile(path.join(dir, `${slug}.json`), JSON.stringify(result, null, 2));
    if (html) await fs.writeFile(path.join(dir, `${slug}.html`), html);
    return { ...job, ...result };
  } catch (err) {
    return { ...job, adapter: null, fields: [], error: err.message };
  }
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const chrome = await launchChrome();
  const results = [];
  try {
    for (const job of JOB_URLS) {
      const cdp = await newPage();
      process.stdout.write(`${job.ats}: ${job.note || job.url} ... `);
      try {
        const r = await inspectJob(job, cdp);
        results.push(r);
        console.log(`adapter=${r.adapter||"none"} fields=${r.fieldCount||0} err=${r.error||"ok"}`);
        if (r.fields && r.fields.length > 0) {
          console.log(`  labels: ${r.fields.map(f => f.label || f.name || f.id).join(", ")}`);
        }
      } finally { cdp.close(); }
    }

    await fs.writeFile(path.join(OUT_DIR, "results.json"), JSON.stringify(results, null, 2));

    console.log("\n=== FIELD EXTRACTION SUMMARY ===");
    const byAts = {};
    for (const r of results) {
      if (!byAts[r.ats]) byAts[r.ats] = { total: 0, matched: 0, totalFields: 0, allFields: [], errors: [] };
      byAts[r.ats].total++;
      if (r.adapter) byAts[r.ats].matched++;
      byAts[r.ats].totalFields += r.fieldCount || 0;
      if (r.fields) byAts[r.ats].allFields.push(...r.fields);
      if (r.error) byAts[r.ats].errors.push(r.error);
    }
    for (const [ats, s] of Object.entries(byAts)) {
      console.log(`\n${ats}: ${s.matched}/${s.total} matched, ${s.totalFields} fields`);
      if (s.allFields.length > 0) {
        for (const f of s.allFields.slice(0, 15)) {
          console.log(`  [${f.type}] label="${f.label}" name="${f.name}" id="${f.id}" required=${f.required} opts=${f.options.length}`);
        }
      }
      if (s.errors.length) console.log(`  errors: ${s.errors.join("; ")}`);
    }
  } finally { chrome.kill("SIGTERM"); }
}

main().catch(e => { console.error(e); process.exit(1); });
