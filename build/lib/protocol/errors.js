"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getResponseForJsonwpError = exports.getResponseForW3CError = exports.errorFromW3CJsonCode = exports.errorFromMJSONWPStatusCode = exports.isUnknownError = exports.isErrorType = exports.errors = exports.ProxyRequestError = exports.BadParametersError = exports.UnableToCaptureScreen = exports.NotImplementedError = exports.NotYetImplementedError = exports.InvalidContextError = exports.NoSuchContextError = exports.MoveTargetOutOfBoundsError = exports.SessionNotCreatedError = exports.InvalidSelectorError = exports.IMEEngineActivationFailedError = exports.IMENotAvailableError = exports.InvalidCoordinatesError = exports.InvalidElementCoordinatesError = exports.ScriptTimeoutError = exports.NoSuchAlertError = exports.NoAlertOpenError = exports.UnexpectedAlertOpenError = exports.UnableToSetCookieError = exports.NoSuchCookieError = exports.InvalidCookieDomainError = exports.InvalidArgumentError = exports.NoSuchWindowError = exports.TimeoutError = exports.XPathLookupError = exports.JavaScriptError = exports.InsecureCertificateError = exports.ElementNotInteractableError = exports.ElementClickInterceptedError = exports.ElementIsNotSelectableError = exports.UnsupportedOperationError = exports.UnknownMethodError = exports.UnknownError = exports.InvalidElementStateError = exports.ElementNotVisibleError = exports.StaleElementReferenceError = exports.UnknownCommandError = exports.NoSuchFrameError = exports.NoSuchElementError = exports.NoSuchDriverError = exports.ProtocolError = void 0;
const es6_error_1 = __importDefault(require("es6-error"));
const lodash_1 = __importDefault(require("lodash"));
const support_1 = require("@appium/support");
const http_status_codes_1 = require("http-status-codes");
const mjsonwpLog = support_1.logger.getLogger('MJSONWP');
const w3cLog = support_1.logger.getLogger('W3C');
const W3C_UNKNOWN_ERROR = 'unknown error';
// base error class for all of our errors
class ProtocolError extends es6_error_1.default {
    constructor(msg, jsonwpCode, w3cStatus, error) {
        super(msg);
        this.jsonwpCode = jsonwpCode;
        this.error = error || W3C_UNKNOWN_ERROR;
        if (this.jsonwpCode === null) {
            this.jsonwpCode = 13;
        }
        this.w3cStatus = w3cStatus || http_status_codes_1.StatusCodes.BAD_REQUEST;
        this._stacktrace = null;
    }
    get stacktrace() {
        return this._stacktrace || this.stack;
    }
    set stacktrace(value) {
        this._stacktrace = value;
    }
    /**
     * Get the Bidi protocol version of an error
     * @param {string|number} id - the id used in the request for which this error forms the response
     * @see https://w3c.github.io/webdriver-bidi/#protocol-definition
     * @returns The object conforming to the shape of a BiDi error response
     */
    bidiErrObject(id) {
        // if we don't have an id, the client didn't send one, so we have nothing to send back.
        // send back an empty string rather than making something up
        if (lodash_1.default.isNil(id)) {
            id = '';
        }
        return {
            id,
            type: 'error',
            error: this.error,
            stacktrace: this.stacktrace,
            message: this.message,
        };
    }
}
exports.ProtocolError = ProtocolError;
// https://github.com/SeleniumHQ/selenium/blob/176b4a9e3082ac1926f2a436eb346760c37a5998/java/client/src/org/openqa/selenium/remote/ErrorCodes.java#L215
// https://github.com/SeleniumHQ/selenium/issues/5562#issuecomment-370379470
// https://w3c.github.io/webdriver/webdriver-spec.html#dfn-error-code
class NoSuchDriverError extends ProtocolError {
    static code() {
        return 6;
    }
    // W3C Error is called InvalidSessionID
    static w3cStatus() {
        return http_status_codes_1.StatusCodes.NOT_FOUND;
    }
    static error() {
        return 'invalid session id';
    }
    /**
     * @param {string} [message] error message
     */
    constructor(message) {
        super(message || 'A session is either terminated or not started', NoSuchDriverError.code(), NoSuchDriverError.w3cStatus(), NoSuchDriverError.error());
    }
}
exports.NoSuchDriverError = NoSuchDriverError;
class NoSuchElementError extends ProtocolError {
    static code() {
        return 7;
    }
    static w3cStatus() {
        return http_status_codes_1.StatusCodes.NOT_FOUND;
    }
    static error() {
        return 'no such element';
    }
    /**
     * @param {string} [message] error message
     */
    constructor(message) {
        super(message ||
            'An element could not be located on the page using the given ' + 'search parameters.', NoSuchElementError.code(), NoSuchElementError.w3cStatus(), NoSuchElementError.error());
    }
}
exports.NoSuchElementError = NoSuchElementError;
class NoSuchFrameError extends ProtocolError {
    static code() {
        return 8;
    }
    static error() {
        return 'no such frame';
    }
    static w3cStatus() {
        return http_status_codes_1.StatusCodes.NOT_FOUND;
    }
    /**
     *
     * @param {string} [message]
     */
    constructor(message) {
        super(message ||
            'A request to switch to a frame could not be satisfied because ' +
                'the frame could not be found.', NoSuchFrameError.code(), NoSuchFrameError.w3cStatus(), NoSuchFrameError.error());
    }
}
exports.NoSuchFrameError = NoSuchFrameError;
class UnknownCommandError extends ProtocolError {
    static code() {
        return 9;
    }
    static w3cStatus() {
        return http_status_codes_1.StatusCodes.NOT_FOUND;
    }
    static error() {
        return 'unknown command';
    }
    /**
     *
     * @param {string} [message]
     */
    constructor(message) {
        super(message ||
            'The requested resource could not be found, or a request was ' +
                'received using an HTTP method that is not supported by the mapped ' +
                'resource.', UnknownCommandError.code(), UnknownCommandError.w3cStatus(), UnknownCommandError.error());
    }
}
exports.UnknownCommandError = UnknownCommandError;
class StaleElementReferenceError extends ProtocolError {
    static code() {
        return 10;
    }
    static w3cStatus() {
        return http_status_codes_1.StatusCodes.NOT_FOUND;
    }
    static error() {
        return 'stale element reference';
    }
    /**
     *
     * @param {string} [message]
     */
    constructor(message) {
        super(message ||
            'An element command failed because the referenced element is no ' +
                'longer attached to the DOM.', StaleElementReferenceError.code(), StaleElementReferenceError.w3cStatus(), StaleElementReferenceError.error());
    }
}
exports.StaleElementReferenceError = StaleElementReferenceError;
class ElementNotVisibleError extends ProtocolError {
    static code() {
        return 11;
    }
    static w3cStatus() {
        return http_status_codes_1.StatusCodes.BAD_REQUEST;
    }
    static error() {
        return 'element not visible';
    }
    /**
     * @param {string} [message] error message
     */
    constructor(message) {
        super(message ||
            'An element command could not be completed because the element is ' +
                'not visible on the page.', ElementNotVisibleError.code(), ElementNotVisibleError.w3cStatus(), ElementNotVisibleError.error());
    }
}
exports.ElementNotVisibleError = ElementNotVisibleError;
class InvalidElementStateError extends ProtocolError {
    static code() {
        return 12;
    }
    static w3cStatus() {
        return http_status_codes_1.StatusCodes.BAD_REQUEST;
    }
    static error() {
        return 'invalid element state';
    }
    /**
     *
     * @param {string} [message]
     */
    constructor(message) {
        super(message ||
            'An element command could not be completed because the element is ' +
                'in an invalid state (e.g. attempting to click a disabled element).', InvalidElementStateError.code(), InvalidElementStateError.w3cStatus(), InvalidElementStateError.error());
    }
}
exports.InvalidElementStateError = InvalidElementStateError;
class UnknownError extends ProtocolError {
    static code() {
        return 13;
    }
    static w3cStatus() {
        return http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR;
    }
    static error() {
        return W3C_UNKNOWN_ERROR;
    }
    constructor(errorOrMessage) {
        const origMessage = lodash_1.default.isString((errorOrMessage || {}).message)
            ? errorOrMessage.message
            : errorOrMessage;
        const message = 'An unknown server-side error occurred while processing the command.' +
            (origMessage ? ` Original error: ${origMessage}` : '');
        super(message, UnknownError.code(), UnknownError.w3cStatus(), UnknownError.error());
    }
}
exports.UnknownError = UnknownError;
class UnknownMethodError extends ProtocolError {
    static code() {
        return 405;
    }
    static w3cStatus() {
        return http_status_codes_1.StatusCodes.METHOD_NOT_ALLOWED;
    }
    static error() {
        return 'unknown method';
    }
    /**
     * @param {string} [message] error message
     */
    constructor(message) {
        super(message ||
            'The requested command matched a known URL but did not match an method for that URL', UnknownMethodError.code(), UnknownMethodError.w3cStatus(), UnknownMethodError.error());
    }
}
exports.UnknownMethodError = UnknownMethodError;
class UnsupportedOperationError extends ProtocolError {
    static code() {
        return 405;
    }
    static w3cStatus() {
        return http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR;
    }
    static error() {
        return 'unsupported operation';
    }
    /**
     * @param {string} [message] error message
     */
    constructor(message) {
        super(message || 'A server-side error occurred. Command cannot be supported.', UnsupportedOperationError.code(), UnsupportedOperationError.w3cStatus(), UnsupportedOperationError.error());
    }
}
exports.UnsupportedOperationError = UnsupportedOperationError;
class ElementIsNotSelectableError extends ProtocolError {
    static code() {
        return 15;
    }
    static error() {
        return 'element not selectable';
    }
    static w3cStatus() {
        return http_status_codes_1.StatusCodes.BAD_REQUEST;
    }
    /**
     * @param {string} [message] error message
     */
    constructor(message) {
        super(message || 'An attempt was made to select an element that cannot be selected.', ElementIsNotSelectableError.code(), ElementIsNotSelectableError.w3cStatus(), ElementIsNotSelectableError.error());
    }
}
exports.ElementIsNotSelectableError = ElementIsNotSelectableError;
class ElementClickInterceptedError extends ProtocolError {
    static code() {
        return 64;
    }
    static error() {
        return 'element click intercepted';
    }
    static w3cStatus() {
        return http_status_codes_1.StatusCodes.BAD_REQUEST;
    }
    /**
     * @param {string} [message] error message
     */
    constructor(message) {
        super(message ||
            'The Element Click command could not be completed because the element receiving ' +
                'the events is obscuring the element that was requested clicked', ElementClickInterceptedError.code(), ElementClickInterceptedError.w3cStatus(), ElementClickInterceptedError.error());
    }
}
exports.ElementClickInterceptedError = ElementClickInterceptedError;
class ElementNotInteractableError extends ProtocolError {
    static code() {
        return 60;
    }
    static error() {
        return 'element not interactable';
    }
    static w3cStatus() {
        return http_status_codes_1.StatusCodes.BAD_REQUEST;
    }
    /**
     * @param {string} [message] error message
     */
    constructor(message) {
        super(message ||
            'A command could not be completed because the element is not pointer- or keyboard interactable', ElementNotInteractableError.code(), ElementNotInteractableError.w3cStatus(), ElementNotInteractableError.error());
    }
}
exports.ElementNotInteractableError = ElementNotInteractableError;
class InsecureCertificateError extends ProtocolError {
    static error() {
        return 'insecure certificate';
    }
    /**
     * @param {string} [message] error message
     */
    constructor(message) {
        super(message ||
            'Navigation caused the user agent to hit a certificate warning, which is usually the result of an expired or invalid TLS certificate', ElementIsNotSelectableError.code(), null, InsecureCertificateError.error());
    }
}
exports.InsecureCertificateError = InsecureCertificateError;
class JavaScriptError extends ProtocolError {
    static code() {
        return 17;
    }
    static w3cStatus() {
        return http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR;
    }
    static error() {
        return 'javascript error';
    }
    /**
     * @param {string} [message] error message
     */
    constructor(message) {
        super(message || 'An error occurred while executing user supplied JavaScript.', JavaScriptError.code(), JavaScriptError.w3cStatus(), JavaScriptError.error());
    }
}
exports.JavaScriptError = JavaScriptError;
class XPathLookupError extends ProtocolError {
    static code() {
        return 19;
    }
    static w3cStatus() {
        return http_status_codes_1.StatusCodes.BAD_REQUEST;
    }
    static error() {
        return 'invalid selector';
    }
    /**
     * @param {string} [message] error message
     */
    constructor(message) {
        super(message || 'An error occurred while searching for an element by XPath.', XPathLookupError.code(), XPathLookupError.w3cStatus(), XPathLookupError.error());
    }
}
exports.XPathLookupError = XPathLookupError;
class TimeoutError extends ProtocolError {
    static code() {
        return 21;
    }
    static w3cStatus() {
        return http_status_codes_1.StatusCodes.REQUEST_TIMEOUT;
    }
    static error() {
        return 'timeout';
    }
    /**
     * @param {string} [message] error message
     */
    constructor(message) {
        super(message || 'An operation did not complete before its timeout expired.', TimeoutError.code(), TimeoutError.w3cStatus(), TimeoutError.error());
    }
}
exports.TimeoutError = TimeoutError;
class NoSuchWindowError extends ProtocolError {
    static code() {
        return 23;
    }
    static error() {
        return 'no such window';
    }
    static w3cStatus() {
        return http_status_codes_1.StatusCodes.NOT_FOUND;
    }
    /**
     * @param {string} [message] error message
     */
    constructor(message) {
        super(message ||
            'A request to switch to a different window could not be satisfied ' +
                'because the window could not be found.', NoSuchWindowError.code(), NoSuchWindowError.w3cStatus(), NoSuchWindowError.error());
    }
}
exports.NoSuchWindowError = NoSuchWindowError;
class InvalidArgumentError extends ProtocolError {
    static code() {
        return 61;
    }
    static error() {
        return 'invalid argument';
    }
    static w3cStatus() {
        return http_status_codes_1.StatusCodes.BAD_REQUEST;
    }
    /**
     * @param {string} [err] error message
     */
    constructor(err) {
        super(err || 'The arguments passed to the command are either invalid or malformed', InvalidArgumentError.code(), InvalidArgumentError.w3cStatus(), InvalidArgumentError.error());
    }
}
exports.InvalidArgumentError = InvalidArgumentError;
class InvalidCookieDomainError extends ProtocolError {
    static code() {
        return 24;
    }
    static error() {
        return 'invalid cookie domain';
    }
    static w3cStatus() {
        return http_status_codes_1.StatusCodes.BAD_REQUEST;
    }
    /**
     * @param {string} [err] error message
     */
    constructor(err) {
        super(err ||
            'An illegal attempt was made to set a cookie under a different ' +
                'domain than the current page.', InvalidCookieDomainError.code(), InvalidCookieDomainError.w3cStatus(), InvalidCookieDomainError.error());
    }
}
exports.InvalidCookieDomainError = InvalidCookieDomainError;
class NoSuchCookieError extends ProtocolError {
    static code() {
        return 62;
    }
    static w3cStatus() {
        return http_status_codes_1.StatusCodes.NOT_FOUND;
    }
    static error() {
        return 'no such cookie';
    }
    /**
     * @param {string} [err] error message
     */
    constructor(err) {
        super(err ||
            'No cookie matching the given path name was found amongst the associated cookies of the current browsing context’s active document', NoSuchCookieError.code(), NoSuchCookieError.w3cStatus(), NoSuchCookieError.error());
    }
}
exports.NoSuchCookieError = NoSuchCookieError;
class UnableToSetCookieError extends ProtocolError {
    static code() {
        return 25;
    }
    static w3cStatus() {
        return http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR;
    }
    static error() {
        return 'unable to set cookie';
    }
    /**
     * @param {string} [err] error message
     */
    constructor(err) {
        super(err || "A request to set a cookie's value could not be satisfied.", UnableToSetCookieError.code(), UnableToSetCookieError.w3cStatus(), UnableToSetCookieError.error());
    }
}
exports.UnableToSetCookieError = UnableToSetCookieError;
class UnexpectedAlertOpenError extends ProtocolError {
    static code() {
        return 26;
    }
    static w3cStatus() {
        return http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR;
    }
    static error() {
        return 'unexpected alert open';
    }
    /**
     * @param {string} [message] error message
     */
    constructor(message) {
        super(message || 'A modal dialog was open, blocking this operation', UnexpectedAlertOpenError.code(), UnexpectedAlertOpenError.w3cStatus(), UnexpectedAlertOpenError.error());
    }
}
exports.UnexpectedAlertOpenError = UnexpectedAlertOpenError;
class NoAlertOpenError extends ProtocolError {
    static code() {
        return 27;
    }
    static w3cStatus() {
        return http_status_codes_1.StatusCodes.NOT_FOUND;
    }
    static error() {
        return 'no such alert';
    }
    /**
     *
     * @param {string} [message]
     */
    constructor(message) {
        super(message || 'An attempt was made to operate on a modal dialog when one ' + 'was not open.', NoAlertOpenError.code(), NoAlertOpenError.w3cStatus(), NoAlertOpenError.error());
    }
}
exports.NoAlertOpenError = NoAlertOpenError;
class NoSuchAlertError extends NoAlertOpenError {
}
exports.NoSuchAlertError = NoSuchAlertError;
class ScriptTimeoutError extends ProtocolError {
    static code() {
        return 28;
    }
    static w3cStatus() {
        return http_status_codes_1.StatusCodes.REQUEST_TIMEOUT;
    }
    static error() {
        return 'script timeout';
    }
    /**
     * @param {string} [err] error message
     */
    constructor(err) {
        super(err || 'A script did not complete before its timeout expired.', ScriptTimeoutError.code(), ScriptTimeoutError.w3cStatus(), ScriptTimeoutError.error());
    }
}
exports.ScriptTimeoutError = ScriptTimeoutError;
class InvalidElementCoordinatesError extends ProtocolError {
    static code() {
        return 29;
    }
    static w3cStatus() {
        return http_status_codes_1.StatusCodes.BAD_REQUEST;
    }
    static error() {
        return 'invalid coordinates';
    }
    /**
     * @param {string} [err] error message
     */
    constructor(err) {
        super(err || 'The coordinates provided to an interactions operation are invalid.', InvalidElementCoordinatesError.code(), InvalidElementCoordinatesError.w3cStatus(), InvalidElementCoordinatesError.error());
    }
}
exports.InvalidElementCoordinatesError = InvalidElementCoordinatesError;
class InvalidCoordinatesError extends InvalidElementCoordinatesError {
}
exports.InvalidCoordinatesError = InvalidCoordinatesError;
class IMENotAvailableError extends ProtocolError {
    static code() {
        return 30;
    }
    static w3cStatus() {
        return http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR;
    }
    static error() {
        return 'unsupported operation';
    }
    /**
     * @param {string} [message] error message
     */
    constructor(message) {
        super(message || 'IME was not available.', IMENotAvailableError.code(), IMENotAvailableError.w3cStatus(), IMENotAvailableError.error());
    }
}
exports.IMENotAvailableError = IMENotAvailableError;
class IMEEngineActivationFailedError extends ProtocolError {
    static code() {
        return 31;
    }
    static w3cStatus() {
        return http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR;
    }
    static error() {
        return 'unsupported operation';
    }
    /**
     * @param {string} [err] error message
     */
    constructor(err) {
        super(err || 'An IME engine could not be started.', IMEEngineActivationFailedError.code(), IMEEngineActivationFailedError.w3cStatus(), IMEEngineActivationFailedError.error());
    }
}
exports.IMEEngineActivationFailedError = IMEEngineActivationFailedError;
class InvalidSelectorError extends ProtocolError {
    static code() {
        return 32;
    }
    static w3cStatus() {
        return http_status_codes_1.StatusCodes.BAD_REQUEST;
    }
    static error() {
        return 'invalid selector';
    }
    /**
     * @param {string} [err] error message
     */
    constructor(err) {
        super(err || 'Argument was an invalid selector (e.g. XPath/CSS).', InvalidSelectorError.code(), InvalidSelectorError.w3cStatus(), InvalidSelectorError.error());
    }
}
exports.InvalidSelectorError = InvalidSelectorError;
class SessionNotCreatedError extends ProtocolError {
    static code() {
        return 33;
    }
    static w3cStatus() {
        return http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR;
    }
    static error() {
        return 'session not created';
    }
    constructor(details) {
        let message = 'A new session could not be created.';
        if (details) {
            message += ` Details: ${details}`;
        }
        super(message, SessionNotCreatedError.code(), SessionNotCreatedError.w3cStatus(), SessionNotCreatedError.error());
    }
}
exports.SessionNotCreatedError = SessionNotCreatedError;
class MoveTargetOutOfBoundsError extends ProtocolError {
    static code() {
        return 34;
    }
    static w3cStatus() {
        return http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR;
    }
    static error() {
        return 'move target out of bounds';
    }
    /**
     * @param {string} [err] error message
     */
    constructor(err) {
        super(err || 'Target provided for a move action is out of bounds.', MoveTargetOutOfBoundsError.code(), MoveTargetOutOfBoundsError.w3cStatus(), MoveTargetOutOfBoundsError.error());
    }
}
exports.MoveTargetOutOfBoundsError = MoveTargetOutOfBoundsError;
class NoSuchContextError extends ProtocolError {
    static code() {
        return 35;
    }
    /**
     *
     * @param {string} [message]
     */
    constructor(message) {
        super(message || 'No such context found.', NoSuchContextError.code());
    }
}
exports.NoSuchContextError = NoSuchContextError;
class InvalidContextError extends ProtocolError {
    static code() {
        return 36;
    }
    /**
     *
     * @param {string} [message]
     */
    constructor(message) {
        super(message || 'That command could not be executed in the current context.', InvalidContextError.code());
    }
}
exports.InvalidContextError = InvalidContextError;
// These are aliases for UnknownMethodError
class NotYetImplementedError extends UnknownMethodError {
    /**
     * @param {string} [err] error message
     */
    constructor(err) {
        super(err || 'Method has not yet been implemented');
    }
}
exports.NotYetImplementedError = NotYetImplementedError;
class NotImplementedError extends UnknownMethodError {
    /**
     * @param {string} [err] error message
     */
    constructor(err) {
        super(err || 'Method is not implemented');
    }
}
exports.NotImplementedError = NotImplementedError;
class UnableToCaptureScreen extends ProtocolError {
    static code() {
        return 63;
    }
    static w3cStatus() {
        return http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR;
    }
    static error() {
        return 'unable to capture screen';
    }
    /**
     * @param {string} [err] error message
     */
    constructor(err) {
        super(err || 'A screen capture was made impossible', UnableToCaptureScreen.code(), UnableToCaptureScreen.w3cStatus(), UnableToCaptureScreen.error());
    }
}
exports.UnableToCaptureScreen = UnableToCaptureScreen;
function generateBadParametersMessage(requiredParams, actualParams) {
    const toArray = (/** @type {any} */ x) => (lodash_1.default.isArray(x) ? x : []);
    const requiredParamNames = toArray(requiredParams?.required);
    const actualParamNames = toArray(actualParams);
    const missingRequiredParamNames = lodash_1.default.difference(requiredParamNames, actualParamNames);
    /** @type {string[]} */
    const resultLines = [];
    resultLines.push(lodash_1.default.isEmpty(missingRequiredParamNames)
        ? // This should not happen
            'Some of the provided parameters are not known'
        : `The following required parameter${missingRequiredParamNames.length === 1 ? ' is ' : 's are '}` + `missing: ${JSON.stringify(missingRequiredParamNames)}`);
    if (!lodash_1.default.isEmpty(requiredParamNames)) {
        resultLines.push(`Known required parameters are: ${JSON.stringify(requiredParamNames)}`);
    }
    const optionalParamNames = lodash_1.default.difference(toArray(requiredParams?.optional), ['sessionId', 'id']);
    if (!lodash_1.default.isEmpty(optionalParamNames)) {
        resultLines.push(`Known optional parameters are: ${JSON.stringify(optionalParamNames)}`);
    }
    resultLines.push(`You have provided${lodash_1.default.isEmpty(actualParamNames) ? ' none' : ': ' + JSON.stringify(actualParams)}`);
    return resultLines.join('\n');
}
// Equivalent to W3C InvalidArgumentError
class BadParametersError extends es6_error_1.default {
    static error() {
        return 'invalid argument';
    }
    constructor(requiredParams, actualParams, errMessage) {
        super(errMessage
            ? `Parameters were incorrect. You sent ${JSON.stringify(actualParams)}, ${errMessage}`
            : generateBadParametersMessage(requiredParams, actualParams));
        this.w3cStatus = http_status_codes_1.StatusCodes.BAD_REQUEST;
    }
}
exports.BadParametersError = BadParametersError;
/**
 * ProxyRequestError is a custom error and will be thrown up on unsuccessful proxy request and
 * will contain information about the proxy failure.
 * In case of ProxyRequestError should fetch the actual error by calling `getActualError()`
 * for proxy failure to generate the client response.
 */
