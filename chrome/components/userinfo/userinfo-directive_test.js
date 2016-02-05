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
 * @fileoverview Tests for the userinfo filter.
 */

goog.require('e2email.components.userinfo.module');

describe('UserinfoDirective', function() {

  var $timeout, $compile, $rootScope;
  var mockContactsService, mockTranslateService, mockTimeout;
  var mockTranslateFilter;

  beforeEach(module(e2email.components.userinfo.module.name));
  beforeEach(module('components/userinfo/userinfo.html'));

  beforeEach(function() {
    mockContactsService = {
      'users': {
        'test@example.com': {
          'fingerprintHex': 'xyzabc'
        }
      }
    };
    mockTranslateFilter = function(data) {
      return data.toString();
    };
    mockTranslateService = {
      'getMessage': function(label) {
        return label;
      }
    };
    mockTimeout = function(f, delay) {
      // Call it right away for testing purposes.
      f();
    };

    module(function($provide) {
      $provide.value('contactsService', mockContactsService);
      $provide.value('translateService', mockTranslateService);
      $provide.value('translateFilter', mockTranslateFilter);
      $provide.value('$timeout', mockTimeout);
    });

    inject(function(_$compile_, _$rootScope_) {
      $compile = _$compile_;
      $rootScope = _$rootScope_;
    });
  });

  it('should load the fingerprint correctly.', function() {
    var scope = $rootScope.$new();
    scope['theUser'] = 'test@example.com';
    var element = angular.element('<userinfo ui-user="theUser"/>');
    $compile(element)(scope);
    scope.$apply();
    expect(angular.element(element.find('p')[0]).text()).toBe('xyzabc');
    expect(angular.element(element.find('p')[1]).text())
        .toContain('test@example.com');
  });

});
