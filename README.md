# @eduh_dev021/baileys

![npm version](https://img.shields.io/npm/v/@eduh_dev021/baileys)
![node version](https://img.shields.io/node/v/@eduh_dev021/baileys)
![license](https://img.shields.io/npm/l/@eduh_dev021/baileys)
![downloads](https://img.shields.io/npm/dm/@eduh_dev021/baileys)
![builds](https://img.shields.io/badge/builds-ESM%20%2B%20CJS-blue)

**A complete, production-grade WhatsApp Web library for Node.js.** No browser. No WhatsApp Business API. No WASM binaries. **Zero runtime dependencies.** Connect with a QR code or a pairing code and automate everything WhatsApp can do: text, media, stickers, albums, interactive buttons, carousels, native flows, rich messages, polls, events, groups, communities, channels, business tools and more.

Built as a drop-in replacement for the Baileys v7 API — if your code works with Baileys-style libraries, it works here by changing only the import line. Every internal dependency (crypto, QR, ZIP, media probing, caching, locking) is implemented in pure JavaScript inside the package, so `npm install` pulls no binaries and no transitive packages.

```bash
npm install @eduh_dev021/baileys
```

---

## Table of contents

- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Quick start](#quick-start-connect-to-whatsapp)
- [Saving your session (auth state)](#saving-your-session-auth-state)
  - [JSON folder](#usemultifileauthstatefolder--json-folder)
  - [Single JSON file](#usesinglefileauthstatefilename--one-json-file)
  - [SQLite](#usesqliteauthstatedbpath-owneddatabase--sqlite)
  - [Any other database (MySQL, PostgreSQL, MongoDB, Redis...)](#any-other-database-mysql-postgresql-mongodb-redis)
- [The store (`makeInMemoryStore`)](#the-store-makeinmemorystore)
  - [Persisting to JSON](#persisting-the-store-to-a-json-file)
  - [Persisting to SQL / any database](#persisting-the-store-to-sql-or-any-other-database)
  - [Store API](#everything-the-store-offers)
- [Socket configuration](#socket-configuration-makewasocket-options)
- [WhatsApp IDs (JID and LID)](#whatsapp-ids-jid-and-lid)
- [Sending messages](#sending-messages)
  - [Text and formatting](#text)
  - [Rich messages (code blocks, tables, LaTeX)](#rich-messages-code-blocks-tables-latex)
  - [Media](#sending-media)
  - [Sticker packs and albums](#sticker-pack)
  - [Interactive: buttons, lists, template, native flow, carousel](#interactive-messages)
  - [Other message options (AI icon, spoiler, view once...)](#other-message-options)
  - [Status mentions](#status-mentions)
  - [Commerce: product, order, invoice, payments](#commerce-messages)
  - [Polls](#poll)
  - [Phone number and privacy messages](#phone-number-and-privacy-messages)
  - [Modifying messages](#modifying-messages)
- [Receiving messages and downloading media](#receiving-messages-and-downloading-media)
- [Events](#everything-you-can-listen-to-events)
- [Socket method reference](#complete-socket-method-reference)
- [Practical guides](#practical-guides)
  - [Find User ID (PN/LID)](#find-user-id-pnlid)
  - [Image processing](#image-processing)
  - [Add-on utilities](#add-on-utilities)
- [Export reference](#complete-export-reference)
- [Common problems](#common-problems)
- [License](#license)

## Features

| Area | What you get |
| --- | --- |
| **Connection** | QR code or pairing code login, auto-reconnect handling, pre-key rotation, session recreation |
| **Messages** | Text with formatting, mentions (`@jid` and @all), link previews, replies, forwards, edits, deletes, reactions, pins, view-once |
| **Rich messages** | Code blocks with syntax highlighting, tables, LaTeX, inline images, content carousels — rendered natively by WhatsApp |
| **Interactive** | Buttons, lists, hydrated templates, native flows (single select, offers, bottom sheets), carousels with cards |
| **Media** | Images, videos, voice notes (PTT), documents, stickers, sticker packs (up to 60), albums |
| **Commerce** | Products, orders, invoices, payment requests, payment invites, storefronts |
| **Polls** | Create polls, receive votes, aggregate results, send result snapshots |
| **Groups** | Create, invite codes, participants, settings, join requests, ephemeral timers |
| **Communities** | Create, link/unlink groups, member management, invite codes |
| **Channels** | Create and manage newsletters, reactions, subscribers, admin tools |
| **Calls** | Reject calls, create call links, call privacy |
| **Presence** | Online/typing/recording status, read receipts |
| **Privacy** | Full control of every privacy setting via API |
| **Storage** | Auth state in JSON folder / single file / SQLite / your own database; in-memory store with JSON or SQL persistence |
| **Built-in utilities** | QR generator (terminal + PNG), ZIP builder, file-type detection, media probing, audio waveform, TTL cache, mutex, task queue — all self-contained |
| **Developer experience** | 100% TypeScript, ESM + CommonJS builds, zero WASM binaries, zero runtime dependencies, no native code required |

## Requirements

- **Node.js 20 or newer** (Node 22/24 recommended — SQLite auth state needs 22.13+ for the built-in driver)
- **ffmpeg + ffprobe** on the system PATH for video/audio thumbnails, waveforms and animated stickers

Optional peer dependencies, installed only if you use the related feature:

| Package | Needed for |
| --- | --- |
| `ws` | WebSocket client on Node.js below 22 (install unless you are sure you don't need it) |
| `sharp` / `jimp` / `@napi-rs/image` | Thumbnail and image processing (install at least one) |
| `better-sqlite3` | `useSqliteAuthState` on Node.js below 22.13 |

Simplest setup for most users:

```bash
npm install @eduh_dev021/baileys ws sharp
```

## Installation

```bash
# npm
npm install @eduh_dev021/baileys

# yarn
yarn add @eduh_dev021/baileys

# pnpm
pnpm add @eduh_dev021/baileys

# bun
bun add @eduh_dev021/baileys
```

### Importing

```javascript
// --- ESM (import)
import { makeWASocket } from '@eduh_dev021/baileys'

// --- CommonJS (require)
const { makeWASocket } = require('@eduh_dev021/baileys')
```

`makeWASocket` is also the default export, so `import makeWASocket from '@eduh_dev021/baileys'` works too. TypeScript types ship inside the package.

### Deep imports and drop-in alias

Besides the main entry, every internal module can be imported directly, with the correct build chosen automatically per module (ESM for `import`, CommonJS for `require`):

```javascript
// CommonJS — resolves to the CJS build
const logger = require('@eduh_dev021/baileys/lib/Utils/logger').default
const { DEFAULT_CONNECTION_TIMEOUT } = require('@eduh_dev021/baileys/lib/Defaults')

// ESM — resolves to the ESM build (note the .js extension, required by ESM)
import makeMultipartBody from '@eduh_dev021/baileys/lib/Utils/messages.js'
```

Directory-style requires (`lib/Defaults`, `lib/Store`, ...) and `WAProto` imports work as well. If your framework expects the library under a fixed package name, install it as a npm alias and no code change is needed:

```bash
npm install @whiskeysockets/baileys@npm:@eduh_dev021/baileys
```

Deep imports then resolve under the alias name exactly as shown above.

## Quick start: connect to WhatsApp

This complete example connects using a **pairing code** and answers incoming messages automatically:

```javascript
import {
   makeWASocket,
   useMultiFileAuthState,
   delay,
   DisconnectReason
} from '@eduh_dev021/baileys'

const myPhoneNumber = '5511999999999' // your number, country code + DDD, no + or spaces

const connectToWhatsApp = async () => {
   const { state, saveCreds } = await useMultiFileAuthState('session')

   const sock = makeWASocket({
      auth: state,
      printQRInTerminal: true // prints the pairing QR in the terminal (built-in, no extra package)
   })

   sock.ev.on('creds.update', saveCreds)

   sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update

      if (qr && !sock.authState.creds.registered) {
         await delay(1500)
         const code = await sock.requestPairingCode(myPhoneNumber)
         console.log('Pairing code:', code)
      }

      if (connection === 'close') {
         const shouldReconnect =
            lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
         if (shouldReconnect) connectToWhatsApp()
      }

      if (connection === 'open') {
         console.log('Connected to WhatsApp!')
      }
   })

   sock.ev.on('messages.upsert', async ({ messages }) => {
      for (const message of messages) {
         if (!message.message) continue // ignore status and empty messages
         await sock.sendMessage(message.key.remoteJid, { text: 'Hello! 👋' })
      }
   })
}

connectToWhatsApp()
```

The first run asks WhatsApp for a pairing code. Type it on your phone (Linked devices → Link a device → **Link with phone number instead**). After that, the `session` folder keeps you logged in.

Prefer a QR code? Just remove the pairing-code block and set `printQRInTerminal: true` — the QR generator is built into the package, no extra install needed. A custom, easier-to-type pairing code is also supported:

```javascript
await sock.requestPairingCode(myPhoneNumber, 'MYBOT123')
```

---

# Saving your session (auth state)

The auth state holds your login credentials and encryption keys. Three ready-made storages are included — JSON (folder), JSON (single file) and SQLite — plus a simple interface you can implement to store everything in **any other database**: MySQL, PostgreSQL, MongoDB, Redis, DynamoDB, whatever you like.

| Helper | Storage | Needs extra package? | Best for |
| --- | --- | --- | --- |
| `useMultiFileAuthState` | one JSON file per key, inside a folder | No | General use (most common) |
| `useSingleFileAuthState` | everything in one JSON file | No | Simple bots, easy backup |
| `useSqliteAuthState` | an SQLite database | No on Node 22.13+/Bun; `better-sqlite3` otherwise | Performance and reliability |
| your own adapter | any database | your DB driver | Big bots, existing infrastructure |

All of them return an object with `state` and `saveCreds`. Always connect `saveCreds` to the `creds.update` event — that is what keeps the session saved between restarts:

```javascript
sock.ev.on('creds.update', saveCreds)
```

### `useMultiFileAuthState(folder)` — JSON folder

```javascript
import { useMultiFileAuthState } from '@eduh_dev021/baileys'

const { state, saveCreds } = await useMultiFileAuthState('session')
```

Saves the credentials and each set of Signal keys as separate JSON files inside `session/`. Easy to inspect and back up.

### `useSingleFileAuthState(fileName)` — one JSON file

```javascript
import { useSingleFileAuthState } from '@eduh_dev021/baileys'

const { state, saveCreds, flush } = await useSingleFileAuthState('session.json')
```

Everything lives in a single file. Writes are **debounced and atomic** (written to a `.temp` file first, then renamed), so the file never gets corrupted if the process dies. A corrupted file found at startup is automatically renamed to `session.json.corrupt` and a fresh session starts.

Two extras:

- `await flush()` forces the pending write to disk right away — call it on process exit (`process.on('SIGINT', ...)`) so nothing is lost.
- If two sockets use the same file name, they share one mutex automatically, so concurrent writes are safe.

### `useSqliteAuthState(dbPath?, ownedDatabase?)` — SQLite

```javascript
import { useSqliteAuthState } from '@eduh_dev021/baileys'

const { state, saveCreds, close } = await useSqliteAuthState('session.db')
```

Credentials go to a `creds` table and each Signal key to a `signal_keys` table (WAL mode, synchronous prepared statements, transactional writes). The driver is picked automatically:

1. **Bun** → `bun:sqlite`
2. **Node.js ≥ 22.13** → `node:sqlite` (built into Node, nothing to install)
3. Otherwise → `better-sqlite3` (install it: `npm install better-sqlite3`)

Useful options:

```javascript
// 1) Open (or create) a database file — the common case
const s1 = await useSqliteAuthState('session.db')

// 2) Use a database you already opened (shared with the rest of your app)
import Database from 'better-sqlite3'
const myDb = new Database('app.db')
const s2 = await useSqliteAuthState(undefined, myDb)

// 3) Release the file when you are done
s1.close()
```

Returns `{ state, saveCreds, close }`.

### Any other database (MySQL, PostgreSQL, MongoDB, Redis...)

The auth state is just a plain object:

```javascript
{
   creds: { ... },                    // login credentials
   keys: {
      get: (type, ids) => ({ ... }),  // read keys
      set: (data) => { ... }          // write keys
   }
}
```

So any storage works if you implement `get`/`set`. Keys are plain JSON serialized with the exported `BufferJSON` helpers (which turn Buffers into JSON-safe objects). Below is a complete, ready-to-copy adapter — replace the `myDb` calls with your MySQL/PostgreSQL/MongoDB/Redis client:

```javascript
import {
   makeWASocket,
   initAuthCreds,
   BufferJSON,
   proto
} from '@eduh_dev021/baileys'

async function useMyDatabaseAuthState() {
   // -- replace these 4 functions with your database calls ---------------
   const readCreds = async () => {
      // e.g. MySQL:  SELECT data FROM baileys_creds WHERE key = '__creds__'
      const row = await myDb.getCredsRow()
      return row ? JSON.parse(row.data, BufferJSON.reviver) : null
   }
   const writeCreds = async (json) => {
      // e.g. MySQL:  INSERT ... ON DUPLICATE KEY UPDATE
      await myDb.saveCredsRow(JSON.stringify(json, BufferJSON.replacer))
   }
   const readKey = async (type, id) => {
      // e.g. MySQL:  SELECT data FROM baileys_keys WHERE type = ? AND id = ?
      const row = await myDb.getKeyRow(type, id)
      return row ? JSON.parse(row.data, BufferJSON.reviver) : null
   }
   const writeKey = async (type, id, value) => {
      // value === null means "delete this key"
      await myDb.saveKeyRow(type, id, value === null ? null : JSON.stringify(value, BufferJSON.replacer))
   }
   // ----------------------------------------------------------------------

   const creds = (await readCreds()) || initAuthCreds()

   return {
      state: {
         creds,
         keys: {
            get: async (type, ids) => {
               const data = {}
               for (const id of ids) {
                  const value = await readKey(type, id)
                  if (!value) continue
                  data[id] = type === 'app-state-sync-key'
                     ? proto.Message.AppStateSyncKeyData.fromObject(value)
                     : value
               }
               return data
            },
            set: async (data) => {
               for (const type in data) {
                  for (const id in data[type]) {
                     await writeKey(type, id, data[type][id] || null)
                  }
               }
            }
         }
      },
      saveCreds: () => writeCreds(creds)
   }
}

// usage — identical to the built-in helpers
const { state, saveCreds } = await useMyDatabaseAuthState()
const sock = makeWASocket({ auth: state })
sock.ev.on('creds.update', saveCreds)
```

Notes:

- The key `type` values you will see: `pre-key`, `session`, `sender-key`, `sender-key-name`, `app-state-sync-key` and `app-state-sync-version-*`. Store them all the same way — the `type` column is just part of the primary key.
- Wrap `set` in a transaction if your database supports it — it writes several keys at once.
- Prefer `makeCacheableSignalKeyStore(state.keys, logger)` in `set`-heavy setups; it caches reads in memory and batches writes (this is what `makeWASocket` does internally when you pass a raw state).

### Logging out / removing the session

```javascript
await sock.logout() // logs out from WhatsApp
// then delete the storage yourself: rm -rf session/ (or DROP the tables / the file)
```

---

# The store: `makeInMemoryStore`

The library itself does not keep a list of your chats, contacts or messages — WhatsApp does not provide one. The built-in **in-memory store** listens to all events and builds a queryable state from them: chats, messages, contacts, group metadata, labels and presences.

```javascript
import { makeWASocket, makeInMemoryStore, useMultiFileAuthState } from '@eduh_dev021/baileys'

const { state, saveCreds } = await useMultiFileAuthState('session')
const sock = makeWASocket({ auth: state })

const store = makeInMemoryStore({ socket: sock })
store.bind(sock.ev) // starts collecting — call this once, right after connecting
```

### Persisting the store to a JSON file

The store can save and reload all of its content as JSON with two functions: **`writeToFile`** and **`readFromFile`**. Combine them with an interval for automatic saving:

```javascript
const store = makeInMemoryStore({ socket: sock })
store.bind(sock.ev)

// reload what was saved last time (does nothing if the file doesn't exist yet)
store.readFromFile('./baileys_store.json')

// save every 10 seconds
setInterval(() => {
   store.writeToFile('./baileys_store.json')
}, 10_000)

// also save once on exit
process.on('SIGINT', () => {
   store.writeToFile('./baileys_store.json')
   process.exit(0)
})
```

### Persisting the store to SQL or any other database

`store.toJSON()` returns the whole store as a plain JSON object, and `store.fromJSON(json)` loads it back. That means the store content is just a JSON document you can put **anywhere**: a MySQL `LONGTEXT` column, a PostgreSQL `JSONB` column, MongoDB, Redis, S3... Save it periodically and load it on startup:

```javascript
// example with node:sqlite (built into Node 22.13+; same idea for MySQL/Postgres/Mongo)
import { DatabaseSync } from 'node:sqlite'
import { makeInMemoryStore } from '@eduh_dev021/baileys'

const db = new DatabaseSync('store.db')
db.exec(`CREATE TABLE IF NOT EXISTS store_data (
   id INTEGER PRIMARY KEY CHECK (id = 1),
   data TEXT NOT NULL
)`)

const loadJson = () => db.prepare('SELECT data FROM store_data WHERE id = 1').get()?.data
const saveJson = (json) =>
   db.prepare('INSERT OR REPLACE INTO store_data (id, data) VALUES (1, ?)')
     .run(JSON.stringify(json))

const store = makeInMemoryStore({ socket: sock })
store.bind(sock.ev)

// restore
const saved = loadJson()
if (saved) store.fromJSON(saved)

// save every 10 seconds
setInterval(() => saveJson(store.toJSON()), 10_000)
```

The JSON document has this shape (same as `toJSON()` returns):

```javascript
{
   chats: [ ... ],                // chat list
   contacts: { '<jid>': {...} },  // known contacts
   messages: { '<jid>': [ ... ] },// stored messages per chat
   labels: { ... },               // WhatsApp labels
   labelAssociations: [ ... ]     // which chat/message has which label
}
```

### Everything the store offers

```javascript
store.chats            // KeyedDB of chats — store.chats.all() returns the array
store.contacts         // { jid: contact }
store.messages         // { jid: ordered message list }
store.groupMetadata    // { jid: group metadata }
store.presences        // { jid: presence data }
store.state            // last connection.update received
store.labels           // all labels (ObjectRepository)
store.labelAssociations

store.bind(ev)                            // connect to sock.ev (required)
store.loadMessages(jid, count, cursor?)   // last `count` messages of a chat, oldest→newest; cursor = { before: key } for pagination
store.loadMessage(jid, id)                // one message by id
store.mostRecentMessage(jid)              // latest message of a chat
store.fetchImageUrl(jid, sock)            // profile picture URL (cached)
store.fetchGroupMetadata(jid, sock)       // group metadata (cached)
store.fetchMessageReceipts(key)           // delivery/read receipts of a message
store.getLabels()                         // all labels
store.getChatLabels(chatId)               // labels applied to a chat
store.getMessageLabels(messageId)         // labels applied to a message
store.toJSON()                            // full snapshot as JSON object
store.fromJSON(json)                      // restore from a snapshot
store.writeToFile(path)                   // snapshot → JSON file
store.readFromFile(path)                  // JSON file → store (no-op if missing)
```

Two notes:

- `loadMessages` only returns messages the store has **already seen** — it never queries the server. Fresh sessions start empty and fill up as history sync arrives.
- Keeping every chat and message in memory can use a lot of RAM on busy bots. If that becomes a problem, save snapshots on your own schedule with a limited `messages` list, or build custom storage from the events you receive.

### Store options

```javascript
const store = makeInMemoryStore({
   socket: sock,             // lets the store fetch profile pictures automatically
   chatKey: waChatKey(true), // how chats are ordered (default: pinned > unpinned > timestamp)
   logger                    // custom pino logger
})
```

---

# Socket configuration (`makeWASocket` options)

All options are optional except `auth` (well, even it is optional — but without a saved state you cannot stay logged in). Defaults come from `DEFAULT_CONNECTION_CONFIG`, also exported.

```javascript
import makeWASocket, {
   Browsers,
   fetchLatestBaileysVersion
} from '@eduh_dev021/baileys'

const { version } = await fetchLatestBaileysVersion()

const sock = makeWASocket({
   // --- connection ---------------------------------------------------------
   version,                                  // WA Web version to announce (fetchLatestBaileysVersion)
   browser: Browsers.macOS('Chrome'),        // device shown in linked devices
   auth: state,                              // auth state (see "Saving your session")
   waWebSocketUrl: 'wss://web.whatsapp.com/ws/chat', // server endpoint
   connectTimeoutMs: 60_000,                 // default timeout for internal awaits
   defaultQueryTimeoutMs: undefined,         // timeout for query() calls
   keepAliveIntervalMs: 30_000,              // ping interval
   emitOwnEvents: true,                      // also emit events for your own messages
   fireInitQueries: true,                    // send the initial queries at startup

   // --- behaviour ----------------------------------------------------------
   syncFullHistory: false,                   // ask WhatsApp for ALL history (heavy)
   shouldSyncHistoryMessage: () => true,     // filter which history messages to accept
   markOnlineOnConnect: true,                // show you "online" while connected (false = you appear offline)
   generateHighQualityLinkPreview: false,    // better link previews, more processing
   linkPreviewImageThumbnailWidth: 1920,     // link preview width
   enableAutoSessionRecreation: true,        // auto-rebuild the Signal session on errors
   enableRecentMessageCache: true,           // cache recent messages for retry decryption
   maxMsgRetryCount: 5,                      // max decryption retries per message
   retryRequestDelayMs: 250,                 // base delay between retries

   // --- features you must provide ------------------------------------------
   getMessage: async (key) => undefined,     // return the original message for retries (from your store/DB)
   cachedGroupMetadata: async (jid) => undefined, // serve group metadata from your cache
   shouldIgnoreJid: (jid) => false,          // ignore certain chats entirely
   patchMessageBeforeSending: (msg) => msg,  // transform the message before it is serialized
   printQRInTerminal: false,                 // print QR in terminal (built-in generator)

   // --- caches (all optional; plug your own Map-like objects) ---------------
   mediaCache,                               // link-preview media cache
   msgRetryCounterCache,                     // retry counters
   callOfferCache,                           // pending call offers
   userDevicesCache,                         // user device lists
   placeholderResendCache,                   // placeholder resend state

   // --- advanced -------------------------------------------------------------
   logger,                                   // pino logger (default: silent)
   options: {},                              // default options for media uploads (headers, agent)
   customUploadHosts: [],                    // extra upload hosts
   transactionOpts: { maxCommitRetries: 10, delayBetweenTriesMs: 3000 },
   appStateMacVerification: { patch: true, snapshot: true },
   makeSignalRepository,                     // custom Signal repository factory
   qrTimeout: 60_000                         // how long to keep requesting QR codes
})
```

`Browsers` helps you build the `browser` array: `Browsers.macOS('Chrome')`, `Browsers.ubuntu('Chrome')`, `Browsers.windows('Chrome')`, `Browsers.baileys('...')`, `Browsers.appropriate(...)`. Avoid `Browsers.android(...)` — it is experimental and may misbehave.

---

# WhatsApp IDs (JID and LID)

Every chat and user is addressed by an ID. WhatsApp uses two addressing systems:

- **JID (Jabber ID)** — the classic phone-number-based address.
- **LID (Local ID)** — a newer privacy-preserving identifier. WhatsApp is migrating accounts to LIDs; the library handles the mapping automatically (`lid-mapping.update` event) and accepts either form when sending.

| Target | ID format | Example |
| --- | --- | --- |
| Person (JID) | `[country code][number]@s.whatsapp.net` | `5511999999999@s.whatsapp.net` |
| Person (LID) | `[number]@lid` | `102345678912345@lid` |
| Group | `[id]@g.us` | `120363025857034293@g.us` |
| Channel (newsletter) | `[id]@newsletter` | `120363025857034293@newsletter` |
| Status / stories | fixed | `status@broadcast` |
| Broadcast list | `[creation timestamp]@broadcast` | `1677860500@broadcast` |
| Meta AI bot | `[number]@bot` | `13135550002@bot` |
| Official business | `[number]@business` | — |

The ID must contain **numbers only** — no `+`, spaces, dashes or parentheses, and always with the country code.

Useful helpers (all exported): `jidNormalizedUser` (canonical form), `jidDecode`/`jidEncode`, `areJidsSameUser` (compares a PN against its LID), `isJidGroup`, `isJidNewsletter`, `isLidUser`, `isPnUser`, `isJidBot`, `isJidMetaAI`, `isJidBroadcast`. To check whether a number exists on WhatsApp, use `sock.onWhatsApp(number)`.

When you receive a message, `msg.key.remoteJid` carries the sender ID and `msg.key.participant` the author inside groups. Both may arrive as LID — resolve the phone number with `sock.findUserId(...)` (see [Practical guides](#find-user-id-pnlid)).

---

# Sending messages

Everything below is `await sock.sendMessage(jid, content, extraOptions?)`.

A `jid` looks like:

- `5511999999999@s.whatsapp.net` — a person
- `120363...@g.us` — a group
- `123456789@newsletter` — a channel (newsletter)
- `status@broadcast` — status/stories

Helpers to build and check JIDs: `jidNormalizedUser`, `jidDecode`, `jidEncode`, `areJidsSameUser`, `isJidGroup`, `isJidNewsletter`, `isJidBroadcast`, `isJidStatusBroadcast`, `isJidBot`, `isJidMetaAI`, `isLidUser`, `isPnUser`.

Check if a number has WhatsApp before talking to it:

```javascript
const [result] = await sock.onWhatsApp('5511999999999')
if (result?.exists) console.log('has WhatsApp:', result.jid)
```

The third argument of `sendMessage` carries send options: `{ quoted, edit, ephemeralExpiration, mediaUpload, ... }`. In the examples, `receivedMessage` is a message object you got from `messages.upsert`.

## Text

```javascript
await sock.sendMessage(jid, { text: 'Hello from my bot!' })
```

With formatting and a link preview:

```javascript
await sock.sendMessage(jid, {
   text: '*bold* _italic_ ~strikethrough~ ```code```\nhttps://example.com'
})
```

Replying to a specific message:

```javascript
await sock.sendMessage(jid, { text: 'Great message!' }, { quoted: receivedMessage })
```

Mentions — individual or everyone:

```javascript
await sock.sendMessage(jid, {
   text: 'Hey @5511999999999, look at this!',
   mentions: ['5511999999999@s.whatsapp.net']
})

// mention everyone without listing them
await sock.sendMessage(jid, { text: 'Attention, everyone!', mentionAll: true })
```

## Rich messages (code blocks, tables, LaTeX)

Send WhatsApp's native "AI-style" rich messages — code blocks with syntax highlighting, content carousels, LaTeX and citation links:

```javascript
// a syntax-highlighted code block
await sock.sendMessage(jid, {
   code: 'const hello = () => console.log("hi!")',
   language: 'javascript'
})

// a rich composite: header, code, table, image, LaTeX and footer
await sock.sendMessage(jid, {
   title: 'Bot report',
   richResponse: [
      { text: 'Uptime: 24h, 0 errors.' },
      { code: 'for (i = 0; i < 10; i++) print(i)', language: 'python' },
      { table: [{ name: 'Alice', score: 10 }, { name: 'Bob', score: 9 }], title: 'Scores' },
      { inlineImage: 'https://example.com/chart.png', imageText: 'Traffic chart', alignment: 'CENTER' },
      { latex: ['E = mc^2'], text: 'Relativity' }
   ],
   headerText: '📊 Daily summary',
   footerText: 'Generated by my bot'
})

// citation-style links
await sock.sendMessage(jid, {
   links: [
      { text: 'Source of the news', url: 'https://example.com/article' }
   ],
   contentText: 'The article above says everything.'
})
```

## Sending media

For media, pass a **Buffer**, a **local file path**, or a **URL** in the `url` field of each type.

```javascript
// image
await sock.sendMessage(jid, { image: { url: './photo.jpg' }, caption: 'Check this out!' })

// video (gifPlayback: true renders as looping GIF preview)
await sock.sendMessage(jid, { video: { url: './clip.mp4' }, caption: 'Watch this', gifPlayback: false })

// video note (round, like the phone app)
await sock.sendMessage(jid, { ptv: true, video: { url: './note.mp4' } })

// voice note (ptt: true shows the waveform bubble)
await sock.sendMessage(jid, {
   audio: { url: './voice.ogg' },
   mimetype: 'audio/ogg; codecs=opus',
   ptt: true
})

// document
await sock.sendMessage(jid, {
   document: { url: './report.pdf' },
   mimetype: 'application/pdf',
   fileName: 'Quarterly report.pdf'
})

// single sticker
await sock.sendMessage(jid, { sticker: { url: './funny.webp' } })
```

### Sticker pack

Send a whole sticker pack in one message (up to 60 stickers — WhatsApp's limit):

```javascript
import fs from 'node:fs'

await sock.sendMessage(jid, {
   stickers: [
      { sticker: fs.readFileSync('./s1.webp'), emoji: '😎' },
      { sticker: fs.readFileSync('./s2.webp'), emoji: '🎉' }
   ],
   cover: fs.readFileSync('./cover.webp'), // required
   name: 'My Pack',
   publisher: 'My Bot',
   description: 'Stickers made by my bot'
})
```

### Album

Send an album (2+ media) as one collection message:

```javascript
await sock.sendMessage(jid, {
   album: [
      { image: { url: './photo1.jpg' }, caption: 'First' },
      { image: { url: './photo2.jpg' }, caption: 'Second' },
      { video: { url: './clip.mp4' }, caption: 'And a video' }
   ]
})
```

The value must be an **array** with at least two image/video items; each item is a normal media payload with its own caption.

## Contact, location, event

```javascript
// one contact (or contactsArrayMessage for several — pass an array in `contacts`)
await sock.sendMessage(jid, {
   contacts: {
      displayName: 'Maria',
      contacts: [{ vcard: 'BEGIN:VCARD\nVERSION:3.0\nFN:Maria\nTEL;type=CELL:+5511999999999\nEND:VCARD' }]
   }
})

// location
await sock.sendMessage(jid, {
   location: { degreesLatitude: -23.5505, degreesLongitude: -46.6333 }
})

// calendar event (dates are JavaScript Date objects)
await sock.sendMessage(jid, {
   event: {
      name: 'Team meeting',
      description: 'Weekly sync',
      startDate: new Date(Date.now() + 3_600_000),
      endDate: new Date(Date.now() + 7_200_000),
      isCancelled: false,
      extraGuestsAllowed: true,
      call: 'video' // optional: also creates a WhatsApp call link
   }
})
```

## Other message options

All the extra toggles below are plain fields on the message content:

```javascript
import fs from 'node:fs'

// AI icon — shows the Meta AI badge next to the message (private chats only)
await sock.sendMessage(jid, {
   image: { url: './photo.jpg' },
   caption: 'Answered by AI',
   ai: true
})

// spoiler — blurs the media until the user taps it
await sock.sendMessage(jid, {
   image: { url: './surprise.jpg' },
   caption: 'Tap to reveal',
   spoiler: true
})

// view once — media disappears after being opened (three protocol variants)
await sock.sendMessage(jid, { image: { url: './secret.jpg' }, viewOnce: true })
await sock.sendMessage(jid, { image: { url: './secret.jpg' }, viewOnceV2: true })
await sock.sendMessage(jid, { image: { url: './secret.jpg' }, viewOnceV2Extension: true })

// ephemeral — wraps the message in the chat's disappearing timer
await sock.sendMessage(jid, { text: 'This one expires', ephemeral: true })

// group status — posts to the group's status instead of the chat timeline (groups only)
await sock.sendMessage(groupJid, {
   image: { url: './news.jpg' },
   caption: 'Group announcement',
   groupStatus: true
})

// lottie sticker — animated sticker backed by a Lottie file
await sock.sendMessage(jid, { sticker: { url: './animated.webp' }, isLottie: true })

// secure Meta service label — flags the message for business labeling
await sock.sendMessage(jid, { text: 'Categorized message', secureMetaServiceLabel: true })

// raw — build the full proto yourself and send it untouched (advanced)
await sock.sendMessage(jid, {
   extendedTextMessage: {
      text: 'Built manually from the raw WhatsApp proto structure',
      contextInfo: {
         externalAdReply: {
            title: 'My bot',
            thumbnail: fs.readFileSync('./thumb.jpg'),
            sourceApp: 'whatsapp',
            showAdAttribution: true,
            mediaType: 1
         }
      }
   },
   raw: true
}, { quoted: receivedMessage })
```

Notes:

- `viewOnce`/`viewOnceV2`/`viewOnceV2Extension` are three generations of the same protocol feature; `viewOnceV2` is what current WhatsApp clients send.
- `ephemeral: true` wraps an individual message in the chat's configured disappearing duration — the chat itself must have a timer set (`disappearingMessagesInChat` or `sock.groupToggleEphemeral`).
- `ai: true` only renders the AI badge in private chats.
- `groupStatus: true` only works in groups.

## Status mentions

Sending to `status@broadcast` posts a status. Pass `mentions` and the library automatically notifies each mentioned contact (the protocol `statusMentionMessage`), so the status shows up for them with a mention marker:

```javascript
await sock.sendMessage('status@broadcast', {
   image: { url: './promo.jpg' },
   caption: 'Big news for @5511999999999 and @5511888888888!',
   mentions: ['5511999999999@s.whatsapp.net', '5511888888888@s.whatsapp.net'],
   backgroundColor: '#7CFC00',
   font: 1
})
```

When you send the status to an **array of jids**, each contact receives the mention notification as well:

```javascript
await sock.sendMessage(['5511999999999@s.whatsapp.net', '5511888888888@s.whatsapp.net'], {
   text: 'Check out my status!'
})
```

## Commerce messages

```javascript
// product card
await sock.sendMessage(jid, {
   product: {
      productImage: imageBuffer,
      productId: '123456789',
      title: 'Nice shoes',
      description: 'Size 42, blue',
      currencyCode: 'BRL',
      priceAmount1000: 29990, // price × 1000
      retailerId: 'store-001',
      url: 'https://mystore.com/item/123456789'
   }
})

// order (thumbnail must be a Buffer)
import fs from 'node:fs'
await sock.sendMessage(jid, {
   orderText: 'Order #123 — 2 items',
   thumbnail: fs.readFileSync('./thumb.jpg'),
   orderTitle: 'My Store',
   totalAmount1000: 29990,
   totalCurrencyCode: 'BRL',
   itemCount: 2
})

// invoice note (must accompany an image or document message)
await sock.sendMessage(jid, {
   document: { url: './invoice.pdf' },
   mimetype: 'application/pdf',
   invoiceNote: 'Invoice #42 for services'
})

// payment request (note: only text or sticker messages can be the note)
await sock.sendMessage(jid, {
   requestPaymentFrom: '5511999999999@s.whatsapp.net',
   text: 'Please pay for the service',
   amount1000: 50000,
   currencyCodeIso4217: 'BRL'
})

// payment invite
await sock.sendMessage(jid, { paymentInviteServiceType: 'fbpay' })
```

## Poll

```javascript
// create a poll
await sock.sendMessage(jid, {
   poll: {
      name: 'Pizza or burger?',
      values: ['Pizza', 'Burger'],
      selectableCount: 1
   }
})

// send a result snapshot (e.g. after aggregating votes yourself)
await sock.sendMessage(jid, {
   pollResult: {
      name: 'Pizza or burger?',
      votes: [
         { name: 'Pizza', voteCount: 12 },
         { name: 'Burger', voteCount: 3 }
      ]
   }
})
```

To **read votes as they arrive**, listen to `messages.update` and use `getAggregateVotesInPollMessage` (shown in the events section).

## Phone number and privacy messages

```javascript
// protocol-type messages (no content, they toggle things on the chat)
await sock.sendMessage(jid, { sharePhoneNumber: true })       // share your number with the contact
await sock.sendMessage(jid, { requestPhoneNumber: true })     // ask the contact to share theirs
await sock.sendMessage(jid, { disappearingMessagesInChat: 604800 }) // seconds: 0/off, 86400, 604800, 7776000
await sock.sendMessage(jid, { limitSharing: true })           // restrict forwarding of this chat's content

// send any raw proto content you build yourself (advanced)
await sock.sendMessage(jid, { raw: myMessageProto })
```

## Interactive messages

> Compatibility note from the protocol: hydrated templates render on WhatsApp Web/Desktop and iOS; on Android they currently appear only in newsletters. Plain buttons and lists work everywhere.

### Buttons

Three button styles, selected by the fields you provide:

```javascript
// 1) simple response buttons
await sock.sendMessage(jid, {
   text: 'What do you want to do?',
   footer: 'My bot',
   buttons: [
      { id: '#help', text: 'Help' },
      { id: '#menu', text: 'Menu' }
   ]
})

// 2) a button that opens a single-select list
await sock.sendMessage(jid, {
   text: 'Pick a city',
   buttons: [{
      text: 'Cities',
      sections: [
         { title: 'South', rows: [{ title: 'Curitiba', id: 'city-cwb' }, { title: 'Floripa', id: 'city-fln' }] },
         { title: 'North', rows: [{ title: 'Manaus', id: 'city-mao' }] }
      ]
   }]
})

// 3) native-flow buttons (catalog, copy code, call, etc.)
await sock.sendMessage(jid, {
   text: 'Limited offer!',
   footer: 'My Store',
   nativeFlow: [
      { name: 'cta_copy', paramsJson: JSON.stringify({ display_text: 'Copy code', copy_code: 'PROMO10' }) },
      { name: 'cta_url',  paramsJson: JSON.stringify({ display_text: 'Visit site', url: 'https://example.com' }) }
   ],
   offerText: '10% OFF',        // optional: renders the "limited time offer" panel
   offerCode: 'PROMO10',
   offerUrl: 'https://example.com'
})
```

#### Declarative buttons (recommended)

Instead of hand-writing the raw `nativeFlow` JSON, describe **what** each button
does with a `type` and let the library translate it to the correct native payload
via `translateButtonToNative` / `buildNativeButtons`. This is the engine behind the
Jurandir-Mini buttons system and it covers **every** WhatsApp button type.

```javascript
import { buildNativeButtons } from '@eduh_dev021/baileys'

const buttons = buildNativeButtons([
  { type: 'reply', text: 'Sim', id: 'sim' },
  { type: 'url',   text: 'Site',  url: 'https://example.com' },
  { type: 'copy',  text: 'Copiar', payload: 'PROMO10' },
])

// sock.sendMessage(jid, { text: '...', nativeFlow: buttons })
```

Every supported type, with the field it reads:

| `type` | Native node | Key fields |
| --- | --- | --- |
| `reply` | `quick_reply` | `text`, `id`, `icon` |
| `list` | `single_select` | `text`, `sections`, `icon` |
| `url` | `cta_url` | `text`, `url`, `icon` |
| `webview` / `open_webview` | `open_webview` | `title`, `displayText`, `url`, `link`, `inAppWebview`, `fullScreen`, `icon` |
| `copy` | `cta_copy` | `text`, `payload`, `id`, `icon` |
| `call` | `cta_call` | `text`, `phone`, `icon` |
| `catalog` | `cta_catalog` | `text`, `phone`, `icon` |
| `location` | `send_location` | `text`, `icon` |
| `pix` | `review_and_pay` | `referenceId`, `amount`, `pixCode`, `merchantName`, `pixKey`, `keyType` |
| `pix_static` | `payment_info` | `referenceId`, `amount`, `itemName`, `merchantName`, `pixKey`, `keyType` |
| `boleto` | `review_and_pay` | `referenceId`, `amount`, `digitableLine` |
| `payment_link` | `review_and_pay` | `referenceId`, `amount`, `uri` |
| `card_pay` | `review_and_pay` | `referenceId`, `amount`, `lastFourDigits`, `credentialId` |
| `reminder` / `cta_reminder` | `cta_reminder` | `text`, `icon` |
| `cancel_reminder` / `cta_cancel_reminder` | `cta_cancel_reminder` | `text`, `icon` |
| `mpm` | `mpm` | `text`, `sections`, `icon` |
| `catalog_message` | `catalog_message` | `text`, `businessPhoneNumber`, `icon` |
| `view_catalog` | `automated_greeting_message_view_catalog` | `text`, `businessPhoneNumber`, `catalogProductId`, `icon` |
| `transaction_details` | `wa_payment_transaction_details` | `text`, `transactionId`, `icon` |
| `galaxy` / `galaxy_message` / `flow` | `galaxy_message` | `flowCta`, `flowAction`, `flowMessageVersion`, `flowScreen`, `flowPayload`, `icon` |

Payments use **BRL** and produce the `review_and_pay` / `payment_info` nodes with
the correct `total_amount` (converted to cents) and `payment_settings` for each
method (dynamic/static Pix, boleto, payment link, offsite card).

#### Galaxy Flow

Galaxy Flows are WhatsApp's rich, in-app mini-apps. The library builds the
`galaxy_message` payload (renders perfectly on iOS and Android):

```javascript
await sock.sendMessage(jid, {
   text: 'Leia os termos e aceite para continuar.',
   footer: 'Jurandir',
   nativeFlow: [{
      type: 'galaxy',
      flowCta: 'Aceitar',
      flowAction: 'navigate',
      flowMessageVersion: '3',
      flowScreen: 'TERMS_SCREEN',
      flowPayload: { documentId: 'termos-2026', locale: 'pt_BR' }
   }]
})
```

`flowCta` is the button label, `flowScreen` the screen to open, and `flowPayload`
free-form data forwarded to the flow. Omit `flowScreen` to use the default
`SATISFACTION_SCREEN`.

#### Reactions with a sticker

React to a message with a **sticker** instead of an emoji. The library builds the
`STICKER_ANNOTATION` association (message context + associated child sticker), so
the sticker renders attached to the target message — including animated stickers
(with first-frame sidecar):

```javascript
import { sendStickerReaction } from '@eduh_dev021/baileys'

// target: the message to react to; sticker: Buffer, file path, URL or uploaded node
await sendStickerReaction(sock, jid, targetMessage, './sticker.webp', {
   count: 1,        // up to 20 sticker reactions per message
   delayMs: 300,   // throttle between multiple reactions
   isAnimated: true // optional; auto-detected from the WebP if omitted
})
```

`target` accepts `{ key }` or `{ id, remoteJid, fromMe, participant? }`. The sticker
source can be a `Buffer`, a file path, an HTTP(S) URL, or an already-uploaded
`IStickerMessage` (with `fileSha256` + `mediaKey`).

#### Audio sticker (figurinha com som)

Send a **sticker with sound** — a WebP sticker that plays an OGG/Opus audio when
tapped. The library builds the `audioStickerMessage` envelope (a `FutureProofMessage`
wrapping the sticker, with the audio nested inside the `stickerMessage`), uploading
both the sticker and the audio through the normal media pipeline:

```javascript
import { sendAudioSticker } from '@eduh_dev021/baileys'

await sendAudioSticker(sock, jid, {
   stickerBuffer,   // Buffer (image/webp, ≤ 2 MiB) — obrigatório
   audioBuffer,     // Buffer (OGG/Opus) — obrigatório
   audioSeconds,    // real duration in seconds (avoids truncation)
   isAnimated,      // optional; auto-detected from the WebP ANMF chunk
   width, height    // optional; auto-detected from the WebP
}, quotedRef)        // optional { key:{id,participant?,remoteJid?}, message }
```

The audio **must** be OGG/Opus (`OggS` header). The sticker and audio are uploaded
independently, then assembled into the `audioStickerMessage` payload and relayed with
an explicit 32-byte `messageSecret`. Animated stickers get their `firstFrameLength`
and `firstFrameSidecar` computed automatically so WhatsApp renders them correctly.

To read a received audio sticker back into buffers:

```javascript
import { isAudioSticker, extractAudioSticker, downloadAudioSticker } from '@eduh_dev021/baileys'

if (isAudioSticker(msg.message)) {
   const { stickerMessage, audioMessage } = extractAudioSticker(msg.message)
   const { stickerBuffer, audioBuffer, seconds } = await downloadAudioSticker(msg.message, { sock })
}
```

> Note: the fork's WAProto doesn't declare the `audioStickerMessage` (field 134) or
> `StickerMessage.audioMessage` (field 26) fields, so on the wire they travel as raw
> `$unknowns` bytes. Sending works out of the box; for receiving, pass the message
> object that still carries `$unknowns` (or raw message bytes) to `extractAudioSticker`.


### List (classic section list)

```javascript
await sock.sendMessage(jid, {
   text: 'Pick an option',
   title: 'Options',
   footer: 'My bot',
   buttonText: 'Choose',
   sections: [{
      title: 'Main',
      rows: [
         { title: 'Help', id: '#help', description: 'How to use' },
         { title: 'Menu', id: '#menu', description: 'Show the menu' }
      ]
   }]
})
```

### Template buttons (hydrated template)

```javascript
await sock.sendMessage(jid, {
   text: 'Welcome! Choose an action:',
   footer: 'My bot',
   templateButtons: [
      { index: 0, id: '#help', text: 'Help' },
      { index: 1, url: 'https://example.com', text: 'Visit us' },
      { index: 2, call: '+5511999999999', text: 'Call us' }
   ]
})
```

### Carousel (cards)

```javascript
await sock.sendMessage(jid, {
   text: 'Check our products',
   footer: 'My Store',
   cards: [
      {
         image: { url: './product1.jpg' },
         body: 'Great shoes',
         footer: 'R$ 299,90',
         nativeFlow: [
            { name: 'cta_url', paramsJson: JSON.stringify({ display_text: 'Buy', url: 'https://mystore.com/1' }) }
         ]
      },
      {
         image: { url: './product2.jpg' },
         body: 'Blue shirt',
         footer: 'R$ 99,90',
         nativeFlow: [
            { name: 'cta_url', paramsJson: JSON.stringify({ display_text: 'Buy', url: 'https://mystore.com/2' }) }
         ]
      }
   ]
})
```

### Button, list and flow replies

Send the "response" message a user would send after tapping — useful when relaying flows or building tests:

```javascript
// response to a simple/template button
await sock.sendMessage(jid, { buttonReply: { id: '#help', displayText: 'Help', index: 0 }, type: 'template' })
await sock.sendMessage(jid, { buttonReply: { id: '#help', displayText: 'Help' }, type: 'plain' })

// response to a list row
await sock.sendMessage(jid, { listReply: { id: '#menu', title: 'Menu', description: 'Show the menu' } })

// response to a native-flow interaction
await sock.sendMessage(jid, {
   flowReply: { name: 'menu', paramsJson: JSON.stringify({ choice: 'pizza' }), text: 'Chosen!' }
})
```

### Ad replies (link cards)

Attach a rich link card to (almost) any message — `thumbnail` must be a Buffer:

```javascript
import fs from 'node:fs'

await sock.sendMessage(jid, {
   text: 'Read this!',
   externalAdReply: {
      title: 'My article',
      body: 'A great read',
      url: 'https://example.com/article',
      thumbnail: fs.readFileSync('./thumb.jpg'),
      mediaType: 1,
      largeThumbnail: true,
      sourceUrl: 'https://example.com/article'
   }
})
```

## Modifying messages

```javascript
// delete for everyone
await sock.sendMessage(jid, { delete: receivedMessage.key })

// delete only for yourself
await sock.sendMessage(jid, { delete: { ...receivedMessage.key, fromMe: false, participant: sock.user.id } })

// edit a sent message
await sock.sendMessage(jid, { text: 'Corrected text' }, { edit: sentMessage.key })

// reaction
await sock.sendMessage(jid, { react: { text: '👍', key: receivedMessage.key } })

// pin (time in seconds: 86400 = 1 day, 604800 = 1 week; type 0 unpins)
await sock.sendMessage(jid, { pin: { type: 1, key: receivedMessage.key, time: 86400 } })

// keep a message in the chat
await sock.sendMessage(jid, { keep: { type: 1, key: receivedMessage.key, time: 0 } })

// forward
await sock.sendMessage(jid, { forward: receivedMessage })
```

---

# Receiving messages and downloading media

```javascript
import { getContentType, normalizeMessageContent } from '@eduh_dev021/baileys'

sock.ev.on('messages.upsert', async ({ messages, type }) => {
   // type: 'notify' (new messages), 'append' (history), etc.
   for (const msg of messages) {
      if (!msg.message) continue
      const content = normalizeMessageContent(msg.message) // unwraps view-once, ephemeral, replies, forwards
      const contentType = getContentType(content)          // 'conversation', 'imageMessage', ...
      console.log('from:', msg.key.remoteJid, 'type:', contentType)

      const body =
         content.conversation ||
         content.extendedTextMessage?.text ||
         content.imageMessage?.caption ||
         ''
   }
})
```

### Download any media

```javascript
import { downloadContentFromMessage } from '@eduh_dev021/baileys'

async function mediaToBuffer(messageContent, mediaType) {
   // mediaType: 'image' | 'video' | 'audio' | 'document' | 'sticker' | ...
   const stream = await downloadContentFromMessage(messageContent, mediaType)
   const chunks = []
   for await (const chunk of stream) chunks.push(chunk)
   return Buffer.concat(chunks)
}

// example: save an image someone sent
sock.ev.on('messages.upsert', async ({ messages }) => {
   const msg = messages[0]
   if (msg.message?.imageMessage) {
      const buffer = await mediaToBuffer(msg.message.imageMessage, 'image')
      require('fs').writeFileSync('./download.jpg', buffer)
   }
})
```

One-shot helper for a whole message object:

```javascript
import { downloadMediaMessage } from '@eduh_dev021/baileys'

const buffer = await downloadMediaMessage(msg, 'buffer', {}, {
   reuploadRequest: sock.updateMediaMessage // auto re-request if the media expired
})
```

If a download fails because WhatsApp expired the media, `sock.updateMediaMessage(msg)` re-requests it and updates the message object.

### Reading poll votes

```javascript
import { getAggregateVotesInPollMessage } from '@eduh_dev021/baileys'

sock.ev.on('messages.update', (updates) => {
   for (const { key, update } of updates) {
      if (update.pollUpdates) {
         const poll = /* the original poll message, from your store */
         const votes = getAggregateVotesInPollMessage({
            message: poll?.message,
            pollUpdates: update.pollUpdates
         })
         console.log('poll votes:', votes)
      }
   }
})
```

---

# Everything you can listen to (events)

All events fire on `sock.ev` (`sock.ev.on(event, handler)`). The full list, grouped:

### Connection and session

| Event | When it fires |
| --- | --- |
| `connection.update` | Connection state changed (`connecting`, `open`, `close`, QR received, logged out) |
| `creds.update` | Login credentials changed — save them here with `saveCreds` |

### Messages

| Event | When it fires |
| --- | --- |
| `messages.upsert` | New message arrived (`type: 'notify'`) or history was loaded (`type: 'append'`) |
| `messages.update` | Message edited, status changed (delivered/read), poll vote, media re-upload |
| `messages.delete` | Message removed (for a chat or by keys) |
| `messages.reaction` | Reaction added/removed on a message |
| `messages.media-update` | Media message updated (e.g. re-upload result) |
| `message-receipt.update` | Delivery/read receipts (bulk) |
| `messaging-history.set` | History sync batch: chats, contacts, messages |
| `messaging-history.status` | History sync progress state |

### Chats and contacts

| Event | When it fires |
| --- | --- |
| `chats.upsert` | New chat appeared |
| `chats.update` | Chat changed (unread count, pinned, archived, muted...) |
| `chats.delete` | Chat deleted |
| `chats.lock` | Chat lock (protected chats) changed |
| `contacts.upsert` | New/updated contacts |
| `contacts.update` | Contact info changed (photo, name) |
| `settings.update` | Account settings changed (e.g. push name) |
| `blocklist.update` | Someone was blocked/unblocked |
| `presence.update` | Contact online/typing/recording status |
| `lid-mapping.update` | Phone-number ↔ LID mapping updated |
| `message-capping.update` | Per-chat message capping settings changed |

### Groups and calls

| Event | When it fires |
| --- | --- |
| `groups.upsert` | You were added to a group |
| `groups.update` | Group info changed (subject, photo, settings) |
| `group-participants.update` | Someone joined/left/promoted/demoted |
| `group.join-request` | Someone requested to join a group |
| `call` | Incoming call offer — accept or `sock.rejectCall` |

### Newsletters (channels)

| Event | When it fires |
| --- | --- |
| `newsletter-participants.update` | Subscriber count changed |
| `newsletter-settings.update` | Channel settings changed |
| `newsletter.reaction` | Reaction on a channel post |
| `newsletter.view` | Message viewed in the channel |

### Labels

| Event | When it fires |
| --- | --- |
| `labels.edit` | A label was created/edited/deleted |
| `labels.association` | A label was applied/removed on a chat or message |

Example — reject calls and log typing:

```javascript
sock.ev.on('call', async (calls) => {
   for (const call of calls) {
      if (call.status === 'offer') await sock.rejectCall(call.id, call.from)
   }
})

sock.ev.on('presence.update', ({ id, presences }) => {
   for (const jid in presences) {
      const p = presences[jid]
      if (p.lastKnownPresence === 'composing') console.log(jid, 'is typing in', id)
   }
})
```

---

# Complete socket method reference

Everything below is a method on the socket object returned by `makeWASocket`.

### Connection and pairing

| Method | What it does |
| --- | --- |
| `sock.ev` | Event emitter — all events above |
| `sock.authState` | Current `creds` and `keys` |
| `sock.user` | Your logged-in user (`id`, `name`, `lid`) |
| `sock.ws` | The underlying WebSocket client |
| `sock.requestPairingCode(phone, customCode?)` | Get a pairing code for a phone number |
| `sock.logout()` | Log out and invalidate the session |
| `sock.end(error?)` | Close the connection |
| `sock.query(node)` | Send a raw protocol query and await the response |
| `sock.sendNode(node)` | Send a raw node without waiting |
| `sock.waitForConnectionUpdate(check)` | Wait until a connection condition is true |
| `sock.onUnexpectedError(error)` | Report an error to the socket error handler |

### Presence, profile and privacy

| Method | What it does |
| --- | --- |
| `sock.sendPresenceUpdate(type, toJid?)` | `available`, `unavailable`, `composing`, `recording`, `paused` |
| `sock.presenceSubscribe(jid)` | Receive presence updates of a contact |
| `sock.updateProfileName(name)` | Change your profile name |
| `sock.updateProfileStatus(status)` | Change your about/status text |
| `sock.updateProfilePicture(jid, image?)` | Set a new photo (`Buffer`); `undefined` removes it |
| `sock.removeProfilePicture(jid)` | Remove your profile photo |
| `sock.profilePictureUrl(jid, type?)` | Get the picture URL (`'preview'` or `'image'`) |
| `sock.fetchStatus(jid)` | Read someone's about text |
| `sock.fetchBlocklist()` | List blocked numbers |
| `sock.updateBlockStatus(jid, action)` | `'block'` or `'unblock'` |
| `sock.fetchPrivacySettings(disposable?)` | Read your privacy settings |
| `sock.updateLastSeenPrivacy(value)` | who sees last seen: `'all'` / `'contacts'` / `'contact_blacklist'` / `'none'` |
| `sock.updateOnlinePrivacy(value)` | who sees you online |
| `sock.updateProfilePicturePrivacy(value)` | who sees your photo |
| `sock.updateStatusPrivacy(value)` | who sees your status |
| `sock.updateReadReceiptsPrivacy(value)` | who sees read receipts |
| `sock.updateGroupsAddPrivacy(value)` | who can add you to groups |
| `sock.updateCallPrivacy(value)` | who can call you |
| `sock.updateMessagesPrivacy(value)` | who can message you |
| `sock.updateDisableLinkPreviewsPrivacy(value)` | link previews on/off |
| `sock.updateDefaultDisappearingMode({ ephemeralDuration })` | default disappearing timer |

### Chats

| Method | What it does |
| --- | --- |
| `sock.chatModify(mod, jid)` | Change a chat — see below |
| `sock.fetchDisappearingDuration(jid)` | Current disappearing timer of a chat |
| `sock.fetchNewChatMessageCap(jid)` | Message capping info for a chat |
| `sock.fetchAccountReachoutTimelock()` | Account reachout timelock state |
| `sock.findUserId(...)` | Resolve a user id (LID helpers) |
| `sock.addOrEditContact(jid, contact)` | Save a contact locally |
| `sock.removeContact(jid)` | Remove a saved contact |
| `sock.addChatLabel(jid, labelId)` / `sock.removeChatLabel(jid, labelId)` | Label a chat |
| `sock.addMessageLabel(jid, labelId, messageId)` / `sock.removeMessageLabel(...)` | Label a message |
| `sock.star(jid, messages, starred)` | Star/unstar messages |
| `sock.addOrEditQuickReply(...)` / `sock.removeQuickReply(...)` | Manage quick replies |
| `sock.cleanDirtyBits(type, from?)` | Sync dirty state |

Supported `chatModify` actions (`mod` object):

```javascript
await sock.chatModify({ archive: true }, jid)                       // archive / unarchive (false)
await sock.chatModify({ mute: Date.now() + 86400_000 }, jid)        // mute until a timestamp (ms); 0 = unmute
await sock.chatModify({ pin: true }, jid)                           // pin / unpin
await sock.chatModify({ markRead: false, readMessages: [key] }, jid) // mark read/unread
await sock.chatModify({ clear: true }, jid)                         // clear messages
await sock.chatModify({ delete: true }, jid)                        // delete the chat
await sock.chatModify({ deleteForMe: { keyIds: [key.id], timestamp: Date.now() } }, jid)
await sock.chatModify({ star: { messages: [{ id: key.id, star: true }], timestamp: Date.now() } }, jid)
await sock.chatModify({ contact: { name: 'Maria' } }, jid)          // save contact
await sock.chatModify({ disableLinkPreviews: true }, jid)
await sock.chatModify({ pushNameSetting: 'Name' }, jid)
await sock.chatModify({ quickReply: { ... } }, jid)
await sock.chatModify({ addChatLabel: labelId }, jid)
await sock.chatModify({ removeChatLabel: labelId }, jid)
await sock.chatModify({ addMessageLabel: labelId }, jid)            // + message/messageKey fields
await sock.chatModify({ removeMessageLabel: labelId }, jid)
```

### Media and uploads

| Method | What it does |
| --- | --- |
| `sock.getMediaHost(...)` | Resolve a media upload host |
| `sock.updateMediaMessage(message)` | Re-request expired media and update the message |
| `sock.uploadPreKeys(count?)` | Upload new pre-keys to the server |
| `sock.rotateSignedPreKey(...)` | Rotate your signed pre-key |

### Groups

| Method | What it does |
| --- | --- |
| `sock.groupCreate(subject, participants)` | Create a group |
| `sock.groupLeave(jid)` | Leave a group |
| `sock.groupUpdateSubject(jid, subject)` | Rename |
| `sock.groupUpdateDescription(jid, description)` | Change description |
| `sock.groupParticipantsUpdate(jid, jids, action)` | `'add'`, `'remove'`, `'promote'`, `'demote'` |
| `sock.groupRequestParticipantsList(jid)` | Pending join requests |
| `sock.groupRequestParticipantsUpdate(jid, jids, action)` | `'approve'` or `'reject'` |
| `sock.groupInviteCode(jid)` | Current invite code |
| `sock.groupRevokeInvite(jid)` | Reset the invite code |
| `sock.groupAcceptInvite(code)` | Join by invite code |
| `sock.groupGetInviteInfo(code)` | Info about an invite code |
| `sock.groupAcceptInviteV4(jid, code)` | Join using an invite message |
| `sock.groupRevokeInviteV4(jid, code)` | Revoke a sent invite |
| `sock.groupToggleEphemeral(jid, duration)` | Disappearing messages timer (0 = off) |
| `sock.groupSettingUpdate(jid, setting)` | `'announcement'`, `'not_announcement'`, `'locked'`, `'unlocked'` |
| `sock.groupMemberAddMode(jid, mode)` | `'admin_add'` or `'all_member_add'` |
| `sock.groupJoinApprovalMode(jid, mode)` | `'on'` or `'off'` |
| `sock.groupMetadata(jid)` | Full group info |

### Communities (groups with linked groups)

| Method | What it does |
| --- | --- |
| `sock.communityCreate(name, description?)` | Create a community |
| `sock.communityCreateGroup(...)` | Create a group inside a community |
| `sock.communityLeave(id)` | Leave/delete |
| `sock.communityUpdateSubject(id, subject)` | Rename |
| `sock.communityUpdateDescription(id, description)` | Change description |
| `sock.communityLinkGroup(id, groupJid)` | Link a group to the community |
| `sock.communityUnlinkGroup(id, groupJid)` | Unlink |
| `sock.communityFetchLinkedGroups(id)` | List linked groups |
| `sock.communityParticipantsUpdate(id, jids, action)` | Manage members |
| `sock.communityRequestParticipantsList/Update(...)` | Manage join requests |
| `sock.communityInviteCode(id)` / `sock.communityRevokeInvite(id)` | Invite codes |
| `sock.communityAcceptInvite(code)` / `sock.communityAcceptInviteV4(...)` | Join |
| `sock.communityGetInviteInfo(code)` / `sock.communityRevokeInviteV4(...)` | Invite info |
| `sock.communityToggleEphemeral(id, duration)` | Disappearing messages |
| `sock.communitySettingUpdate(id, setting)` | Announcement mode |
| `sock.communityMemberAddMode(id, mode)` | Who can add members |
| `sock.communityJoinApprovalMode(id, mode)` | Approval mode |
| `sock.addressingMode(id)` | Community addressing mode |

### Newsletters (channels)

| Method | What it does |
| --- | --- |
| `sock.newsletterCreate(name, description?)` | Create a channel |
| `sock.newsletterDelete(id)` | Delete a channel |
| `sock.newsletterUpdateName(id, name)` | Rename |
| `sock.newsletterUpdateDescription(id, description)` | Change description |
| `sock.newsletterUpdatePicture(id, picture)` | Set picture |
| `sock.newsletterRemovePicture(id)` | Remove picture |
| `sock.newsletterFollow(id)` | Follow a channel |
| `sock.newsletterUnfollow(id)` | Unfollow |
| `sock.newsletterMute(id)` / `sock.newsletterUnmute(id)` | Mute/unmute |
| `sock.newsletterMetadata(type, key)` | `'invite'` or `'jid'` lookup |
| `sock.newsletterSubscribed(id)` | Subscription state |
| `sock.newsletterSubscribers(id)` | Subscriber list |
| `sock.newsletterAdminCount(id)` | Number of admins |
| `sock.newsletterChangeOwner(id, jid)` | Transfer ownership |
| `sock.newsletterDemote(id, jid)` | Demote an admin |
| `sock.newsletterReactMessage(id, messageId, emoji)` | React to a post |
| `sock.newsletterFetchMessages(type, key, count?)` | Fetch posts |
| `sock.subscribeNewsletterUpdates(id)` | Live updates for a channel |

### Business, calls and advanced queries

| Method | What it does |
| --- | --- |
| `sock.getBusinessProfile(jid)` | Business profile info |
| `sock.updateBusinessProfile(profile)` | Update your business profile |
| `sock.rejectCall(callId, callFrom)` | Reject an incoming call |
| `sock.createCallLink(...)` | Create a WhatsApp call link |
| `sock.getBotListV2(...)` | List Meta AI bots |
| `sock.executeUSyncQuery(query)` | Run a USync query (users, devices, status, LIDs) |
| `sock.onWhatsApp(numbers)` | Check which numbers have WhatsApp |
| `sock.serverProps` | Server properties |
| `sock.resyncAppState(patches, isInitial)` | Force an app-state re-sync |
| `sock.fetchMessageHistory(count)` | Request more history |
| `sock.requestPlaceholderResend(messageKey)` | Force placeholder resend for undecrypted messages |
| `sock.getCachedMessage(messageKey)` | Read the recent-message cache |
| `sock.messageRetryManager` | The retry manager instance |
| `sock.sendRetryRequest(...)` / `sock.sendMessageAck(...)` | Low-level receipt/ack helpers |
| `sock.upsertMessage(...)` | Inject a message locally (advanced) |
| `sock.appPatch(...)` | Apply an app-state patch (advanced) |
| `sock.sendWAMBuffer(...)` / `sock.wamBuffer` | WhatsApp Analytics events (advanced) |
| `sock.digestKeyBundle(...)` | Process a server key bundle |
| `sock.sendUnifiedSession(...)` | Unified session ping (advanced) |

---

# Practical guides

## Find User ID (PN/LID)

`sock.findUserId(id)` resolves the two addresses of a user — phone number (PN) and local ID (LID). The input may be either form; the result always has the same shape:

```javascript
// from a phone-number jid
const ids = await sock.findUserId('5511999999999@s.whatsapp.net')

// from a lid
const ids2 = await sock.findUserId('102345678912345@lid')

console.log(ids)
// {
//   phoneNumber: '5511999999999@s.whatsapp.net',
//   lid: '102345678912345@lid'
// }
// (a field is undefined when WhatsApp has no mapping for it)
```

The input must contain numbers only (no `+`, dashes or parentheses) and include the country code. This is the recommended way to normalize senders inside `messages.upsert` handlers when WhatsApp delivers LID-based keys.

## Image processing

The library picks the best installed image library automatically — `sharp`, then `@napi-rs/image`, then `jimp` — through `getImageProcessingLibrary()`:

```javascript
import { getImageProcessingLibrary } from '@eduh_dev021/baileys'
import { readFile } from 'node:fs/promises'

const lib = await getImageProcessingLibrary()
const source = './photo.jpg'
const width = 512
let output

if (lib.sharp?.default) {
   output = await lib.sharp.default(source).resize(width).jpeg({ quality: 80 }).toBuffer()
}
else if (lib.image?.Transformer) {
   const input = Buffer.isBuffer(source) ? source : await readFile(source)
   output = await new lib.image.Transformer(input).resize(width, undefined, 0).jpeg(80)
}
else if (lib.jimp?.Jimp) {
   const img = await lib.jimp.Jimp.read(source)
   output = await img
      .resize({ w: width, mode: lib.jimp.ResizeStrategy.BILINEAR })
      .getBuffer('image/jpeg', { quality: 80 })
}
else {
   throw new Error('No image processing library available')
}
```

This is exactly what the library itself uses for thumbnails and sticker conversion — install `sharp` for the best performance. Audio/video features (`getAudioData`, animated stickers, video thumbnails) rely on `ffmpeg`/`ffprobe` on the PATH.

## Add-on utilities

The package ships a small, dependency-free utility layer (used by the library internals, also importable by your app):

```javascript
import {
   createCache, createMutex, createQueue, createZip,
   detectFileType, detectMediaInfo, encodeQR,
   getAudioWaveform, getFile
} from '@eduh_dev021/baileys'
```

### `createCache(options?)` — TTL + LRU cache

```javascript
const cache = createCache({ ttl: 300, max: 1024 }) // ttl in SECONDS, max entries (LRU eviction)

cache.set('key', value)          // optional per-entry ttl: cache.set('k', v, 30)
cache.get('key')                 // undefined when missing or expired (counts hits/misses)
cache.has('key')                 // boolean, no statistics
cache.del('key')                 // delete one/many: cache.del('a', 'b') or an array
cache.mset([{ key: 'a', val: 1 }, { key: 'b', val: 2 }])
cache.mget('a', 'b')             // { a: 1, b: 2 } — missing keys omitted
cache.keys()                     // live keys
cache.getStats()                 // { hits, misses, keys }
cache.size                       // live entry count
cache.flushAll()                 // drop everything
cache.close()                    // stop the internal sweep timer
```

This is the same cache type the socket uses internally for retry counters and debounce maps — plug your own Map-like objects into the socket options if you want custom behavior.

### `createMutex()` — async lock

```javascript
const mutex = createMutex()

await mutex.runExclusive(async () => {
   // only one caller runs this block at a time
})

const release = await mutex.acquire() // manual acquire/release (FIFO queue)
release()
const release2 = mutex.tryAcquire()   // undefined when already locked
mutex.isLocked()
```

### `createQueue(concurrency?)` — bounded task queue

```javascript
const queue = createQueue(1) // serialize; any positive number = max parallel tasks

const result = await queue.add(async () => fetchStuff())
await queue.push(taskFn)     // push is an alias of add
```

Tasks run in FIFO order; a failing task rejects only its own promise and never stops the queue.

### `createZip(entries)` — in-memory ZIP builder

```javascript
const zipBuffer = await createZip([
   { name: 'folder/file.txt', data: Buffer.from('hello') },
   { name: 'image.webp', data: webpBuffer }
]) // -> Buffer (DEFLATE-compressed, valid ZIP readable by any tool)
```

This is what powers sticker packs (`stickers` + `cover` are zipped into one upload). Entries accept `Buffer`, `Uint8Array`, strings and Node streams.

### `detectFileType(input)` — magic-byte detection

```javascript
await detectFileType('./voice.ogg')   // { mime: 'application/ogg', ext: 'ogx' }
await detectFileType(pngBuffer)       // { mime: 'image/png', ext: 'png' }
await detectFileType(someText)        // {} — unknown
```

Accepts a Buffer/Uint8Array, a file path or a stream. Detection is fully built-in (signature table covering images, audio, video, documents and archives); if the optional `magic-bytes.js` or `file-type` packages are installed they take priority.

### `detectMediaInfo(input)` — dimensions and duration

```javascript
await detectMediaInfo('./video.mp4')  // { durationSeconds: 9, width: 1280, height: 720 }
await detectMediaInfo('./photo.jpg')  // { width: 640, height: 480 }
await detectMediaInfo(audioBuffer)    // { durationSeconds: 12 }
```

Uses the system `ffprobe`. Buffers are probed through stdin; unparseable inputs throw an error with the ffprobe message.

### `encodeQR(text)` — QR codes for the terminal and PNGs

```javascript
const { ascii, getPngBuffer, getRaw, version } = await encodeQR('pairing-data-here')

console.log(ascii)                  // half-block glyphs, ready to print
const png = await getPngBuffer()    // grayscale PNG (8 px per module)
const matrix = await getRaw()       // boolean[][] of dark modules
```

A complete QR encoder (ISO/IEC 18004, versions 1-40, automatic error-correction and mask selection) — this is what draws the pairing QR for `printQRInTerminal`.

### `getAudioWaveform(input)` — voice-note waveform

```javascript
const { durationSeconds, waveform } = await getAudioWaveform('./voice.ogg')
// durationSeconds: 12
// waveform: [0, 12, 45, 88, 100, ...] — exactly 64 bars, 0-100, relative loudness
```

Accepts a path, Buffer or stream and decodes with the system `ffmpeg`. The `waveform` array is what WhatsApp renders inside audio bubbles — `sendMessage` computes it automatically for `ptt: true` voice notes.

### `getFile(source)` — normalize any media source to a path

```javascript
const path = await getFile(buffer)                  // Buffer -> temp file
const path2 = await getFile('https://cdn.site/a.jpg') // URL -> downloaded temp file
const path3 = await getFile('./local.jpg')          // existing path -> returned as-is
const path4 = await getFile(readableStream)         // stream -> piped to temp file
// non-2xx downloads throw: HTTP 404 Not Found
```

---

# Complete export reference

The package exports **301 names**: `makeWASocket` (also the default export), plus 213 functions, 54 objects/enums and 34 constants. Everything below is importable from `@eduh_dev021/baileys`.

### Session and connection

| Export | Description |
| --- | --- |
| `makeWASocket` | Create the socket and connect (default export) |
| `useMultiFileAuthState` | Auth state in a folder of JSON files |
| `useSingleFileAuthState` | Auth state in one JSON file |
| `useSqliteAuthState` | Auth state in SQLite (Bun / node:sqlite / better-sqlite3) |
| `initAuthCreds` | Create fresh empty credentials |
| `makeCacheableSignalKeyStore` | In-memory cache over any keys store |
| `fetchLatestBaileysVersion` | Current WhatsApp Web version |
| `fetchLatestWaWebVersion` | Version from the WA Web source |
| `generateRegistrationNode` | Build the registration payload |
| `generateRegistrationId` | Random registration id |
| `generateLoginNode` | Build the login payload |
| `generateOrGetPreKeys` / `getNextPreKeys` / `getNextPreKeysNode` | Pre-key management |
| `xmppPreKey` / `xmppSignedPreKey` | Build pre-key nodes |
| `signedKeyPair` | Create a signed pre-key pair |
| `createSignalIdentity` | Create a Signal identity object |
| `configureSuccessfulPairing` | Finish pairing (internal) |
| `derivePairingCodeKey` | Derive pairing-code keys |
| `buildPairingQRData` | Build pairing QR data |
| `getCodeFromWSError` / `getErrorCodeFromStreamError` | Map server errors to codes |
| `getCompanionPlatformId` / `getPlatformId` / `getCompanionWebClientType` | Platform ids for `browser` |
| `bindWaitForConnectionUpdate` / `bindWaitForEvent` | Wait helpers on the event emitter |
| `makeEventBuffer` | Buffered event emitter (used by the socket) |
| `addTransactionCapability` | Wrap an emitter with transactional emit |
| `makeNoiseHandler` | Noise protocol wrapper (internal) |
| `handleIdentityChange` | Process identity changes |
| `parseAndInjectE2ESessions` | Inject sessions from a bundle |
| `extractE2ESessionFromRetryReceipt` / `isMissingKeyError` / `isAppStateSyncIrrecoverable` | Retry/error helpers |
| `DisconnectReason` | All disconnect codes (`loggedOut`, `connectionClosed`, ...) |
| `Browsers` | `Browsers.macOS('Chrome')`, `ubuntu`, `windows`, `baileys`, `appropriate` |
| `DEFAULT_CONNECTION_CONFIG` | All socket defaults |

### Messages

| Export | Description |
| --- | --- |
| `generateWAMessageContent` | Build message content from a sendable object |
| `generateWAMessage` | Content + key + timestamp |
| `generateWAMessageFromContent` | Wrap a prepared proto content |
| `generateForwardMessageContent` | Build forwardable content |
| `generateMessageID` / `generateMessageIDV2` | Message id helpers |
| `generateLinkPreviewIfRequired` / `getUrlInfo` | Link previews |
| `prepareWAMessageMedia` | Upload media and attach keys |
| `prepareRichResponseMessage` | Build rich messages (code, tables, LaTeX) |
| `prepareDisappearingMessageSettingContent` | Disappearing config message |
| `normalizeMessageContent` | Unwrap view-once/ephemeral/replies/forwards |
| `extractMessageContent` | Extract real content from stubs |
| `getContentType` | `'conversation'`, `'imageMessage'`, ... |
| `assertMediaContent` | Assert a message has media |
| `getAggregateVotesInPollMessage` | Aggregate poll votes |
| `updateMessageWithPollUpdate` / `updateMessageWithReaction` / `updateMessageWithReceipt` / `updateMessageWithEventResponse` | Merge updates into stored messages |
| `aggregateMessageKeysNotFromMe` | Keys of non-self messages |
| `isRealMessage` / `shouldIncrementChatUnread` / `cleanMessage` | Message filtering |
| `getDevice` / `getKeyAuthor` / `getStatusFromReceiptType` | Receipt helpers |
| `generateParticipantHashV2` | Group participant hash |
| `getDecryptionJid` / `decryptMessageNode` / `decryptMessageEdit` / `decryptPollVote` / `decryptEventResponse` | Decryption helpers |
| `decodeMessageNode` | Decode a received message node |
| `encodeWAMessage` / `encodeNewsletterMessage` | Encode message protos |
| `wrapToBotForwardedMessage` / `markViewOnce` / `isViewOnceMessage` | Message flags |
| `hasValidAlbumMedia` / `hasValidCarouselHeader` / `hasValidInteractiveHeader` | Rich message checks |
| `tokenizeCode` | Code tokenization for rich code blocks |
| `MessageRetryManager` | Class managing message retries |
| `DECRYPTION_RETRY_CONFIG` / `RetryReason` | Retry tuning |

### Media download and processing

| Export | Description |
| --- | --- |
| `downloadContentFromMessage` | Decrypt a media message into a stream |
| `downloadMediaMessage` | Download a whole message to buffer/stream |
| `downloadEncryptedContent` / `encryptedStream` | Raw encrypted media streams |
| `decryptMediaRetryData` / `encryptMediaRetryRequest` / `getStatusCodeForMediaRetry` / `decodeMediaRetryNode` | Media retry protocol |
| `getHttpStream` / `getStream` | HTTP streams |
| `downloadExternalBlob` / `downloadExternalPatch` | External media fetch |
| `getRawMediaUploadData` / `encodeBase64EncodedStringForUpload` / `getWAUploadToServer` / `uploadWithNodeHttp` | Upload pipeline |
| `getMediaKeys` / `MEDIA_KEYS` / `MEDIA_HKDF_KEY_MAPPING` | Media key derivation |
| `mediaMessageSHA256B64` / `extensionForMediaMessage` / `MEDIA_PATH_MAP` | Media metadata |
| `generateThumbnail` / `extractImageThumb` / `extractVideoThumb` / `generateProfilePicture` / `getAudioData` | Thumbnails, waveforms |
| `getImageProcessingLibrary` | Pick sharp/jimp/@napi-rs/image |
| `decompressingIfRequired` | Decompress media payloads |

### JIDs

| Export | Description |
| --- | --- |
| `jidNormalizedUser` | Canonical personal/group jid |
| `jidDecode` / `jidEncode` | Parse/build jids |
| `areJidsSameUser` | Compare two jids across PN/LID |
| `isLidUser` / `isPnUser` / `isHostedLidUser` / `isHostedPnUser` / `assertMeId` | Jid kinds |
| `isJidGroup` / `isJidNewsletter` / `isJidBot` / `isJidMetaAI` / `isJidBroadcast` / `isJidStatusBroadcast` | Jid domains |
| `getChatId` / `getServerFromDomainType` / `extractAddressingContext` / `extractDeviceJids` / `transferDevice` | Jid utilities |
| `S_WHATSAPP_NET` / `WAJIDDomains` | Constants |

### Binary nodes and proto

| Export | Description |
| --- | --- |
| `encodeBinaryNode` / `decodeBinaryNode` / `binaryNodeToString` | Node ↔ bytes |
| `getBinaryNodeChild` / `getBinaryNodeChildren` / `getAllBinaryNodeChildren` | Find child nodes |
| `getBinaryNodeChildBuffer` / `getBinaryNodeChildString` / `getBinaryNodeChildUInt` | Typed child access |
| `getBinaryNodeMessages` / `reduceBinaryNodeToDictionary` / `assertNodeErrorFree` / `buildAckStanza` | Node helpers |
| `proto` / `WAProto` | Full protobuf namespace |

### History sync and app state

| Export | Description |
| --- | --- |
| `decodeSyncdSnapshot` / `decodeSyncdPatch` / `decodeSyncdMutations` / `decodePatches` | Decode app-state data |
| `encodeSyncdPatch` / `extractSyncdPatches` | Build/extract patches |
| `processSyncAction` / `processHistoryMessage` / `downloadAndProcessHistorySyncNotification` / `getHistoryMsg` / `downloadHistory` | History processing |
| `ensureLTHashStateVersion` / `makeLtHashGenerator` / `newLTHashState` / `LT_HASH_ANTI_TAMPERING` | LT-Hash state |
| `ALL_WA_PATCH_NAMES` / `SyncState` / `PROCESSABLE_HISTORY_TYPES` | Patch names and state |

### USync (user queries)

| Export | Description |
| --- | --- |
| `USyncQuery` | Build queries (device list, status, contact, LID...) |
| `USyncUser` | User entry for queries |
| `USyncContactProtocol` / `USyncDeviceProtocol` / `USyncDisappearingModeProtocol` / `USyncStatusProtocol` / `USyncUsernameProtocol` | Result protocols |

### Crypto primitives

| Export | Description |
| --- | --- |
| `Curve` | `generateKeyPair`, `sharedKey`, `sign`, `verify`, `generateSignature`, `generateSignedKeyPair`, `createPublicKeyFromPrivateKey` |
| `hkdf` / `hkdfInfoKey` / `hmacSign` | Key derivation |
| `md5` / `sha256` | Hashes |
| `aesEncrypt` / `aesDecrypt` / `aesEncryptCTR` / `aesDecryptCTR` / `aesEncryptGCM` / `aesDecryptGCM` / `aesEncrypWithIV` / `aesDecryptWithIV` | AES helpers |
| `writeRandomPadMax16` / `unpadRandomMax16` / `encodeBigEndian` / `bytesToCrockford` | Byte utilities |

### Store

| Export | Description |
| --- | --- |
| `makeInMemoryStore` | The store described above |
| `waChatKey` / `waMessageID` / `waLabelAssociationKey` | Store ordering keys |
| `makeOrderedDictionary` / `ObjectRepository` | Store building blocks |

### WAM (analytics)

| Export | Description |
| --- | --- |
| `BinaryInfo` / `encodeWAM` | Build analytics event payloads |

### Timers and small utilities

| Export | Description |
| --- | --- |
| `delay` / `delayCancellable` / `promiseTimeout` / `debouncedTimeout` | Async timing |
| `unixTimestampSeconds` | Seconds since epoch |
| `toNumber` / `toBuffer` / `toReadable` / `toUnified` | Conversions |
| `trimUndefined` / `hasNonNullishProperty` / `hasOptionalProperty` / `isStringNullOrEmpty` | Object helpers |
| `BufferJSON` | JSON replacer/reviver that survives Buffers |

### Addon utilities

| Export | Description |
| --- | --- |
| `createCache` | TTL + LRU in-memory cache (see [Add-on utilities](#add-on-utilities)) |
| `createMutex` | Async mutual-exclusion lock (FIFO, used by the auth states) |
| `createQueue` | Bounded-concurrency task queue |
| `createZip` | In-memory ZIP builder (DEFLATE, powers sticker packs) |
| `detectFileType` | Magic-byte file type detection — `{ mime, ext }` |
| `detectMediaInfo` | Media dimensions/duration via ffprobe |
| `encodeQR` | Full QR encoder — terminal ASCII + PNG (used for pairing) |
| `getAudioWaveform` | 64-bar audio waveform via ffmpeg |
| `getFile` | Normalize Buffer/URL/stream/path into a local file path |
| `HttpError` | Error class with `statusCode` used across the API |
| `KeyedDB` | Ordered keyed database (powers the store's chat list) |
| `getLinkPreview` | Fetch Open Graph data for a URL |

### Other notable constants and objects

`WAMessageStatus` (status codes), `WAMessageStubType` (stub types), `NACK_REASONS`, `NOISE_WA_HEADER`, `WEBSOCKET_STATES`, `URL_REGEX`, `DEFAULT_CACHE_TTLS`, `DEFAULT_ORIGIN`, `DEF_MEDIA_HOST`, `SERVER_JID`, `STORIES_JID`, `META_AI_JID`, `OFFICIAL_BIZ_JID`, `PSA_WID`, `WA_DEFAULT_EPHEMERAL`, `QueryIds`, `XWAPaths`, `CompanionWebClientType`, `ButtonHeaderType`, `ButtonType`, `CarouselCardType`, `ListType`, `AssociationType`, `ProtocolType`, `NewChatMessageCappingStatusType` (and the OTE/MV variants), `ReachoutTimelockEnforcementType`, `WAMessageAddressingMode`, `WEB_EVENTS`, `WEB_GLOBALS`, `WA_CERT_DETAILS`, `KEY_BUNDLE_TYPE`, `SERVER_ERROR_CODES`, `UNAUTHORIZED_CODES`, `TimeMs`, `INITIAL_PREKEY_COUNT`, `MIN_PREKEY_COUNT`, `MAX_SYNC_ATTEMPTS`, `HISTORY_SYNC_PAUSED_TIMEOUT_MS`, `PLACEHOLDER_MAX_AGE_SECONDS`, `STATUS_EXPIRY_SECONDS`, `DICT_VERSION`, `getCallStatusFromNode`, `getBizBinaryNode`, `shouldIncludeBizBinaryNode` and more.

---

# Common problems

**"Connection closed" right after connecting** — usually the session expired or WhatsApp logged you out. Delete the session storage and pair again.

**Send fails with a thumbnail error** — install one of the image libraries (`sharp` is the most common) and make sure `ffmpeg`/`ffprobe` are on your system PATH for videos and audio.

**Node version error on install** — this package needs Node.js 20 or newer. Check with `node -v`.

**"No SQLite driver found"** — `useSqliteAuthState` needs Bun, Node.js ≥ 22.13 (`node:sqlite`), or the `better-sqlite3` package. Install `better-sqlite3` if you are on an older Node.

**Messages not decrypting after a restart** — provide `getMessage` in the socket config (read the original message from your store/database) and keep `enableRecentMessageCache` on.

**Stickers not converting** — sticker conversion needs `ffmpeg` for animated stickers.

**Album rejects my message** — the `album` field must be an **array** with at least two image/video items.

**Buttons/lists not showing on Android** — hydrated templates currently render on WhatsApp Web/Desktop and iOS; on Android they appear only inside newsletters. Use plain buttons (`buttons`) or lists (`sections`) for cross-platform messages.

**Cannot require the package on Node.js 18** — the CommonJS build requires Node.js 20+ (the package states `engines: >=20`). Upgrade Node.js.

# License

Released under the [MIT License](LICENSE). Third-party attributions live in the LICENSE file and in the source file headers (see `lib/WACrypto/`).

---

## Installing under the official package name (drop-in replacement)

Bots and frameworks that already install `@whiskeysockets/baileys` can switch to this package **without changing a single import line**, using an npm alias:

```bash
npm install @whiskeysockets/baileys@npm:@eduh_dev021/baileys
```

Every deep path keeps working under the alias name, e.g.:

```js
const makeWASocket = require('@whiskeysockets/baileys')
const logger = require('@whiskeysockets/baileys/lib/Utils/logger')
```

Since `v1.1.1` the `exports` map exposes `./lib/*`, `./cjs/*` and `./WAProto` subpaths, for both `require` and `import`, with or without the `.js` extension. Deep `require()` calls are served from the CJS build (`cjs/`), so they work on every Node version.

## Calls addon

Call signaling support (incoming call events, auto-reject, call state machine) lives in a separate, optional module with a Go sidecar engine:

```bash
npm install @eduh_dev021/baileys-calls
```

```js
const { attachCalls } = require('@eduh_dev021/baileys-calls')
const calls = attachCalls(sock, { autoReject: { delayMs: 1500 } })
calls.on('incoming', c => console.log('incoming call from', c.from))
```

See the `@eduh_dev021/baileys-calls` package page for the full API and the Go engine architecture.
