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
var make_in_memory_store_exports = {};
__export(make_in_memory_store_exports, {
  makeInMemoryStore: () => makeInMemoryStore,
  waChatKey: () => waChatKey,
  waLabelAssociationKey: () => waLabelAssociationKey,
  waMessageID: () => waMessageID
});
module.exports = __toCommonJS(make_in_memory_store_exports);
var import_node_fs = require("node:fs");
var import_Addon = require("../Addon/index.js");
var import_Types = require("../Types/index.js");
var import_LabelAssociation = require("../Types/LabelAssociation.js");
var import_Defaults = require("../Defaults/index.js");
var import_Utils = require("../Utils/index.js");
var import_WABinary = require("../WABinary/index.js");
var import_make_ordered_dictionary = require("./make-ordered-dictionary.js");
var import_object_repository = require("./object-repository.js");
const waChatKey = (pin) => ({
  key: (c) => (pin ? c.pinned ? "1" : "0" : "") + (c.archived ? "0" : "1") + (c.conversationTimestamp ? c.conversationTimestamp.toString(16).padStart(8, "0") : "") + c.id,
  compare: (k1, k2) => k2.localeCompare(k1)
});
const waMessageID = (m) => m.key.id || "";
const waLabelAssociationKey = {
  key: (la) => la.type === import_LabelAssociation.LabelAssociationType.Chat ? la.chatId + la.labelId : la.chatId + la.messageId + la.labelId,
  compare: (k1, k2) => k2.localeCompare(k1)
};
const makeMessagesDictionary = () => (0, import_make_ordered_dictionary.makeOrderedDictionary)(waMessageID);
const makeInMemoryStore = (config = {}) => {
  const socket = config.socket;
  const chatKey = config.chatKey || waChatKey(true);
  const labelAssociationKey = config.labelAssociationKey || waLabelAssociationKey;
  const logger = config.logger || import_Defaults.DEFAULT_CONNECTION_CONFIG.logger.child({ stream: "in-mem-store" });
  const chats = new import_Addon.KeyedDB(chatKey, (c) => c.id);
  const messages = {};
  const contacts = {};
  const groupMetadata = {};
  const presences = {};
  const state = { connection: "close" };
  const labels = new import_object_repository.ObjectRepository();
  const labelAssociations = new import_Addon.KeyedDB(labelAssociationKey, labelAssociationKey.key);
  const assertMessageList = (jid) => {
    if (!messages[jid]) {
      messages[jid] = makeMessagesDictionary();
    }
    return messages[jid];
  };
  const contactsUpsert = (newContacts) => {
    const oldContacts = new Set(Object.keys(contacts));
    for (const contact of newContacts) {
      oldContacts.delete(contact.id);
      contacts[contact.id] = Object.assign(contacts[contact.id] || {}, contact);
    }
    return oldContacts;
  };
  const labelsUpsert = (newLabels) => {
    for (const label of newLabels) {
      labels.upsertById(label.id, label);
    }
  };
  const bind = (ev) => {
    ev.on("connection.update", (update) => {
      Object.assign(state, update);
    });
    ev.on("messaging-history.set", ({ chats: newChats, contacts: newContacts, messages: newMessages, isLatest, syncType }) => {
      if (syncType === import_Types.WAProto.HistorySync.HistorySyncType.ON_DEMAND) {
        return;
      }
      if (isLatest) {
        chats.clear();
        for (const id in messages) {
          delete messages[id];
        }
      }
      const chatsAdded = chats.insertIfAbsent(...newChats).length;
      logger.debug({ chatsAdded }, "synced chats");
      const oldContacts = contactsUpsert(newContacts);
      if (isLatest) {
        for (const jid of oldContacts) {
          delete contacts[jid];
        }
      }
      logger.debug({ deletedContacts: isLatest ? oldContacts.size : 0, newContacts }, "synced contacts");
      for (const msg of newMessages) {
        const jid = msg.key.remoteJidAlt || msg.key.remoteJid;
        const list = assertMessageList(jid);
        list.upsert(msg, "prepend");
      }
      logger.debug({ messages: newMessages.length }, "synced messages");
    });
    ev.on("contacts.upsert", (contacts2) => {
      contactsUpsert(contacts2);
    });
    ev.on("contacts.update", async (updates) => {
      var _a;
      for (const update of updates) {
        let contact;
        if (contacts[update.id]) {
          contact = contacts[update.id];
        } else {
          const contactHashes = await Promise.all(Object.keys(contacts).map(async (contactId) => {
            const { user } = (0, import_WABinary.jidDecode)(contactId);
            return [contactId, (await (0, import_Utils.md5)(Buffer.from(user + "WA_ADD_NOTIF", "utf8"))).toString("base64").slice(0, 3)];
          }));
          contact = contacts[((_a = contactHashes.find(([, b]) => b === update.id)) === null || _a === void 0 ? void 0 : _a[0]) || ""];
        }
        if (contact) {
          if (update.imgUrl === "changed") {
            contact.imgUrl = socket ? await (socket === null || socket === void 0 ? void 0 : socket.profilePictureUrl(contact.id)) : void 0;
          } else if (update.imgUrl === "removed") {
            delete contact.imgUrl;
          }
        } else {
          return logger.debug({ update }, "got update for non-existant contact");
        }
        Object.assign(contacts[contact.id], contact);
      }
    });
    ev.on("chats.upsert", (newChats) => {
      chats.upsert(...newChats);
    });
    ev.on("chats.update", (updates) => {
      for (let update of updates) {
        const result = chats.update(update.id, (chat) => {
          if (update.unreadCount > 0) {
            update = { ...update };
            update.unreadCount = (chat.unreadCount || 0) + update.unreadCount;
          }
          Object.assign(chat, update);
        });
        if (!result) {
          logger.debug({ update }, "got update for non-existant chat");
        }
      }
    });
    ev.on("labels.edit", (label) => {
      if (label.deleted) {
        return labels.deleteById(label.id);
      }
      if (labels.count() < 20) {
        return labels.upsertById(label.id, label);
      }
      logger.error("Labels count exceed");
    });
    ev.on("labels.association", ({ type, association }) => {
      switch (type) {
        case "add":
          labelAssociations.upsert(association);
          break;
        case "remove":
          labelAssociations.delete(association);
          break;
        default:
          console.error(`unknown operation type [${type}]`);
      }
    });
    ev.on("presence.update", ({ id, presences: update }) => {
      presences[id] = presences[id] || {};
      Object.assign(presences[id], update);
    });
    ev.on("chats.delete", (deletions) => {
      for (const item of deletions) {
        if (chats.get(item)) {
          chats.deleteById(item);
        }
      }
    });
    ev.on("messages.upsert", ({ messages: newMessages, type }) => {
      switch (type) {
        case "append":
        case "notify":
          for (const msg of newMessages) {
            const jid = (0, import_WABinary.jidNormalizedUser)(msg.key.remoteJidAlt || msg.key.remoteJid);
            const list = assertMessageList(jid);
            list.upsert(msg, "append");
            if (type === "notify" && !chats.get(jid)) {
              ev.emit("chats.upsert", [
                {
                  id: jid,
                  conversationTimestamp: (0, import_Utils.toNumber)(msg.messageTimestamp),
                  unreadCount: 1
                }
              ]);
            }
          }
          break;
      }
    });
    ev.on("messages.update", (updates) => {
      var _a;
      for (const { update, key } of updates) {
        const list = assertMessageList((0, import_WABinary.jidNormalizedUser)(key.remoteJid));
        if (update === null || update === void 0 ? void 0 : update.status) {
          const listStatus = (_a = list.get(key.id)) === null || _a === void 0 ? void 0 : _a.status;
          if (listStatus && (update === null || update === void 0 ? void 0 : update.status) <= listStatus) {
            logger.debug({ update, storedStatus: listStatus }, "status stored newer then update");
            delete update.status;
            logger.debug({ update }, "new update object");
          }
        }
        const result = list.updateAssign(key.id, update);
        if (!result) {
          logger.debug({ update }, "got update for non-existent message");
        }
      }
    });
    ev.on("messages.delete", (item) => {
      if ("all" in item) {
        const list = messages[item.jid];
        list === null || list === void 0 ? void 0 : list.clear();
      } else {
        const jid = item.keys[0].remoteJidAlt || item.keys[0].remoteJid;
        const list = messages[jid];
        if (list) {
          const idSet = new Set(item.keys.map((k) => k.id));
          list.filter((m) => !idSet.has(m.key.id));
        }
      }
    });
    ev.on("groups.update", (updates) => {
      for (const update of updates) {
        const id = update.id;
        if (groupMetadata[id]) {
          Object.assign(groupMetadata[id], update);
        } else {
          logger.debug({ update }, "got update for non-existant group metadata");
        }
      }
    });
    ev.on("group-participants.update", ({ id, participants, action }) => {
      const metadata = groupMetadata[id];
      if (metadata) {
        switch (action) {
          case "add":
            metadata.participants.push(...participants.map((participant) => ({ id: participant.id, phoneNumber: participant.phoneNumber, admin: participant.admin })));
            break;
          case "demote":
          case "promote":
            for (const participant of metadata.participants) {
              for (const participantData of participants) {
                if (participantData.id === participant.id || participantData.phoneNumber === participant.phoneNumber) {
                  participant.admin = action === "promote" && "admin";
                }
              }
            }
            break;
          case "remove":
            const removeSet = /* @__PURE__ */ new Set();
            for (const p of participants) {
              if (p.id)
                removeSet.add(p.id);
              if (p.phoneNumber)
                removeSet.add(p.phoneNumber);
            }
            metadata.participants = metadata.participants.reduce((acc, p) => {
              if (!removeSet.has(p.id) && !removeSet.has(p.phoneNumber))
                acc.push(p);
              return acc;
            }, []);
            break;
        }
      }
    });
    ev.on("message-receipt.update", (updates) => {
      for (const { key, receipt } of updates) {
        const obj = messages[key.remoteJidAlt || key.remoteJid];
        const msg = obj === null || obj === void 0 ? void 0 : obj.get(key.id);
        if (msg) {
          (0, import_Utils.updateMessageWithReceipt)(msg, receipt);
        }
      }
    });
    ev.on("messages.reaction", (reactions) => {
      for (const { key, reaction } of reactions) {
        const obj = messages[key.remoteJidAlt || key.remoteJid];
        const msg = obj === null || obj === void 0 ? void 0 : obj.get(key.id);
        if (msg) {
          (0, import_Utils.updateMessageWithReaction)(msg, reaction);
        }
      }
    });
  };
  const toJSON = () => ({
    chats,
    contacts,
    messages,
    labels,
    labelAssociations
  });
  const fromJSON = (json) => {
    chats.upsert(...json.chats);
    labelAssociations.upsert(...json.labelAssociations || []);
    contactsUpsert(Object.values(json.contacts));
    labelsUpsert(Object.values(json.labels || {}));
    for (const jid in json.messages) {
      const list = assertMessageList(jid);
      for (const msg of json.messages[jid]) {
        list.upsert(import_Types.WAProto.WebMessageInfo.fromObject(msg), "append");
      }
    }
  };
  return {
    chats,
    contacts,
    messages,
    groupMetadata,
    state,
    presences,
    labels,
    labelAssociations,
    bind,
    /** loads messages from the store, if not found -- uses the legacy connection */
    loadMessages: async (jid, count, cursor) => {
      const list = assertMessageList(jid);
      const mode = !cursor || "before" in cursor ? "before" : "after";
      const cursorKey = !!cursor ? "before" in cursor ? cursor.before : cursor.after : void 0;
      const cursorValue = cursorKey ? list.get(cursorKey.id) : void 0;
      let messages2;
      if (list && mode === "before" && (!cursorKey || cursorValue)) {
        if (cursorValue) {
          const msgIdx = list.array.findIndex((m) => m.key.id === (cursorKey === null || cursorKey === void 0 ? void 0 : cursorKey.id));
          messages2 = list.array.slice(0, msgIdx);
        } else {
          messages2 = list.array;
        }
        const diff = count - messages2.length;
        if (diff < 0) {
          messages2 = messages2.slice(-count);
        }
      } else {
        messages2 = [];
      }
      return messages2;
    },
    /**
     * Get all available labels for profile
     *
     * Keep in mind that the list is formed from predefined tags and tags
     * that were "caught" during their editing.
     */
    getLabels: () => {
      return labels;
    },
    /**
     * Get labels for chat
     *
     * @returns Label IDs
     **/
    getChatLabels: (chatId) => {
      return labelAssociations.filter((la) => la.chatId === chatId).all();
    },
    /**
     * Get labels for message
     *
     * @returns Label IDs
     **/
    getMessageLabels: (messageId) => {
      const associations = labelAssociations.filter((la) => la.messageId === messageId).all();
      return associations.map(({ labelId }) => labelId);
    },
    loadMessage: async (jid, id) => {
      var _a;
      return (_a = messages[jid]) === null || _a === void 0 ? void 0 : _a.get(id);
    },
    mostRecentMessage: async (jid) => {
      var _a;
      const message = (_a = messages[jid]) === null || _a === void 0 ? void 0 : _a.array.slice(-1)[0];
      return message;
    },
    fetchImageUrl: async (jid, sock) => {
      const contact = contacts[jid];
      if (!contact) {
        return sock === null || sock === void 0 ? void 0 : sock.profilePictureUrl(jid);
      }
      if (typeof contact.imgUrl === "undefined") {
        contact.imgUrl = await (sock === null || sock === void 0 ? void 0 : sock.profilePictureUrl(jid));
      }
      return contact.imgUrl;
    },
    fetchGroupMetadata: async (jid, sock) => {
      if (!groupMetadata[jid]) {
        const metadata = await (sock === null || sock === void 0 ? void 0 : sock.groupMetadata(jid));
        if (metadata) {
          groupMetadata[jid] = metadata;
        }
      }
      return groupMetadata[jid];
    },
    fetchMessageReceipts: async ({ remoteJid, id }) => {
      const list = messages[remoteJid];
      const msg = list === null || list === void 0 ? void 0 : list.get(id);
      return msg === null || msg === void 0 ? void 0 : msg.userReceipt;
    },
    toJSON,
    fromJSON,
    writeToFile: (path) => {
      (0, import_node_fs.writeFileSync)(path, JSON.stringify(toJSON()));
    },
    readFromFile: (path) => {
      if ((0, import_node_fs.existsSync)(path)) {
        logger.debug({ path }, "reading from file");
        const jsonStr = (0, import_node_fs.readFileSync)(path, { encoding: "utf-8" });
        const json = JSON.parse(jsonStr);
        fromJSON(json);
      }
    }
  };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  makeInMemoryStore,
  waChatKey,
  waLabelAssociationKey,
  waMessageID
});
