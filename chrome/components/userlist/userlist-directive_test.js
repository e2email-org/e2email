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
 * @fileoverview Tests for the userlist filter.
 */

goog.require('e2email.components.userlist.module');

describe('UserlistDirective', function() {

  var $compile, $rootScope;
  var mockGmailService, mockTranslateService;

  beforeEach(function() {
    mockGmailService = {
      'mailbox': {
        'email': 'myself@example.com'
      }
    };
    mockTranslateService = {
      'getMessage': function(label) {
        return label;
      }
    };

    module(function($provide) {
      $provide.value('gmailService', mockGmailService);
      $provide.value('translateService', mockTranslateService);
    });

    module(e2email.components.userlist.module.name);
    module('components/userlist/userlist.html');

    inject(function(_$compile_, _$rootScope_) {
      $compile = _$compile_;
      $rootScope = _$rootScope_;
    });
  });

  it('should convert user email to the me label', function() {
    var scope = $rootScope.$new();
    scope['emails'] = ['myself@example.com'];
    var element = angular.element('<userlist ul-members="emails"></userlist>');
    $compile(element)(scope);
    scope.$apply();
    var innerScope = scope.$$childHead;
    expect(innerScope.members.length).toBe(1);
    expect(innerScope.members[0].displayName).toBe('me');
  });

  it('should convert multiple emails appropriately.', function() {
    var scope = $rootScope.$new();
    scope['emails'] = ['someone@foo.com', 'myself@example.com'];
    var element = angular.element('<userlist ul-members="emails"></userlist>');
    $compile(element)(scope);
    scope.$apply();
    var innerScope = scope.$$childHead;
    expect(innerScope.members.length).toBe(2);
    expect(innerScope.members[0].displayName).toBe('someone');
    expect(innerScope.members[1].displayName).toBe('me');
  });


});
