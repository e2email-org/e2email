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
 * @fileoverview Tests for the threads page controller.
 */

goog.require('e2email.pages.threads.ThreadsCtrl');

describe('ThreadsCtrl', function() {
  var q, controller, threadsController, scope, location;
  var mockTranslateService, mockOpenpgpService, mockGmailService;
  var mockWindowService;
  var TEST_EMAIL = 'mail@example.com';
  var TEST_SUBJECT = 'test subject';
  var TEST_CONTENT = 'test content';
  var TEST_KEY = { key: 'test-key'};

  beforeEach(module(function($controllerProvider) {
    $controllerProvider.register(
        'ThreadsCtrl', e2email.pages.threads.ThreadsCtrl);
  }));

  beforeEach(inject(function($q, $rootScope, $controller, $location) {
    q = $q;
    scope = $rootScope.$new();
    controller = $controller;
    location = $location;

    mockWindowService = {
      open: function(url, name, options) {
      },
      document: {
        title: 'not set'
      }
    };

    mockTranslateService = {
      getMessage: function(m) { return m; }
    };
    mockOpenpgpService = {
      getVerifiedPublicKey: function(email) {
        if (email === TEST_EMAIL) {
          return q.when(TEST_KEY);
        } else {
          return q.reject('bad code');
        }
      }
    };

    mockGmailService = {
      refresh: function(force, progress) {
        return q.when(undefined);
      },
      encryptAndSendMail: function(
          recipients, threadId, messageID, subject, content) {
        if ((recipients.length === 1) && (recipients[0] === TEST_EMAIL) &&
            (subject === TEST_SUBJECT) && (content === TEST_CONTENT)) {
          this.mailbox.threads.push({
            subject: TEST_SUBJECT,
            from: TEST_EMAIL,
            to: [TEST_EMAIL],
            unread: false,
            isMarked: false,
            mails: [{
              subject: TEST_SUBJECT,
              from: TEST_EMAIL,
              to: [TEST_EMAIL],
              unread: false,
              hasErrors: false
            }]
          });
          return q.when(undefined);
        } else {
          return q.reject('bad parameters');
        }
      },
      sendInvite: function(recipients) {
        if ((recipients.length === 1) && (recipients[0] === TEST_EMAIL)) {
          return q.when(undefined);
        } else {
          return q.reject('bad parameters');
        }
      },
      mailbox: {
        email: TEST_EMAIL,
        threads: []
      }
    };
  }));

  it('should update compose model after validation', function() {
    spyOn(mockOpenpgpService, 'getVerifiedPublicKey').and.callThrough();
    threadsController = controller(
        'ThreadsCtrl as threadsCtrl', {
          $scope: scope,
          $location: location,
          $window: mockWindowService,
          translateService: mockTranslateService,
          gmailService: mockGmailService,
          openpgpService: mockOpenpgpService
        });

    // Reset any values in the compose model
    threadsController.showCompose(false);
    threadsController.compose['recipient'] = TEST_EMAIL;
    expect(threadsController.compose['validRecipient']).toBe(false);
    threadsController.validateRecipient();

    // Resolve promises.
    scope.$digest();
    // Check expected calls were made
    expect(mockOpenpgpService.getVerifiedPublicKey).toHaveBeenCalled();

    // Verify compose model.
    expect(threadsController.compose['validRecipient']).toBe(true);
  });

  it('should invite missing recipients when requested', function() {
    spyOn(mockGmailService, 'sendInvite').and.callThrough();
    threadsController = controller(
        'ThreadsCtrl as threadsCtrl', {
          $scope: scope,
          $location: location,
          $window: mockWindowService,
          translateService: mockTranslateService,
          gmailService: mockGmailService,
          openpgpService: mockOpenpgpService
        });

    // Set up the compose model
    threadsController.showCompose(false);
    threadsController.compose['missingRecipient'] = TEST_EMAIL;
    threadsController.inviteMissingRecipient();
    // Resolve promises.
    scope.$digest();
    // Check expected calls were made
    expect(mockGmailService.sendInvite).toHaveBeenCalled();

    // Verify compose model was reset.
    expect(threadsController.compose['missingRecipient']).toBe(null);
  });

  it('should send encrypted email from the compose model', function() {
    spyOn(mockGmailService, 'encryptAndSendMail').and.callThrough();
    threadsController = controller(
        'ThreadsCtrl as threadsCtrl', {
          $scope: scope,
          $location: location,
          $window: mockWindowService,
          translateService: mockTranslateService,
          gmailService: mockGmailService,
          openpgpService: mockOpenpgpService
        });

    // Set up the compose model
    threadsController.showCompose(false);
    threadsController.compose['recipient'] = TEST_EMAIL;
    threadsController.compose['subject'] = TEST_SUBJECT;
    threadsController.compose['message'] = TEST_CONTENT;

    threadsController.sendCompose();
    // Resolve promises.
    scope.$digest();
    // Check expected calls were made
    expect(mockGmailService.encryptAndSendMail).toHaveBeenCalled();
    expect(mockWindowService.document.title).toBe('inboxCountTitle');

    // Verify compose model was reset.
    expect(threadsController.compose['recipient']).toBe(null);
    expect(threadsController.compose['subject']).toBe(null);
    expect(threadsController.compose['message']).toBe(null);
  });


});
