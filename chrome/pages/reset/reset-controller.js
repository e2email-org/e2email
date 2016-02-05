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
 * @fileoverview Controller for the reset account view.
 */
goog.provide('e2email.pages.reset.ResetCtrl');

goog.require('e2email.constants.Location');

goog.scope(function() {



/**
 * Reset page controller.
 *
 * @param {!angular.$location} $location angular location service.
 * @param {!e2email.components.translate.TranslateService} translateService
 * @param {!e2email.components.gmail.GmailService} gmailService
 * @param {!e2email.components.openpgp.OpenPgpService} openpgpService
 * @param {!e2email.components.auth.AuthService} authService
 *     The Authentication service.
 * @constructor
 * @ngInject
 * @export
 */
e2email.pages.reset.ResetCtrl = function(
    $location, translateService, gmailService, openpgpService, authService) {
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
  /** @type {?string} */
  this.status = null;
  /**
   * Controller sets this to true when there are any in-progress
   * background operations.
   * @type {boolean}
   */
  this.inProgress = false;
};

var ResetCtrl = e2email.pages.reset.ResetCtrl;


/**
 * Goes back to the recover account flow.
 * @export
 */
ResetCtrl.prototype.cancel = function() {
  this.location_.path(e2email.constants.Location.RECOVER);
};


/**
 * Generates a new key, publishes it and finally redirects the
 * user to the "write down my secret code" page.
 * @export
 */
ResetCtrl.prototype.goAhead = function() {
  this.status = this.translateService_.getMessage('resetKeyStatus');
  this.inProgress = true;

  // Run a sequence of async tasks that generates a new keypair,
  // and sends an email that this account was reset.
  this.authService_.getIdentityToken().then(
      goog.bind(function(idtoken) {
        // Idtoken is guaranteed to be available here.
        return this.openpgpService_.generateKey(
            this.gmailService_.mailbox.email, idtoken, this);
      }, this)).then(goog.bind(function(keys) {
        // Chains a task that posts an email that this account was
        // reset.
        this.status = this.translateService_.getMessage('sendResetMailStatus');
        return this.gmailService_.sendResetMail();
      }, this)).then(goog.bind(function() {
        // Redirects the user to the showsecret page.
        this.status = null;
        this.location_.path(e2email.constants.Location.SHOWSECRET);
      }, this)).catch(goog.bind(function(err) {
        this.status = err.toString();
      }, this)).finally(goog.bind(function() {
        this.inProgress = false;
      }, this));
};


});  // goog.scope
