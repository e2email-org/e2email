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
 * @fileoverview Tests for the recovery page controller.
 */

goog.require('e2email.pages.recover.RecoverCtrl');

describe('RecoverCtrl', function() {
  var q, controller, recoverController, scope, location;
  var mockTranslateService, mockOpenpgpService, mockGmailService,
      mockAuthService, mockAuthService;
  var TEST_TOKEN = 'idtoken';
  var TEST_CODE = 'test-code';
  var TEST_CODE_COMPLETE = TEST_CODE + TEST_CODE + 
  TEST_CODE + TEST_CODE + TEST_CODE;
  var TEST_EMAIL = 'mail@example.com';
  var TEST_KEY = 'test-key';

  beforeEach(module(function($controllerProvider) {
    $controllerProvider.register(
        'RecoverCtrl', e2email.pages.recover.RecoverCtrl);
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
      restoreFromSecretBackupCode: function(code, email, idtoken) {
        if ((code === TEST_CODE_COMPLETE) && (email === TEST_EMAIL) &&
            (idtoken === TEST_TOKEN)) {
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
      sendNewDeviceMail: function() {
        return q.when(undefined);
      }
    };
    mockAuthService = {
      getIdentityToken: function() {
        return q.when(TEST_TOKEN);
      }
    };
  }));

  it('should perform all unlock steps', function() {
    spyOn(mockGmailService, 'sendNewDeviceMail').and.callThrough();
    spyOn(mockOpenpgpService, 'restoreFromSecretBackupCode').and.callThrough();
    recoverController = controller(
        'RecoverCtrl as recoverCtrl', {
          $scope: scope,
          $location: location,
          gmailService: mockGmailService,
          translateService: mockTranslateService,
          openpgpService: mockOpenpgpService,
          authService: mockAuthService
        });
    recoverController.recoveryCode1 = TEST_CODE;
    recoverController.recoveryCode2 = TEST_CODE;
    recoverController.recoveryCode3 = TEST_CODE;
    recoverController.recoveryCode4 = TEST_CODE;
    recoverController.recoveryCode5 = TEST_CODE;
    // Unlock using code.
    recoverController.unlock();
    scope.$digest();
    // Just check all interesting service methods were called.
    expect(mockOpenpgpService.restoreFromSecretBackupCode).toHaveBeenCalled();
    expect(mockGmailService.sendNewDeviceMail).toHaveBeenCalled();
    // And that we landed at the right end-point.
    expect(location.path()).toBe('/threads');
  });


});
