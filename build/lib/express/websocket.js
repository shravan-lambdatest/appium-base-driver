"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_WS_PATHNAME_PREFIX = exports.getWebSocketHandlers = exports.removeAllWebSocketHandlers = exports.removeWebSocketHandler = exports.addWebSocketHandler = void 0;
/* eslint-disable require-await */
const lodash_1 = __importDefault(require("lodash"));
const url_1 = require("url");
const bluebird_1 = __importDefault(require("bluebird"));
const path_to_regexp_1 = require("path-to-regexp");
const DEFAULT_WS_PATHNAME_PREFIX = '/ws';
exports.DEFAULT_WS_PATHNAME_PREFIX = DEFAULT_WS_PATHNAME_PREFIX;
/**
 * @this {AppiumServer}
 * @type {AppiumServer['addWebSocketHandler']}
 */
async function addWebSocketHandler(handlerPathname, handlerServer) {
    if (lodash_1.default.isUndefined(this.webSocketsMapping)) {
        this.webSocketsMapping = {};
        // https://github.com/websockets/ws/pull/885
        this.on('upgrade', (request, socket, head) => {
            let currentPathname;
            try {
                currentPathname = new url_1.URL(request.url ?? '').pathname;
            }
            catch {
                currentPathname = request.url ?? '';
            }
            for (const [pathname, wsServer] of lodash_1.default.toPairs(this.webSocketsMapping)) {
                if ((0, path_to_regexp_1.pathToRegexp)(pathname).test(currentPathname)) {
                    wsServer.handleUpgrade(request, socket, head, (ws) => {
                        wsServer.emit('connection', ws, request);
                    });
                    return;
                }
            }
            socket.destroy();
        });
    }
    this.webSocketsMapping[handlerPathname] = handlerServer;
}
exports.addWebSocketHandler = addWebSocketHandler;
/**
 * @this {AppiumServer}
 * @type {AppiumServer['getWebSocketHandlers']}
 */
async function getWebSocketHandlers(keysFilter = null) {
    if (lodash_1.default.isEmpty(this.webSocketsMapping)) {
        return {};
    }
    return lodash_1.default.toPairs(this.webSocketsMapping).reduce((acc, [pathname, wsServer]) => {
        if (!lodash_1.default.isString(keysFilter) || pathname.includes(keysFilter)) {
            acc[pathname] = wsServer;
        }
        return acc;
    }, {});
}
exports.getWebSocketHandlers = getWebSocketHandlers;
/**
 * @this {AppiumServer}
 * @type {AppiumServer['removeWebSocketHandler']}
 */
async function removeWebSocketHandler(handlerPathname) {
    const wsServer = this.webSocketsMapping?.[handlerPathname];
    if (!wsServer) {
        return false;
    }
    try {
        wsServer.close();
        for (const client of wsServer.clients || []) {
            client.terminate();
        }
        return true;
    }
    catch (ign) {
        // ignore
    }
    finally {
        delete this.webSocketsMapping[handlerPathname];
    }
    return false;
}
exports.removeWebSocketHandler = removeWebSocketHandler;
/**
 *
 * @this {AppiumServer}
 * @type {AppiumServer['removeAllWebSocketHandlers']}
 */
async function removeAllWebSocketHandlers() {
    if (lodash_1.default.isEmpty(this.webSocketsMapping)) {
        return false;
    }
    return lodash_1.default.some(await bluebird_1.default.all(lodash_1.default.keys(this.webSocketsMapping).map((pathname) => this.removeWebSocketHandler(pathname))));
}
exports.removeAllWebSocketHandlers = removeAllWebSocketHandlers;
/**
 * @typedef {import('@appium/types').AppiumServer} AppiumServer
 */
//# sourceMappingURL=websocket.js.map