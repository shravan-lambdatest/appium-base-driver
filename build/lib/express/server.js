"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeBasePath = exports.configureServer = exports.server = void 0;
const lodash_1 = __importDefault(require("lodash"));
const path_1 = __importDefault(require("path"));
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const serve_favicon_1 = __importDefault(require("serve-favicon"));
const body_parser_1 = __importDefault(require("body-parser"));
const method_override_1 = __importDefault(require("method-override"));
const logger_1 = __importDefault(require("./logger"));
const express_logging_1 = require("./express-logging");
const middleware_1 = require("./middleware");
const static_1 = require("./static");
const crash_1 = require("./crash");
const websocket_1 = require("./websocket");
const bluebird_1 = __importDefault(require("bluebird"));
const constants_1 = require("../constants");
const events_1 = require("events");
const support_1 = require("@appium/support");
const KEEP_ALIVE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
/**
 *
 * @param {import('express').Express} app
 * @param {Partial<import('@appium/types').ServerArgs>} [cliArgs]
 * @returns {Promise<http.Server>}
 */
async function createServer(app, cliArgs) {
    const { sslCertificatePath, sslKeyPath } = cliArgs ?? {};
    if (!sslCertificatePath && !sslKeyPath) {
        return http_1.default.createServer(app);
    }
    if (!sslCertificatePath || !sslKeyPath) {
        throw new Error(`Both certificate path and key path must be provided to enable TLS`);
    }
    const certKey = [sslCertificatePath, sslKeyPath];
    const zipped = lodash_1.default.zip(await bluebird_1.default.all(certKey.map((p) => support_1.fs.exists(p))), ['certificate', 'key'], certKey);
    for (const [exists, desc, p] of zipped) {
        if (!exists) {
            throw new Error(`The provided SSL ${desc} at '${p}' does not exist or is not accessible`);
        }
    }
    const [cert, key] = await bluebird_1.default.all(certKey.map((p) => support_1.fs.readFile(p, 'utf8')));
    logger_1.default.debug('Enabling TLS/SPDY on the server using the provided certificate');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('spdy').createServer({
        cert,
        key,
        spdy: {
            plain: false,
            ssl: true,
        }
    }, app);
}
/**
 *
 * @param {ServerOpts} opts
 * @returns {Promise<AppiumServer>}
 */
async function server(opts) {
    const { routeConfiguringFunction, port, hostname, cliArgs = {}, allowCors = true, basePath = constants_1.DEFAULT_BASE_PATH, extraMethodMap = {}, serverUpdaters = [], keepAliveTimeout = KEEP_ALIVE_TIMEOUT_MS, } = opts;
    const app = (0, express_1.default)();
    const httpServer = await createServer(app, cliArgs);
    return await new bluebird_1.default(async (resolve, reject) => {
        // we put an async function as the promise constructor because we want some things to happen in
        // serial (application of plugin updates, for example). But we still need to use a promise here
        // because some elements of server start failure only happen in httpServer listeners. So the
        // way we resolve it is to use an async function here but to wrap all the inner logic in
        // try/catch so any errors can be passed to reject.
        try {
            const appiumServer = configureHttp({
                httpServer,
                reject,
                keepAliveTimeout,
            });
            configureServer({
                app,
                addRoutes: routeConfiguringFunction,
                allowCors,
                basePath,
                extraMethodMap,
            });
            // allow extensions to update the app and http server objects
            for (const updater of serverUpdaters) {
                await updater(app, appiumServer, cliArgs);
            }
            // once all configurations and updaters have been applied, make sure to set up a catchall
            // handler so that anything unknown 404s. But do this after everything else since we don't
            // want to block extensions' ability to add routes if they want.
            app.all('*', middleware_1.catch404Handler);
            await startServer({ httpServer, hostname, port, keepAliveTimeout });
            resolve(appiumServer);
        }
        catch (err) {
            reject(err);
        }
    });
}
exports.server = server;
/**
 * Sets up some Express middleware and stuff
 * @param {ConfigureServerOpts} opts
 */
