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
 * @fileoverview Controller for the application setup flow.
 */
goog.provide('e2email.pages.setup.SetupCtrl');
goog.provide('e2email.pages.setup.SetupCtrl.State');

goog.require('e2e.error.InvalidArgumentsError');
goog.require('e2email.constants.Location');
goog.require('goog.array');
goog.require('goog.asserts');

goog.scope(function() {



/**
 * The setup controller is typically run during startup, and has no
 * user controllable interactions.  Instead, it runs a series of tests
 * on the state of the application, and redirects the user to a view
 * that needs user interaction of some kind. Some of the checks may
 * also automatically run long-running tasks like key-pair creation
 * (eg: if this is the first time the user has installed this
 * application.)  Once all checks and tasks are complete, it will
 * route the application to a suitable view.
 *
 * @param {!angular.Scope} $scope
 * @param {!angular.$location} $location The angular $location service.
 * @param {!angular.$log} $log The angular $log service.
 * @param {!angular.$q} $q The angular $q service.
 * @param {!e2email.components.translate.TranslateService} translateService
 * @param {!e2email.components.gmail.GmailService} gmailService
 * @param {!e2email.components.openpgp.OpenPgpService} openpgpService
 * @param {!e2email.components.auth.AuthService} authService
 * @constructor
 * @ngInject
 * @export
 */
e2email.pages.setup.SetupCtrl = function(
    $scope, $location, $log, $q,
    translateService, gmailService, openpgpService, authService) {
  /** @private */
  this.location_ = $location;

  /** @private */
  this.translateService_ = translateService;

  /** @private */
  this.gmailService_ = gmailService;

  /** @private */
  this.openpgpService_ = openpgpService;

  /** @private */
  this.authService_ = authService;

  /** @private */
  this.log_ = $log;

  /** @private */
  this.q_ = $q;

  /**
   * @type {?string}
   */
  this.status = this.translateService_.getMessage('initializeStatus');

  /**
   * Holds the user's email address once the code confirms the application
   * is authorized to access the Gmail API.
   * @type {string}
   */
  this.email = '...'; // Initial value renders as ellipses.
  // Automatically run the state checker when the view has loaded.
  $scope.$on('$viewContentLoaded', goog.bind(this.check_, this));
};


/**
 * Internal typedef to track the state of the app through
 * various async calls.
 * Location holds the eventual destination view target,
 * priorPrivateKey holds (if available) a the user's pre-existing
 * local private key,
 * priorRegisteredKey holds (if available) the user's pre-existing
 * public key on the keyserver, and
 * newKey is true if the code generated a new key during setup.
 * @typedef {{
 *     location: ?string,
 *     priorPrivateKey: e2e.openpgp.Key,
 *     priorPublicKey: e2e.openpgp.Key,
 *     newKey: boolean
 * }}
 */
e2email.pages.setup.SetupCtrl.State;

var SetupCtrl = e2email.pages.setup.SetupCtrl;


/**
 * Checks the state of the application, performs any additional
 * initializations as needed, and routes to the most appropriate view.
 * @private
 */
SetupCtrl.prototype.check_ = function() {

  /**
   * This state is updated through the series of async operations.
   * @type {!e2email.pages.setup.SetupCtrl.State}
   */
  var thestate = {
    location: null, priorPrivateKey: null, priorPublicKey: null, newKey: false
  };

  // This chain of promises determines the eventual view for the app
  // as it runs various tests or tasks based on the state of the app.
  // Each promise is passed a state object, which it updates and
  // returns when it completes.

  // First initializes any asynchronous services
  this.checkInitialized_()
      // Checks if we're authorized to access the Gmail API.
      .then(goog.bind(this.checkAuthorized_, this, thestate))
      // Checks for a locally available private key.
      .then(goog.bind(function(state) {
        return this.checkPrivateKey_(state);
      }, this))
      // Checks for a key on the keyserver.
      .then(goog.bind(function(state) {
        return this.checkRegisteredKey_(state);
      }, this))
      // Sets a destination location if we need user intervention.
      .then(goog.bind(function(state) {
        return this.setLocationIfNeeded_(state);
      }, this))
      // Runs any automatic tasks like key-pair generation.
      .then(goog.bind(function(state) {
        return this.runAutomaticTasksIfNeeded_(state);
      }, this))
      // Sends a welcome message if we generated a new key
      .then(goog.bind(function(state) {
        return this.sendWelcomeIfNeeded_(state);
      }, this))
      // The view location should be available by now.
      .then(goog.bind(function(state) {
        if (!goog.isDefAndNotNull(state.location)) {
          throw new e2e.error.InvalidArgumentsError(
              'Unexpected - no location set');
        } else {
          this.location_.path(state.location);
          return state;
        }
      }, this)).catch(goog.bind(function(err) {
        // Errors here are unexpected, so just log, report and stop.
        this.status = err.toString();
        this.log_.error(err);
      }, this));
};


/**
 * Performs any asynchronous initializations required by the
 * application.
 * @return {!angular.$q.Promise} a promise that resolves once all
 *     initializations are complete.
 * @private
 */
SetupCtrl.prototype.checkInitialized_ = function() {
  // Just one service to initialize, so return its promise directly.
  // We initialize the service with an empty passphrase.
  return this.openpgpService_.initialize('');
};


/**
 * Confirms the application is authorized to access the Gmail API, and
 * sets the email property upon confirmation. Otherwise, redirects to a
 * suitable view.
 * @param {!e2email.pages.setup.SetupCtrl.State} state
 * @return {!angular.$q.Promise<!e2email.pages.setup.SetupCtrl.State>|
 *     !e2email.pages.setup.SetupCtrl.State}
 * @private
 */
SetupCtrl.prototype.checkAuthorized_ = function(state) {
  // Location decided, do nothing.
  if (goog.isDefAndNotNull(state.location)) {
    return state;
  }
  this.status = this.translateService_.getMessage('checkAuthorizedStatus');
  // Chains a promise that confirms the application has all needed
  // permissions.
  return this.gmailService_.isAuthorized().then(
      goog.bind(function(isAuthorized) {
        if (isAuthorized) {
          // Updates email property from the gmail service.
          this.email = this.gmailService_.mailbox.email;
        } else {
          // Not authorized, so redirects the user to the welcome view.
          state.location = e2email.constants.Location.INTRODUCTION;
        }
        return state;
      }, this));
};


/**
 * Checks if the application has a private key for the user.
 * @param {!e2email.pages.setup.SetupCtrl.State} state
 * @return {!angular.$q.Promise<!e2email.pages.setup.SetupCtrl.State>|
 *     !e2email.pages.setup.SetupCtrl.State}
 * @private
 */
SetupCtrl.prototype.checkPrivateKey_ = function(state) {
  // Location decided, do nothing.
  if (goog.isDefAndNotNull(state.location)) {
    return state;
  }
  // Chains a promise that adds the private key to the state when found.
  this.status = this.translateService_.getMessage('checkPrivateKeyStatus');
  return this.openpgpService_.searchPrivateKey(
      this.gmailService_.mailbox.email).then(function(key) {
        if (goog.isDefAndNotNull(key) && goog.isDefAndNotNull(key.key)) {
          state.priorPrivateKey = key;
        }
        return state;
      });
};


/**
 * Checks whether the user a public key at the keyserver.
 * @param {!e2email.pages.setup.SetupCtrl.State} state
 * @return {!angular.$q.Promise<!e2email.pages.setup.SetupCtrl.State>|
 *     !e2email.pages.setup.SetupCtrl.State}
 * @private
 */
SetupCtrl.prototype.checkRegisteredKey_ = function(state) {
  // Location decided, do nothing.
  if (goog.isDefAndNotNull(state.location)) {
    return state;
  }
  // Chains a promise that looks for a public key at the keyserver.
  this.status = this.translateService_.getMessage('checkRegisteredKeyStatus');
  return this.openpgpService_.searchPublicKey(
      this.gmailService_.mailbox.email, true).then(function(key) {
        if (goog.isDefAndNotNull(key) && goog.isDefAndNotNull(key.key)) {
          state.priorPublicKey = key;
        }
        return state;
      });
};


/**
 * Based on the available state information, decides whether user
 * intervention is needed, and if so, sets a suitable location.
 * @param {!e2email.pages.setup.SetupCtrl.State} state
 * @return {!e2email.pages.setup.SetupCtrl.State}
 * @private
 */
SetupCtrl.prototype.setLocationIfNeeded_ = function(state) {
  // Location decided, do nothing.
  if (goog.isDefAndNotNull(state.location)) {
    return state;
  }

  if (goog.isDefAndNotNull(state.priorPublicKey)) {
    // User has a public key on the keyserver.
    if (!goog.isDefAndNotNull(state.priorPrivateKey) ||
        !goog.array.equals(state.priorPublicKey.key.fingerprint,
                           state.priorPrivateKey.key.fingerprint)) {
      // We don't have a local private key, or the local and remote
      // keys don't match. In either case, we ask the user to recover
      // or reset their account with a recovery code.
      state.location = e2email.constants.Location.RECOVER;
    } else {
      // User has a local private key, and its fingerprint matches the
      // fingerprint at the keyserver. Everything looks normal, so
      // proceed to the main application view.
      state.location = e2email.constants.Location.THREADS;
    }
  } else {
    // User does not have a public key on the keyserver, and may or
    // may not have a local private key. This case is automatically
    // handled by the next chained method, and we do nothing here.
  }
  return state;
};


/**
 * Performs any automatic chores like generating a new key and
 * uploading it to the keyserver.
 * @param {!e2email.pages.setup.SetupCtrl.State} state
 * @return {!angular.$q.Promise<!e2email.pages.setup.SetupCtrl.State>|
 *     !e2email.pages.setup.SetupCtrl.State}
 * @private
 */
SetupCtrl.prototype.runAutomaticTasksIfNeeded_ = function(state) {
  // Location decided, do nothing.
  if (goog.isDefAndNotNull(state.location)) {
    return state;
  }

  // We should be here only when the user doesn't have a public key at
  // the keyserver.
  if (goog.isDefAndNotNull(state.priorPublicKey)) {
    throw new e2e.error.InvalidArgumentsError(
        'Unexpected state, already have a remote public key.');
  }

  if (goog.isDefAndNotNull(state.priorPrivateKey)) {
    // User has a private key, but no registered public key. This may
    // be a bug or a transient issue - we chain a promise that publishes
    // the public key we should have, and redirects to the main application
    // view once done.
    this.status = this.translateService_.getMessage('updateKeyStatus');
    return this.authService_.getIdentityToken().then(
        goog.bind(function(idtoken) {
          // Idtoken is guaranteed to be available here.
          return this.openpgpService_.publishKey(
              this.gmailService_.mailbox.email,
              goog.asserts.assertString(idtoken), this);
        }, this)).then(function(keys) {
          // Once uploaded, go to the main app page.
          state.location = e2email.constants.Location.THREADS;
          return state;
        });

  } else {
    // User doesn't have a private key, and doesn't have a published
    // public key. This is considered to be a new installation, so we
    // chain a promise that generates a new keypair and redirects to
    // the "write down my secret code" page.
    this.status = this.translateService_.getMessage('createKeyStatus');
    return this.authService_.getIdentityToken().then(
        goog.bind(function(idtoken) {
          // Idtoken is guaranteed to be available here.
          return this.openpgpService_.generateKey(
              this.gmailService_.mailbox.email,
              goog.asserts.assertString(idtoken), this);
        }, this)).then(function(keys) {
          // Once created, update the state and redirect to the show
          // secret page.
          state.newKey = true;
          state.location = e2email.constants.Location.SHOWSECRET;
          return state;
        });
  }
};


/**
 * Sends a welcome email this is a fresh installation.
 * @param {!e2email.pages.setup.SetupCtrl.State} state
 * @return {!angular.$q.Promise<!e2email.pages.setup.SetupCtrl.State>|
 *     !e2email.pages.setup.SetupCtrl.State}
 * @private
 */
SetupCtrl.prototype.sendWelcomeIfNeeded_ = function(state) {
  // If there were no prior local or remote keys, and a new key was
  // generated, this is considered a new installation.
  if (state.newKey &&
      !goog.isDefAndNotNull(state.priorPrivateKey) &&
      !goog.isDefAndNotNull(state.priorPublicKey)) {
    this.status = this.translateService_.getMessage('sendWelcomeMailStatus');
    return this.gmailService_.sendWelcomeMail().then(function() {
      return state;
    });
  } else {
    // Nothing to do.
    return state;
  }
};


});  // goog.scope
