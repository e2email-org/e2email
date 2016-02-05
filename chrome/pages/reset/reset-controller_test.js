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
 * @fileoverview Tests for the reset page controller.
 */

goog.require('e2email.pages.reset.ResetCtrl');

describe('ResetCtrl', function() {
  var q, controller, resetController, scope, location;
  var mockTranslateService, mockOpenpgpService, mockGmailService,
      mockAuthService;
  var TEST_TOKEN = 'idtoken';
  var TEST_CODE = 'test-code';
  var TEST_EMAIL = 'mail@example.com';
  var TEST_KEY = 'test-key';

  beforeEach(module(function($controllerProvider) {
    $controllerProvider.register(
        'ResetCtrl', e2email.pages.reset.ResetCtrl);
  }));

  beforeEach(inject(function($rootScope, $controller, $location, $q) {
    scope = $rootScope.$new();
    controller = $controller;
    location = $location;
    q = $q;

    mockTranslateService = {
      getMessage: function(m) { return 'dummy'; }
    };
    mockOpenpgpService = {
      generateKey: function(email, idtoken) {
        if ((email === TEST_EMAIL) && (idtoken === TEST_TOKEN)) {
          return q.when(TEST_KEY);
        } else {
          return q.reject('bad code');
        }
      }
    };
    mockGmailService = {
      mailbox: {
        email: TEST_EMAIL
      },
      sendResetMail: function() {
        return q.when(undefined);
      }
    };
    mockAuthService = {
      getIdentityToken: function() {
        return q.when(TEST_TOKEN);
      }
    };
  }));

  it('should perform all reset steps', function() {
    spyOn(mockGmailService, 'sendResetMail').and.callThrough();
    spyOn(mockOpenpgpService, 'generateKey').and.callThrough();
    resetController = controller(
        'ResetCtrl as resetCtrl', {
          $scope: scope,
          $location: location,
          gmailService: mockGmailService,
          translateService: mockTranslateService,
          openpgpService: mockOpenpgpService,
          authService: mockAuthService
        });
    // Ask controller to reset.
    scope.resetCtrl.goAhead();
    scope.$digest();
    // Just check all interesting service methods were called.
    expect(mockOpenpgpService.generateKey).toHaveBeenCalled();
    expect(mockGmailService.sendResetMail).toHaveBeenCalled();
    // And that we landed at the right end-point.
    expect(location.path()).toBe('/showsecret');
  });


});