class ProxyRequestError extends es6_error_1.default {
    constructor(err, responseError, httpStatus) {
        let responseErrorObj = support_1.util.safeJsonParse(responseError);
        if (!lodash_1.default.isPlainObject(responseErrorObj)) {
            responseErrorObj = {};
        }
        let origMessage = lodash_1.default.isString(responseError) ? responseError : '';
        if (!lodash_1.default.isEmpty(responseErrorObj)) {
            if (lodash_1.default.isString(responseErrorObj.value)) {
                origMessage = responseErrorObj.value;
            }
            else if (lodash_1.default.isPlainObject(responseErrorObj.value) &&
                lodash_1.default.isString(responseErrorObj.value.message)) {
                origMessage = responseErrorObj.value.message;
            }
        }
        super(lodash_1.default.isEmpty(err) ? `Proxy request unsuccessful. ${origMessage}` : err);
        this.w3cStatus = http_status_codes_1.StatusCodes.BAD_REQUEST;
        // If the response error is an object and value is an object, it's a W3C error (for JSONWP value is a string)
        if (lodash_1.default.isPlainObject(responseErrorObj.value) && lodash_1.default.has(responseErrorObj.value, 'error')) {
            this.w3c = responseErrorObj.value;
            this.w3cStatus = httpStatus || http_status_codes_1.StatusCodes.BAD_REQUEST;
        }
        else {
            this.jsonwp = responseErrorObj;
        }
    }
    getActualError() {
        // If it's MJSONWP error, returns actual error cause for request failure based on `jsonwp.status`
        if (support_1.util.hasValue(this.jsonwp?.status) && support_1.util.hasValue(this.jsonwp?.value)) {
            return errorFromMJSONWPStatusCode(this.jsonwp.status, this.jsonwp.value);
        }
        else if (support_1.util.hasValue(this.w3c) && lodash_1.default.isNumber(this.w3cStatus) && this.w3cStatus >= 300) {
            return errorFromW3CJsonCode(this.w3c.error, this.w3c.message || this.message, this.w3c.stacktrace);
        }
        return new UnknownError(this.message);
    }
}
exports.ProxyRequestError = ProxyRequestError;
// map of error class name to error class
const errors = {
    NotYetImplementedError,
    NotImplementedError,
    BadParametersError,
    InvalidArgumentError,
    NoSuchDriverError,
    NoSuchElementError,
    UnknownCommandError,
    StaleElementReferenceError,
    ElementNotVisibleError,
    InvalidElementStateError,
    UnknownError,
    ElementIsNotSelectableError,
    ElementClickInterceptedError,
    ElementNotInteractableError,
    InsecureCertificateError,
    JavaScriptError,
    XPathLookupError,
    TimeoutError,
    NoSuchWindowError,
    NoSuchCookieError,
    InvalidCookieDomainError,
    InvalidCoordinatesError,
    UnableToSetCookieError,
    UnexpectedAlertOpenError,
    NoAlertOpenError,
    ScriptTimeoutError,
    InvalidElementCoordinatesError,
    IMENotAvailableError,
    IMEEngineActivationFailedError,
    InvalidSelectorError,
    SessionNotCreatedError,
    MoveTargetOutOfBoundsError,
    NoSuchAlertError,
    NoSuchContextError,
    InvalidContextError,
    NoSuchFrameError,
    UnableToCaptureScreen,
    UnknownMethodError,
    UnsupportedOperationError,
    ProxyRequestError,
};
exports.errors = errors;
// map of error code to error class
const jsonwpErrorCodeMap = {};
for (let ErrorClass of lodash_1.default.values(errors)) {
    if ('code' in ErrorClass) {
        jsonwpErrorCodeMap[ErrorClass.code()] = ErrorClass;
    }
}
const w3cErrorCodeMap = {};
for (let ErrorClass of lodash_1.default.values(errors)) {
    if ('error' in ErrorClass) {
        w3cErrorCodeMap[ErrorClass.error()] = ErrorClass;
    }
}
function isUnknownError(err) {
    return (!err.constructor.name ||
        !lodash_1.default.values(errors).find(function equalNames(error) {
            return error.name === err.constructor.name;
        }));
}
exports.isUnknownError = isUnknownError;
/**
 * Type guard to check if an Error is of a specific type
 * @template {Error} T
 * @param {any} err
 * @param {import('@appium/types').Class<T>} type
 * @returns {err is T}
 */
