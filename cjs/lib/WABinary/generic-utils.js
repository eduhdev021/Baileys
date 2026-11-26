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
var generic_utils_exports = {};
__export(generic_utils_exports, {
  assertNodeErrorFree: () => assertNodeErrorFree,
  binaryNodeToString: () => binaryNodeToString,
  getAllBinaryNodeChildren: () => getAllBinaryNodeChildren,
  getBinaryNodeChild: () => getBinaryNodeChild,
  getBinaryNodeChildBuffer: () => getBinaryNodeChildBuffer,
  getBinaryNodeChildString: () => getBinaryNodeChildString,
  getBinaryNodeChildUInt: () => getBinaryNodeChildUInt,
  getBinaryNodeChildren: () => getBinaryNodeChildren,
  getBinaryNodeMessages: () => getBinaryNodeMessages,
  getBizBinaryNode: () => getBizBinaryNode,
  reduceBinaryNodeToDictionary: () => reduceBinaryNodeToDictionary
});
module.exports = __toCommonJS(generic_utils_exports);
var import_node_crypto = require("node:crypto");
var import_Addon = require("../Addon/index.js");
var import_WAProto = require("../../WAProto/index.js");
const indexCache = /* @__PURE__ */ new WeakMap();
const getBinaryNodeChildren = (node, childTag) => {
  if (!node || !Array.isArray(node.content))
    return [];
  let index = indexCache.get(node);
  if (!index) {
    index = /* @__PURE__ */ new Map();
    for (const child of node.content) {
      let arr = index.get(child.tag);
      if (!arr)
        index.set(child.tag, arr = []);
      arr.push(child);
    }
    indexCache.set(node, index);
  }
  return index.get(childTag) || [];
};
const getBinaryNodeChild = (node, childTag) => {
  return getBinaryNodeChildren(node, childTag)[0];
};
const getAllBinaryNodeChildren = ({ content }) => {
  if (Array.isArray(content)) {
    return content;
  }
  return [];
};
const getBinaryNodeChildBuffer = (node, childTag) => {
  const child = getBinaryNodeChild(node, childTag)?.content;
  if (Buffer.isBuffer(child) || child instanceof Uint8Array) {
    return child;
  }
};
const getBinaryNodeChildString = (node, childTag) => {
  const child = getBinaryNodeChild(node, childTag)?.content;
  if (Buffer.isBuffer(child) || child instanceof Uint8Array) {
    return Buffer.from(child).toString("utf-8");
  } else if (typeof child === "string") {
    return child;
  }
};
const getBinaryNodeChildUInt = (node, childTag, length) => {
  const buff = getBinaryNodeChildBuffer(node, childTag);
  if (buff) {
    return bufferToUInt(buff, length);
  }
};
const assertNodeErrorFree = (node) => {
  const errNode = getBinaryNodeChild(node, "error");
  if (errNode) {
    throw new import_Addon.HttpError(errNode.attrs.text || "Unknown error", { data: +errNode.attrs.code });
  }
};
const reduceBinaryNodeToDictionary = (node, tag) => {
  const nodes = getBinaryNodeChildren(node, tag);
  const dict = nodes.reduce((dict2, { attrs }) => {
    if (typeof attrs.name === "string") {
      dict2[attrs.name] = attrs.value || attrs.config_value;
    } else {
      dict2[attrs.config_code] = attrs.value || attrs.config_value;
    }
    return dict2;
  }, {});
  return dict;
};
const getBinaryNodeMessages = ({ content }) => {
  const msgs = [];
  if (Array.isArray(content)) {
    for (const item of content) {
      if (item.tag === "message") {
        msgs.push(import_WAProto.proto.WebMessageInfo.decode(item.content).toJSON());
      }
    }
  }
  return msgs;
};
function bufferToUInt(e, t) {
  let a = 0;
  for (let i = 0; i < t; i++) {
    a = 256 * a + e[i];
  }
  return a;
}
const tabs = (n) => "	".repeat(n);
function binaryNodeToString(node, i = 0) {
  if (!node) {
    return node;
  }
  if (typeof node === "string") {
    return tabs(i) + node;
  }
  if (node instanceof Uint8Array) {
    return tabs(i) + Buffer.from(node).toString("hex");
  }
  if (Array.isArray(node)) {
    return node.map((x) => tabs(i + 1) + binaryNodeToString(x, i + 1)).join("\n");
  }
  const children = binaryNodeToString(node.content, i + 1);
  const tag = `<${node.tag} ${Object.entries(node.attrs || {}).filter(([, v]) => v !== void 0).map(([k, v]) => `${k}='${v}'`).join(" ")}`;
  const content = children ? `>
${children}
${tabs(i)}</${node.tag}>` : "/>";
  return tag + content;
}
const FLOWS_MAP = {
  mpm: true,
  cta_catalog: true,
  send_location: true,
  call_permission_request: true,
  wa_payment_transaction_details: true,
  automated_greeting_message_view_catalog: true,
  form_message: true,
  payment_key_info: true
};
const DECISION_SOURCE_CONTENT = [
  {
    tag: "decision_source",
    attrs: { value: "df" }
  }
];
const LIST_TYPE_CONTENT = {
  tag: "list",
  attrs: { v: "2", type: "product_list" }
};
const NATIVE_FLOW_ATTRIBUTE = { type: "native_flow", v: "1" };
const MIXED_NATIVE_FLOW = {
  tag: "interactive",
  attrs: NATIVE_FLOW_ATTRIBUTE,
  content: [
    {
      tag: "native_flow",
      attrs: { v: "9", name: "mixed" }
    }
  ]
};
const getBizBinaryNode = (message) => {
  const flowMsg = message.interactiveMessage?.nativeFlowMessage;
  const firstButtonName = flowMsg?.buttons?.[0]?.name;
  const qualityContent = {
    tag: "quality_control",
    attrs: {
      decision_id: (0, import_node_crypto.randomBytes)(20).toString("hex"),
      source_type: "third_party"
    },
    content: DECISION_SOURCE_CONTENT
  };
  const bizAttributes = {
    actual_actors: "2",
    host_storage: "2",
    privacy_mode_ts: `${Date.now() / 1e3 | 0}`
  };
  if (firstButtonName === "review_and_pay" || firstButtonName === "payment_info") {
    bizAttributes.native_flow_name = firstButtonName === "review_and_pay" ? "order_details" : firstButtonName;
    return {
      tag: "biz",
      attrs: bizAttributes,
      content: [qualityContent]
    };
  }
  if (firstButtonName && FLOWS_MAP[firstButtonName]) {
    return {
      tag: "biz",
      attrs: bizAttributes,
      content: [
        {
          tag: "interactive",
          attrs: NATIVE_FLOW_ATTRIBUTE,
          content: [
            {
              tag: "native_flow",
              attrs: firstButtonName === "form_message" || firstButtonName === "payment_key_info" ? { name: firstButtonName } : { v: "2", name: firstButtonName }
            }
          ]
        },
        qualityContent
      ]
    };
  }
  if (flowMsg || message.buttonsMessage || message.templateMessage) {
    return {
      tag: "biz",
      attrs: bizAttributes,
      content: [
        MIXED_NATIVE_FLOW,
        qualityContent
      ]
    };
  }
  if (message.listMessage) {
    return {
      tag: "biz",
      attrs: bizAttributes,
      content: [
        LIST_TYPE_CONTENT,
        qualityContent
      ]
    };
  }
  return {
    tag: "biz",
    attrs: bizAttributes,
    content: [qualityContent]
  };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  assertNodeErrorFree,
  binaryNodeToString,
  getAllBinaryNodeChildren,
  getBinaryNodeChild,
  getBinaryNodeChildBuffer,
  getBinaryNodeChildString,
  getBinaryNodeChildUInt,
  getBinaryNodeChildren,
  getBinaryNodeMessages,
  getBizBinaryNode,
  reduceBinaryNodeToDictionary
});