function configureServer({ app, addRoutes, allowCors = true, basePath = constants_1.DEFAULT_BASE_PATH, extraMethodMap = {}, }) {
    basePath = normalizeBasePath(basePath);
    app.use(express_logging_1.endLogFormatter);
    // set up static assets
    app.use((0, serve_favicon_1.default)(path_1.default.resolve(static_1.STATIC_DIR, 'favicon.ico')));
    app.use(express_1.default.static(static_1.STATIC_DIR));
    // crash routes, for testing
    app.use(`${basePath}/produce_error`, crash_1.produceError);
    app.use(`${basePath}/crash`, crash_1.produceCrash);
    // add middlewares
    if (allowCors) {
        app.use(middleware_1.allowCrossDomain);
    }
    else {
        app.use((0, middleware_1.allowCrossDomainAsyncExecute)(basePath));
    }
    app.use(middleware_1.handleIdempotency);
    app.use((0, middleware_1.fixPythonContentType)(basePath));
    app.use(middleware_1.defaultToJSONContentType);
    app.use(body_parser_1.default.urlencoded({ extended: true }));
    app.use((0, method_override_1.default)());
    app.use(middleware_1.catchAllHandler);
    // make sure appium never fails because of a file size upload limit
    app.use(body_parser_1.default.json({ limit: '1gb' }));
    // set up start logging (which depends on bodyParser doing its thing)
    app.use(express_logging_1.startLogFormatter);
    addRoutes(app, { basePath, extraMethodMap });
    // dynamic routes for testing, etc.
    app.all('/welcome', static_1.welcome);
    app.all('/test/guinea-pig', static_1.guineaPig);
    app.all('/test/guinea-pig-scrollable', static_1.guineaPigScrollable);
    app.all('/test/guinea-pig-app-banner', static_1.guineaPigAppBanner);
}
exports.configureServer = configureServer;
/**
 * Monkeypatches the `http.Server` instance and returns a {@linkcode AppiumServer}.
 * This function _mutates_ the `httpServer` parameter.
 * @param {ConfigureHttpOpts} opts
 * @returns {AppiumServer}
 */
function configureHttp({ httpServer, reject, keepAliveTimeout }) {
    const serverState = {
        notifier: new events_1.EventEmitter(),
        closed: false,
    };
    /**
     * @type {AppiumServer}
     */
    const appiumServer = /** @type {any} */ (httpServer);
    appiumServer.addWebSocketHandler = websocket_1.addWebSocketHandler;
    appiumServer.removeWebSocketHandler = websocket_1.removeWebSocketHandler;
    appiumServer.removeAllWebSocketHandlers = websocket_1.removeAllWebSocketHandlers;
    appiumServer.getWebSocketHandlers = websocket_1.getWebSocketHandlers;
    // http.Server.close() only stops new connections, but we need to wait until
    // all connections are closed and the `close` event is emitted
    const close = appiumServer.close.bind(appiumServer);
    appiumServer.close = async () => await new bluebird_1.default((resolve, reject) => {
        // https://github.com/nodejs/node-v0.x-archive/issues/9066#issuecomment-124210576
        serverState.closed = true;
        serverState.notifier.emit('shutdown');
        logger_1.default.info('Waiting until the server is closed');
        httpServer.on('close', () => {
            logger_1.default.info('Received server close event');
            resolve();
        });
        close((err) => {
            if (err)
                reject(err); // eslint-disable-line curly
        });
    });
    appiumServer.on('error', 
    /** @param {NodeJS.ErrnoException} err */ (err) => {
        if (err.code === 'EADDRNOTAVAIL') {
            logger_1.default.error('Could not start REST http interface listener. ' + 'Requested address is not available.');
        }
        else {
            logger_1.default.error('Could not start REST http interface listener. The requested ' +
                'port may already be in use. Please make sure there is no ' +
                'other instance of this server running already.');
        }
        reject(err);
    });
    appiumServer.on('connection', 
    /** @param {AppiumServerSocket} socket */ (socket) => {
        socket.setTimeout(keepAliveTimeout);
        socket.on('error', reject);
        function destroy() {
            socket.destroy();
        }
        socket._openReqCount = 0;
        socket.once('close', () => serverState.notifier.removeListener('shutdown', destroy));
        serverState.notifier.once('shutdown', destroy);
    });
    appiumServer.on('request', function (req, res) {
        const socket = /** @type {AppiumServerSocket} */ (req.connection || req.socket);
        socket._openReqCount++;
        res.on('finish', function () {
            socket._openReqCount--;
            if (serverState.closed && socket._openReqCount === 0) {
                socket.destroy();
            }
        });
    });
    return appiumServer;
}
/**
 * Starts an {@linkcode AppiumServer}
 * @param {StartServerOpts} opts
 * @returns {Promise<void>}
 */
