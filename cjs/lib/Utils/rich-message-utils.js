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
var rich_message_utils_exports = {};
__export(rich_message_utils_exports, {
  botMetadataCertificate: () => botMetadataCertificate,
  botMetadataSignature: () => botMetadataSignature,
  prepareRichResponseMessage: () => prepareRichResponseMessage,
  toUnified: () => toUnified,
  tokenizeCode: () => tokenizeCode,
  wrapToBotForwardedMessage: () => wrapToBotForwardedMessage
});
module.exports = __toCommonJS(rich_message_utils_exports);
var import_node_crypto = require("node:crypto");
var import_Defaults = require("../Defaults/index.js");
var import_constants = require("../WABinary/constants.js");
var import_RichType = require("../Types/RichType.js");
var import_WAProto = require("../../WAProto/index.js");
var import_generics = require("./generics.js");
const NOOP = /* @__PURE__ */ new Set([]);
const tokenizeCode = (code, language = "javascript") => {
  const keywords = import_constants.LANGUAGE_KEYWORDS[language] || NOOP;
  const blocks = [];
  import_Defaults.LEXER_REGEX.lastIndex = 0;
  let match;
  while ((match = import_Defaults.LEXER_REGEX.exec(code)) !== null) {
    if (match[1]) {
      blocks.push({ highlightType: import_RichType.CodeHighlightType.COMMENT, codeContent: match[1] });
    } else if (match[2]) {
      blocks.push({ highlightType: import_RichType.CodeHighlightType.STRING, codeContent: match[2] });
    } else if (match[3]) {
      blocks.push({
        highlightType: keywords.has(match[3]) ? import_RichType.CodeHighlightType.KEYWORD : import_RichType.CodeHighlightType.METHOD,
        codeContent: match[3]
      });
    } else if (match[4]) {
      blocks.push({
        highlightType: keywords.has(match[4]) ? import_RichType.CodeHighlightType.KEYWORD : import_RichType.CodeHighlightType.DEFAULT,
        codeContent: match[4]
      });
    } else if (match[5]) {
      blocks.push({ highlightType: import_RichType.CodeHighlightType.NUMBER, codeContent: match[5] });
    } else {
      blocks.push({ highlightType: import_RichType.CodeHighlightType.DEFAULT, codeContent: match[6] });
    }
  }
  return blocks;
};
const toUnified = (submessages, uuid) => ({
  response_id: uuid || (0, import_node_crypto.randomUUID)(),
  sections: submessages.map((submessage, index) => {
    switch (submessage.messageType) {
      case import_RichType.RichSubMessageType.CODE:
        const codeMetadata = submessage.codeMetadata;
        return {
          view_model: {
            primitive: {
              language: codeMetadata.codeLanguage,
              code_blocks: codeMetadata.codeBlocks.map((block) => ({ content: block.codeContent, type: import_RichType.CodeHighlightType[block.highlightType] })),
              __typename: "GenAICodeUXPrimitive"
            },
            __typename: "GenAISingleLayoutViewModel"
          }
        };
      case import_RichType.RichSubMessageType.CONTENT_ITEMS:
        return {};
      case import_RichType.RichSubMessageType.INLINE_IMAGE:
        return {};
      case import_RichType.RichSubMessageType.LATEX:
        return {};
      case import_RichType.RichSubMessageType.TABLE:
        const tableMetadata = submessage.tableMetadata;
        return {
          view_model: {
            primitive: {
              title: tableMetadata.title,
              rows: tableMetadata.rows.map((row) => ({
                is_header: row.isHeading,
                cells: row.items,
                markdown_cells: row.items.map((item) => ({ text: item }))
              })),
              __typename: "GenATableUXPrimitive"
            },
            __typename: "GenAISingleLayoutViewModel"
          }
        };
      case import_RichType.RichSubMessageType.TEXT:
        return {
          view_model: {
            primitive: {
              text: submessage.messageText,
              inline_entities: submessage.inlineEntities || [],
              __typename: "GenAIMarkdownTextUXPrimitive"
            },
            __typename: "GenAISingleLayoutViewModel"
          }
        };
    }
    return submessage;
  })
});
const prepareRichResponseMessage = (content) => {
  let { alignment, code, contentText, disclaimerText, footerText, headerText, imageText, inlineImage, inlineVideo, items, language, latex, links, noHeading, posts, products, suggested, richResponse, table, tapLinkUrl, title } = content;
  let submessages = [];
  if (Array.isArray(richResponse)) {
    submessages = richResponse.map((submessage) => {
      if (submessage.text) {
        return {
          messageType: import_RichType.RichSubMessageType.TEXT,
          messageText: submessage.text,
          inlineEntities: submessage.inlineEntities
        };
      } else if (submessage.code) {
        return {
          messageType: import_RichType.RichSubMessageType.CODE,
          codeMetadata: {
            codeLanguage: submessage.language,
            codeBlocks: submessage.code
          }
        };
      } else if (submessage.items) {
        return {
          messageType: import_RichType.RichSubMessageType.CONTENT_ITEMS,
          contentItemsMetadata: {
            itemsMetadata: submessage.items,
            contentType: import_WAProto.proto.AIRichResponseContentItemsMetadata.ContentType.CAROUSEL
          }
        };
      } else if (submessage.inlineImage) {
        return {
          messageType: import_RichType.RichSubMessageType.INLINE_IMAGE,
          imageMetadata: {
            imageUrl: submessage.inlineImage,
            imageText: submessage.imageText,
            alignment: submessage.alignment,
            tapLinkUrl: submessage.tapLinkUrl
          }
        };
      } else if (submessage.inlineVideo) {
        return {
          messageType: import_RichType.RichSubMessageType.TEXT,
          messageText: "INLINE_VIDEO"
        };
      } else if (submessage.latex) {
        return {
          messageType: import_RichType.RichSubMessageType.LATEX,
          latexMetadata: {
            text: submessage.text,
            expressions: submessage.latex
          }
        };
      } else if (submessage.posts) {
        return {
          messageType: import_RichType.RichSubMessageType.TEXT,
          messageText: "POSTS"
        };
      } else if (submessage.products) {
        return {
          messageType: import_RichType.RichSubMessageType.TEXT,
          messageText: "PRODUCTS"
        };
      } else if (submessage.suggested) {
        return {
          messageType: import_RichType.RichSubMessageType.TEXT,
          messageText: "SUGGESTED_PROMPT"
        };
      } else if (submessage.table) {
        return {
          messageType: import_RichType.RichSubMessageType.TABLE,
          tableMetadata: {
            title: submessage.title,
            rows: submessage.table
          }
        };
      }
      return submessage;
    });
  } else {
    if (headerText) {
      submessages.push({
        messageType: import_RichType.RichSubMessageType.TEXT,
        messageText: headerText
      });
    }
    if (contentText) {
      submessages.push({
        messageType: import_RichType.RichSubMessageType.TEXT,
        messageText: contentText
      });
    }
    if (code) {
      language || (language = "javascript");
      submessages.push({
        messageType: import_RichType.RichSubMessageType.CODE,
        codeMetadata: {
          codeLanguage: language,
          codeBlocks: tokenizeCode(code, language)
        }
      });
    }
    if (items) {
      submessages.push({
        messageType: import_RichType.RichSubMessageType.CONTENT_ITEMS,
        contentItemsMetadata: {
          itemsMetadata: items,
          contentType: import_WAProto.proto.AIRichResponseContentItemsMetadata.ContentType.CAROUSEL
        }
      });
    }
    if (inlineImage) {
      submessages.push({
        messageType: import_RichType.RichSubMessageType.INLINE_IMAGE,
        imageMetadata: {
          imageUrl: inlineImage,
          imageText,
          alignment,
          tapLinkUrl
        }
      });
    }
    if (inlineVideo) {
      submessages.push({
        messageType: import_RichType.RichSubMessageType.TEXT,
        messageText: "INLINE_VIDEO"
      });
    }
    if (latex) {
      submessages.push({
        messageType: import_RichType.RichSubMessageType.LATEX,
        latexMetadata: {
          text,
          expressions: latex
        }
      });
    }
    if (links) {
      links.forEach((linkField, index) => {
        const prefix = "SS_" + index;
        const url = linkField.url || import_Defaults.DONATE_URL;
        const sources = linkField.sources?.map((sourceField) => ({
          source_type: "THIRD_PARTY",
          source_display_name: sourceField.displayName || "Source",
          source_subtitle: sourceField.subtitle || "External link",
          source_url: sourceField.url || url
        }));
        submessages.push({
          messageType: import_RichType.RichSubMessageType.TEXT,
          messageText: linkField.text + ` {{${prefix}}}\xB9{{/${prefix}}} `,
          inlineEntities: [{
            key: prefix,
            metadata: {
              reference_id: index + 1,
              reference_url: url,
              reference_title: linkField.title || "External link",
              reference_display_name: linkField.displayName || "Link",
              sources: sources || [],
              __typename: "GenAISearchCitationItem"
            }
          }]
        });
      });
    }
    if (posts) {
      submessages.push({
        messageType: import_RichType.RichSubMessageType.TEXT,
        messageText: "POSTS"
      });
    }
    if (products) {
      submessages.push({
        messageType: import_RichType.RichSubMessageType.TEXT,
        messageText: "PRODUCTS"
      });
    }
    if (suggested) {
      submessages.push({
        messageType: import_RichType.RichSubMessageType.TEXT,
        messageText: "SUGGESTED_PROMPT"
      });
    }
    if (table) {
      submessages.push({
        messageType: import_RichType.RichSubMessageType.TABLE,
        tableMetadata: {
          title,
          rows: table.map((items2, index) => ({
            isHeading: !noHeading && index == 0,
            items: items2
          }))
        }
      });
    }
    if (footerText) {
      submessages.push({
        messageType: import_RichType.RichSubMessageType.TEXT,
        messageText: footerText
      });
    }
  }
  const uuid = (0, import_node_crypto.randomUUID)();
  const unified = toUnified(submessages, uuid);
  const richResponseMessage = import_WAProto.proto.AIRichResponseMessage.create({
    submessages,
    messageType: import_WAProto.proto.AIRichResponseMessageType.AI_RICH_RESPONSE_TYPE_STANDARD,
    unifiedResponse: {
      data: import_Defaults.TEXT_ENCODER.encode(JSON.stringify(unified))
      // Expects "ArrayBufferLike"
    },
    contextInfo: {
      isForwarded: true,
      forwardingScore: 1,
      forwardedAiBotMessageInfo: { botJid: "867051314767696@bot" },
      forwardOrigin: 4
    }
  });
  const message = wrapToBotForwardedMessage(richResponseMessage);
  const botMetadata = message.messageContextInfo.botMetadata;
  if (disclaimerText) {
    botMetadata.messageDisclaimerText = disclaimerText;
  }
  botMetadata.botResponseId = uuid;
  return message;
};
const botMetadataSignature = () => {
  const signature = new Uint8Array(64);
  (0, import_node_crypto.getRandomValues)(signature);
  return signature;
};
const botMetadataCertificate = (length = 685) => {
  const certificate = new Uint8Array(length);
  certificate[0] = 48;
  certificate[1] = 130;
  (0, import_node_crypto.getRandomValues)(certificate.subarray(2));
  return certificate;
};
const wrapToBotForwardedMessage = (richResponseMessage) => ({
  messageContextInfo: {
    botMetadata: {
      // TODO: Fill verificationMetadata field
      verificationMetadata: {
        proofs: [
          {
            certificateChain: [
              botMetadataCertificate(),
              botMetadataCertificate(892)
            ],
            version: 1,
            useCase: 1,
            signature: botMetadataSignature()
          }
        ]
      }
    }
  },
  botForwardedMessage: {
    message: { richResponseMessage }
  }
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  botMetadataCertificate,
  botMetadataSignature,
  prepareRichResponseMessage,
  toUnified,
  tokenizeCode,
  wrapToBotForwardedMessage
});
