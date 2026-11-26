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
var http_error_exports = {};
__export(http_error_exports, {
  HttpError: () => HttpError
});
module.exports = __toCommonJS(http_error_exports);
class HttpError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = this.constructor.name;
    this.isHttpError = true;
    this.isBoom = true;
    this.isServer = true;
    const statusCode = options?.statusCode || 400;
    this.data = options?.data || null;
    this.output = {
      statusCode,
      payload: {
        statusCode,
        error: HttpError.getStatusText(statusCode),
        message
      },
      headers: {}
    };
  }
  get statusCode() {
    return this.output.statusCode;
  }
  static getStatusText(statusCode) {
    const statuses = {
      400: "Bad Request",
      401: "Unauthorized",
      403: "Forbidden",
      404: "Not Found",
      405: "Method Not Allowed",
      409: "Conflict",
      422: "Unprocessable Entity",
      429: "Too Many Requests",
      500: "Internal Server Error",
      501: "Not Implemented",
      502: "Bad Gateway",
      503: "Service Unavailable"
    };
    return statuses[statusCode] || "Internal Server Error";
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  HttpError
});
