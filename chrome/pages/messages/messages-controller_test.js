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
 * @fileoverview Tests for the messages page controller.
 */

goog.require('e2email.pages.messages.MessagesCtrl');

describe('MessagesCtrl', function() {
  var q, controller, messagesController, scope, location;
  var mockGmailService, mockWindowService, mockTranslateService;
  var TEST_EMAIL = 'mail@example.com';
  var TEST_SUBJECT = 'test subject';
  var TEST_THREAD_ID = 'test-thread-id';
  var TEST_MESSAGE_ID = 'test-message-id';
  var TEST_CONTENT = 'test content';
  var TEST_FILENAME = 'dull';
  var TEST_TYPE = 'dull';
  var TEST_ENCODING = 'base64';
  var TEST_CONTENT_ATTACHMENT = 'dull';
  var TEST_SIZE = 12;
  var TEST_ATTACHMENTS = [{'filename': TEST_FILENAME, 'type': TEST_TYPE,
    'encoding': TEST_ENCODING, 'content': TEST_CONTENT_ATTACHMENT,
    'size': TEST_SIZE}];

  var TEST_THREAD = {
    'to': [TEST_EMAIL],
    'messageId': TEST_MESSAGE_ID,
    'subject': TEST_SUBJECT
  };

  beforeEach(module(function($controllerProvider) {
    $controllerProvider.register(
        'MessagesCtrl', e2email.pages.messages.MessagesCtrl);
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

    mockGmailService = {
      refresh: function(force, progress) {
        return q.when(undefined);
      },
      refreshThread: function(threadId) {
        if (threadId === TEST_THREAD_ID) {
          return q.when(undefined);
        } else {
          return q.reject('bad parameters');
        }
      },
      encryptAndSendMail: function(
          recipients, threadId, messageId, subject, content, attachments) {
        if ((recipients.length === 1) && (recipients[0] === TEST_EMAIL) &&
            (threadId == TEST_THREAD_ID) && (messageId === TEST_MESSAGE_ID) &&
            (subject === TEST_SUBJECT) && (content === TEST_CONTENT) &&
            (attachments === TEST_ATTACHMENTS)) {
          return q.when(undefined);
        } else {
          return q.reject('bad parameters');
        }
      },
      getThread: function(threadId) {
        if (threadId === TEST_THREAD_ID) {
          return TEST_THREAD;
        } else {
          return null;
        }
      },
      mailbox: {
        email: TEST_EMAIL
      }
    };
  }));

  it('should refresh thread correctly when requested', function() {
    spyOn(mockGmailService, 'refreshThread').and.callThrough();
    messagesController = controller(
        'MessagesCtrl as messagesCtrl', {
          $scope: scope,
          $location: location,
          $routeParams: { 'threadId': TEST_THREAD_ID },
          gmailService: mockGmailService
        });

    messagesController.refresh_();
    // Resolve promises.
    scope.$digest();
    // Check expected calls were made
    expect(mockGmailService.refreshThread).toHaveBeenCalled();
    expect(messagesController.thread).toEqual(TEST_THREAD);
  });

  it('should encrypt and send an initialized reply model', function() {
    spyOn(mockGmailService, 'encryptAndSendMail').and.callThrough();
    spyOn(mockGmailService, 'refreshThread').and.callThrough();
    messagesController = controller(
        'MessagesCtrl as messagesCtrl', {
          $scope: scope,
          $location: location,
          $routeParams: { 'threadId': TEST_THREAD_ID },
          gmailService: mockGmailService
        });

    messagesController.refresh_();
    scope.$digest();

    messagesController.reply['showText'] = true;
    messagesController.reply['content'] = TEST_CONTENT;
    messagesController.reply['attachments'] = TEST_ATTACHMENTS;
    messagesController.onReply();
    // Resolve promises.
    scope.$digest();
    // Check expected calls were made
    expect(mockGmailService.encryptAndSendMail).toHaveBeenCalled();
    expect(mockGmailService.refreshThread).toHaveBeenCalled();
    // check reply model is reset.
    expect(messagesController.reply['content']).toBeNull();
    expect(messagesController.reply['showText']).toBe(false);
  });

  it('should create an object with the properties and add it to attachments',
     function() {
       messagesController = controller(
       'MessagesCtrl as messagesCtrl', {
         $scope: scope,
         $location: location,
         $window: mockWindowService,
         gmailService: mockGmailService,
         $routeParams: { 'threadId': TEST_THREAD_ID }
       });
       messagesController.onFileUpload(TEST_FILENAME, TEST_TYPE,
       TEST_CONTENT_ATTACHMENT, TEST_SIZE);

       // Verify attachments to have been updated.
       expect(messagesController.reply['attachments']).
       toEqual(TEST_ATTACHMENTS);
     });
});
