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
var buttons_exports = {};
__export(buttons_exports, {
  buildNativeButtons: () => buildNativeButtons,
  translateButtonToNative: () => translateButtonToNative
});
module.exports = __toCommonJS(buttons_exports);
const translateButtonToNative = (button) => {
  const icon = button.icon && button.icon !== "" ? button.icon : void 0;
  const withIcon = (obj) => icon ? { ...obj, icon } : obj;
  const type = button.type;
  switch (type) {
    case "reply":
      return {
        name: "quick_reply",
        buttonParamsJson: JSON.stringify(withIcon({
          display_text: button.text,
          id: button.id,
          ...button.icon && { icon: button.icon }
        }))
      };
    case "list":
      return {
        name: "single_select",
        buttonParamsJson: JSON.stringify(withIcon({
          title: button.text,
          sections: button.sections,
          ...button.icon && { icon: button.icon }
        }))
      };
    case "url":
      return {
        name: "cta_url",
        buttonParamsJson: JSON.stringify(withIcon({
          display_text: button.text,
          url: button.url,
          merchant_url: button.url,
          ...button.icon && { icon: button.icon }
        }))
      };
    case "webview":
    case "open_webview":
      return {
        name: "open_webview",
        buttonParamsJson: JSON.stringify(withIcon({
          title: button.title || button.text,
          display_text: button.displayText || button.text,
          link: button.link || {
            url: button.url,
            in_app_webview: button.inAppWebview ?? true,
            full_screen: button.fullScreen ?? true
          },
          ...button.icon && { icon: button.icon }
        }))
      };
    case "copy":
      return {
        name: "cta_copy",
        buttonParamsJson: JSON.stringify({
          display_text: button.text,
          copy_code: button.payload ?? button.copy,
          ...button.id && { id: button.id },
          ...button.icon && { icon: button.icon }
        })
      };
    case "call":
      return {
        name: "cta_call",
        buttonParamsJson: JSON.stringify({
          display_text: button.text,
          phone_number: button.phone ?? button.call,
          ...button.icon && { icon: button.icon }
        })
      };
    case "catalog":
      return {
        name: "cta_catalog",
        buttonParamsJson: JSON.stringify({
          display_text: button.text,
          business_phone_number: button.phone,
          ...button.icon && { icon: button.icon }
        })
      };
    case "location":
      return {
        name: "send_location",
        buttonParamsJson: JSON.stringify({
          display_text: button.text || "Localiza\xE7\xE3o",
          ...button.icon && { icon: button.icon }
        })
      };
    case "pix":
      return {
        name: "review_and_pay",
        buttonParamsJson: JSON.stringify({
          reference_id: button.referenceId,
          type: "digital-goods",
          payment_type: "br",
          currency: "BRL",
          total_amount: { value: Math.round(button.amount * 100), offset: 100 },
          payment_settings: [{
            type: "pix_dynamic_code",
            pix_dynamic_code: {
              code: button.pixCode,
              merchant_name: button.merchantName,
              key: button.pixKey,
              key_type: button.keyType
            }
          }]
        })
      };
    case "pix_static": {
      const amountVal = Math.round(button.amount * 100);
      return {
        name: "payment_info",
        buttonParamsJson: JSON.stringify({
          currency: "BRL",
          total_amount: { value: amountVal, offset: 100 },
          reference_id: button.referenceId,
          type: "physical-goods",
          order: {
            status: "pending",
            subtotal: { value: amountVal, offset: 100 },
            order_type: "ORDER",
            items: [{
              name: button.itemName || "Produto",
              amount: { value: amountVal, offset: 100 },
              quantity: 1,
              sale_amount: { value: amountVal, offset: 100 }
            }]
          },
          payment_settings: [{
            type: "pix_static_code",
            pix_static_code: {
              merchant_name: button.merchantName,
              key: button.pixKey,
              key_type: button.keyType
            }
          }],
          share_payment_status: false,
          is_soft_deleted: false,
          referral: "chat_attachment"
        })
      };
    }
    case "boleto":
      return {
        name: "review_and_pay",
        buttonParamsJson: JSON.stringify({
          reference_id: button.referenceId,
          type: "physical-goods",
          payment_type: "br",
          currency: "BRL",
          total_amount: { value: Math.round(button.amount * 100), offset: 100 },
          payment_settings: [{
            type: "boleto",
            boleto: { digitable_line: button.digitableLine }
          }]
        })
      };
    case "payment_link":
      return {
        name: "review_and_pay",
        buttonParamsJson: JSON.stringify({
          reference_id: button.referenceId,
          type: "digital-goods",
          payment_type: "br",
          currency: "BRL",
          total_amount: { value: Math.round(button.amount * 100), offset: 100 },
          payment_settings: [{
            type: "payment_link",
            payment_link: { uri: button.uri }
          }]
        })
      };
    case "card_pay":
      return {
        name: "review_and_pay",
        buttonParamsJson: JSON.stringify({
          reference_id: button.referenceId,
          type: "physical-goods",
          payment_type: "br",
          currency: "BRL",
          total_amount: { value: Math.round(button.amount * 100), offset: 100 },
          payment_settings: [{
            type: "offsite_card_pay",
            offsite_card_pay: {
              last_four_digits: button.lastFourDigits,
              credential_id: button.credentialId
            }
          }]
        })
      };
    case "reminder":
    case "cta_reminder":
      return {
        name: "cta_reminder",
        buttonParamsJson: JSON.stringify({
          display_text: button.text,
          ...button.icon && { icon: button.icon }
        })
      };
    case "cancel_reminder":
    case "cta_cancel_reminder":
      return {
        name: "cta_cancel_reminder",
        buttonParamsJson: JSON.stringify({
          display_text: button.text,
          ...button.icon && { icon: button.icon }
        })
      };
    case "mpm":
      return {
        name: "mpm",
        buttonParamsJson: JSON.stringify({
          display_text: button.text || button.title || "Ver Produtos",
          sections: button.sections,
          ...button.icon && { icon: button.icon }
        })
      };
    case "catalog_message":
      return {
        name: "catalog_message",
        buttonParamsJson: JSON.stringify({
          display_text: button.text || "Ver Cat\xE1logo",
          ...button.businessPhoneNumber && { business_phone_number: button.businessPhoneNumber },
          ...button.icon && { icon: button.icon }
        })
      };
    case "view_catalog":
    case "automated_greeting_message_view_catalog":
      return {
        name: "automated_greeting_message_view_catalog",
        buttonParamsJson: JSON.stringify({
          display_text: button.text || "Ver Produto",
          business_phone_number: button.businessPhoneNumber,
          catalog_product_id: button.catalogProductId,
          ...button.icon && { icon: button.icon }
        })
      };
    case "transaction_details":
    case "wa_payment_transaction_details":
      return {
        name: "wa_payment_transaction_details",
        buttonParamsJson: JSON.stringify({
          display_text: button.text || "Detalhes da Transa\xE7\xE3o",
          transaction_id: button.transactionId,
          ...button.icon && { icon: button.icon }
        })
      };
    case "galaxy":
    case "galaxy_message":
    case "flow":
      return {
        name: "galaxy_message",
        buttonParamsJson: JSON.stringify({
          flow_cta: button.flowCta || button.text || "Abrir",
          flow_action: button.flowAction || "navigate",
          flow_message_version: button.flowMessageVersion || "3",
          flow_action_payload: {
            screen: button.flowScreen || "SATISFACTION_SCREEN",
            data: button.flowPayload || {}
          },
          ...button.icon && { icon: button.icon }
        })
      };
    default:
      if (button.id) {
        return {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: button.text || button.buttonText || "\u{1F449}\u{1F3FB} Click",
            id: button.id,
            ...button.icon && { icon: button.icon }
          })
        };
      }
      if (button.copy) {
        return {
          name: "cta_copy",
          buttonParamsJson: JSON.stringify({
            display_text: button.text || button.buttonText || "\u{1F4CB} Copy",
            copy_code: button.copy,
            ...button.icon && { icon: button.icon }
          })
        };
      }
      if (button.url) {
        return {
          name: "cta_url",
          buttonParamsJson: JSON.stringify({
            display_text: button.text || button.buttonText || "\u{1F310} Visit",
            url: button.url,
            merchant_url: button.url,
            ...button.icon && { icon: button.icon }
          })
        };
      }
      if (button.call) {
        return {
          name: "cta_call",
          buttonParamsJson: JSON.stringify({
            display_text: button.text || button.buttonText || "\u{1F4DE} Call",
            phone_number: button.call,
            ...button.icon && { icon: button.icon }
          })
        };
      }
      if (button.sections) {
        return {
          name: "single_select",
          buttonParamsJson: JSON.stringify({
            title: button.text || button.buttonText || "\u{1F4CB} Select",
            sections: button.sections,
            ...button.icon && { icon: button.icon }
          })
        };
      }
      if (button.name) {
        return button;
      }
      throw new Error(`Tipo de bot\xE3o desconhecido: ${type}`);
  }
};
const buildNativeButtons = (buttons) => {
  return buttons.map((button) => {
    const native = translateButtonToNative(button);
    return native;
  });
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  buildNativeButtons,
  translateButtonToNative
});
