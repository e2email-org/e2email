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
 * @fileoverview Tests for the setup page controller.
 */

goog.require('e2email.pages.setup.SetupCtrl');

describe('SetupCtrl', function() {
  var q, controller, setupController, scope, location;
  var mockTranslateService, mockOpenpgpService, mockGmailService,
      mockAuthService;
  var TEST_TOKEN = 'idtoken';
  var TEST_CODE = 'test-code';
  var TEST_EMAIL = 'mail@example.com';
  var TEST_KEY = { key: 'test-key'};
  var gmailAuthorized = true;
  var privateKey, remoteKey;

  beforeEach(module(function($controllerProvider) {
    $controllerProvider.register(
        'SetupCtrl', e2email.pages.setup.SetupCtrl);
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
      initialize: function(password) {
        return q.when(undefined);
      },
      searchPrivateKey: function(email) {
        if (email === TEST_EMAIL) {
          return q.when(privateKey);
        } else {
          return q.reject('bad email');
        }
      },
      searchPublicKey: function(email, remote) {
        if ((email === TEST_EMAIL) && remote) {
          return q.when(remoteKey);
        } else {
          return q.reject('bad email');
        }
      },
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
      sendSetupMail: function() {
        return q.when(undefined);
      },
      sendWelcomeMail: function() {
        return q.when(undefined);
      },
      isAuthorized: function() {
        return q.when(gmailAuthorized);
      }
    };
    mockAuthService = {
      getIdentityToken: function() {
        return q.when(TEST_TOKEN);
      }
    };
  }));

  it('should send to introduction when unauthorized', function() {
    gmailAuthorized = false;
    setupController = controller(
        'SetupCtrl as setupCtrl', {
          $scope: scope,
          $location: location,
          gmailService: mockGmailService,
          translateService: mockTranslateService,
          openpgpService: mockOpenpgpService,
          authService: mockAuthService
        });
    // Hand-crank the check code.
    scope.setupCtrl.check_();
    // Resolve promises.
    scope.$digest();
    // Verify we landed at the right end-point.
    expect(location.path()).toBe('/introduction');
  });

  it('should redirect to recover when user only has a public key', function() {
    gmailAuthorized = true;
    privateKey = null;
    remoteKey = TEST_KEY;
    setupController = controller(
        'SetupCtrl as setupCtrl', {
          $scope: scope,
          $location: location,
          gmailService: mockGmailService,
          translateService: mockTranslateService,
          openpgpService: mockOpenpgpService,
          authService: mockAuthService
        });
    // Hand-crank the check code.
    scope.setupCtrl.check_();
    // Resolve promises.
    scope.$digest();
    // Verify we landed at the right end-point.
    expect(location.path()).toBe('/recover');
  });

  it('should make a new key with no local or remote keys', function() {
    gmailAuthorized = true;
    privateKey = null;
    remoteKey = null;
    spyOn(mockOpenpgpService, 'generateKey').and.callThrough();
    spyOn(mockGmailService, 'sendWelcomeMail').and.callThrough();
    setupController = controller(
        'SetupCtrl as setupCtrl', {
          $scope: scope,
          $location: location,
          gmailService: mockGmailService,
          translateService: mockTranslateService,
          openpgpService: mockOpenpgpService,
          authService: mockAuthService
        });
    // Hand-crank the check code.
    scope.setupCtrl.check_();
    // Resolve promises.
    scope.$digest();
    // Check generate key was called.
    expect(mockOpenpgpService.generateKey).toHaveBeenCalled();
    // Check new user email was sent.
    expect(mockGmailService.sendWelcomeMail).toHaveBeenCalled();

    // Verify we landed at the right end-point.
    expect(location.path()).toBe('/showsecret');
  });


});
