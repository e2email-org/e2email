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
 * @fileoverview Controller for the key recovery page.
 */
goog.provide('e2email.pages.recover.RecoverCtrl');

goog.require('e2email.constants.Location');

goog.scope(function() {



/**
 * Recover page controller.
 *
 * @param {!angular.$log} $log The Angular $log service.
 * @param {!angular.$location} $location The Angular $location service.
 * @param {!e2email.components.translate.TranslateService} translateService
 *     The Translate service.
 * @param {!e2email.components.openpgp.OpenPgpService} openpgpService
 *     The OpenPGP service.
 * @param {!e2email.components.gmail.GmailService} gmailService
 *     The Gmail service.
 * @param {!e2email.components.auth.AuthService} authService
 *     The Authentication service.
 * @constructor
 * @ngInject
 * @export
 */
e2email.pages.recover.RecoverCtrl = function(
    $log, $location, translateService, openpgpService, gmailService,
    authService) {
  /** @private */
  this.log_ = $log;
  /** @private */
  this.location_ = $location;
  /** @private */
  this.translateService_ = translateService;
  /** @private */
  this.openpgpService_ = openpgpService;
  /** @private */
  this.gmailService_ = gmailService;
  /** @private */
  this.authService_ = authService;
  /** @type {?string} */
  this.recoveryCode = null;
  /** @type {?string} */
  this.errors = null;
  /** @type {?string} */
  this.status = null;
};

var RecoverCtrl = e2email.pages.recover.RecoverCtrl;


/**
 * Regular expression that selects for valid base58 encoding
 * characters, but includes spaces.
 * @const
 * @export
 */
RecoverCtrl.prototype.REGEX_BASE58 = /^[1-9A-HJ-NP-Za-km-z ]+$/;


/**
 * Goes into the reset account flow.
 * @export
 */
RecoverCtrl.prototype.reset = function() {
  this.location_.path(e2email.constants.Location.RESET);
};


/**
 * Returns any current error message.
 * @return {?string}
 * @export
 */
RecoverCtrl.prototype.getErrors = function() {
  return this.errors;
};


/**
 * Uses the provided code to recover the keyring.
 * @export
 */
RecoverCtrl.prototype.unlock = function() {
  if (!goog.isDefAndNotNull(this.recoveryCode1)) {
    this.errors = this.translateService_.getMessage('missingCodeStatus');
    return;
  } else if (!goog.isDefAndNotNull(this.recoveryCode2)) {
    this.errors = this.translateService_.getMessage('missingCodeStatus');
    return;
  } else if (!goog.isDefAndNotNull(this.recoveryCode3)) {
    this.errors = this.translateService_.getMessage('missingCodeStatus');
    return;
  } else if (!goog.isDefAndNotNull(this.recoveryCode4)) {
    this.errors = this.translateService_.getMessage('missingCodeStatus');
    return;
  } else if (!goog.isDefAndNotNull(this.recoveryCode5)) {
    this.errors = this.translateService_.getMessage('missingCodeStatus');
    return;
  } 

  this.status = this.translateService_.getMessage('checkingCodeStatus');
  this.errors = null;
  // Removes all spaces
  var code = this.recoveryCode1.replace(/\s+/g, '')+this.recoveryCode2.replace(/\s+/g, '')+
this.recoveryCode3.replace(/\s+/g, '')+
this.recoveryCode4.replace(/\s+/g, '')+
this.recoveryCode5.replace(/\s+/g, '');

  this.authService_.getIdentityToken().then(goog.bind(function(idtoken) {
    return this.openpgpService_.restoreFromSecretBackupCode(
        code, this.gmailService_.mailbox.email, idtoken, this);
  }, this)).then(goog.bind(function() {
    // Sends a notification on a successful recovery.
    this.status = this.translateService_.getMessage('sendNotificationStatus');
    return this.gmailService_.sendNewDeviceMail();
  }, this)).then(goog.bind(function() {
    // And continues to the main application view.
    this.location_.path(e2email.constants.Location.THREADS);
  }, this)).catch(goog.bind(function(err) {
    this.log_.info(err);
    if (goog.isDefAndNotNull(err.message)) {
      this.errors = err.message;
    } else {
      this.errors = err.toString();
    }
  }, this)).finally(goog.bind(function() {
    this.status = null;
  }, this));
};

});  // goog.scope
