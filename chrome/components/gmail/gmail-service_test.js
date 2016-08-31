/**
 * @fileoverview Tests for the gmail api service.
 */

goog.require('e2e.openpgp.error.InvalidArgumentsError');
goog.require('e2email.components.gmail.GmailService');

goog.scope(function() {


describe('GmailService', function() {
  var log;
  var q;
  var location;
  var token = null;
  var window_;
  var service;
  var rootScope;
  var http;
  var httpBackend;
  var mockOpenpgpService;
  var mockAutocompleteService;
  var mockAutocompleteCandidates = [];
  var mockTranslateService;
  var mockAuthService;
  var mockContactsService;
  var TEST_EMAIL = 'test@example.com';
  var TEST_PUBLIC_KEY = {
    serialized: [1, 2],
    key: {
      fingerprint: [0, 1, 2],
      fingerprintHex: '012'
    }
  };
  var TEST_PRIVATE_KEY = 'private-key';
  var TEST_DATE_STRING = 'Tue, 31 Mar 2015 16:06:53 -0700';
  var TEST_ENCRYPTED_DATA = 'some encrypted content';
  var TEST_PLAINTEXT_DATA = ['Content-Type: text/plain',
    'Content-Transfer-Encoding: 8bit', '', 'some plaintext content'].join(
          '\r\n');
  var TEST_EXPECTED_PLAINTEXT_DATA = 'some plaintext content';

  var makeMetadataResponse = function(mailid, threadid) {
    return {
      id: mailid,
      threadId: threadid,
      payload: {
        mimeType: 'multipart/encrypted',
        headers: [
          {
            name: 'content-type',
            value: 'multipart/encrypted; boundary=foo; ' +
                'protocol="application/pgp-encrypted"'
          },
          {name: 'date', value: TEST_DATE_STRING},
          {name: 'subject', value: 'a subject'},
          {name: 'from', value: 'sender@example.com'},
          {name: 'message-id', value: mailid}
        ]
      }
    };
  };

  beforeEach(function() {
    inject(function($injector) {
      log = $injector.get('$log');
      q = $injector.get('$q');
      location = $injector.get('$location');
      window_ = $injector.get('$window');
      rootScope = $injector.get('$rootScope');
      http = $injector.get('$http');
      httpBackend = $injector.get('$httpBackend');
      window_.chrome = {
        identity: {
          getAuthToken: function(options, cb) {
            cb(token);
          },
          getProfileUserInfo: function(cb) {
            cb({email: TEST_EMAIL});
          },
          removeCachedAuthToken: function(options, cb) {
            token = '*removed*';
            cb(token);
          }
        },
        runtime: {
        }
      };
    });
    mockOpenpgpService = {
      searchPublicKey: function(email, remote) {
        var deferred = q.defer();
        if (email === TEST_EMAIL) {
          deferred.resolve(TEST_PUBLIC_KEY);
        } else {
          deferred.resolve(null);
        }
        return deferred.promise;
      },
      searchPrivateKey: function(email) {
        var deferred = q.defer();
        if (email === TEST_EMAIL) {
          deferred.resolve(TEST_PRIVATE_KEY);
        } else {
          deferred.resolve(null);
        }
        return deferred.promise;
      },
      getVerifiedPublicKey: function(email) {
        return this.searchPublicKey(email, true).then(function(key) {
          return { 'local': key, 'remote': key };
        });
      },
      decryptVerify: function(data, privateKey, signingKey) {
        var deferred = q.defer();
        if ((data === TEST_ENCRYPTED_DATA) &&
            (privateKey === TEST_PRIVATE_KEY) &&
            (signingKey === TEST_PUBLIC_KEY)) {
          deferred.resolve({content: TEST_PLAINTEXT_DATA, warning: null});
        } else {
          deferred.reject('Unexpected decryption data');
        }
        return deferred.promise;
      }
    };
    mockTranslateService = {
      getMessage: function(m) { return m; }
    };
    mockAutocompleteService = {
      addCandidate: function(candidate, priority) {
        mockAutocompleteCandidates.push({
          'candidate': candidate,
          'priority': priority
        });
      },
      getCandidates: function(partial) {
        return [];
      }
    };
    mockContactsService = {
      processContacts: function(progress) {
        return q.when(progress);
      },
      addUserInfo: function(info) {
        return;
      }
    };
    mockAuthService = {
      withAuth: function(scope, retry, op) {
        return op(token);
      },
      addAuthorization: function(config, token) {
        if (!goog.isDefAndNotNull(config['headers'])) {
          config['headers'] = {};
        }
        config['headers']['Authorization'] = 'Bearer ' + token;
      },
      getToken: function() {
        if (!window_.chrome.runtime.lastError) {
          return q.when(token);
        }else {
          return q.when(null);
        }
      }
    };

    service = new e2email.components.gmail.GmailService(
        window_, log, q, location, http,
        mockTranslateService, mockOpenpgpService, mockAutocompleteService,
        mockContactsService, mockAuthService);

    // Mocks the "constructPgpMimeMessage_" function for the
    // "should send correctly formatted email" test.
    service.constructPgpMimeMessage_ = function() {
      return ['Content-Type: multipart/encrypted; ' +
              'protocol="application/pgp-encrypted"; boundary="----safemail"',
            'Subject: test-subject', 'From: ', 'To: test@example.com',
            'In-Reply-To: message-id', 'MIME-Version: 1.0', '',
            'This is an OpenPGP/MIME encrypted message. ' +
              'Please open it from the Safe Mail app.', '', '------safemail',
            'Content-Type: application/pgp-encrypted; name="version.asc"',
            'Content-Description: PGP/MIME Versions Identification', '',
            'Version: 1', '------safemail',
            'Content-Type: text/plain; charset=UTF-8; name="encrypted.asc"',
            '', 'test-content', '', '------safemail--', ''].join('\n');
    };
  });

  it('should initialize', function() {
    expect(service.q_).toEqual(q);
    expect(service.location_).toEqual(location);
    expect(service.chrome_).toEqual(window_.chrome);
    expect(service.openpgpService_).toEqual(mockOpenpgpService);
    expect(service.translateService_).toEqual(mockTranslateService);
    expect(service.authService_).toEqual(mockAuthService);
  });

  it('should authorize when available', function() {
    httpBackend.expectGET(
        'https://www.googleapis.com/gmail/v1/users/me/labels',
        {'Authorization': 'Bearer null',
          'Accept': 'application/json, text/plain, */*'}).respond(
        200, {labels: [{type: 'user', id: 'Label_1'}]});
    var authorized;
    service.isAuthorized().then(function(v) {
      authorized = v;
    });
    token = null;
    rootScope.$apply();
    expect(authorized).toEqual(false);
    token = 'abc';
    service.isAuthorized().then(function(v) {
      authorized = v;
    });
    rootScope.$apply();
    expect(authorized).toEqual(true);
    expect(service.mailbox.email).toBe(TEST_EMAIL);
    window_.chrome.runtime.lastError = true;
    service.isAuthorized().then(function(v) {
      authorized = v;
    });
    rootScope.$apply();
    expect(authorized).toEqual(false);
  });

  it('should fetch keys for the logged in user', function() {
    httpBackend.expectGET(
        'https://www.googleapis.com/gmail/v1/users/me/labels',
        {'Authorization': 'Bearer abc',
          'Accept': 'application/json, text/plain, */*'}).respond(
            200, {labels: [{type: 'user', id: 'Label_1'}]});

    var result = null;
    var witherror = null;
    // The user is not currently logged in, so this should return
    // an error.
    service.withMyKey_().then(function(keys) {
      result = keys;
    }).catch(function(err) {
      witherror = err;
    });
    rootScope.$apply();
    expect(result).toBeNull();
    expect(witherror).toEqual(new e2e.openpgp.error.InvalidArgumentsError(
        'Private key not found for ""'));
    // Log in the user, which should now permit (with this setup) the
    // keys to be found.
    var authorized = false;
    service.signIn().then(function(v) {
      authorized = v;
    });
    rootScope.$apply();
    expect(authorized).toBe(true);

    witherror = null;
    service.withMyKey_().then(function(keys) {
      result = keys;
    }).catch(function(err) {
      witherror = err;
    });
    rootScope.$apply();
    expect(witherror).toBeNull();
    expect(result.publicKey).toEqual(TEST_PUBLIC_KEY);
    expect(result.privateKey).toEqual(TEST_PRIVATE_KEY);
  });

  it('should send correctly formatted email', function() {
    // base-64 url-encoding of pgp/mime encoded payload.
    var golden_content =
        'Q29udGVudC1UeXBlOiBtdWx0aXBhcnQvZW5jcnlwdGVkOyBwcm90b2NvbD0iYX' +
        'BwbGljYXRpb24vcGdwLWVuY3J5cHRlZCI7IGJvdW5kYXJ5PSItLS0tc2FmZW1h' +
        'aWwiClN1YmplY3Q6IHRlc3Qtc3ViamVjdApGcm9tOiAKVG86IHRlc3RAZXhhbX' +
        'BsZS5jb20KSW4tUmVwbHktVG86IG1lc3NhZ2UtaWQKTUlNRS1WZXJzaW9uOiAx' +
        'LjAKClRoaXMgaXMgYW4gT3BlblBHUC9NSU1FIGVuY3J5cHRlZCBtZXNzYWdlLi' +
        'BQbGVhc2Ugb3BlbiBpdCBmcm9tIHRoZSBTYWZlIE1haWwgYXBwLgoKLS0tLS0t' +
        'c2FmZW1haWwKQ29udGVudC1UeXBlOiBhcHBsaWNhdGlvbi9wZ3AtZW5jcnlwdG' +
        'VkOyBuYW1lPSJ2ZXJzaW9uLmFzYyIKQ29udGVudC1EZXNjcmlwdGlvbjogUEdQ' +
        'L01JTUUgVmVyc2lvbnMgSWRlbnRpZmljYXRpb24KClZlcnNpb246IDEKLS0tLS' +
        '0tc2FmZW1haWwKQ29udGVudC1UeXBlOiB0ZXh0L3BsYWluOyBjaGFyc2V0PVVU' +
        'Ri04OyBuYW1lPSJlbmNyeXB0ZWQuYXNjIgoKdGVzdC1jb250ZW50CgotLS0tLS' +
        '1zYWZlbWFpbC0tCg==';
    var messageid = 'messageid';
    var threadid = 'threadid';

    httpBackend.expectGET(
        'https://www.googleapis.com/gmail/v1/users/me/labels',
        {'Authorization': 'Bearer abc',
          'Accept': 'application/json, text/plain, */*'}).respond(
            200, {labels: [{type: 'user', id: 'Label_1'}]});
    httpBackend.expectPOST(
        'https://www.googleapis.com/gmail/v1/users/me/messages/send',
        { raw: golden_content, threadId: threadid}).respond(
            200, {id: messageid, threadId: threadid, labelIds: ['UNREAD']});
    httpBackend.expectPOST(
        'https://www.googleapis.com/gmail/v1/users/me/messages/' +
            messageid + '/modify', {removeLabelIds: ['UNREAD']}).respond(
            200, { id: messageid, threadId: threadid, labelIds: []});
    httpBackend.whenGET(new RegExp(
        'https://www.googleapis.com/gmail/v1/users/me/messages/' +
            messageid + '\\?.*'))
            .respond(200, makeMetadataResponse(messageid, threadid));

    var sent = false;
    service.sendPgpMimeMail_(
        threadid, 'previd', [TEST_EMAIL], 'test-subject', 'test-content')
            .then(function() {
              sent = true;
            });
    rootScope.$apply();
    httpBackend.flush();
    httpBackend.verifyNoOutstandingExpectation();
    expect(sent).toBe(true);
    // Verify that the service also updated the mailbox model.
    expect(service.mailbox.threads.length).toBe(1);
    expect(service.mailbox.threads[0].id).toBe(threadid);
    expect(service.mailbox.threads[0].mails.length).toBe(1);
    expect(service.mailbox.threads[0].mails[0].id).toBe(messageid);
  });

  it('should mark messages as read.', function() {
    token = 'abc';
    // We want it to make a call to remove the read label.
    httpBackend.expectGET(
        'https://www.googleapis.com/gmail/v1/users/me/labels',
        {'Authorization': 'Bearer abc',
          'Accept': 'application/json, text/plain, */*'}).respond(
            200, {labels: [{type: 'user', id: 'Label_1'}]});
    httpBackend.expectPOST(
        'https://www.googleapis.com/gmail/v1/users/me/messages/theMail/modify',
        {'removeLabelIds': ['UNREAD']}).respond(200, '');
    var ok = false;
    var withError = null;
    // Set up the model, which we'll later verify is marked as read.
    service.mailbox.threads = [
      {
        'id': 'theThread',
        'subject': 'aSubject',
        'updated': new Date(),
        'from': 'from@example.com',
        'messageId': 'theMessage',
        'participants': [],
        'to': [],
        'snippet': 'a snippet',
        'mails': [{
          'id': 'theMail',
          'unread': true
        }],
        'unread': true,
        'isMarked': false
      }
    ];

    service.markMailReadIfNecessary_(
        service.mailbox.threads[0], service.mailbox.threads[0].mails[0])
            .then(function() {
              ok = true;
            }).catch(function(err) {
              withError = err;
            });
    rootScope.$apply();
    httpBackend.flush();
    httpBackend.verifyNoOutstandingExpectation();
    expect(ok).toBe(true);
    expect(withError).toBe(null);
    // When done, both the mail and the thread should be marked as read.
    expect(service.mailbox.threads[0].unread).toBe(false);
    expect(service.mailbox.threads[0].mails[0].unread).toBe(false);
  });

  it('should refresh and decrypt messages within a thread.', function() {
    token = 'abc';
    var ok = false;
    var withError = null;
    // Set up the model.
    service.mailbox.threads = [
      {
        'id': 'theThread',
        'subject': 'aSubject',
        'updated': new Date(),
        'messageId': 'theMessage',
        'participants': [],
        'to': [],
        'snippet': 'a snippet',
        'mails': [{
          'id': 'theMail',
          'hasErrors': false,
          'mimeContent': null,
          'from': TEST_EMAIL,
          'created': new Date()
        }],
        'unread': true,
        'isMarked': false
      }
    ];
    service.mailbox.email = TEST_EMAIL;
    service.recentlyViewedThreads_.clear();

    // We expect to get these requests for the mail, and then the
    // attachments for the mail.
    httpBackend.expectGET(
        'https://www.googleapis.com/gmail/v1/users/me/labels',
        {'Authorization': 'Bearer abc',
          'Accept': 'application/json, text/plain, */*'}).respond(
            200, {labels: [{type: 'user', id: 'Label_1'}]});
    httpBackend.expectGET(
        'https://www.googleapis.com/gmail/v1/users/me/messages/theMail')
            .respond(200, {
              'id': 'theMail',
              'threadId': 'theThread',
              'payload': {
                'parts': [
                  { 'mimeType': 'application/pgp-encrypted' },
                  {
                    'mimeType': 'text/plain',
                    'body' : {
                      'data': btoa(TEST_ENCRYPTED_DATA)
                    }
                  }
                ]
              }
            });

    service.refreshThread(service.mailbox.threads[0].id)
        .then(function() {
          ok = true;
        }).catch(function(err) {
          withError = err;
        });
    // Check our pre-conditions are true before we apply all the
    // async operations.
    expect(service.mailbox.threads[0].mails[0].mimeContent).toBe(null);
    expect(service.recentlyViewedThreads_.isEmpty()).toBe(true);
    rootScope.$apply();
    httpBackend.flush();
    httpBackend.verifyNoOutstandingExpectation();
    expect(ok).toBe(true);
    expect(withError).toBe(null);
    // Verify post-conditions on our model.
    expect(service.mailbox.threads[0].mails[0].mimeContent[0].content)
        .toBe(TEST_EXPECTED_PLAINTEXT_DATA);
    expect(service.recentlyViewedThreads_.get('theThread')).toBe('theThread');
  });

  it('should not retry requests that fail for other reasons', function() {
    // We want non-400 errors to return right away.
    var FAKE_REQUEST = 'https://example.com/request';
    token = 'abc';
    httpBackend.expectGET(
        'https://www.googleapis.com/gmail/v1/users/me/labels',
        {'Authorization': 'Bearer abc',
          'Accept': 'application/json, text/plain, */*'}).respond(
            200, {labels: [{type: 'user', id: 'Label_1'}]});
    httpBackend.whenGET(FAKE_REQUEST + '/abc').respond(404, 'not-found');
    var tokens_received = [];
    ok = false;
    service.authService_.withAuth(null, true, function(access_token) {
      // save tokens so we can check what we got.
      tokens_received.push(access_token);
      return http.get(FAKE_REQUEST + '/' + access_token);
    }).then(function() {
      ok = true;
    }).catch(function(err) {
      witherror = err;
    });
    rootScope.$apply();
    httpBackend.flush();
    httpBackend.verifyNoOutstandingRequest();
    expect(ok).toBe(false);
    expect(witherror.data).toBe('not-found');
    expect(tokens_received).toEqual(['abc']);
  });

  it('should process all batches from the Gmail API', function() {
    token = 'abc';
    var message1 = 'mid1';
    var message2 = 'mid2';
    // We want it to make two batch calls, and one metadata call per batch.
    // 1. Set up the expected batch calls.
    httpBackend.expectGET(
        'https://www.googleapis.com/gmail/v1/users/me/labels',
        {'Authorization': 'Bearer abc',
          'Accept': 'application/json, text/plain, */*'}).respond(
            200, {labels: [{type: 'user', id: 'Label_1'}]});
    httpBackend.whenGET(new RegExp(
        '^https://www.googleapis.com/gmail/v1/users/me/messages\\?' +
            '[^\\&]+\\&[^\\&]+$'))
            .respond(200, {
              messages: [{id: message1, threadId: 'threadid'}],
              nextPageToken: 'nextPage'
            });
    httpBackend.whenGET(new RegExp(
        'https://www.googleapis.com/gmail/v1/users/me/messages\\?' +
            '.*pageToken=nextPage'))
            .respond(200, {
              messages: [{id: message2, threadId: 'threadid'}]
            });
    // 2. And the expected metadata calls.
    httpBackend.whenGET(new RegExp(
        'https://www.googleapis.com/gmail/v1/users/me/messages/' +
            message1 + '\\?.*'))
            .respond(200, makeMetadataResponse(message1, 'threadid'));
    httpBackend.whenGET(new RegExp(
        'https://www.googleapis.com/gmail/v1/users/me/messages/' +
            message2 + '\\?.*'))
            .respond(200, makeMetadataResponse(message2, 'threadid'));
    var mockProgress = {};
    var ok = false;
    var withError = null;
    service.processInbox_(mockProgress).then(function() {
      ok = true;
    }).catch(function(err) {
      withError = err;
    });
    rootScope.$apply();
    httpBackend.flush();
    httpBackend.verifyNoOutstandingExpectation();
    expect(ok).toBe(true);
    expect(withError).toBe(null);
    // When done, mailbox should have one thread with two messages.
    expect(service.mailbox.threads.length).toBe(1);
    var thread = service.mailbox.threads[0];
    expect(thread.id).toBe('threadid');
    expect(thread.mails.length).toBe(2);
    expect(thread.mails[0].id).toBe(message1);
    expect(thread.mails[1].id).toBe(message2);
  });

  it('should delete marked threads with the Gmail API', function() {
    token = 'abc';
    // We want it to make a call to remove the label
    httpBackend.expectGET(
        'https://www.googleapis.com/gmail/v1/users/me/labels',
        {'Authorization': 'Bearer abc',
          'Accept': 'application/json, text/plain, */*'}).respond(
            200, {labels: [{type: 'user', id: 'Label_1'},
                           {type: 'system', id: 'SENT'}]});
    httpBackend.expectPOST(
        'https://www.googleapis.com/gmail/v1/users/me/threads/theThread/modify',
        {'removeLabelIds': ['Label_1', 'INBOX']}).respond(200, '');
    var mockProgress = {};
    var ok = false;
    var withError = null;
    // Set up the thread model, which we'll later verify is removed.
    service.mailbox.threads = [{
      'id': 'theThread',
      'subject': 'aSubject',
      'updated': new Date(),
      'from': 'from@example.com',
      'messageId': 'theMessage',
      'participants': [],
      'to': [],
      'snippet': 'a snippet',
      'mails': [],
      'unread': false,
      'isMarked': true
    }];

    service.trashMarkedThreads(mockProgress).then(function() {
      ok = true;
    }).catch(function(err) {
      withError = err;
    });
    rootScope.$apply();
    httpBackend.flush();
    httpBackend.verifyNoOutstandingExpectation();
    expect(ok).toBe(true);
    expect(withError).toBe(null);
    // When done, mailbox should have no more threads.
    expect(service.mailbox.threads.length).toBe(0);
  });

  it('should make metadata requests from a message batch', function() {
    token = 'abc';
    var messageid = 'mid';
    var re = new RegExp(
        'https://www.googleapis.com/gmail/v1/users/me/messages/' +
            messageid + '\\?.*');
    httpBackend.whenGET(re)
        .respond(200, makeMetadataResponse('mailid', 'threadid'));
    httpBackend.expectGET(
        'https://www.googleapis.com/gmail/v1/users/me/labels',
        {'Authorization': 'Bearer abc',
          'Accept': 'application/json, text/plain, */*'}).respond(
            200, {labels: [{type: 'user', id: 'Label_1'}]});
    var mockProgress = {};
    var ok = false;
    var withError = null;
    service.processInboxMessages_(mockProgress, [
      {id: messageid, threadId: 'threadid'}
    ]).then(function() {
      ok = true;
    }).catch(function(err) {
      withError = err;
    });
    rootScope.$apply();
    httpBackend.flush();
    httpBackend.verifyNoOutstandingExpectation();
    expect(ok).toBe(true);
    expect(withError).toBe(null);
    expect(service.mailbox.threads.length).toBe(1);
  });


  it('should index metadata from the Gmail API', function() {
    var response = {
      status: 200,
      data: makeMetadataResponse('mailid', 'threadid')
    };
    service.processMetaData_(response);
    expect(service.mailbox.threads.length).toBe(1);
    var thread = service.mailbox.threads[0];
    expect(thread.id).toBe('threadid');
    expect(thread.subject).toBe('a subject');
    expect(thread.updated).toEqual(new Date(TEST_DATE_STRING));
    expect(thread.mails.length).toBe(1);
    expect(thread.snippet).toBe('...');
    var mail = thread.mails[0];
    expect(mail.subject).toBe('a subject');
    expect(mail.mimeContent).toBeNull();
  });

  it('should identify PGP/MIME content', function() {
    var mockPayload = {
      mimeType: 'some-type',
      headers: []
    };
    expect(service.isLikelyPGPMime_(mockPayload)).toBe(false);
    mockPayload.mimeType = 'multipart/encrypted';
    expect(service.isLikelyPGPMime_(mockPayload)).toBe(false);
    mockPayload.headers.push({
      name: 'content-type',
      value: 'multipart/encrypted; boundary=foo; ' +
          'protocol="application/pgp-encrypted"'
    });
    expect(service.isLikelyPGPMime_(mockPayload)).toBe(true);
  });

  it('should get the right MIME header', function() {
    var mockHeaders = [];
    expect(service.getHeader_(mockHeaders, 'test-header')).toBeNull();
    mockHeaders.push({name: 'Test-HEADER', value: 'test-value'});
    expect(service.getHeader_(mockHeaders, 'test-header')).toBe('test-value');
    expect(service.getHeader_(mockHeaders, 'other-header')).toBe(null);
    mockHeaders.push({name: 'OTHER-header', value: 'other-value'});
    expect(service.getHeader_(mockHeaders, 'other-header')).toBe('other-value');
  });


  it('should handle MIME content correctly', function() {
    var message = ['Content-Type: multipart/mixed; ' +
          'boundary="===============5213375533884816044=="',
      'MIME-Version: 1.0',
      'Subject: test multiple image file', 'From: ystoller@google.com',
      'To: ystoller@google.com', '', 'pictures and text',
      '--===============5213375533884816044==', 'Content-Type: image/jpeg',
      'MIME-Version: 1.0', 'Content-Transfer-Encoding: base64', '',
      '/9j/4AAQSkZJRgA',
      '--===============5213375533884816044==',
      'Content-Type: application/octet-stream',
      'Content-Disposition: attachment; filename="pic.jpg"',
      'MIME-Version: 1.0', 'Content-Transfer-Encoding: base64', '',
      '/9j/4QBCRXhpZgAASUkqAAgAAAABAJiCAgAeAAAAGgAAAAAAAABFZHdpbiBHaWVzYmVycy' +
          'AvIG5h', 'dHVyZXBsLmNvbQAAAP/sABFEdWNiT1retcHPyf/2Q==',
      '--===============5213375533884816044==',
      'Content-Type: text/plain', 'Content-Transfer-Encoding: 7bit', '',
      'random text, part 2',
      '--===============5213375533884816044==--'].join('\r\n');
    var mockMailObject = {};
    service.extractMimeContent_(mockMailObject, message);
    // extractMimeContent_ should detect a total of five image/text MIME nodes.
    // The nodes should be identified correctly, and formatted for display.
    expect(mockMailObject.mimeContent.length).toBe(3);
    expect(mockMailObject.mimeContent[0].type).toBe('unsupported');
    expect(mockMailObject.mimeContent[1].type).toBe('application/octet-stream');
    expect(mockMailObject.mimeContent[2].type).toBe('text');
    expect(mockMailObject.mimeContent[0].content).toEqual(
        'unsupportedMimeContent');
    expect(mockMailObject.mimeContent[1].url.substring(0, 5)).toEqual(
        'blob:');
    expect(mockMailObject.mimeContent[2].content).toEqual(
        'random text, part 2');
  });


  it('handles partially invalid MIME emails correctly', function() {
    // This test verifies that if a single node within a MIME message is
    // invalid, it gets marked as having an error, but the other nodes are
    // still processed.
    var mixedEmail = {header: {'Content-Type': {value: 'multipart/mixed'},
            'Content-Transfer-Encoding': {value: '7bit'}},
          body: [{header: {'Content-Type': {value: 'text/plain'},
                'Content-Transfer-Encoding': {value: '7bit'}},
              body: 'this part is valid'},
            {header: {'Content-Type': {value: 'image/bmp'}},
              body: '/9j/4AAQSkZJRgA'}]};
    expect(service.mimeTreeWalker_(mixedEmail)).toEqual(
        [{content: 'this part is valid', type: 'text'},
         {content: 'errorInParsingMime', type: 'error'}]);
  });


  it('should determine MIME types correctly from filename', function() {
    var filetype = 'abc.txt';
    var result = 'text/plain';
    expect(service.determineTypeFromFilename_(filetype)).toEqual(result);

    filetype = 'pic.png';
    result = 'image/png';
    expect(service.determineTypeFromFilename_(filetype)).toEqual(result);

    filetype = 'invalid';
    result = 'Unknown/unsupported content type';
    expect(service.determineTypeFromFilename_(filetype)).toEqual(result);

    filetype = 'something.pdf';
    result = 'Unknown/unsupported content type';
    expect(service.determineTypeFromFilename_(filetype)).toEqual(result);
  });


  it('should detect non MIME formatted messages', function() {
    var message = 'hello\r\nworld';
    expect(service.isMime_(message)).toBe(false);

    message = 'hello world';
    expect(service.isMime_(message)).toBe(false);

    var mockMimeContent = {};
    service.extractMimeContent_(mockMimeContent, message);
    expect(mockMimeContent.mimeContent[0].content).toBe('hello world');

  });

  it('should display notification for unsupported MIME messages', function() {
    // The following two messages contain MIME content that is unsupported by
    // the E2EMail app - appropriate notifications should be displayed.

    var errorMsg = 'unsupportedMimeContent';
    // PDFs are unsupported.
    var mockMimeContent = {};
    var message = 'Content-Type: application/pdf\r\n\r\nhello world';
    expect(service.isMime_(message)).toBe(true);
    service.extractMimeContent_(mockMimeContent, message);
    expect(mockMimeContent.mimeContent[0].content).toBe(errorMsg);

    // Certain image types are supported by Chrome. svg is intentionally not
    // displayed, as it can contain embedded JavaScript.
    var mockMimeContent = {};
    var message = 'Content-Type: image/svg\r\n\r\nDe44';
    expect(service.isMime_(message)).toBe(true);
    service.extractMimeContent_(mockMimeContent, message);
    expect(mockMimeContent.mimeContent[0].content).toBe(errorMsg);

    // The following base64 encoded data contains invalid characters.
    message = 'Content-Type: image/bmp\r\nContent-Transfer-Encoding: ' +
        'base64\r\n\r\nDe4&5';
    expect(service.isMime_(message)).toBe(true);
    service.extractMimeContent_(mockMimeContent, message);
    expect(mockMimeContent.mimeContent[0].content).toBe(errorMsg);

    // The following message is supported.
    mockMimeContent = {};
    message = 'Content-Type: text/plain\r\n\r\nhello world';
    expect(service.isMime_(message)).toBe(true);
    service.extractMimeContent_(mockMimeContent, message);
    expect(mockMimeContent.mimeContent[0]).toEqual({content: 'hello world',
                                                 type: 'text'});
  });

  it('invalid base64 strings should be detected', function() {
    var invalidBase64 = 'hey<script>console.log("something bad");' +
        '</script>there';
    expect(service.isValidBase64_(invalidBase64)).toBe(false);
    var validBase64 = 'hey+there/==';
    expect(service.isValidBase64_(validBase64)).toBe(true);
  });

  it('should correctly parse the case insensitive values of MIME ' +
      'content headers', function() {
       // Content headers' values are case-insensitive. Accordingly,
       // extractMimeContent_() should correctly handle their values regardless
       // of their case
       var message = ['MIME-Version: 1.0',
         'Content-type: multipart/mIXEd; boundary="simple boundary"', '',
         '--simple boundary',
         'Content-type: text/plain; charset=us-ascii',
         '', 'lorem ipsum dolor.',
         '--simple boundary',
         'Content-type: IMAGE/GIF',
         'Content-Transfer-Encoding: base64',
         'Content-Disposition: attachment; filename="foo.txt"',
         '', 'aGVsbG8gd29ybGQK', '--simple boundary--'].join('\r\n');
       var mockMimeContent = {};
       var expectedObject = [{content: 'lorem ipsum dolor.\r\n', type: 'text'}];
       var expectedFilename = 'foo.txt';
       var expectedType = 'image/gif';
       var expectedURL = 'blob:';
       var expectedFilesize = 12;
       service.extractMimeContent_(mockMimeContent, message);
       expect(mockMimeContent.mimeContent.length).toBe(2);
       expect(mockMimeContent.mimeContent[0]).toEqual(expectedObject[0]);
       expect(mockMimeContent.mimeContent[1].filename).
       toEqual(expectedFilename);
       expect(mockMimeContent.mimeContent[1].type).toEqual(expectedType);
       expect(mockMimeContent.mimeContent[1].url.substring(0, 5)).
       toEqual(expectedURL);
     });

});

});  // goog.scope
