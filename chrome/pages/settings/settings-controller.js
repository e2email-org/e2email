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
 * @fileoverview Controller for the settings view for the application.
 */
goog.provide('e2email.pages.settings.SettingsCtrl');

goog.require('e2email.constants.Location');


goog.scope(function() {



/**
 * Settings page controller.
 *
 * @param {!angular.Scope} $scope
 * @param {!angular.$location} $location The Angular location service.
 * @param {!e2email.components.appinfo.AppinfoService} appinfoService
 *     the appinfo service.
 * @param {!e2email.components.openpgp.OpenPgpService} openpgpService
 *     The OpenPGP service.
 * @param {!e2email.components.gmail.GmailService} gmailService
 *     the gmail service.
 * @constructor
 * @ngInject
 * @export
 */
e2email.pages.settings.SettingsCtrl = function(
    $scope, $location, appinfoService, openpgpService, gmailService) {

  /** @private */
  this.location_ = $location;

  /** @private */
  this.appinfoService_ = appinfoService;

  /** @private */
  this.openpgpService_ = openpgpService;

  var email = goog.isDefAndNotNull(gmailService.mailbox.email) ?
      gmailService.mailbox.email : 'Unknown';
  /** @type {!e2email.models.user.User} */
  this.info = {
    'email': email,
    'fingerprintChanged': false,
    'name': null,
    'fingerprintHex': null
  };
  /** @type {?string} */
  this.recoveryCode = null;

  /** @type {boolean} */
  this.showIDCheckHelp = false;

  /** @type {string} */
  this.appVersion = appinfoService.getVersion();

  /** @type {string|undefined} */
  this.appPlatform = undefined;

  // Refresh additional information
  $scope.$on('$viewContentLoaded', goog.bind(this.refresh_, this));
};


var SettingsCtrl = e2email.pages.settings.SettingsCtrl;


/**
 * Runs an async task to update user information.
 * @private
 */
SettingsCtrl.prototype.refresh_ = function() {
  this.openpgpService_.searchPublicKey(this.info.email, false)
      .then(goog.bind(function(key) {
        if (goog.isDefAndNotNull(key)) {
          this.info.fingerprintHex = key.key.fingerprintHex;
        }
      }, this))
          .then(goog.bind(this.createBackupCode_, this))
          .then(goog.bind(this.getApplicationInfo_, this));
};


/**
 * Creates a backup code if necessary.
 * @private
 * @return {!angular.$q.Promise}
 */
SettingsCtrl.prototype.createBackupCode_ = function() {
  return this.openpgpService_.getSecretBackupCode(this.info.email)
      .then(goog.bind(function(code) {
        this.recoveryCode = this.nicelyFormat_(code);
      }, this));
};


/**
 * Fetches application info if necessary.
 * @private
 * @return {!angular.$q.Promise}
 */
SettingsCtrl.prototype.getApplicationInfo_ = function() {
  return this.appinfoService_.getPlatform()
      .then(goog.bind(function(platform) {
        this.appPlatform = platform;
      }, this));
};


/**
 * Returns user information around primary user.
 * @return {?e2email.models.user.User}
 * @export
 */
SettingsCtrl.prototype.getInfo = function() {
  return this.info;
};


/**
 * Returns the recovery code, if available.
 * @return {?string}
 * @export
 */
SettingsCtrl.prototype.getRecoveryCode = function() {
  return this.recoveryCode;
};


/**
 * Toggles whether the help screen should be displayed or not.
 * @param {!angular.Scope.Event} event
 * @export
 */
SettingsCtrl.prototype.toggleIDCheckHelp = function(event) {
  this.showIDCheckHelp = !this.showIDCheckHelp;
  event.stopPropagation();
};


/**
 * Returns true if the help screen for the ID Check should be visible.
 * @return {boolean}
 * @export
 */
SettingsCtrl.prototype.getShowIDCheckHelp = function() {
  return this.showIDCheckHelp;
};


/**
 * Returns the application version.
 * @return {string}
 * @export
 */
SettingsCtrl.prototype.getAppVersion = function() {
  return this.appVersion;
};


/**
 * Returns the application platform.
 * @return {string|undefined}
 * @export
 */
SettingsCtrl.prototype.getAppPlatform = function() {
  return this.appPlatform;
};


/**
 * Given a string, chunks it to make it somewhat easier to read.
 * @param {string} input
 * @return {string} formatted string.
 * @private
 */
SettingsCtrl.prototype.nicelyFormat_ = function(input) {
  return input.match(/.{1,5}/g).join(' ');
};


/**
 * Redirects the application to the thread list view.
 * @export
 */
SettingsCtrl.prototype.showThreads = function() {
  this.location_.path(e2email.constants.Location.THREADS);
};


});  // goog.scope
