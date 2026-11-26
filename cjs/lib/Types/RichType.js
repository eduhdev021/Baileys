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
var RichType_exports = {};
__export(RichType_exports, {
  CodeHighlightType: () => CodeHighlightType,
  RichSubMessageType: () => RichSubMessageType
});
module.exports = __toCommonJS(RichType_exports);
var CodeHighlightType;
(function(CodeHighlightType2) {
  CodeHighlightType2[CodeHighlightType2["DEFAULT"] = 0] = "DEFAULT";
  CodeHighlightType2[CodeHighlightType2["KEYWORD"] = 1] = "KEYWORD";
  CodeHighlightType2[CodeHighlightType2["METHOD"] = 2] = "METHOD";
  CodeHighlightType2[CodeHighlightType2["STRING"] = 3] = "STRING";
  CodeHighlightType2[CodeHighlightType2["NUMBER"] = 4] = "NUMBER";
  CodeHighlightType2[CodeHighlightType2["COMMENT"] = 5] = "COMMENT";
})(CodeHighlightType || (CodeHighlightType = {}));
var RichSubMessageType;
(function(RichSubMessageType2) {
  RichSubMessageType2[RichSubMessageType2["UNKNOWN"] = 0] = "UNKNOWN";
  RichSubMessageType2[RichSubMessageType2["GRID_IMAGE"] = 1] = "GRID_IMAGE";
  RichSubMessageType2[RichSubMessageType2["TEXT"] = 2] = "TEXT";
  RichSubMessageType2[RichSubMessageType2["INLINE_IMAGE"] = 3] = "INLINE_IMAGE";
  RichSubMessageType2[RichSubMessageType2["TABLE"] = 4] = "TABLE";
  RichSubMessageType2[RichSubMessageType2["CODE"] = 5] = "CODE";
  RichSubMessageType2[RichSubMessageType2["DYNAMIC"] = 6] = "DYNAMIC";
  RichSubMessageType2[RichSubMessageType2["MAP"] = 7] = "MAP";
  RichSubMessageType2[RichSubMessageType2["LATEX"] = 8] = "LATEX";
  RichSubMessageType2[RichSubMessageType2["CONTENT_ITEMS"] = 9] = "CONTENT_ITEMS";
})(RichSubMessageType || (RichSubMessageType = {}));
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  CodeHighlightType,
  RichSubMessageType
});
