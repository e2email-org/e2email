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
 * @fileoverview Tests for the appinfo service.
 */

goog.require('e2email.components.appinfo.AppinfoService');

describe('AppinfoService', function() {
  var window_;
  var q_;
  var rootScope;
  var service;
  var TEST_VERSION = 'test-version';
  var TEST_OS = 'test-os';
  var TEST_ARCH = 'test-arch';

  beforeEach(function() {
    inject(function($injector) {
      q_ = $injector.get('$q');
      rootScope = $injector.get('$rootScope');
      window_ = $injector.get('$window');
      window_.chrome = {
        runtime: {
          getManifest: function() {
            return { 'version': TEST_VERSION };
          },
          getPlatformInfo: function(cb) {
            cb({'os': TEST_OS, 'arch': TEST_ARCH});
          }
        }
      };
    });
    service = new e2email.components.appinfo.AppinfoService(window_, q_);
  });

  it('should get the right version', function() {
    expect(service.getVersion()).toBe(TEST_VERSION);
  });

  it('should get the right platform info', function() {
    var info = null;
    service.getPlatform().then(function(v) {
      info = v;
    });
    expect(info).toBeNull();
    rootScope.$apply();
    expect(info).toBe(TEST_OS + ' ' + TEST_ARCH);
  });

});
