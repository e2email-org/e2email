/**
 * @license
 * Copyright 2016 E2EMail authors. All rights reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Service managing Gmail authentication.
 */
goog.provide('e2email.components.auth.AuthService');
goog.provide('e2email.components.auth.module');

goog.require('e2e.openpgp.error.InvalidArgumentsError');

goog.scope(function() {


/**
 * The name for the email-address-only scope.
 * @const
 * @private
 */
var EMAIL_SCOPE_ = 'email';



/**
 * Service to manage Gmail authentication
 * @param {!angular.$window} $window The angular $window service.
 * @param {!angular.$log} $log The angular $log service.
 * @param {!angular.$q} $q The angular $q service.
 * @param {!angular.$http} $http The angular $http service.
 * @ngInject
 * @constructor
 */
e2email.components.auth.AuthService = function($window, $log, $q, $http) {
  /** @private */
  this.chrome_ = $window.chrome;
  /** @private */
  this.log_ = $log;
  /** @private */
  this.q_ = $q;
  /** @private */
  this.http_ = $http;
};

var AuthService = e2email.components.auth.AuthService;


/**
 * Revokes any authorization acquired from the user, and effectively
 * 'signs out' of Gmail.
 * @return {!angular.$q.Promise}
 */
AuthService.prototype.signOut = function() {
  return this.revokeScope_(null).catch(goog.bind(function(any) {
    // Log, but ignore errors.
    this.log_.info('Skipping server revoke error', any);
  }, this));
};


/**
 * Removes tokens for the passed-in scope, and also revokes it on the server.
 * @param {?string} scope The scope to revoke (null for the default scope.)
 * @return {!angular.$q.Promise} A promise that returns when the tokens
 *     have been revoked.
 * @private
 */
AuthService.prototype.revokeScope_ = function(scope) {
  var cached = null;

  return this.getToken(false, scope).then(goog.bind(function(token) {
    // Save this token (so we can revoke it on the server end.)
    cached = token;
    // And chain a promise to remove it locally.
    return this.removeCachedToken_(cached);
  }, this)).then(goog.bind(function() {
    if (goog.isDefAndNotNull(cached)) {
      // Chain a promise to revoke it on the server end.
      return this.http_.get(
          'https://accounts.google.com/o/oauth2/revoke?token=' + cached);
    } else {
      // Just return normally, nothing to do.
    }
  }, this));
};


/**
 * @return {!angular.$q.Promise<string>} An identity OAuth token, always
 *     freshly minted, and shows an approval screen if necessary.
 */
AuthService.prototype.getIdentityToken = function() {
  return this.getToken(true, EMAIL_SCOPE_, true, true);
};


/**
 * Given a config object suitable for the Angularjs http service,
 * add an OAuth authorization header.
 * @param {!Object} config The config object.
 * @param {string} token The OAuth access token.
 */
AuthService.prototype.addAuthorization = function(config, token) {
  if (!goog.isDefAndNotNull(config['headers'])) {
    config['headers'] = {};
  }
  config['headers']['Authorization'] = 'Bearer ' + token;
};


/**
 * Obtain an OAuth token.
 * @param {boolean} interactive A boolean to specify if the user is
 *     allowed to manually approve a desired scope if necessary.
 * @param {?string} scope The desired scope, or null to use scopes from
 *     the manifest.
 * @param {boolean=} opt_mustHave Set to true to reject as an error if the token
 *     cannot be obtained. Defaults to false.
 * @param {boolean=} opt_new Set to true to first remove the code from the
 *     cache and get a newly minted token. Defaults to false.
 * @return {!angular.$q.Promise<!string>} A promise that returns
 *     a token if available.
 */
AuthService.prototype.getToken = function(
    interactive, scope, opt_mustHave, opt_new) {
  var deferred = this.q_.defer();
  var options = { 'interactive': interactive };
  if (goog.isDefAndNotNull(scope)) {
    options['scopes'] = [scope];
  }

  this.chrome_.identity.getAuthToken(options, goog.bind(function(token) {
    // To be safe, refuse (make null) any tokens passed in when there
    // are errors.
    if (goog.isDefAndNotNull(this.chrome_.runtime.lastError)) {
      token = null;
    }
    if (opt_mustHave &&
        (goog.isDefAndNotNull(this.chrome_.runtime.lastError) ||
        !goog.isDefAndNotNull(token))) {
      var msg = goog.isDefAndNotNull(scope) ? scope : 'default scope';
      deferred.reject(new e2e.openpgp.error.InvalidArgumentsError(
          'Unable to authorize access to Gmail "' + msg + '"'));
    } else {
      deferred.resolve(token);
    }
  }, this));

  if (!opt_new) {
    // Nothing else to do, just return the promise.
    return deferred.promise;
  } else {
    // We've been asked to mint a fresh token, so chain calls to fetch the
    // token again after we remove it from the cache.
    return deferred.promise.then(goog.bind(function(token) {
      return this.removeCachedToken_(token);
    }, this)).then(goog.bind(function(token) {
      if (goog.isDefAndNotNull(token)) {
        // But this time don't ask to mint a new token.
        return this.getToken(interactive, scope, opt_mustHave, false);
      } else {
        // We didn't get a token even the first time, so just
        // pass it through.
        return null;
      }
    }, this));
  }
};


/**
 * Remove a provided token from chrome's cache.
 * @param {?string} token This token should be removed from the cache.
 * @return {!angular.$q.Promise<string>} Returns the passed-in token.
 * @private
 */
AuthService.prototype.removeCachedToken_ = function(token) {
  var deferred = this.q_.defer();
  if (goog.isDefAndNotNull(token)) {
    this.chrome_.identity.removeCachedAuthToken({token: token}, function() {
      deferred.resolve(token);
    });
  } else {
    // just resolve right away.
    deferred.resolve(token);
  }

  return deferred.promise;
};


/**
 * Monitors a http promise generated by an operation - possibly
 * running it twice, the second time by refreshing an OAuth token if
 * the first request resulted in an authorization failure. The
 * operation being monitored is passed a token, and it returns the
 * promise that should be run.
 * This method itself returns a promise that runs the underlying
 * promise returned by the operation.
 * @param {?string} scope Should be null for the default scope.
 * @param {boolean} retry Should be true to retry (once).
 * @param {function(string):!angular.$http.HttpPromise} op The operation
 *     that should be monitored. It should take in an access token, and
 *     return a promise that runs the http operation.
 * @return {!angular.$q.Promise} A promise that monitors and runs
 *     the http operation.
 */
AuthService.prototype.withAuth = function(scope, retry, op) {
  return this.getToken(false, scope).then(goog.bind(function(token) {
    // return either the promise itself, or a chained promise
    // that handles errors if we were asked to retry.
    var promise = op(token);
    if (!retry) {
      // We should not retry, so just return the underlying promise.
      return promise;
    } else {
      // We should retry, so return a chained promise that catches
      // authorization errors and retries (once) after removing the
      // token from the cache.
      return promise.catch(goog.bind(function(resp) {
        if (resp.status !== 400) {
          // we don't handle anything other than 400 errors, so just
          // abort at this point.
          return this.q_.reject(resp);
        } else {
          // remove cached token and retry once.
          return this.removeCachedToken_(token).then(goog.bind(function() {
            return this.withAuth(scope, false, op);
          }, this));
        }
      }, this));
    }
  }, this));
};


/**
 * Angular module.
 * @type {!angular.Module}
 */
e2email.components.auth.module = angular
    .module('e2email.components.auth.AuthService', [])
    .service('authService', AuthService);

});  // goog.scope