function isErrorType(err, type) {
    // `name` property is the constructor name
    if (type.name === ProtocolError.name) {
        // `jsonwpCode` is `0` on success
        return !!err.jsonwpCode;
    }
    else if (type.name === ProxyRequestError.name) {
        // `status` is `0` on success
        if (err.jsonwp) {
            return !!err.jsonwp.status;
        }
        if (lodash_1.default.isPlainObject(err.w3c)) {
            return lodash_1.default.isNumber(err.w3cStatus) && err.w3cStatus >= 300;
        }
        return false;
    }
    return err.constructor.name === type.name;
}
exports.isErrorType = isErrorType;
/**
 * Retrieve an error derived from MJSONWP status
 * @param {number} code JSONWP status code
 * @param {string|Object} value The error message, or an object with a `message` property
 * @return {ProtocolError} The error that is associated with provided JSONWP status code
 */
function errorFromMJSONWPStatusCode(code, value = '') {
    // if `value` is an object, pull message from it, otherwise use the plain
    // value, or default to an empty string, if null
    const message = (value || {}).message || value || '';
    if (code !== UnknownError.code() && jsonwpErrorCodeMap[code]) {
        mjsonwpLog.debug(`Matched JSONWP error code ${code} to ${jsonwpErrorCodeMap[code].name}`);
        return new jsonwpErrorCodeMap[code](message);
    }
    mjsonwpLog.debug(`Matched JSONWP error code ${code} to UnknownError`);
    return new UnknownError(message);
}
exports.errorFromMJSONWPStatusCode = errorFromMJSONWPStatusCode;
/**
 * Retrieve an error derived from W3C JSON Code
 * @param {string} code W3C error string (see https://www.w3.org/TR/webdriver/#handling-errors `JSON Error Code` column)
 * @param {string} message the error message
 * @param {?string} stacktrace an optional error stacktrace
 * @return {ProtocolError}  The error that is associated with the W3C error string
 */
