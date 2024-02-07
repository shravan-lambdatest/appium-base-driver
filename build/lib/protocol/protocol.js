"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateExecuteMethodParams = exports.deprecatedCommandsLogged = exports.GET_STATUS_COMMAND = exports.DELETE_SESSION_COMMAND = exports.CREATE_SESSION_COMMAND = exports.determineProtocol = exports.driverShouldDoJwpProxy = exports.isSessionCommand = exports.routeConfiguringFunction = exports.makeArgs = exports.checkParams = void 0;
const lodash_1 = __importDefault(require("lodash"));
const support_1 = require("@appium/support");
const validators_1 = require("./validators");
const errors_1 = require("./errors");
const routes_1 = require("./routes");
const bluebird_1 = __importDefault(require("bluebird"));
const helpers_1 = require("./helpers");
const constants_1 = require("../constants");
const capabilities_1 = require("../helpers/capabilities");
const logger_1 = __importDefault(require("../basedriver/logger"));
const CREATE_SESSION_COMMAND = 'createSession';
exports.CREATE_SESSION_COMMAND = CREATE_SESSION_COMMAND;
const DELETE_SESSION_COMMAND = 'deleteSession';
exports.DELETE_SESSION_COMMAND = DELETE_SESSION_COMMAND;
const GET_STATUS_COMMAND = 'getStatus';
exports.GET_STATUS_COMMAND = GET_STATUS_COMMAND;
/** @type {Set<string>} */
const deprecatedCommandsLogged = new Set();
exports.deprecatedCommandsLogged = deprecatedCommandsLogged;
function determineProtocol(createSessionArgs) {
    return lodash_1.default.some(createSessionArgs, capabilities_1.isW3cCaps) ? constants_1.PROTOCOLS.W3C : constants_1.PROTOCOLS.MJSONWP;
}
exports.determineProtocol = determineProtocol;
function extractProtocol(driver, sessionId = null) {
    const dstDriver = lodash_1.default.isFunction(driver.driverForSession)
        ? driver.driverForSession(sessionId)
        : driver;
    if (dstDriver === driver) {
        // Shortcircuit if the driver instance is not an umbrella driver
        // or it is Fake driver instance, where `driver.driverForSession`
        // always returns self instance
        return driver.protocol;
    }
    // Extract the protocol for the current session if the given driver is the umbrella one
    return dstDriver?.protocol ?? constants_1.PROTOCOLS.W3C;
}
function isSessionCommand(command) {
    return !lodash_1.default.includes(routes_1.NO_SESSION_ID_COMMANDS, command);
}
exports.isSessionCommand = isSessionCommand;
/**
 *
 * @param {import('@appium/types').ExternalDriver} driver
 * @param {string?} [sessionId]
 * @returns {import('@appium/types').AppiumLogger}
 */
