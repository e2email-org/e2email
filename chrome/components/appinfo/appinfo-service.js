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
 * @fileoverview Service that holds basic information about
 * the application (e.g. its version.)
 */
goog.provide('e2email.components.appinfo.AppinfoService');
goog.provide('e2email.components.appinfo.module');


goog.scope(function() {



/**
 * Service that provides access to basic information about
 * the application.
 * @param {!angular.$window} $window The angular $window service.
 * @param {!angular.$q} $q The angular $q service.
 * @ngInject
 * @constructor
 */
e2email.components.appinfo.AppinfoService = function($window, $q) {
  /** @private */
  this.chrome_ = $window.chrome;
  /** @private */
  this.q_ = $q;
  /** @private */
  this.appVersion_ = this.chrome_.runtime.getManifest().version;
  /** @private {string|undefined} */
  this.appPlatform_ = undefined;
};

var AppinfoService = e2email.components.appinfo.AppinfoService;


/**
 * Returns the current version of the application.
 * @return {string}
 */
AppinfoService.prototype.getVersion = function() {
  return this.appVersion_;
};


/**
 * Returns information about the current platform.
 * @return {!angular.$q.Promise<string>}
 */
AppinfoService.prototype.getPlatform = function() {
  if (goog.isDefAndNotNull(this.appPlatform_)) {
    return this.q_.when(this.appPlatform_);
  }
  var deferred = this.q_.defer();
  this.chrome_.runtime.getPlatformInfo(goog.bind(function(info) {
    var platform = '';
    if (goog.isDefAndNotNull(info['os'])) {
      platform = info['os'];
    }
    if (goog.isDefAndNotNull(info['arch'])) {
      platform = platform + ' ' + info['arch'];
    }
    this.appPlatform_ = platform;
    return deferred.resolve(platform);
  }, this));
  return deferred.promise;
};


/**
 * Angular module.
 * @type {!angular.Module}
 */
e2email.components.appinfo.module = angular
    .module('e2email.components.appinfo.AppinfoService', [])
    .service('appinfoService', AppinfoService);

});  // goog.scope
