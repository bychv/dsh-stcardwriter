window.__ModuleLoader__.load({ id: "dsh-stcardwriter", factory: (require) => { var module = { exports: {} }; var exports = module.exports;
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client.tsx
var client_exports = {};
__export(client_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(client_exports);
var import_react = require("react");
var import_jsx_runtime = require("react/jsx-runtime");
var API = "/api/dsh-stcardwriter";
var listeners = /* @__PURE__ */ new Set();
var opened = false;
function setOpened(value) {
  opened = value;
  for (const listener of listeners) listener();
}
function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
var harnessBridge;
var bridgeVersion = 0;
var bridgeListeners = /* @__PURE__ */ new Set();
function setHarnessBridge(value) {
  harnessBridge = value;
  bridgeVersion += 1;
  for (const listener of bridgeListeners) listener();
}
function subscribeBridge(listener) {
  bridgeListeners.add(listener);
  return () => bridgeListeners.delete(listener);
}
var activeWorkspacePath = "";
function downloadUrl(path) {
  const separator = path.includes("?") ? "&" : "?";
  return `${API}${path}${separator}workspace=${encodeURIComponent(activeWorkspacePath)}`;
}
async function api(path, init) {
  if (!activeWorkspacePath) throw new Error("\u8BF7\u5148\u9009\u62E9\u6216\u6253\u5F00\u4E00\u4E2A DSH \u5DE5\u4F5C\u533A");
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: { ...init?.body ? { "content-type": "application/json" } : {}, "x-dsh-workspace": encodeURIComponent(activeWorkspacePath), ...init?.headers }
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(body.error || `HTTP ${response.status}`);
  }
  return response.json();
}
function FooterAction({ wide }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: "stcw-sidebar-button", title: "\u9152\u9986\u521B\u4F5C\u6A21\u5F0F", onClick: () => setOpened(true), children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { "aria-hidden": true, children: "\u2726" }),
    wide && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u9152\u9986\u521B\u4F5C" })
  ] });
}
function HarnessComposerAction({ sessionId, inputActions }) {
  (0, import_react.useEffect)(() => {
    const value = { sessionId, actions: inputActions };
    setHarnessBridge(value);
    return () => {
      if (harnessBridge === value) setHarnessBridge(void 0);
    };
  }, [sessionId, inputActions]);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "stcw-composer-button", title: "\u6253\u5F00\u9152\u9986\u521B\u4F5C\u6A21\u5F0F", onClick: () => setOpened(true), children: "\u2726 \u9152\u9986" });
}
function field(data, key) {
  return typeof data?.[key] === "string" ? data[key] : "";
}
function innerCharacter(asset) {
  return asset.data && typeof asset.data.data === "object" ? asset.data.data : asset.data;
}
function TextField(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "stcw-field", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: props.label }),
    props.multiline ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", { value: props.value, rows: 5, onChange: (event) => props.onChange(event.target.value) }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: props.value, onChange: (event) => props.onChange(event.target.value) })
  ] });
}
function CharacterEditor({ asset, change }) {
  const data = innerCharacter(asset);
  const set = (key, value) => change((next) => {
    const inner = innerCharacter(next);
    inner[key] = value;
    if (key === "name" && typeof value === "string") next.name = value;
  });
  const greetings = Array.isArray(data.alternate_greetings) ? data.alternate_greetings.join("\n---\n") : "";
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "stcw-form", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "stcw-grid2", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextField, { label: "\u89D2\u8272\u540D", value: field(data, "name"), onChange: (value) => set("name", value) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextField, { label: "\u7248\u672C", value: field(data, "character_version"), onChange: (value) => set("character_version", value) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextField, { label: "\u4F5C\u8005", value: field(data, "creator"), onChange: (value) => set("creator", value) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextField, { label: "\u6807\u7B7E\uFF08\u9017\u53F7\u5206\u9694\uFF09", value: Array.isArray(data.tags) ? data.tags.join(", ") : "", onChange: (value) => set("tags", value.split(",").map((v) => v.trim()).filter(Boolean)) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextField, { label: "\u89D2\u8272\u63CF\u8FF0", multiline: true, value: field(data, "description"), onChange: (value) => set("description", value) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextField, { label: "\u6027\u683C", multiline: true, value: field(data, "personality"), onChange: (value) => set("personality", value) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextField, { label: "\u573A\u666F", multiline: true, value: field(data, "scenario"), onChange: (value) => set("scenario", value) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextField, { label: "\u7B2C\u4E00\u6761\u6D88\u606F", multiline: true, value: field(data, "first_mes"), onChange: (value) => set("first_mes", value) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextField, { label: "\u5BF9\u8BDD\u793A\u4F8B", multiline: true, value: field(data, "mes_example"), onChange: (value) => set("mes_example", value) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextField, { label: "\u5907\u9009\u5F00\u573A\uFF08\u7528\u5355\u72EC\u4E00\u884C --- \u5206\u9694\uFF09", multiline: true, value: greetings, onChange: (value) => set("alternate_greetings", value ? value.split(/\n---\n/) : []) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextField, { label: "\u7CFB\u7EDF\u63D0\u793A", multiline: true, value: field(data, "system_prompt"), onChange: (value) => set("system_prompt", value) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextField, { label: "\u5386\u53F2\u540E\u6307\u4EE4", multiline: true, value: field(data, "post_history_instructions"), onChange: (value) => set("post_history_instructions", value) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextField, { label: "\u521B\u4F5C\u8005\u5907\u6CE8", multiline: true, value: field(data, "creator_notes"), onChange: (value) => set("creator_notes", value) })
  ] });
}
var ENTRY_DEFAULTS = {
  key: [],
  keysecondary: [],
  comment: "",
  content: "",
  constant: false,
  vectorized: false,
  selective: true,
  selectiveLogic: 0,
  order: 100,
  position: 0,
  disable: false,
  ignoreBudget: false,
  excludeRecursion: false,
  preventRecursion: false,
  probability: 100,
  useProbability: true,
  depth: 4,
  group: "",
  groupOverride: false,
  groupWeight: 100
};
function worldEntries(asset) {
  const current = asset.data.entries;
  if (current && !Array.isArray(current) && typeof current === "object") return current;
  const converted = {};
  if (Array.isArray(current)) current.forEach((entry, index) => {
    converted[String(entry?.uid ?? entry?.id ?? index)] = entry;
  });
  return converted;
}
function WorldbookEditor({ asset, change }) {
  const entries = worldEntries(asset);
  const ids = Object.keys(entries).sort((a, b) => Number(a) - Number(b));
  const [selected, setSelected] = (0, import_react.useState)(ids[0] || "");
  (0, import_react.useEffect)(() => {
    if (!entries[selected]) setSelected(ids[0] || "");
  }, [asset.id, ids.join(","), selected]);
  const entry = entries[selected];
  const alter = (key, value) => change((next) => {
    const all = worldEntries(next);
    next.data.entries = all;
    if (all[selected]) all[selected][key] = value;
  });
  const add = () => change((next) => {
    const all = worldEntries(next);
    next.data.entries = all;
    const numeric = Object.keys(all).map(Number).filter(Number.isFinite);
    const id = String((numeric.length ? Math.max(...numeric) : -1) + 1);
    all[id] = { ...ENTRY_DEFAULTS, uid: Number(id) };
    setSelected(id);
  });
  const remove = () => change((next) => {
    const all = worldEntries(next);
    next.data.entries = all;
    delete all[selected];
  });
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "stcw-world-editor", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "stcw-entry-list", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: add, children: "\uFF0B \u65B0\u6761\u76EE" }),
      ids.map((id) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: id === selected ? "active" : "", onClick: () => setSelected(id), children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: entries[id]?.comment || `\u6761\u76EE ${id}` }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: Array.isArray(entries[id]?.key) ? entries[id].key.join(", ") : "" })
      ] }, id))
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "stcw-entry-form", children: entry ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "stcw-row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: [
          "\u6761\u76EE ",
          selected
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "danger", onClick: remove, children: "\u5220\u9664" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextField, { label: "\u6807\u9898 / \u5907\u6CE8", value: field(entry, "comment"), onChange: (value) => alter("comment", value) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextField, { label: "\u4E3B\u5173\u952E\u8BCD\uFF08\u9017\u53F7\u5206\u9694\uFF09", value: Array.isArray(entry.key) ? entry.key.join(", ") : "", onChange: (value) => alter("key", value.split(",").map((v) => v.trim()).filter(Boolean)) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextField, { label: "\u6B21\u5173\u952E\u8BCD\uFF08\u9017\u53F7\u5206\u9694\uFF09", value: Array.isArray(entry.keysecondary) ? entry.keysecondary.join(", ") : "", onChange: (value) => alter("keysecondary", value.split(",").map((v) => v.trim()).filter(Boolean)) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextField, { label: "\u6CE8\u5165\u5185\u5BB9", multiline: true, value: field(entry, "content"), onChange: (value) => alter("content", value) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "stcw-grid2", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextField, { label: "\u987A\u5E8F", value: String(entry.order ?? 100), onChange: (value) => alter("order", Number(value) || 0) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextField, { label: "\u6DF1\u5EA6", value: String(entry.depth ?? 4), onChange: (value) => alter("depth", Number(value) || 0) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextField, { label: "\u6982\u7387 %", value: String(entry.probability ?? 100), onChange: (value) => alter("probability", Math.max(0, Math.min(100, Number(value) || 0))) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextField, { label: "\u5206\u7EC4", value: field(entry, "group"), onChange: (value) => alter("group", value) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "stcw-checks", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "checkbox", checked: entry.constant === true, onChange: (e) => alter("constant", e.target.checked) }),
          "\u5E38\u9A7B"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "checkbox", checked: entry.disable === true, onChange: (e) => alter("disable", e.target.checked) }),
          "\u7981\u7528"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "checkbox", checked: entry.selective !== false, onChange: (e) => alter("selective", e.target.checked) }),
          "\u4F7F\u7528\u6B21\u5173\u952E\u8BCD"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "checkbox", checked: entry.caseSensitive === true, onChange: (e) => alter("caseSensitive", e.target.checked) }),
          "\u533A\u5206\u5927\u5C0F\u5199"
        ] })
      ] })
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "stcw-empty", children: "\u65B0\u5EFA\u4E00\u4E2A\u4E16\u754C\u4E66\u6761\u76EE\u5F00\u59CB\u5199\u4F5C" }) })
  ] });
}
function EmbeddedWorldbookEditor({ asset, change }) {
  const data = innerCharacter(asset);
  const book = data.character_book && typeof data.character_book === "object" && !Array.isArray(data.character_book) ? data.character_book : void 0;
  const create = () => change((next) => {
    innerCharacter(next).character_book = { name: `${next.name} \u4E16\u754C\u4E66`, description: "", entries: [] };
  });
  const remove = () => {
    if (confirm("\u79FB\u9664\u8FD9\u5F20\u89D2\u8272\u5361\u7684\u5185\u5D4C\u4E16\u754C\u4E66\uFF1F\u5176\u4ED6\u9644\u5C5E\u8D44\u6E90\u4E0D\u4F1A\u53D7\u5F71\u54CD\u3002")) change((next) => {
      delete innerCharacter(next).character_book;
    });
  };
  if (!book) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", { className: "stcw-embedded-book", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("summary", { children: "\u5185\u5D4C\u4E16\u754C\u4E66" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "stcw-hint", children: "\u8FD9\u5F20\u89D2\u8272\u5361\u76EE\u524D\u6CA1\u6709 character_book\u3002" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: create, children: "\uFF0B \u65B0\u5EFA\u5185\u5D4C\u4E16\u754C\u4E66" })
  ] });
  const bookAsset = { ...asset, kind: "worldbook", format: "worldbook", name: typeof book.name === "string" ? book.name : `${asset.name} \u4E16\u754C\u4E66`, data: book };
  const changeBook = (mutate) => change((next) => {
    const inner = innerCharacter(next);
    const nested = { ...next, kind: "worldbook", format: "worldbook", data: inner.character_book };
    mutate(nested);
    inner.character_book = nested.data;
  });
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", { className: "stcw-embedded-book", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("summary", { children: "\u5185\u5D4C\u4E16\u754C\u4E66 \xB7 \u53EF\u5199\u4F5C\u4E0E\u89E6\u53D1\u9884\u89C8" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "stcw-row", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "stcw-safe-note", children: "\u4FDD\u5B58\u5728\u89D2\u8272\u5361 character_book \u4E2D\uFF0C\u5BFC\u51FA\u4E0E\u539F\u5361\u540C\u884C\u3002" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "danger", onClick: remove, children: "\u79FB\u9664\u5185\u5D4C\u4E16\u754C\u4E66" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WorldbookEditor, { asset: bookAsset, change: changeBook }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "stcw-embedded-preview", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Preview, { asset: bookAsset }) })
  ] });
}
function PresetPlusEditor({ asset, change }) {
  const entries = Array.isArray(asset.data.entries) ? asset.data.entries : [];
  const [selected, setSelected] = (0, import_react.useState)(0);
  (0, import_react.useEffect)(() => {
    setSelected(0);
  }, [asset.id]);
  const entry = entries[selected];
  const alterRoot = (key, value) => change((next) => {
    ;
    next.data[key] = value;
    if (key === "name" && typeof value === "string") next.name = value;
  });
  const alterEntry = (key, value) => change((next) => {
    const list = Array.isArray(next.data.entries) ? next.data.entries : [];
    if (list[selected]) list[selected][key] = value;
  });
  const add = () => change((next) => {
    if (!Array.isArray(next.data.entries)) next.data.entries = [];
    const list = next.data.entries;
    list.push({ role: list.length === 0 ? "system" : "user", text: "", enabled: true });
    setSelected(list.length - 1);
  });
  const remove = () => change((next) => {
    const list = Array.isArray(next.data.entries) ? next.data.entries : [];
    list.splice(selected, 1);
    setSelected(Math.max(0, selected - 1));
  });
  const move = (offset) => change((next) => {
    const list = Array.isArray(next.data.entries) ? next.data.entries : [];
    const target = selected + offset;
    if (!list[selected] || target < 0 || target >= list.length) return;
    [list[selected], list[target]] = [list[target], list[selected]];
    setSelected(target);
  });
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "stcw-world-editor", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "stcw-entry-list", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: add, children: "\uFF0B \u65B0\u6761\u76EE" }),
      entries.map((item, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: selected === index ? "active" : "", onClick: () => setSelected(index), children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("b", { children: [
          index + 1,
          ". ",
          item.role || "\u65E0\u89D2\u8272"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: item.enabled === false ? "\u5DF2\u7981\u7528" : String(item.text || "").slice(0, 28) || "\uFF08\u7A7A\uFF09" })
      ] }, index))
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "stcw-entry-form", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextField, { label: "Preset Plus \u540D\u79F0", value: field(asset.data, "name"), onChange: (value) => alterRoot("name", value) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextField, { label: "Preset Plus ID", value: field(asset.data, "id"), onChange: (value) => alterRoot("id", value) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "stcw-checks", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "checkbox", checked: asset.data.autoMode !== false, onChange: (event) => alterRoot("autoMode", event.target.checked) }),
        "\u81EA\u52A8\u6CE8\u5165"
      ] }) }),
      entry ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "stcw-row", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: [
            "\u6761\u76EE ",
            selected + 1
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: selected === 0, onClick: () => move(-1), children: "\u4E0A\u79FB" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: selected === entries.length - 1, onClick: () => move(1), children: "\u4E0B\u79FB" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "danger", onClick: remove, children: "\u5220\u9664" })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "stcw-field", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Role" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { value: String(entry.role || ""), onChange: (event) => alterEntry("role", event.target.value), children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "system", children: "system" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "user", children: "user" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "assistant", children: "assistant" })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "stcw-checks", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "checkbox", checked: entry.enabled !== false, onChange: (event) => alterEntry("enabled", event.target.checked) }),
          "\u542F\u7528"
        ] }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextField, { label: "\u63D0\u793A\u8BCD\u6B63\u6587", multiline: true, value: field(entry, "text"), onChange: (value) => alterEntry("text", value) }),
        selected === 0 && (entry.role !== "system" || entry.enabled === false) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "stcw-probe-error", children: "Preset Plus \u8981\u6C42\u7B2C\u4E00\u6761\u662F\u5DF2\u542F\u7528\u7684 system \u6761\u76EE\uFF0C\u5199\u5165\u524D\u8BF7\u4FEE\u6B63\u3002" })
      ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "stcw-hint", children: "\u81F3\u5C11\u6DFB\u52A0\u4E00\u4E2A\u5DF2\u542F\u7528\u7684 system \u6761\u76EE\u540E\u624D\u80FD\u5199\u5165 Preset Plus\u3002" })
    ] })
  ] });
}
function SillyTavernPresetEditor({ asset, change }) {
  const prompts = Array.isArray(asset.data.prompts) ? asset.data.prompts : [];
  const [selected, setSelected] = (0, import_react.useState)(0);
  const alterRoot = (key, value) => change((next) => {
    next.data[key] = value;
    if (key === "name" && typeof value === "string") next.name = value;
  });
  const alterPrompt = (key, value) => change((next) => {
    const list = Array.isArray(next.data.prompts) ? next.data.prompts : [];
    if (list[selected]) list[selected][key] = value;
  });
  const add = () => change((next) => {
    if (!Array.isArray(next.data.prompts)) next.data.prompts = [];
    const list = next.data.prompts;
    const identifier = `custom-${Date.now()}`;
    list.push({ name: "\u65B0\u63D0\u793A", identifier, role: "system", content: "", system_prompt: true });
    if (!Array.isArray(next.data.prompt_order)) next.data.prompt_order = [{ character_id: 100001, order: [] }];
    const group = next.data.prompt_order[0];
    if (!Array.isArray(group.order)) group.order = [];
    group.order.push({ identifier, enabled: true });
    setSelected(list.length - 1);
  });
  if (!Array.isArray(asset.data.prompts)) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "stcw-form", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextField, { label: "\u9884\u8BBE\u540D\u79F0", value: field(asset.data, "name"), onChange: (value) => alterRoot("name", value) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "stcw-hint", children: "\u8FD9\u662F Context / Instruct / TextGen \u9884\u8BBE\u3002\u53EF\u5728\u4E0B\u65B9\u201C\u539F\u59CB JSON\u201D\u4E2D\u65E0\u635F\u7F16\u8F91\u5168\u90E8\u5B57\u6BB5\u3002" }),
    "story_string" in asset.data && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextField, { label: "Story String", multiline: true, value: field(asset.data, "story_string"), onChange: (value) => alterRoot("story_string", value) }),
    "input_sequence" in asset.data && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextField, { label: "Input Sequence", multiline: true, value: field(asset.data, "input_sequence"), onChange: (value) => alterRoot("input_sequence", value) }),
    "output_sequence" in asset.data && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextField, { label: "Output Sequence", multiline: true, value: field(asset.data, "output_sequence"), onChange: (value) => alterRoot("output_sequence", value) })
  ] });
  const prompt = prompts[selected];
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "stcw-world-editor", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "stcw-entry-list", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: add, children: "\uFF0B \u65B0\u63D0\u793A" }),
      prompts.map((item, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: selected === index ? "active" : "", onClick: () => setSelected(index), children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: item.name || item.identifier || `\u63D0\u793A ${index + 1}` }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: item.role || (item.marker ? "marker" : "") })
      ] }, String(item.identifier ?? index)))
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "stcw-entry-form", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextField, { label: "\u9884\u8BBE\u540D\u79F0", value: field(asset.data, "name"), onChange: (value) => alterRoot("name", value) }),
      prompt && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextField, { label: "\u63D0\u793A\u540D\u79F0", value: field(prompt, "name"), onChange: (value) => alterPrompt("name", value) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "stcw-grid2", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextField, { label: "Identifier", value: field(prompt, "identifier"), onChange: (value) => alterPrompt("identifier", value) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextField, { label: "Role", value: field(prompt, "role"), onChange: (value) => alterPrompt("role", value) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextField, { label: "\u63D0\u793A\u5185\u5BB9", multiline: true, value: field(prompt, "content"), onChange: (value) => alterPrompt("content", value) })
      ] })
    ] })
  ] });
}
function PresetEditor(props) {
  return props.asset.format === "preset-plus-preset" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PresetPlusEditor, { ...props }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SillyTavernPresetEditor, { ...props });
}
function RawEditor({ asset, apply: apply2 }) {
  const [raw, setRaw] = (0, import_react.useState)(() => JSON.stringify(asset.data, null, 2));
  const [error, setError] = (0, import_react.useState)("");
  (0, import_react.useEffect)(() => {
    setRaw(JSON.stringify(asset.data, null, 2));
    setError("");
  }, [asset.id]);
  const parse = () => {
    try {
      const value = JSON.parse(raw);
      if (!value || Array.isArray(value) || typeof value !== "object") throw new Error("\u9876\u5C42\u5FC5\u987B\u662F\u5BF9\u8C61");
      apply2(value);
      setError("\u5DF2\u5E94\u7528");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", { className: "stcw-raw", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("summary", { children: "\u539F\u59CB JSON\uFF08\u4FDD\u771F\u7F16\u8F91\uFF09" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", { value: raw, onChange: (e) => setRaw(e.target.value), rows: 18 }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "stcw-row", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: parse, children: "\u5E94\u7528 JSON" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: error })
    ] })
  ] });
}
function includesKeyword(text, keyword, sensitive, whole) {
  if (!keyword) return false;
  const haystack = sensitive ? text : text.toLocaleLowerCase();
  const needle = sensitive ? keyword : keyword.toLocaleLowerCase();
  if (!whole) return haystack.includes(needle);
  return new RegExp(`(^|[^\\p{L}\\p{N}_])${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^\\p{L}\\p{N}_]|$)`, sensitive ? "u" : "iu").test(text);
}
function activeLoreEntries(asset, scan) {
  const entries = Object.values(worldEntries(asset));
  return entries.filter((entry) => {
    if (entry.disable === true) return false;
    if (entry.constant === true) return true;
    const primary = Array.isArray(entry.key) ? entry.key : [];
    const secondary = Array.isArray(entry.keysecondary) ? entry.keysecondary : [];
    const match = (key) => typeof key === "string" && includesKeyword(scan, key, entry.caseSensitive === true, entry.matchWholeWords === true);
    if (!primary.some(match)) return false;
    if (entry.selective === false || secondary.length === 0) return true;
    const matches = secondary.map(match);
    switch (Number(entry.selectiveLogic ?? 0)) {
      case 1:
        return !matches.every(Boolean);
      case 2:
        return !matches.some(Boolean);
      case 3:
        return matches.every(Boolean);
      default:
        return matches.some(Boolean);
    }
  }).sort((a, b) => Number(a.order ?? 100) - Number(b.order ?? 100));
}
function Preview({ asset }) {
  const [scan, setScan] = (0, import_react.useState)("");
  if (asset.kind === "character") {
    const data = innerCharacter(asset);
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "stcw-preview-card", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "stcw-avatar", children: field(data, "name").slice(0, 1) || "?" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: field(data, "name") || "\u672A\u547D\u540D\u89D2\u8272" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "stcw-tags", children: (Array.isArray(data.tags) ? data.tags : []).map((tag) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: tag }, tag)) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", { children: "\u7B2C\u4E00\u6761\u6D88\u606F" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", { children: field(data, "first_mes") || "\u5C1A\u672A\u586B\u5199" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", { children: "\u573A\u666F" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", { children: field(data, "scenario") || "\u5C1A\u672A\u586B\u5199" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", { children: "\u89D2\u8272\u63CF\u8FF0" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", { children: field(data, "description") || "\u5C1A\u672A\u586B\u5199" })
    ] });
  }
  if (asset.kind === "worldbook") {
    const active = activeLoreEntries(asset, scan);
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "\u4E16\u754C\u4E66\u6FC0\u6D3B\u9884\u89C8" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextField, { label: "\u6A21\u62DF\u804A\u5929\u6587\u672C", multiline: true, value: scan, onChange: setScan }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "stcw-preview-note", children: [
        "\u547D\u4E2D ",
        active.length,
        " \u4E2A\u6761\u76EE\uFF08\u9884\u89C8\u5173\u952E\u8BCD\u4E0E\u903B\u8F91\uFF1B\u6982\u7387/\u9012\u5F52\u7531 SillyTavern \u6700\u7EC8\u6267\u884C\uFF09"
      ] }),
      active.map((entry, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { className: "stcw-lore-hit", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: entry.comment || `\u6761\u76EE ${index + 1}` }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: Array.isArray(entry.key) ? entry.key.join(", ") : "" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", { children: entry.content })
      ] }, index))
    ] });
  }
  if (asset.format === "preset-plus-preset") {
    const entries = Array.isArray(asset.data.entries) ? asset.data.entries : [];
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Preset Plus \u6CE8\u5165\u9884\u89C8" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "stcw-preview-note", children: [
        "ID: ",
        field(asset.data, "id") || "\u672A\u8BBE\u7F6E",
        " \xB7 \u81EA\u52A8\u6CE8\u5165\uFF1A",
        asset.data.autoMode === false ? "\u5173" : "\u5F00",
        " \xB7 ",
        entries.filter((entry) => entry?.enabled !== false).length,
        "/",
        entries.length,
        " \u6761\u542F\u7528"
      ] }),
      entries.length ? entries.map((entry, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { className: "stcw-prompt", style: entry?.enabled === false ? { opacity: 0.48 } : void 0, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("b", { children: [
            index + 1,
            ". ",
            entry?.role || "\u65E0\u89D2\u8272"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: entry?.enabled === false ? "disabled" : "enabled" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", { children: typeof entry?.text === "string" && entry.text ? entry.text : "\uFF08\u7A7A\uFF09" })
      ] }, index)) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", { children: "\u5C1A\u65E0\u6761\u76EE" })
    ] });
  }
  const prompts = Array.isArray(asset.data.prompts) ? asset.data.prompts : [];
  const byId = new Map(prompts.map((prompt) => [String(prompt.identifier ?? ""), prompt]));
  const orders = Array.isArray(asset.data.prompt_order) ? asset.data.prompt_order : [];
  const group = orders.find((value) => value?.character_id === 100001) || orders[0];
  const ordered = Array.isArray(group?.order) ? group.order.filter((value) => value?.enabled !== false).map((value) => byId.get(String(value.identifier))).filter(Boolean) : prompts;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "\u63D0\u793A\u987A\u5E8F\u9884\u89C8" }),
    ordered.length ? ordered.map((prompt, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { className: "stcw-prompt", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("b", { children: [
          index + 1,
          ". ",
          prompt.name || prompt.identifier
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: prompt.role || (prompt.marker ? "marker" : "") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", { children: prompt.marker ? `\u3014SillyTavern \u52A8\u6001\u7247\u6BB5\uFF1A${prompt.identifier}\u3015` : prompt.content || "\uFF08\u7A7A\uFF09" })
    ] }, String(prompt.identifier ?? index))) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", { children: field(asset.data, "story_string") || field(asset.data, "input_sequence") || JSON.stringify(asset.data, null, 2) })
  ] });
}
function embeddedPath(uri) {
  if (typeof uri !== "string") return void 0;
  if (uri.startsWith("__asset:")) return uri.slice("__asset:".length).replaceAll("\\", "/").replace(/^\/+/, "");
  if (/^(?:embeded|embedded):\/\//i.test(uri)) return uri.replace(/^(?:embeded|embedded):\/\//i, "").replaceAll("\\", "/").replace(/^\/+/, "");
  return void 0;
}
function nonWorldAssets(asset) {
  const data = innerCharacter(asset);
  const assets = Array.isArray(data.assets) ? data.assets : [];
  return assets.map((value, index) => ({ value, index, path: embeddedPath(value?.uri) })).filter((item) => item.value && typeof item.value === "object" && !["worldbook", "lorebook"].includes(String(item.value.type || "").toLowerCase()));
}
function ResourceInspector({ asset }) {
  if (asset.kind !== "character") return null;
  const data = innerCharacter(asset);
  const assets = nonWorldAssets(asset);
  const resources = asset.resources || [];
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", { className: "stcw-resources", open: true, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("summary", { children: "\u89D2\u8272\u5361\u9644\u5C5E\u8D44\u6E90" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "stcw-resource-badges", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: data.character_book && typeof data.character_book === "object" ? "ok" : "", children: data.character_book && typeof data.character_book === "object" ? "\u2713 \u5DF2\u68C0\u6D4B\u5230\u5185\u5D4C\u4E16\u754C\u4E66" : "\u672A\u9644\u5E26\u5185\u5D4C\u4E16\u754C\u4E66" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
        assets.length,
        " \u4E2A\u975E\u4E16\u754C\u4E66\u8D44\u4EA7"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
        resources.length,
        " \u4E2A\u5D4C\u5165\u6587\u4EF6"
      ] })
    ] }),
    assets.map((item) => {
      const present = !item.path || resources.some((resource) => resource.path.toLowerCase() === item.path.toLowerCase());
      return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "stcw-resource-row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: item.value.name || `\u8D44\u6E90 ${item.index + 1}` }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: item.value.type || "other" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: item.value.uri || "\u65E0 URI" }),
        !present && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("em", { children: "\u7F3A\u5C11\u5D4C\u5165\u6587\u4EF6" })
      ] }, item.index);
    }),
    resources.filter((resource) => !assets.some((item) => item.path?.toLowerCase() === resource.path.toLowerCase())).map((resource) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "stcw-resource-row", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: resource.path }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u672A\u5F15\u7528\u6587\u4EF6" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("code", { children: [
        resource.mimeType || "binary",
        " \xB7 ",
        Math.ceil((resource.binary?.bytes ?? (resource.dataBase64 ? BufferlessBase64Size(resource.dataBase64) : 0)) / 1024),
        " KiB"
      ] })
    ] }, resource.id))
  ] });
}
function BufferlessBase64Size(value) {
  return Math.max(0, Math.floor(value.length * 3 / 4) - (value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0));
}
function MigrationTool({ project, target, accept, notice }) {
  const sources = project.assets.filter((value) => value.kind === "character" && value.id !== target.id);
  const [sourceId, setSourceId] = (0, import_react.useState)(sources[0]?.id || "");
  const source = sources.find((value) => value.id === sourceId) || sources[0];
  const candidates = source ? nonWorldAssets(source) : [];
  const referenced = new Set(candidates.map((value) => value.path?.toLowerCase()).filter(Boolean));
  const orphanResources = (source?.resources || []).filter((resource) => !referenced.has(resource.path.toLowerCase()));
  const [assetIndexes, setAssetIndexes] = (0, import_react.useState)([]);
  const [resourceIds, setResourceIds] = (0, import_react.useState)([]);
  (0, import_react.useEffect)(() => {
    setAssetIndexes(candidates.map((value) => value.index));
    setResourceIds(orphanResources.map((value) => value.id));
  }, [source?.id]);
  if (!sources.length) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "stcw-hint", children: "\u9879\u76EE\u4E2D\u518D\u5BFC\u5165\u6216\u65B0\u5EFA\u4E00\u5F20\u89D2\u8272\u5361\u540E\uFF0C\u53EF\u5728\u8FD9\u91CC\u8FC1\u79FB\u9644\u5C5E\u8D44\u6E90\u3002" });
  const toggle = (list, value, checked) => checked ? [.../* @__PURE__ */ new Set([...list, value])] : list.filter((item) => item !== value);
  const migrate = async () => {
    if (!source) return;
    const response = await api(`/projects/${project.id}/assets/${target.id}/migrate`, {
      method: "POST",
      body: JSON.stringify({ sourceAssetId: source.id, assetIndexes, resourceIds })
    });
    accept(response.project);
    notice(`\u5DF2\u8FC1\u79FB ${response.result.migratedAssets} \u4E2A\u8D44\u4EA7\u3001${response.result.migratedResources} \u4E2A\u6587\u4EF6${response.result.renamed ? `\uFF0C${response.result.renamed} \u4E2A\u51B2\u7A81\u6587\u4EF6\u5DF2\u6539\u540D` : ""}`);
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", { className: "stcw-migrate", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("summary", { children: "\u4ECE\u5176\u4ED6\u89D2\u8272\u5361\u8FC1\u79FB\u9644\u5C5E\u8D44\u6E90" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "stcw-field", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u6E90\u89D2\u8272\u5361" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", { value: source?.id || "", onChange: (event) => setSourceId(event.target.value), children: sources.map((value) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: value.id, children: value.name }, value.id)) })
    ] }),
    source && innerCharacter(source).character_book && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "stcw-safe-note", children: "\u6E90\u5361\u5E26\u6709\u5185\u5D4C\u4E16\u754C\u4E66\uFF1B\u8FC1\u79FB\u5DE5\u5177\u4F1A\u660E\u786E\u8DF3\u8FC7\u5B83\u3002" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "stcw-migrate-list", children: [
      candidates.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "checkbox", checked: assetIndexes.includes(item.index), onChange: (event) => setAssetIndexes(toggle(assetIndexes, item.index, event.target.checked)) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: item.value.name || `\u8D44\u6E90 ${item.index + 1}` }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
            item.value.type || "other",
            " \xB7 ",
            item.value.uri || "\u65E0 URI"
          ] })
        ] })
      ] }, item.index)),
      orphanResources.map((resource) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "checkbox", checked: resourceIds.includes(resource.id), onChange: (event) => setResourceIds(toggle(resourceIds, resource.id, event.target.checked)) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: resource.path }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "\u672A\u5F15\u7528\u9644\u5C5E\u6587\u4EF6" })
        ] })
      ] }, resource.id))
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: !assetIndexes.length && !resourceIds.length, onClick: () => void migrate().catch((error) => notice(error.message)), children: "\u8FC1\u79FB\u6240\u9009\u5230\u5F53\u524D\u89D2\u8272\u5361" })
  ] });
}
function HarnessPanel({ workspacePath, project, asset }) {
  (0, import_react.useSyncExternalStore)(subscribeBridge, () => bridgeVersion);
  const defaultPrompt = (0, import_react.useMemo)(() => asset ? `\u8BF7\u5728\u9152\u9986\u521B\u4F5C\u9879\u76EE\u201C${project.name}\u201D\u4E2D\u534F\u52A9\u7F16\u8F91${asset.kind === "character" ? "\u89D2\u8272\u5361" : asset.kind === "worldbook" ? "\u4E16\u754C\u4E66" : "\u9884\u8BBE"}\u201C${asset.name}\u201D\u3002\u5148\u8BFB\u53D6\u9879\u76EE\u4E0E\u8D44\u6E90\uFF0C\u4FDD\u7559\u672A\u77E5\u5B57\u6BB5\u548C\u6240\u6709\u9644\u5C5E\u8D44\u6E90\uFF0C\u518D\u6309\u6211\u7684\u8981\u6C42\u4FEE\u6539\u3002

\u6211\u7684\u8981\u6C42\uFF1A` : `\u8BF7\u5728\u7A7A\u7684\u9152\u9986\u521B\u4F5C\u9879\u76EE\u201C${project.name}\u201D\u4E2D\u6839\u636E\u6211\u7684\u8981\u6C42\u521B\u5EFA\u8D44\u6E90\u3002

\u6211\u7684\u8981\u6C42\uFF1A `, [project.id, project.name, asset?.id, asset?.name, asset?.kind]);
  const [prompt, setPrompt] = (0, import_react.useState)(defaultPrompt);
  (0, import_react.useEffect)(() => setPrompt(defaultPrompt), [defaultPrompt]);
  const handoff = (submit) => {
    if (!harnessBridge) return;
    const context = `${prompt}

\u5DE5\u4F5C\u533A\u7EDD\u5BF9\u8DEF\u5F84\uFF1A${workspacePath}
\u9879\u76EE ID\uFF1A${project.id}${asset ? `
\u5F53\u524D\u8D44\u6E90 ID\uFF1A${asset.id}` : ""}`;
    harnessBridge.actions.setDraft(context);
    if (submit) {
      harnessBridge.actions.submit();
      setOpened(false);
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "stcw-harness", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "stcw-panel-title", children: "AI Harness \u8F93\u5165" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", { value: prompt, onChange: (event) => setPrompt(event.target.value), rows: 9, placeholder: "\u544A\u8BC9\u9152\u9986\u521B\u4F5C Agent \u8981\u5199\u4EC0\u4E48\u6216\u4FEE\u6539\u4EC0\u4E48\u2026" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "stcw-harness-actions", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: !harnessBridge || !prompt.trim(), onClick: () => handoff(false), children: "\u653E\u5165\u8F93\u5165\u6846" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "primary", disabled: !harnessBridge || !prompt.trim(), onClick: () => handoff(true), children: "\u53D1\u9001\u7ED9 Agent" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "stcw-hint", children: harnessBridge ? `\u5DF2\u8FDE\u63A5\u5F53\u524D Harness \u4F1A\u8BDD \xB7 \u8D44\u6E90\u5B58\u50A8\u4E8E ${workspacePath}\\.tavernres` : "\u5F53\u524D\u6CA1\u6709\u53EF\u8FDE\u63A5\u7684 Harness \u4F1A\u8BDD\uFF1B\u4ECD\u53EF\u624B\u52A8\u7F16\u8F91\u8D44\u6E90\uFF0C\u6216\u5148\u5728\u8BE5\u5DE5\u4F5C\u533A\u65B0\u5EFA\u4F1A\u8BDD\u3002" })
  ] });
}
function errorText(error) {
  return error instanceof Error ? error.message : String(error);
}
function PresetPlusPanel() {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "stcw-connector stcw-presetplus", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "stcw-panel-title", children: "Preset Plus \u9884\u8BBE\u6CE8\u5165" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "stcw-hint", children: "\u5F53\u524D\u201C\u9152\u9986\u521B\u4F5C\u6A21\u5F0F\u201D\u5DF2\u52A0\u5165 Preset Plus \u4F5C\u7528\u57DF\uFF0C\u4F1A\u5E94\u7528\u5176\u5F53\u524D\u6FC0\u6D3B\u9884\u8BBE\u3002\u9152\u9986\u9884\u8BBE\u53EF\u7531 Agent \u8F6C\u6362\u6210\u9879\u76EE\u8349\u7A3F\uFF0C\u5728\u4E2D\u680F\u7F16\u8F91\u3001\u53F3\u680F\u9884\u89C8\uFF0C\u786E\u8BA4\u540E\u518D\u5199\u5165\uFF1B\u5DF2\u5199\u5165\u9884\u8BBE\u4ECD\u53EF\u5728 DSH \u8BBE\u7F6E\u91CC\u7684\u201C\u9884\u8BBE\u589E\u5F3A\u201D\u7BA1\u7406\u3002" })
  ] });
}
function ConnectorPanel({ project, accept, notice }) {
  const [info, setInfo] = (0, import_react.useState)(null);
  const [draft, setDraft] = (0, import_react.useState)("");
  const [probe, setProbe] = (0, import_react.useState)(null);
  const [entries, setEntries] = (0, import_react.useState)([]);
  const [selected, setSelected] = (0, import_react.useState)(/* @__PURE__ */ new Set());
  const [busy, setBusy] = (0, import_react.useState)(false);
  const [conflict, setConflict] = (0, import_react.useState)("overwrite");
  const load = async () => {
    const result = await api("/connector");
    setInfo(result);
    setProbe(null);
    if (result.connected) setEntries((await api("/connector/remote")).entries);
    else setEntries([]);
  };
  (0, import_react.useEffect)(() => {
    setInfo(null);
    setSelected(/* @__PURE__ */ new Set());
    if (project?.id) void load().catch((error) => notice(error.message));
  }, [project?.id]);
  if (!info) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "stcw-connector", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "stcw-panel-title", children: "\u9152\u9986\u8FDE\u63A5\u5668" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "stcw-hint", children: "\u52A0\u8F7D\u4E2D\u2026" })
  ] });
  const toggle = (file, checked) => setSelected((current) => {
    const next = new Set(current);
    if (checked) next.add(file);
    else next.delete(file);
    return next;
  });
  const doProbe = async () => {
    try {
      setProbe(null);
      setProbe((await api("/connector/probe", { method: "POST", body: JSON.stringify({ path: draft }) })).probe);
    } catch (error) {
      notice(errorText(error));
    }
  };
  const doSave = async () => {
    try {
      await api("/connector", { method: "PUT", body: JSON.stringify({ path: draft, userHandle: probe?.userHandle }) });
      setSelected(/* @__PURE__ */ new Set());
      await load();
    } catch (error) {
      notice(errorText(error));
    }
  };
  const disconnect = async () => {
    if (!confirm("\u65AD\u5F00\u9152\u9986\u8FDE\u63A5\uFF1F\u9879\u76EE\u6570\u636E\u4E0D\u53D7\u5F71\u54CD\u3002")) return;
    try {
      await api("/connector", { method: "DELETE" });
      await load();
      notice("\u5DF2\u65AD\u5F00\u9152\u9986\u8FDE\u63A5");
    } catch (error) {
      notice(errorText(error));
    }
  };
  const importFiles = async (files) => {
    setBusy(true);
    try {
      const result = await api("/connector/import", { method: "POST", body: JSON.stringify({ projectId: project.id, files }) });
      accept(result.project);
      setSelected(/* @__PURE__ */ new Set());
      notice(`\u4ECE\u9152\u9986\u5BFC\u5165 ${result.imported} \u9879${result.replaced ? `\uFF0C\u66FF\u6362 ${result.replaced} \u9879` : ""}${result.errors.length ? `\uFF0C${result.errors.length} \u9879\u5931\u8D25` : ""}`);
    } catch (error) {
      notice(errorText(error));
    } finally {
      setBusy(false);
    }
  };
  const exportAll = async () => {
    if (!project.assets.length) return;
    if (!confirm(`\u628A\u9879\u76EE\u201C${project.name}\u201D\u7684\u5168\u90E8 ${project.assets.length} \u9879\u8D44\u6E90\u5BFC\u51FA\u5230\u9152\u9986\uFF1F\u51B2\u7A81\u7B56\u7565\uFF1A${conflict === "overwrite" ? "\u540C\u540D\u8986\u76D6" : conflict === "rename" ? "\u540C\u540D\u6539\u540D" : "\u540C\u540D\u8DF3\u8FC7"}\u3002`)) return;
    setBusy(true);
    try {
      const result = await api("/connector/export", { method: "POST", body: JSON.stringify({ projectId: project.id, assetIds: project.assets.map((value) => value.id), conflict }) });
      const counts = result.results.reduce((all, item) => ({ ...all, [item.status]: (all[item.status] ?? 0) + 1 }), {});
      notice(`\u5DF2\u5BFC\u51FA\u5230\u9152\u9986\uFF1A${Object.entries(counts).map(([key, value]) => `${value} ${key}`).join("\u3001")}\u3002\u5728\u9152\u9986\u4E2D\u5237\u65B0\u5373\u53EF\u770B\u5230`);
    } catch (error) {
      notice(errorText(error));
    } finally {
      setBusy(false);
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "stcw-connector", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "stcw-panel-title", children: "\u9152\u9986\u8FDE\u63A5\u5668" }),
    !info.connected ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "stcw-hint", children: "\u586B\u5165\u672C\u673A\u9152\u9986\u5B89\u88C5\u6839\u76EE\u5F55\u6216\u7528\u6237\u6570\u636E\u76EE\u5F55\uFF0C\u5373\u53EF\u4E92\u5BFC\u89D2\u8272\u5361\u3001\u4E16\u754C\u4E66\u548C\u9884\u8BBE\u3002" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "stcw-row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: draft, placeholder: "\u4F8B\u5982 F:\\SillyTavern", onChange: (event) => setDraft(event.target.value) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: !draft.trim(), onClick: () => void doProbe(), children: "\u63A2\u6D4B" })
      ] }),
      probe && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "stcw-probe-result", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: probe.type === "unknown" ? "stcw-probe-error" : "stcw-safe-note", children: probe.message }),
        probe.type === "install-root" && probe.userHandles.length > 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "stcw-field", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u9152\u9986\u7528\u6237" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", { value: probe.userHandle, onChange: (event) => setProbe({ ...probe, userHandle: event.target.value }), children: probe.userHandles.map((handle) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: handle, children: handle }, handle)) })
        ] }),
        probe.type !== "unknown" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "stcw-cat-badges", children: probe.status?.categories.map((category) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: category.exists ? "ok" : "", title: category.directory, children: [
          category.directory,
          " ",
          category.count
        ] }, category.id)) }),
        probe.type !== "unknown" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "primary", onClick: () => void doSave(), children: "\u4FDD\u5B58\u8FDE\u63A5" })
      ] })
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "stcw-cat-badges", children: info.status?.categories.map((category) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: category.exists ? "ok" : "", title: category.directory, children: [
        category.directory,
        " ",
        category.count
      ] }, category.id)) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "stcw-hint", title: info.config.userDataRoot, children: [
        "\u5DF2\u8FDE\u63A5 ",
        info.config.userHandle || "\u7528\u6237\u6570\u636E\u76EE\u5F55",
        " \xB7 \u5BFC\u51FA\u540E\u5728\u9152\u9986\u4E2D\u5237\u65B0\u5373\u53EF\u770B\u5230"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "stcw-row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => void load().catch((error) => notice(error.message)), children: "\u5237\u65B0" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { value: conflict, title: "\u5BFC\u51FA\u540C\u540D\u51B2\u7A81\u7B56\u7565", onChange: (event) => setConflict(event.target.value), children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "overwrite", children: "\u540C\u540D\u8986\u76D6" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "rename", children: "\u540C\u540D\u6539\u540D" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "skip", children: "\u540C\u540D\u8DF3\u8FC7" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy || !project.assets.length, onClick: () => void exportAll(), children: "\u5168\u90E8\u5BFC\u51FA\u5230\u9152\u9986" })
      ] }),
      info.status?.categories.filter((category) => category.exists).map((category) => {
        const list = entries.filter((entry) => entry.category === category.id);
        const allSelected = list.length > 0 && list.every((entry) => selected.has(entry.file));
        return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", { className: "stcw-remote-group", open: category.id === "characters", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("summary", { children: [
            category.directory,
            "\uFF08",
            list.length,
            "\uFF09"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "stcw-remote-all", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "checkbox", checked: allSelected, onChange: (event) => {
              for (const entry of list) toggle(entry.file, event.target.checked);
            } }),
            "\u5168\u9009"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "stcw-remote-list", children: list.map((entry) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "checkbox", checked: selected.has(entry.file), onChange: (event) => toggle(entry.file, event.target.checked) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: entry.name }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
                Math.max(1, Math.ceil(entry.bytes / 1024)),
                " KiB"
              ] })
            ] })
          ] }, entry.file)) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy || !list.some((entry) => selected.has(entry.file)), onClick: () => void importFiles(list.filter((entry) => selected.has(entry.file)).map((entry) => entry.file)), children: "\u5BFC\u5165\u6240\u9009\u5230\u9879\u76EE" })
        ] }, category.id);
      }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "danger", onClick: () => void disconnect(), children: "\u65AD\u5F00\u8FDE\u63A5" })
    ] })
  ] });
}
function Workbench(props) {
  const isOpen = (0, import_react.useSyncExternalStore)(subscribe, () => opened);
  const currentWorkspace = props.useSessions((state) => state.current ? state.byId[state.current]?.cwd : void 0);
  const recentWorkspace = props.useWorkspaces((state) => state.items.find((item) => item.workspaceId === state.recentWorkspaceId)?.path);
  const workspacePath = currentWorkspace || recentWorkspace || "";
  activeWorkspacePath = workspacePath;
  const [projects, setProjects] = (0, import_react.useState)([]);
  const [project, setProject] = (0, import_react.useState)(null);
  const [selectedId, setSelectedId] = (0, import_react.useState)("");
  const [notice, setNotice] = (0, import_react.useState)("");
  const asset = project?.assets.find((value) => value.id === selectedId) || project?.assets[0];
  const loadProjects = async (preferred) => {
    const result = await api("/projects");
    setProjects(result.projects);
    const id = preferred === null ? result.projects[0]?.id : preferred || project?.id || result.projects[0]?.id;
    if (id) {
      const detail = await api(`/projects/${id}`);
      setProject(detail.project);
      setSelectedId(detail.project.assets[0]?.id || "");
    } else setProject(null);
  };
  (0, import_react.useEffect)(() => {
    setProject(null);
    setProjects([]);
    setSelectedId("");
    if (isOpen && workspacePath) void loadProjects().catch((error) => setNotice(error.message));
  }, [isOpen, workspacePath]);
  if (!isOpen) return null;
  if (!workspacePath) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "stcw-layer", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "stcw-workbench", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "\u2726 \u9152\u9986\u521B\u4F5C\u6A21\u5F0F" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "stcw-close", onClick: () => setOpened(false), children: "\xD7" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", { className: "stcw-welcome", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "\u8BF7\u5148\u9009\u62E9\u5DE5\u4F5C\u533A" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
        "\u9879\u76EE\u4E0E\u5BFC\u5165\u8D44\u6E90\u5C06\u4FDD\u5B58\u5728\u8BE5\u5DE5\u4F5C\u533A\u7684 ",
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: ".tavernres" }),
        " \u4E2D\u3002"
      ] })
    ] })
  ] }) });
  const createProject = async () => {
    const result = await api("/projects", { method: "POST", body: JSON.stringify({}) });
    await loadProjects(result.project.id);
  };
  const pickProject = async (id) => {
    const detail = await api(`/projects/${id}`);
    setProject(detail.project);
    setSelectedId(detail.project.assets[0]?.id || "");
  };
  const acceptProject = (next) => {
    setProject(next);
    setProjects((current) => current.map((item) => item.id === next.id ? {
      ...item,
      name: next.name,
      updatedAt: next.updatedAt,
      assetCount: next.assets.length,
      counts: {
        character: next.assets.filter((value) => value.kind === "character").length,
        worldbook: next.assets.filter((value) => value.kind === "worldbook").length,
        preset: next.assets.filter((value) => value.kind === "preset").length
      }
    } : item));
  };
  const changeAsset = (mutate) => setProject((current) => {
    if (!current || !asset) return current;
    const next = structuredClone(current);
    const selected = next.assets.find((value) => value.id === asset.id);
    if (selected) mutate(selected);
    return next;
  });
  const save = async () => {
    if (!project || !asset) return;
    const result = await api(`/projects/${project.id}/assets/${asset.id}`, { method: "PUT", body: JSON.stringify({ asset }) });
    acceptProject(result.project);
    setNotice("\u5DF2\u4FDD\u5B58");
  };
  const add = async (kind) => {
    if (!project) return;
    const result = await api(`/projects/${project.id}/assets`, { method: "POST", body: JSON.stringify({ kind }) });
    acceptProject(result.project);
    setSelectedId(result.project.assets.at(-1)?.id || "");
  };
  const importFiles = async (files) => {
    if (!project || !files?.length) return;
    setNotice("\u6B63\u5728\u5BFC\u5165\u2026");
    const encoded = await Promise.all([...files].map((file) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = () => resolve({ name: file.name, data: String(reader.result).split(",")[1] || "" });
      reader.readAsDataURL(file);
    })));
    const result = await api(`/projects/${project.id}/import`, { method: "POST", body: JSON.stringify({ files: encoded }) });
    const added = result.project.assets.slice(-result.imported);
    const embeddedBooks = added.filter((value) => value.kind === "character" && innerCharacter(value).character_book && typeof innerCharacter(value).character_book === "object").length;
    const embeddedFiles = added.reduce((sum, value) => sum + (value.resources?.length || 0), 0);
    acceptProject(result.project);
    setSelectedId(result.project.assets.at(-1)?.id || "");
    setNotice(`\u5BFC\u5165 ${result.imported} \u9879${embeddedBooks ? `\uFF0C\u68C0\u6D4B\u5230 ${embeddedBooks} \u672C\u5185\u5D4C\u4E16\u754C\u4E66` : ""}${embeddedFiles ? `\uFF0C\u4FDD\u7559 ${embeddedFiles} \u4E2A\u9644\u5C5E\u6587\u4EF6` : ""}${result.errors.length ? `\uFF0C${result.errors.length} \u9879\u5931\u8D25` : ""}`);
  };
  const deleteAsset = async () => {
    if (!project || !asset || !confirm(`\u5220\u9664\u201C${asset.name}\u201D\uFF1F`)) return;
    const result = await api(`/projects/${project.id}/assets/${asset.id}`, { method: "DELETE" });
    acceptProject(result.project);
    setSelectedId(result.project.assets[0]?.id || "");
  };
  const exportToTavern = async () => {
    if (!project || !asset) return;
    if (!confirm(`\u628A\u201C${asset.name}\u201D\u5BFC\u51FA\u5230\u9152\u9986\uFF1F\u540C\u540D\u6587\u4EF6\u5C06\u88AB\u8986\u76D6\u3002`)) return;
    const result = await api("/connector/export", { method: "POST", body: JSON.stringify({ projectId: project.id, assetIds: [asset.id] }) });
    const item = result.results[0];
    setNotice(`\u5DF2${item.status === "overwritten" ? "\u8986\u76D6" : "\u5199\u5165"}\u9152\u9986 ${item.file}\uFF1B\u5728\u9152\u9986\u4E2D\u5237\u65B0\u5373\u53EF\u770B\u5230`);
  };
  const deleteProject = async () => {
    if (!project || !confirm(`\u5220\u9664\u9879\u76EE\u201C${project.name}\u201D\u53CA\u5176\u4E2D\u5168\u90E8\u8D44\u6E90\uFF1F`)) return;
    await api(`/projects/${project.id}`, { method: "DELETE" });
    setProject(null);
    setSelectedId("");
    setNotice("\u9879\u76EE\u5DF2\u5220\u9664");
    await loadProjects(null);
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "stcw-layer", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "stcw-workbench", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "\u2726 \u9152\u9986\u521B\u4F5C\u6A21\u5F0F" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { value: project?.id || "", onChange: (e) => void pickProject(e.target.value), children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "", children: "\u9009\u62E9\u9879\u76EE" }),
          projects.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", { value: item.id, children: [
            item.name,
            " (",
            item.assetCount,
            ")"
          ] }, item.id))
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => void createProject(), children: "\u65B0\u5EFA\u7A7A\u9879\u76EE" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { title: workspacePath, children: [
          "\u5DE5\u4F5C\u533A \xB7 ",
          workspacePath.replaceAll("\\", "/").split("/").at(-1)
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "stcw-close", onClick: () => setOpened(false), children: "\xD7" })
    ] }),
    !project ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", { className: "stcw-welcome", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "\u4ECE\u7A7A\u9879\u76EE\u5F00\u59CB" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "\u53EF\u6279\u91CF\u5BFC\u5165\u89D2\u8272\u5361\u3001\u4E16\u754C\u4E66\u548C\u9884\u8BBE\uFF0C\u4E5F\u53EF\u4EE5\u9010\u9879\u65B0\u5EFA\u3002" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => void createProject(), children: "\u65B0\u5EFA\u7A7A\u9879\u76EE" })
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "stcw-toolbar", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { className: "stcw-project-name", value: project.name, onChange: (e) => setProject({ ...project, name: e.target.value }), onBlur: () => void api(`/projects/${project.id}`, { method: "PUT", body: JSON.stringify({ name: project.name }) }).then(() => loadProjects(project.id)) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "stcw-file", title: "\u53EF\u4E00\u6B21\u9009\u62E9\u591A\u4E2A JSON\u3001PNG\u3001CHARX \u6216 ZIP", children: [
          "\u5BFC\u5165\u8D44\u6E90",
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "file", multiple: true, accept: ".json,.png,.charx,.zip,application/json,image/png,application/zip", onChange: (e) => {
            void importFiles(e.target.files);
            e.currentTarget.value = "";
          } })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => void add("character"), children: "\uFF0B\u89D2\u8272\u5361" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => void add("worldbook"), children: "\uFF0B\u4E16\u754C\u4E66" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => void add("preset"), children: "\uFF0B\u9884\u8BBE" }),
        asset ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", { className: "stcw-button", title: `\u5BFC\u51FA\u201C${asset.name}\u201D`, href: downloadUrl(`/projects/${project.id}/assets/${asset.id}/export?format=${asset.kind === "character" ? asset.source?.container === "charx" ? "charx" : "png" : "json"}`), children: "\u5BFC\u51FA\u5F53\u524D\u8D44\u6E90" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "stcw-button disabled", title: "\u8BF7\u5148\u9009\u62E9\u8D44\u6E90", children: "\u5BFC\u51FA\u5F53\u524D\u8D44\u6E90" }),
        asset && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { title: "\u901A\u8FC7\u9152\u9986\u8FDE\u63A5\u5668\u5199\u5165\u672C\u673A SillyTavern", onClick: () => void exportToTavern().catch((error) => setNotice(error.message)), children: "\u5BFC\u51FA\u5230\u9152\u9986" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", { className: "stcw-button", href: downloadUrl(`/projects/${project.id}/export`), children: "\u5BFC\u51FA\u5168\u90E8\u8D44\u6E90 ZIP" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "danger", onClick: () => void deleteProject(), children: "\u5220\u9664\u9879\u76EE" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "stcw-notice", children: notice })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", { className: "stcw-studio", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", { className: "stcw-ai-pane", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HarnessPanel, { workspacePath, project, asset }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PresetPlusPanel, {}),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ConnectorPanel, { project, accept: acceptProject, notice: setNotice }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "stcw-panel-title", children: "\u9879\u76EE\u8D44\u6E90" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "stcw-assets", children: project.assets.length ? project.assets.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: item.id === asset?.id ? "active" : "", onClick: () => setSelectedId(item.id), children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: item.kind === "character" ? "\u89D2\u8272" : item.kind === "worldbook" ? "\u4E16\u754C" : "\u9884\u8BBE" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: item.name }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
              item.format,
              item.kind === "character" && innerCharacter(item).character_book ? " \xB7 \u5185\u5D4C\u4E16\u754C\u4E66" : "",
              item.resources?.length ? ` \xB7 ${item.resources.length} \u6587\u4EF6` : ""
            ] })
          ] }, item.id)) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "stcw-empty", children: "\u8FD9\u662F\u4E00\u4E2A\u7A7A\u9879\u76EE\u3002\u7528\u4E0A\u65B9\u6309\u94AE\u65B0\u5EFA\u6216\u6279\u91CF\u5BFC\u5165\u3002" }) }),
          asset?.kind === "character" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MigrationTool, { project, target: asset, accept: acceptProject, notice: setNotice })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", { className: "stcw-resource-pane", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "stcw-resource-grid", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", { className: "stcw-editor", children: asset ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "stcw-editor-head", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: asset.name, onChange: (e) => changeAsset((next) => {
                  next.name = e.target.value;
                }) }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: asset.format })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => void save(), children: "\u4FDD\u5B58" }),
                asset.kind === "character" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", { className: "stcw-button", href: downloadUrl(`/projects/${project.id}/assets/${asset.id}/export?format=png`), children: "PNG" }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", { className: "stcw-button", href: downloadUrl(`/projects/${project.id}/assets/${asset.id}/export?format=v3`), children: "V3 JSON" }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", { className: "stcw-button", href: downloadUrl(`/projects/${project.id}/assets/${asset.id}/export?format=charx`), children: "CHARX" })
                ] }),
                " ",
                asset.kind !== "character" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", { className: "stcw-button", href: downloadUrl(`/projects/${project.id}/assets/${asset.id}/export?format=json`), children: "\u5BFC\u51FA JSON" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "danger", onClick: () => void deleteAsset(), children: "\u5220\u9664" })
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResourceInspector, { asset }),
            asset.kind === "character" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CharacterEditor, { asset, change: changeAsset }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmbeddedWorldbookEditor, { asset, change: changeAsset })
            ] }) : asset.kind === "worldbook" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WorldbookEditor, { asset, change: changeAsset }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PresetEditor, { asset, change: changeAsset }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RawEditor, { asset, apply: (data) => changeAsset((next) => {
              next.data = data;
            }) })
          ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "stcw-empty", children: "\u8BF7\u9009\u62E9\u6216\u65B0\u5EFA\u4E00\u4E2A\u8D44\u6E90" }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", { className: "stcw-preview", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "stcw-preview-title", children: "\u8D44\u6E90\u5B9E\u65F6\u9884\u89C8" }),
            asset ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Preview, { asset }) : null
          ] })
        ] }) })
      ] })
    ] })
  ] }) });
}
var CSS = `
.stcw-sidebar-button{border:0;background:transparent;color:inherit;display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;cursor:pointer;white-space:nowrap}.stcw-sidebar-button:hover{background:color-mix(in srgb,currentColor 10%,transparent)}
.stcw-layer{position:fixed;inset:0;z-index:10000;background:rgba(8,7,12,.7);backdrop-filter:blur(8px);pointer-events:auto;padding:20px;color:#eee;font:14px/1.45 Inter,system-ui,sans-serif}.stcw-workbench{height:100%;display:flex;flex-direction:column;background:#15121d;border:1px solid #3a3347;border-radius:16px;box-shadow:0 24px 80px #0009;overflow:hidden}.stcw-workbench header{height:58px;padding:0 16px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #302a3a;background:#1c1825}.stcw-workbench header>div{display:flex;align-items:center;gap:12px}.stcw-workbench button,.stcw-button,.stcw-file{border:1px solid #51475f;background:#282232;color:#eee;padding:7px 10px;border-radius:7px;cursor:pointer;text-decoration:none}.stcw-workbench button:hover,.stcw-button:hover,.stcw-file:hover{background:#373043}.stcw-button.disabled{opacity:.45;cursor:not-allowed;pointer-events:none}.stcw-workbench button.danger{border-color:#7a3f4b;color:#ffabb8}.stcw-close{font-size:24px!important;line-height:1;padding:5px 10px!important}.stcw-workbench select,.stcw-workbench input,.stcw-workbench textarea{background:#100e16;color:#eee;border:1px solid #463d52;border-radius:6px;padding:8px;box-sizing:border-box}.stcw-file input{display:none}.stcw-toolbar{display:flex;align-items:center;gap:8px;padding:9px 12px;border-bottom:1px solid #302a3a;overflow-x:auto}.stcw-project-name{font-weight:700;width:220px;flex:0 0 auto}.stcw-notice{color:#b9a7cf;margin-left:auto;white-space:nowrap}.stcw-columns{display:grid;grid-template-columns:230px minmax(420px,1fr) 360px;min-height:0;flex:1}.stcw-assets,.stcw-editor,.stcw-preview{min-height:0;overflow:auto}.stcw-assets{padding:9px;border-right:1px solid #302a3a}.stcw-assets>button{display:grid;width:100%;text-align:left;margin-bottom:7px;grid-template-columns:auto 1fr;gap:2px 8px}.stcw-assets>button>span{grid-row:1/3;background:#493c5b;color:#d8c8ec;font-size:11px;padding:3px 5px;border-radius:4px;align-self:center}.stcw-assets small,.stcw-entry-list small{color:#9d91a9}.stcw-assets .active,.stcw-entry-list .active{border-color:#9b75ce;background:#392c4a}.stcw-editor{padding:14px}.stcw-editor-head{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:14px;position:sticky;top:-14px;background:#15121ded;padding:10px 0;z-index:2}.stcw-editor-head>div{display:flex;gap:7px;align-items:center}.stcw-editor-head input{font-size:18px;font-weight:700}.stcw-form{display:flex;flex-direction:column;gap:10px}.stcw-grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}.stcw-field{display:flex;flex-direction:column;gap:5px}.stcw-field>span{color:#bcaec9;font-size:12px}.stcw-field textarea{width:100%;resize:vertical}.stcw-world-editor{display:grid;grid-template-columns:180px 1fr;gap:12px}.stcw-entry-list{display:flex;flex-direction:column;gap:6px;max-height:68vh;overflow:auto}.stcw-entry-list>button{display:flex;flex-direction:column;text-align:left}.stcw-entry-form{display:flex;flex-direction:column;gap:10px}.stcw-row{display:flex;align-items:center;justify-content:space-between;gap:8px}.stcw-checks{display:flex;gap:14px;flex-wrap:wrap}.stcw-checks label{display:flex;align-items:center;gap:5px}.stcw-raw{margin-top:18px;border-top:1px solid #342d3e;padding-top:12px}.stcw-raw summary{cursor:pointer;color:#bda5d8}.stcw-raw textarea{width:100%;font:12px/1.45 ui-monospace,monospace;margin-top:8px}.stcw-preview{border-left:1px solid #302a3a;background:#100e16;padding:15px}.stcw-preview-title{text-transform:uppercase;letter-spacing:.14em;font-size:11px;color:#a28eaf;margin-bottom:12px}.stcw-preview pre{white-space:pre-wrap;word-break:break-word;font:13px/1.55 inherit}.stcw-avatar{width:72px;height:72px;border-radius:50%;display:grid;place-items:center;margin:10px auto;background:linear-gradient(135deg,#9a67cc,#4d78bd);font-size:30px}.stcw-preview-card h2{text-align:center}.stcw-tags{display:flex;justify-content:center;flex-wrap:wrap;gap:5px}.stcw-tags span{background:#332740;padding:3px 7px;border-radius:20px;font-size:11px}.stcw-lore-hit,.stcw-prompt{border:1px solid #3b3247;border-radius:8px;padding:10px;margin:9px 0;background:#191520}.stcw-lore-hit small{display:block;color:#a795b7}.stcw-prompt>div{display:flex;justify-content:space-between}.stcw-prompt span{color:#a795b7}.stcw-preview-note,.stcw-hint{color:#a99ab7;font-size:12px}.stcw-empty,.stcw-welcome{display:grid;place-content:center;text-align:center;color:#9f93aa;min-height:180px}.stcw-welcome{flex:1}.stcw-welcome button{justify-self:center}@media(max-width:1050px){.stcw-columns{grid-template-columns:180px minmax(380px,1fr) 300px}}`;
var EXTRA_CSS = `
.stcw-composer-button{border:0;background:transparent;color:inherit;padding:4px 7px;border-radius:6px;cursor:pointer}.stcw-composer-button:hover{background:color-mix(in srgb,currentColor 10%,transparent)}
.stcw-studio{display:grid;grid-template-columns:330px minmax(0,1fr);min-height:0;flex:1}.stcw-ai-pane{min-height:0;overflow:auto;padding:12px;border-right:1px solid #302a3a;background:#121019}.stcw-resource-pane{min-width:0;min-height:0}.stcw-resource-grid{height:100%;display:grid;grid-template-columns:minmax(480px,1fr) minmax(300px,36%);min-height:0}.stcw-panel-title{text-transform:uppercase;letter-spacing:.12em;font-size:11px;color:#aa95ba;margin:3px 0 9px}.stcw-harness{border:1px solid #493c59;background:#1a1622;border-radius:10px;padding:11px;margin-bottom:14px}.stcw-harness textarea{width:100%;resize:vertical}.stcw-harness-actions{display:flex;gap:7px;margin-top:8px}.stcw-harness-actions button{flex:1}.stcw-workbench button.primary{background:#694697;border-color:#9367c8}.stcw-workbench button:disabled{opacity:.45;cursor:not-allowed}.stcw-ai-pane>.stcw-assets{border:0;padding:0;max-height:35vh;overflow:auto}.stcw-migrate{margin-top:12px;border-top:1px solid #302a3a;padding-top:10px}.stcw-migrate summary,.stcw-resources summary{cursor:pointer;color:#ccb5e6;font-weight:700;margin-bottom:9px}.stcw-migrate-list{max-height:190px;overflow:auto;margin:8px 0}.stcw-migrate-list label{display:flex;gap:7px;padding:6px;border-radius:6px}.stcw-migrate-list label:hover{background:#211b29}.stcw-migrate-list label>span{display:flex;min-width:0;flex-direction:column}.stcw-migrate-list small{color:#9e90aa;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.stcw-safe-note{color:#aee6c1;background:#153421;padding:7px;border-radius:6px;font-size:12px}.stcw-resources{border:1px solid #3d3548;border-radius:8px;padding:9px;margin-bottom:12px}.stcw-resource-badges{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:7px}.stcw-resource-badges span{padding:3px 7px;border-radius:12px;background:#30283a;font-size:11px}.stcw-resource-badges span.ok{background:#16422a;color:#aee6c1}.stcw-resource-row{display:grid;grid-template-columns:minmax(100px,1fr) auto;gap:2px 8px;padding:6px;border-top:1px solid #2e2736}.stcw-resource-row code{grid-column:1/3;color:#9f90ae;word-break:break-all}.stcw-resource-row em{grid-column:1/3;color:#ffafba}.stcw-workbench header small{color:#998ca5;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.stcw-connector{border:1px solid #493c59;background:#1a1622;border-radius:10px;padding:11px;margin-bottom:14px}.stcw-connector summary{cursor:pointer;color:#ccb5e6;font-weight:700}.stcw-connector input:not([type=checkbox]){width:100%}.stcw-connector .stcw-row{margin:8px 0;gap:6px}.stcw-connector .stcw-row input{flex:1}.stcw-connector .stcw-row select{flex:0 0 auto}.stcw-connector button{margin-top:4px}.stcw-connector button.danger{margin-top:10px}.stcw-probe-result{margin-top:9px;display:flex;flex-direction:column;gap:7px}.stcw-probe-error{color:#ffafba;background:#3a1b22;padding:7px;border-radius:6px;font-size:12px}.stcw-cat-badges{display:flex;gap:5px;flex-wrap:wrap;margin:4px 0}.stcw-cat-badges span{padding:3px 7px;border-radius:12px;background:#30283a;font-size:11px}.stcw-cat-badges span.ok{background:#16422a;color:#aee6c1}.stcw-remote-group{margin-top:8px;border-top:1px solid #302a3a;padding-top:7px}.stcw-remote-group summary{font-weight:600;color:#c9b6de;cursor:pointer}.stcw-remote-all{display:flex;gap:7px;align-items:center;margin:5px 0}.stcw-remote-list{max-height:190px;overflow:auto;margin:4px 0}.stcw-remote-list label{display:flex;gap:7px;align-items:center;padding:4px 5px;border-radius:6px}.stcw-remote-list label:hover{background:#211b29}.stcw-remote-list label>span{display:flex;min-width:0;flex-direction:column}.stcw-remote-list label b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.stcw-remote-list small{color:#9e90aa}.stcw-dshprompt{border:1px solid #493c59;background:#1a1622;border-radius:10px;padding:11px;margin-bottom:14px}.stcw-dshprompt .stcw-field{margin:9px 0}.stcw-dshprompt textarea{width:100%;resize:vertical}.stcw-dshprompt .stcw-row{margin-top:9px}.stcw-dshprompt .stcw-row .stcw-hint{flex:1}@media(max-width:1150px){.stcw-studio{grid-template-columns:285px minmax(0,1fr)}.stcw-resource-grid{grid-template-columns:minmax(420px,1fr) 300px}}`;
var EMBEDDED_CSS = `.stcw-embedded-book{margin-top:18px;border:1px solid #493b57;border-radius:9px;padding:10px}.stcw-embedded-book>summary{cursor:pointer;color:#d1b6ea;font-weight:700}.stcw-embedded-book>.stcw-world-editor{margin-top:12px}.stcw-embedded-preview{margin-top:14px;border-top:1px solid #342d3e;padding-top:10px}`;
function installStyle() {
  const style = document.createElement("style");
  style.dataset.dshStcardwriter = "true";
  style.textContent = CSS + EXTRA_CSS + EMBEDDED_CSS;
  document.head.append(style);
  return () => style.remove();
}
var inject = ["slots"];
function apply(ctx) {
  ctx.effect(installStyle, "dsh-stcardwriter: styles");
  ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({ name: "sidebar.footer.action", id: "stcardwriter", order: 20, label: "\u9152\u9986\u521B\u4F5C" }, FooterAction));
  ctx.slots.inject("shell.overlay", () => ctx.slots.register({ name: "shell.overlay", id: "stcardwriter-workbench", order: 20 }, Workbench));
  ctx.slots.inject("conversation.input.left", () => ctx.slots.register({ name: "conversation.input.left", id: "stcardwriter-composer-action", order: 30, label: "\u9152\u9986\u521B\u4F5C" }, HarnessComposerAction));
}
return module.exports; } });
//# sourceMappingURL=client.js.map