function errorFromW3CJsonCode(code, message, stacktrace = null) {
    if (code && w3cErrorCodeMap[code.toLowerCase()]) {
        w3cLog.debug(`Matched W3C error code '${code}' to ${w3cErrorCodeMap[code.toLowerCase()].name}`);
        const resultError = new w3cErrorCodeMap[code.toLowerCase()](message);
        resultError.stacktrace = stacktrace;
        return resultError;
    }
    w3cLog.debug(`Matched W3C error code '${code}' to UnknownError`);
    const resultError = new UnknownError(message);
    resultError.stacktrace = stacktrace;
    return resultError;
}
exports.errorFromW3CJsonCode = errorFromW3CJsonCode;
/**
 *
 * @param {any} err
 * @returns {err is ProtocolError}
 */
function isProtocolError(err) {
    return 'w3cStatus' in err;
}
/**
 * Convert an Appium error to proper W3C HTTP response
 * @param {ProtocolError|MJSONWPError} err The error that needs to be translated
 */
function getResponseForW3CError(err) {
    let httpStatus;
    // W3C defined error message (https://www.w3.org/TR/webdriver/#dfn-error-code)
    let w3cErrorString;
    if (!isProtocolError(err)) {
        err = support_1.util.hasValue(err.status)
            ? // If it's a JSONWP error, find corresponding error
                errorFromMJSONWPStatusCode(err.status, err.value)
            : new errors.UnknownError(err.message);
    }
    if (isErrorType(err, errors.BadParametersError)) {
        // respond with a 400 if we have bad parameters
        w3cLog.debug(`Bad parameters: ${err}`);
        w3cErrorString = BadParametersError.error();
    }
    else {
        // @ts-expect-error unclear what the problem is here
        w3cErrorString = err.error;
    }
    httpStatus = err.w3cStatus;
    if (!w3cErrorString) {
        w3cErrorString = UnknownError.error();
    }
    let httpResBody = {
        value: {
            error: w3cErrorString,
            message: err.message,
            stacktrace: err.stacktrace || err.stack,
        },
    };
    return [httpStatus, httpResBody];
}
exports.getResponseForW3CError = getResponseForW3CError;
/**
 * Convert an Appium error to a proper JSONWP response
 * @param {ProtocolError} err The error to be converted
 */