async function startServer({ httpServer, port, hostname, keepAliveTimeout }) {
    // If the hostname is omitted, the server will accept
    // connections on any IP address
    /** @type {(port: number, hostname?: string) => B<http.Server>} */
    const start = bluebird_1.default.promisify(httpServer.listen, { context: httpServer });
    const startPromise = start(port, hostname);
    httpServer.keepAliveTimeout = keepAliveTimeout;
    // headers timeout must be greater than keepAliveTimeout
    httpServer.headersTimeout = keepAliveTimeout + 5 * 1000;
    await startPromise;
}
/**
 * Normalize base path string
 * @param {string} basePath
 * @returns {string}
 */
function normalizeBasePath(basePath) {
    if (!lodash_1.default.isString(basePath)) {
        throw new Error(`Invalid path prefix ${basePath}`);
    }
    // ensure the path prefix does not end in '/', since our method map
    // starts all paths with '/'
    basePath = basePath.replace(/\/$/, '');
    // likewise, ensure the path prefix does always START with /, unless the path
    // is empty meaning no base path at all
    if (basePath !== '' && basePath[0] !== '/') {
        basePath = `/${basePath}`;
    }
    return basePath;
}
exports.normalizeBasePath = normalizeBasePath;
/**
 * Options for {@linkcode startServer}.
 * @typedef StartServerOpts
 * @property {import('http').Server} httpServer - HTTP server instance
 * @property {number} port - Port to run on
 * @property {number} keepAliveTimeout - Keep-alive timeout in milliseconds
 * @property {string} [hostname] - Optional hostname
 */
/**
 * @typedef {import('@appium/types').AppiumServer} AppiumServer
 * @typedef {import('@appium/types').AppiumServerSocket} AppiumServerSocket
 */
/**
 * @typedef {import('@appium/types').MethodMap<import('@appium/types').ExternalDriver>} MethodMap
 */
/**
 * Options for {@linkcode configureHttp}
 * @typedef ConfigureHttpOpts
 * @property {import('http').Server} httpServer - HTTP server instance
 * @property {(error?: any) => void} reject - Rejection function from `Promise` constructor
 * @property {number} keepAliveTimeout - Keep-alive timeout in milliseconds
 */
/**
 * Options for {@linkcode server}
 * @typedef ServerOpts
 * @property {RouteConfiguringFunction} routeConfiguringFunction
 * @property {number} port
 * @property {import('@appium/types').ServerArgs} [cliArgs]
 * @property {string} [hostname]
 * @property {boolean} [allowCors]
 * @property {string} [basePath]
 * @property {MethodMap} [extraMethodMap]
 * @property {import('@appium/types').UpdateServerCallback[]} [serverUpdaters]
 * @property {number} [keepAliveTimeout]
 */
/**
 * A function which configures routes
 * @callback RouteConfiguringFunction
 * @param {import('express').Express} app
 * @param {RouteConfiguringFunctionOpts} [opts]
 * @returns {void}
 */
/**
 * Options for a {@linkcode RouteConfiguringFunction}
 * @typedef RouteConfiguringFunctionOpts
 * @property {string} [basePath]
 * @property {MethodMap} [extraMethodMap]
 */
/**
 * Options for {@linkcode configureServer}
 * @typedef ConfigureServerOpts
 * @property {import('express').Express} app
 * @property {RouteConfiguringFunction} addRoutes
 * @property {boolean} [allowCors]
 * @property {string} [basePath]
 * @property {MethodMap} [extraMethodMap]
 */
//# sourceMappingURL=server.js.map