"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseDriver = void 0;
const support_1 = require("@appium/support");
const types_1 = require("@appium/types");
const bluebird_1 = __importDefault(require("bluebird"));
const lodash_1 = __importDefault(require("lodash"));
const capabilities_1 = require("../helpers/capabilities");
const protocol_1 = require("../protocol");
const capabilities_2 = require("./capabilities");
const core_1 = require("./core");
const helpers_1 = __importDefault(require("./helpers"));
const EVENT_SESSION_INIT = 'newSessionRequested';
const EVENT_SESSION_START = 'newSessionStarted';
const EVENT_SESSION_QUIT_START = 'quitSessionRequested';
const EVENT_SESSION_QUIT_DONE = 'quitSessionFinished';
const ON_UNEXPECTED_SHUTDOWN_EVENT = 'onUnexpectedShutdown';
class BaseDriver extends core_1.DriverCore {
    constructor(opts, shouldValidateCaps = true) {
        super(opts, shouldValidateCaps);
        this.caps = {};
        this.cliArgs = {};
    }
    /**
     * Contains the base constraints plus whatever the subclass wants to add.
     *
     * Subclasses _shouldn't_ need to use this. If you need to use this, please create
     * an issue:
     * @see {@link https://github.com/appium/appium/issues/new}
     */
    get _desiredCapConstraints() {
        return Object.freeze(lodash_1.default.merge({}, types_1.BASE_DESIRED_CAP_CONSTRAINTS, this.desiredCapConstraints));
    }
    /**
     * This is the main command handler for the driver. It wraps command
     * execution with timeout logic, checking that we have a valid session,
     * and ensuring that we execute commands one at a time. This method is called
     * by MJSONWP's express router.
     */
    async executeCommand(cmd, ...args) {
        // get start time for this command, and log in special cases
        const startTime = Date.now();
        if (cmd === 'createSession') {
            // If creating a session determine if W3C or MJSONWP protocol was requested and remember the choice
            this.protocol = (0, protocol_1.determineProtocol)(args);
            this.logEvent(EVENT_SESSION_INIT);
        }
        else if (cmd === protocol_1.DELETE_SESSION_COMMAND) {
            this.logEvent(EVENT_SESSION_QUIT_START);
        }
        // if we had a command timer running, clear it now that we're starting
        // a new command and so don't want to time out
        await this.clearNewCommandTimeout();
        if (this.shutdownUnexpectedly) {
            throw new protocol_1.errors.NoSuchDriverError('The driver was unexpectedly shut down!');
        }
        // If we don't have this command, it must not be implemented
        if (!this[cmd]) {
            throw new protocol_1.errors.NotYetImplementedError();
        }
        let unexpectedShutdownListener;
        const commandExecutor = async () => await bluebird_1.default.race([
            this[cmd](...args),
            new bluebird_1.default((resolve, reject) => {
                unexpectedShutdownListener = reject;
                this.eventEmitter.on(ON_UNEXPECTED_SHUTDOWN_EVENT, unexpectedShutdownListener);
            }),
        ]).finally(() => {
            if (unexpectedShutdownListener) {
                // This is needed to prevent memory leaks
                this.eventEmitter.removeListener(ON_UNEXPECTED_SHUTDOWN_EVENT, unexpectedShutdownListener);
                unexpectedShutdownListener = null;
            }
        });
        const res = this.isCommandsQueueEnabled
            ? await this.commandsQueueGuard.acquire(BaseDriver.name, commandExecutor)
            : await commandExecutor();
        // if we have set a new command timeout (which is the default), start a
        // timer once we've finished executing this command. If we don't clear
        // the timer (which is done when a new command comes in), we will trigger
        // automatic session deletion in this.onCommandTimeout. Of course we don't
        // want to trigger the timer when the user is shutting down the session
        // intentionally
        if (this.isCommandsQueueEnabled && cmd !== protocol_1.DELETE_SESSION_COMMAND) {
            // resetting existing timeout
            await this.startNewCommandTimeout();
        }
        // log timing information about this command
        const endTime = Date.now();
        this._eventHistory.commands.push({ cmd, startTime, endTime });
        if (cmd === 'createSession') {
            this.logEvent(EVENT_SESSION_START);
        }
        else if (cmd === protocol_1.DELETE_SESSION_COMMAND) {
            this.logEvent(EVENT_SESSION_QUIT_DONE);
        }
        return res;
    }
    async startUnexpectedShutdown(err = new protocol_1.errors.NoSuchDriverError('The driver was unexpectedly shut down!')) {
        this.eventEmitter.emit(ON_UNEXPECTED_SHUTDOWN_EVENT, err); // allow others to listen for this
        this.shutdownUnexpectedly = true;
        try {
            if (this.sessionId !== null) {
                await this.deleteSession(this.sessionId);
            }
        }
        finally {
            this.shutdownUnexpectedly = false;
        }
    }
    async startNewCommandTimeout() {
        // make sure there are no rogue timeouts
        await this.clearNewCommandTimeout();
        // if command timeout is 0, it is disabled
        if (!this.newCommandTimeoutMs)
            return; // eslint-disable-line curly
        this.noCommandTimer = setTimeout(async () => {
            this.log.warn(`Shutting down because we waited ` +
                `${this.newCommandTimeoutMs / 1000.0} seconds for a command`);
            const errorMessage = `New Command Timeout of ` +
                `${this.newCommandTimeoutMs / 1000.0} seconds ` +
                `expired. Try customizing the timeout using the ` +
                `'newCommandTimeout' desired capability`;
            await this.startUnexpectedShutdown(new Error(errorMessage));
        }, this.newCommandTimeoutMs);
    }
    assignServer(server, host, port, path) {
        this.server = server;
        this.serverHost = host;
        this.serverPort = port;
        this.serverPath = path;
    }
    /*
     * Restart the session with the original caps,
     * preserving the timeout config.
     */
    async reset() {
        this.log.debug('Resetting app mid-session');
        this.log.debug('Running generic full reset');
        // preserving state
        const currentConfig = {};
        for (const property of [
            'implicitWaitMs',
            'newCommandTimeoutMs',
            'sessionId',
            'resetOnUnexpectedShutdown',
        ]) {
            currentConfig[property] = this[property];
        }
        try {
            if (this.sessionId !== null) {
                await this.deleteSession(this.sessionId);
            }
            this.log.debug('Restarting app');
            await this.createSession(this.originalCaps);
        }
        finally {
            // always restore state.
            for (const [key, value] of lodash_1.default.toPairs(currentConfig)) {
                this[key] = value;
            }
        }
        await this.clearNewCommandTimeout();
    }
    /**
     *
     * Historically the first two arguments were reserved for JSONWP capabilities.
     * Appium 2 has dropped the support of these, so now we only accept capability
     * objects in W3C format and thus allow any of the three arguments to represent
     * the latter.
     */
    async createSession(w3cCapabilities1, w3cCapabilities2, w3cCapabilities, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    driverData) {
        if (this.sessionId !== null) {
            throw new protocol_1.errors.SessionNotCreatedError('Cannot create a new session while one is in progress');
        }
        this.log.debug();
        const originalCaps = lodash_1.default.cloneDeep([w3cCapabilities, w3cCapabilities1, w3cCapabilities2].find(capabilities_1.isW3cCaps));
        if (!originalCaps) {
            throw new protocol_1.errors.SessionNotCreatedError('Appium only supports W3C-style capability objects. ' +
                'Your client is sending an older capabilities format. Please update your client library.');
        }
        this.setProtocolW3C();
        this.originalCaps = originalCaps;
        this.log.debug(`Creating session with W3C capabilities: ${JSON.stringify(originalCaps, null, 2)}`);
        let caps;
        try {
            caps = (0, capabilities_2.processCapabilities)(originalCaps, this._desiredCapConstraints, this.shouldValidateCaps);
            caps = (0, capabilities_1.fixCaps)(caps, this._desiredCapConstraints, this.log);
        }
        catch (e) {
            throw new protocol_1.errors.SessionNotCreatedError(e.message);
        }
        this.validateDesiredCaps(caps);
        this.sessionId = support_1.util.uuidV4();
        this.caps = caps;
        // merge caps onto opts so we don't need to worry about what's where
        this.opts = { ...lodash_1.default.cloneDeep(this.initialOpts), ...this.caps };
        // deal with resets
        // some people like to do weird things by setting noReset and fullReset
        // both to true, but this is misguided and strange, so error here instead
        if (this.opts.noReset && this.opts.fullReset) {
            throw new Error("The 'noReset' and 'fullReset' capabilities are mutually " +
                'exclusive and should not both be set to true. You ' +
                "probably meant to just use 'fullReset' on its own");
        }
        if (this.opts.noReset === true) {
            this.opts.fullReset = false;
        }
        if (this.opts.fullReset === true) {
            this.opts.noReset = false;
        }
        this.opts.fastReset = !this.opts.fullReset && !this.opts.noReset;
        this.opts.skipUninstall = this.opts.fastReset || this.opts.noReset;
        // Prevents empty string caps so we don't need to test it everywhere
        if (typeof this.opts.app === 'string' && this.opts.app.trim() === '') {
            delete this.opts.app;
        }
        if (!lodash_1.default.isUndefined(this.caps.newCommandTimeout)) {
            this.newCommandTimeoutMs = this.caps.newCommandTimeout * 1000;
        }
        this._log.prefix = helpers_1.default.generateDriverLogPrefix(this, this.sessionId);
        this.log.info(`Session created with session id: ${this.sessionId}`);
        return [this.sessionId, caps];
    }
    async getSessions() {
        const ret = [];
        if (this.sessionId) {
            ret.push({
                id: this.sessionId,
                capabilities: this.caps,
            });
        }
        return ret;
    }
    /**
     * Returns capabilities for the session and event history (if applicable)
     */
    async getSession() {
        return (this.caps.eventTimings ? { ...this.caps, events: this.eventHistory } : this.caps);
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async deleteSession(sessionId) {
        await this.clearNewCommandTimeout();
        if (this.isCommandsQueueEnabled && this.commandsQueueGuard.isBusy()) {
            // simple hack to release pending commands if they exist
            // @ts-expect-error private API
            const queues = this.commandsQueueGuard.queues;
            for (const key of lodash_1.default.keys(queues)) {
                queues[key] = [];
            }
        }
        this.sessionId = null;
        this._log.prefix = helpers_1.default.generateDriverLogPrefix(this);
    }
    logExtraCaps(caps) {
        const extraCaps = lodash_1.default.difference(lodash_1.default.keys(caps), lodash_1.default.keys(this._desiredCapConstraints));
        if (extraCaps.length) {
            this.log.warn(`The following provided capabilities were not recognized by this driver:`);
            for (const cap of extraCaps) {
                this.log.warn(`  ${cap}`);
            }
        }
    }
    validateDesiredCaps(caps) {
        if (!this.shouldValidateCaps) {
            return true;
        }
        try {
            (0, capabilities_2.validateCaps)(caps, this._desiredCapConstraints);
        }
        catch (e) {
            throw this.log.errorWithException(new protocol_1.errors.SessionNotCreatedError(`The desiredCapabilities object was not valid for the ` +
                `following reason(s): ${e.message}`));
        }
        this.logExtraCaps(caps);
        return true;
    }
    async updateSettings(newSettings) {
        if (!this.settings) {
            throw this.log.errorWithException('Cannot update settings; settings object not found');
        }
        return await this.settings.update(newSettings);
    }
    async getSettings() {
        if (!this.settings) {
            throw this.log.errorWithException('Cannot get settings; settings object not found');
        }
        return this.settings.getSettings();
    }
}
exports.BaseDriver = BaseDriver;
__exportStar(require("./commands"), exports);
exports.default = BaseDriver;
//# sourceMappingURL=driver.js.map