function getResponseForJsonwpError(err) {
    if (isUnknownError(err)) {
        err = new errors.UnknownError(err);
    }
    // MJSONWP errors are usually 500 status code so set it to that by default
    let httpStatus = http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR;
    /** @type {HttpResultBody} */
    let httpResBody = {
        status: err.jsonwpCode,
        value: {
            message: err.message,
        },
    };
    if (isErrorType(err, errors.BadParametersError)) {
        // respond with a 400 if we have bad parameters
        mjsonwpLog.debug(`Bad parameters: ${err}`);
        httpStatus = http_status_codes_1.StatusCodes.BAD_REQUEST;
        httpResBody = err.message;
    }
    else if (isErrorType(err, errors.NotYetImplementedError) ||
        isErrorType(err, errors.NotImplementedError)) {
        // respond with a 501 if the method is not implemented
        httpStatus = http_status_codes_1.StatusCodes.NOT_IMPLEMENTED;
    }
    else if (isErrorType(err, errors.NoSuchDriverError)) {
        // respond with a 404 if there is no driver for the session
        httpStatus = http_status_codes_1.StatusCodes.NOT_FOUND;
    }
    return [httpStatus, httpResBody];
}
exports.getResponseForJsonwpError = getResponseForJsonwpError;
/**
 * @typedef { string | {value: HttpResultBodyValue, status?: number } } HttpResultBody
 */
/**
 * @typedef HttpResultBodyValue
 * @property {string} [message]
 * @property {string|Error} [error]
 * @property {string} [stacktrace]
 */
/**
 * @typedef MJSONWPError
 * @property {number} status
 * @property {string|object} value
 * @property {string} message
 */
//# sourceMappingURL=errors.js.map