function getLogger(driver, sessionId = null) {
    const dstDriver = sessionId && lodash_1.default.isFunction(driver.driverForSession)
        ? driver.driverForSession(sessionId) ?? driver
        : driver;
    if (lodash_1.default.isFunction(dstDriver.log?.info)) {
        return dstDriver.log;
    }
    let logPrefix = dstDriver.constructor
        ? `${dstDriver.constructor.name}@${support_1.node.getObjectId(dstDriver).substring(0, 8)}`
        : 'AppiumDriver';
    if (sessionId) {
        logPrefix += ` (${sessionId.substring(0, 8)})`;
    }
    return support_1.logger.getLogger(logPrefix);
}
function wrapParams(paramSets, jsonObj) {
    /* There are commands like performTouch which take a single parameter (primitive type or array).
     * Some drivers choose to pass this parameter as a value (eg. [action1, action2...]) while others to
     * wrap it within an object(eg' {gesture:  [action1, action2...]}), which makes it hard to validate.
     * The wrap option in the spec enforce wrapping before validation, so that all params are wrapped at
     * the time they are validated and later passed to the commands.
     */
    let res = jsonObj;
    if (lodash_1.default.isArray(jsonObj) || !lodash_1.default.isObject(jsonObj)) {
        res = {};
        res[paramSets.wrap] = jsonObj;
    }
    return res;
}
function unwrapParams(paramSets, jsonObj) {
    /* There are commands like setNetworkConnection which send parameters wrapped inside a key such as
     * "parameters". This function unwraps them (eg. {"parameters": {"type": 1}} becomes {"type": 1}).
     */
    let res = jsonObj;
    if (lodash_1.default.isObject(jsonObj)) {
        // some clients, like ruby, don't wrap
        if (jsonObj[paramSets.unwrap]) {
            res = jsonObj[paramSets.unwrap];
        }
    }
    return res;
}
function checkParams(paramSets, jsonObj, protocol) {
    let requiredParams = [];
    let optionalParams = [];
    let receivedParams = lodash_1.default.keys(jsonObj);
    if (paramSets) {
        if (paramSets.required) {
            // we might have an array of parameters,
            // or an array of arrays of parameters, so standardize
            if (!lodash_1.default.isArray(lodash_1.default.first(paramSets.required))) {
                requiredParams = [paramSets.required];
            }
            else {
                requiredParams = paramSets.required;
            }
        }
        // optional parameters are just an array
        if (paramSets.optional) {
            optionalParams = paramSets.optional;
        }
        // If a function was provided as the 'validate' key, it will here be called with
        // jsonObj as the param. If it returns something falsy, verification will be
        // considered to have passed. If it returns something else, that will be the
        // argument to an error which is thrown to the user
        if (paramSets.validate) {
            let message = paramSets.validate(jsonObj, protocol);
            if (message) {
                throw new errors_1.errors.BadParametersError(message, jsonObj);
            }
        }
    }
    // if we have no required parameters, all is well
    if (requiredParams.length === 0) {
        return;
    }
    // some clients pass in the session id in the params
    if (optionalParams.indexOf('sessionId') === -1) {
        optionalParams.push('sessionId');
    }
    // some clients pass in an element id in the params
    if (optionalParams.indexOf('id') === -1) {
        optionalParams.push('id');
    }
    // go through the required parameters and check against our arguments
    for (let params of requiredParams) {
        if (lodash_1.default.difference(receivedParams, params, optionalParams).length === 0 &&
            lodash_1.default.difference(params, receivedParams).length === 0) {
            // we have a set of parameters that is correct
            // so short-circuit
            return;
        }
    }
    throw new errors_1.errors.BadParametersError(paramSets, receivedParams);
}
exports.checkParams = checkParams;
/*
 * This method takes 3 pieces of data: request parameters ('requestParams'),
 * a request JSON body ('jsonObj'), and 'payloadParams', which is the section
 * from the route definition for a particular endpoint which has instructions
 * on handling parameters. This method returns an array of arguments which will
 * be applied to a command.
 */
function makeArgs(requestParams, jsonObj, payloadParams, protocol) {
    // We want to pass the "url" parameters to the commands in reverse order
    // since the command will sometimes want to ignore, say, the sessionId.
    // This has the effect of putting sessionId last, which means in JS we can
    // omit it from the function signature if we're not going to use it.
    let urlParams = lodash_1.default.keys(requestParams).reverse();
    // In the simple case, the required parameters are a basic array in
    // payloadParams.required, so start there. It's possible that there are
    // multiple optional sets of required params, though, so handle that case
    // too.
    let requiredParams = payloadParams.required;
    if (lodash_1.default.isArray(lodash_1.default.first(payloadParams.required))) {
        // If there are optional sets of required params, then we will have an
        // array of arrays in payloadParams.required, so loop through each set and
        // pick the one that matches which JSON params were actually sent. We've
        // already been through validation so we're guaranteed to find a match.
        let keys = lodash_1.default.keys(jsonObj);
        for (let params of payloadParams.required) {
            if (lodash_1.default.without(params, ...keys).length === 0) {
                requiredParams = params;
                break;
            }
        }
    }
    // Now we construct our list of arguments which will be passed to the command
    let args;
    if (lodash_1.default.isFunction(payloadParams.makeArgs)) {
        // In the route spec, a particular route might define a 'makeArgs' function
        // if it wants full control over how to turn JSON parameters into command
        // arguments. So we pass it the JSON parameters and it returns an array
        // which will be applied to the handling command. For example if it returns
        // [1, 2, 3], we will call `command(1, 2, 3, ...)` (url params are separate
        // from JSON params and get concatenated below).
        args = payloadParams.makeArgs(jsonObj, protocol);
    }
    else {
        // Otherwise, collect all the required and optional params and flatten them
        // into an argument array
        args = lodash_1.default.flatten(requiredParams).map((p) => jsonObj[p]);
        if (payloadParams.optional) {
            args = args.concat(lodash_1.default.flatten(payloadParams.optional).map((p) => jsonObj[p]));
        }
    }
    // Finally, get our url params (session id, element id, etc...) on the end of
    // the list
    args = args.concat(urlParams.map((u) => requestParams[u]));
    return args;
}
exports.makeArgs = makeArgs;
function validateExecuteMethodParams(params, paramSpec) {
    // the w3c protocol will give us an array of arguments to apply to a javascript function.
    // that's not what we're doing. we're going to look for a JS object as the first arg, so we
    // can perform validation on it. we'll ignore everything else.
    if (!params || !lodash_1.default.isArray(params) || params.length > 1) {
        throw new errors_1.errors.InvalidArgumentError(`Did not get correct format of arguments for execute method. Expected zero or one ` +
            `arguments to execute script and instead received: ${JSON.stringify(params)}`);
    }
    let args = params[0] ?? {};
    if (!lodash_1.default.isPlainObject(args)) {
        throw new errors_1.errors.InvalidArgumentError(`Did not receive an appropriate execute method parameters object. It needs to be ` +
            `deserializable as a plain JS object`);
    }
    if (!paramSpec) {
        paramSpec = { required: [], optional: [] };
    }
    else {
        paramSpec.required ?? (paramSpec.required = []);
        paramSpec.optional ?? (paramSpec.optional = []);
        const unknownNames = lodash_1.default.difference(lodash_1.default.keys(args), paramSpec.required, paramSpec.optional);
        if (!lodash_1.default.isEmpty(unknownNames)) {
            logger_1.default.info(`The following script arguments are not known and will be ignored: ${unknownNames}`);
            args = lodash_1.default.pickBy(args, (v, k) => !unknownNames.includes(k));
        }
        checkParams(paramSpec, args, null);
    }
    const argsToApply = makeArgs({}, args, paramSpec, null);
    return argsToApply;
}
exports.validateExecuteMethodParams = validateExecuteMethodParams;
/**
 *
 * @param {import('@appium/types').Core} driver
 * @returns {import('../express/server').RouteConfiguringFunction}
 */
function routeConfiguringFunction(driver) {
    if (!driver.sessionExists) {
        throw new Error('Drivers must implement `sessionExists` property');
    }
    // "execute" isn't defined anywhere
    // @ts-expect-error
    if (!(driver.executeCommand || driver.execute)) {
        throw new Error('Drivers must implement `executeCommand` or `execute` method');
    }
    // return a function which will add all the routes to the driver. Here extraMethods might be
    // passed in as defined by Appium plugins, so we need to add those to the default list
    return function addRoutes(app, { basePath = constants_1.DEFAULT_BASE_PATH, extraMethodMap = {} } = {}) {
        // store basePath on the driver instance so it can use it if necessary
        // for example in determining proxy avoidance
        driver.basePath = basePath;
        const allMethods = { ...routes_1.METHOD_MAP, ...extraMethodMap };
        for (const [path, methods] of lodash_1.default.toPairs(allMethods)) {
            for (const [method, spec] of lodash_1.default.toPairs(methods)) {
                // set up the express route handler
                buildHandler(app, method, `${basePath}${path}`, spec, driver, isSessionCommand(/** @type {import('@appium/types').DriverMethodDef} */ (spec).command));
            }
        }
    };
}
exports.routeConfiguringFunction = routeConfiguringFunction;
function buildHandler(app, method, path, spec, driver, isSessCmd) {
    let asyncHandler = async (req, res) => {
        let jsonObj = req.body;
        let httpResBody = {};
        let httpStatus = 200;
        let newSessionId;
        let currentProtocol = extractProtocol(driver, req.params.sessionId);
        try {
            // if the route accessed is deprecated, log a warning
            if (spec.deprecated && !deprecatedCommandsLogged.has(spec.command)) {
                deprecatedCommandsLogged.add(spec.command);
                getLogger(driver, req.params.sessionId).warn(`Command '${spec.command}' has been deprecated and will be removed in a future ` +
                    `version of Appium or your driver/plugin. Please use a different method or contact the ` +
                    `driver/plugin author to add explicit support for the command before it is removed`);
            }
            // if this is a session command but we don't have a session,
            // error out early (especially before proxying)
            if (isSessCmd && !driver.sessionExists(req.params.sessionId)) {
                throw new errors_1.errors.NoSuchDriverError();
            }
            // if the driver is currently proxying commands to another JSONWP server, bypass all our
            // checks and assume the upstream server knows what it's doing. But keep this in the
            // try/catch block so if proxying itself fails, we give a message to the client. Of course we
            // only want to do these when we have a session command; the Appium driver must be
            // responsible for start/stop session, etc... We also allow the command spec to declare that
            // this command should never be proxied (which is useful for plugin developers who add
            // commands and generally would not want that command to be proxied instead of handled by the
            // plugin)
            let didPluginOverrideProxy = false;
            if (isSessCmd && !spec.neverProxy && driverShouldDoJwpProxy(driver, req, spec.command)) {
                if (!driver.pluginsToHandleCmd ||
                    driver.pluginsToHandleCmd(spec.command, req.params.sessionId).length === 0) {
                    await doJwpProxy(driver, req, res);
                    return;
                }
                getLogger(driver, req.params.sessionId).debug(`Would have proxied ` +
                    `command directly, but a plugin exists which might require its value, so will let ` +
                    `its value be collected internally and made part of plugin chain`);
                didPluginOverrideProxy = true;
            }
            // if a command is not in our method map, it's because we
            // have no plans to ever implement it
            if (!spec.command) {
                throw new errors_1.errors.NotImplementedError();
            }
            // wrap params if necessary
            if (spec.payloadParams && spec.payloadParams.wrap) {
                jsonObj = wrapParams(spec.payloadParams, jsonObj);
            }
            // unwrap params if necessary
            if (spec.payloadParams && spec.payloadParams.unwrap) {
                jsonObj = unwrapParams(spec.payloadParams, jsonObj);
            }
            if (spec.command === CREATE_SESSION_COMMAND) {
                // try to determine protocol by session creation args, so we can throw a
                // properly formatted error if arguments validation fails
                currentProtocol = determineProtocol(makeArgs(req.params, jsonObj, spec.payloadParams || {}));
            }
            // ensure that the json payload conforms to the spec
            checkParams(spec.payloadParams, jsonObj, currentProtocol);
            // turn the command and json payload into an argument list for
            // the driver methods
            let args = makeArgs(req.params, jsonObj, spec.payloadParams || {}, currentProtocol);
            let driverRes;
            // validate command args according to MJSONWP
            if (validators_1.validators[spec.command]) {
                validators_1.validators[spec.command](...args);
            }
            // run the driver command wrapped inside the argument validators
            getLogger(driver, req.params.sessionId).debug(`Calling ` +
                `${driver.constructor.name}.${spec.command}() with args: ` +
                lodash_1.default.truncate(JSON.stringify(args), { length: constants_1.MAX_LOG_BODY_LENGTH }));
            if (didPluginOverrideProxy) {
                // TODO for now we add this information on the args list, but that's mixing purposes here.
                // We really should add another 'options' parameter to 'executeCommand', but this would be
                // a breaking change for all drivers so would need to be handled carefully.
                args.push({ reqForProxy: req });
            }
            driverRes = await driver.executeCommand(spec.command, ...args);
            // Get the protocol after executeCommand
            currentProtocol = extractProtocol(driver, req.params.sessionId) || currentProtocol;
            // If `executeCommand` was overridden and the method returns an object
            // with a protocol and value/error property, re-assign the protocol
            if (lodash_1.default.isPlainObject(driverRes) && lodash_1.default.has(driverRes, 'protocol')) {
                currentProtocol = driverRes.protocol || currentProtocol;
                if (driverRes.error) {
                    throw driverRes.error;
                }
                driverRes = driverRes.value;
            }
            // unpack createSession response
            if (spec.command === CREATE_SESSION_COMMAND) {
                newSessionId = driverRes[0];
                getLogger(driver, newSessionId).debug(`Cached the protocol value '${currentProtocol}' for the new session ${newSessionId}`);
                if (currentProtocol === constants_1.PROTOCOLS.MJSONWP) {
                    driverRes = driverRes[1];
                }
                else if (currentProtocol === constants_1.PROTOCOLS.W3C) {
                    driverRes = {
                        capabilities: driverRes[1],
                    };
                }
            }
            driverRes = (0, helpers_1.formatResponseValue)(driverRes);
            // delete should not return anything even if successful
            if (spec.command === DELETE_SESSION_COMMAND) {
                getLogger(driver, req.params.sessionId).debug(`Received response: ${lodash_1.default.truncate(JSON.stringify(driverRes), {
                    length: constants_1.MAX_LOG_BODY_LENGTH,
                })}`);
                getLogger(driver, req.params.sessionId).debug('But deleting session, so not returning');
                driverRes = null;
            }
            // if the status is not 0,  throw the appropriate error for status code.
            if (support_1.util.hasValue(driverRes)) {
                if (support_1.util.hasValue(driverRes.status) &&
                    !isNaN(driverRes.status) &&
                    parseInt(driverRes.status, 10) !== 0) {
                    throw (0, errors_1.errorFromMJSONWPStatusCode)(driverRes.status, driverRes.value);
                }
                else if (lodash_1.default.isPlainObject(driverRes.value) && driverRes.value.error) {
                    throw (0, errors_1.errorFromW3CJsonCode)(driverRes.value.error, driverRes.value.message, driverRes.value.stacktrace);
                }
            }
            httpResBody.value = driverRes;
            getLogger(driver, req.params.sessionId || newSessionId).debug(`Responding ` +
                `to client with driver.${spec.command}() result: ${lodash_1.default.truncate(JSON.stringify(driverRes), {
                    length: constants_1.MAX_LOG_BODY_LENGTH,
                })}`);
        }
        catch (err) {
            // if anything goes wrong, figure out what our response should be
            // based on the type of error that we encountered
            let actualErr;
            if (err instanceof Error || (lodash_1.default.has(err, 'stack') && lodash_1.default.has(err, 'message'))) {
                actualErr = err;
            }
            else {
                getLogger(driver, req.params.sessionId || newSessionId).warn('The thrown error object does not seem to be a valid instance of the Error class. This ' +
                    'might be a genuine bug of a driver or a plugin.');
                actualErr = new Error(`${err ?? 'unknown'}`);
            }
            currentProtocol =
                currentProtocol || extractProtocol(driver, req.params.sessionId || newSessionId);
            let errMsg = err.stacktrace || err.stack;
            if (!lodash_1.default.includes(errMsg, err.message)) {
                // if the message has more information, add it. but often the message
                // is the first part of the stack trace
                errMsg = `${err.message}${errMsg ? '\n' + errMsg : ''}`;
            }
            if ((0, errors_1.isErrorType)(err, errors_1.errors.ProxyRequestError)) {
                actualErr = err.getActualError();
            }
            else {
                getLogger(driver, req.params.sessionId || newSessionId).debug(`Encountered internal error running command: ${errMsg}`);
            }
            [httpStatus, httpResBody] = (0, errors_1.getResponseForW3CError)(actualErr);
        }
        // decode the response, which is either a string or json
        if (lodash_1.default.isString(httpResBody)) {
            res.status(httpStatus).send(httpResBody);
        }
        else {
            if (newSessionId) {
                if (currentProtocol === constants_1.PROTOCOLS.W3C) {
                    httpResBody.value.sessionId = newSessionId;
                }
                else {
                    httpResBody.sessionId = newSessionId;
                }
            }
            else {
                httpResBody.sessionId = req.params.sessionId || null;
            }
            // Don't include sessionId in W3C responses
            if (currentProtocol === constants_1.PROTOCOLS.W3C) {
                delete httpResBody.sessionId;
            }
            httpResBody = (0, helpers_1.formatStatus)(httpResBody);
            res.status(httpStatus).json(httpResBody);
        }
    };
    // add the method to the app
    app[method.toLowerCase()](path, (req, res) => {
        bluebird_1.default.resolve(asyncHandler(req, res)).done();
    });
}
function driverShouldDoJwpProxy(driver, req, command) {
    // drivers need to explicitly say when the proxy is active
    if (!driver.proxyActive(req.params.sessionId)) {
        return false;
    }
    // we should never proxy deleteSession because we need to give the containing
    // driver an opportunity to clean itself up
    if (command === DELETE_SESSION_COMMAND) {
        return false;
    }
    // validate avoidance schema, and say we shouldn't proxy if anything in the
    // avoid list matches our req
    if (driver.proxyRouteIsAvoided(req.params.sessionId, req.method, req.originalUrl, req.body)) {
        return false;
    }
    return true;
}
exports.driverShouldDoJwpProxy = driverShouldDoJwpProxy;
async function doJwpProxy(driver, req, res) {
    getLogger(driver, req.params.sessionId).info('Driver proxy active, passing request on via HTTP proxy');
    // check that the inner driver has a proxy function
    if (!driver.canProxy(req.params.sessionId)) {
        throw new Error('Trying to proxy to a server but the driver is unable to proxy');
    }
    try {
        await driver.executeCommand('proxyReqRes', req, res, req.params.sessionId);
    }
    catch (err) {
        if ((0, errors_1.isErrorType)(err, errors_1.errors.ProxyRequestError)) {
            throw err;
        }
        else {
            throw new Error(`Could not proxy. Proxy error: ${err.message}`);
        }
    }
}
//# sourceMappingURL=protocol.js.map