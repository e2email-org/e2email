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
 * @fileoverview Angular directive that converts an array of
 *     email addresses into a suitable format that reveals
 *     additional details about the address.
 */

goog.provide('e2email.components.userlist');
goog.provide('e2email.components.userlist.module');

goog.require('goog.array');
goog.require('goog.format.EmailAddress');

goog.scope(function() {


/**
 * A directive that wraps an array of email addresses in a suitable
 * template to make them nicer to read, and show additional
 * information about the user.
 * @param {!e2email.components.gmail.GmailService} gmailService The
 *     Gmail service.
 * @param {!e2email.components.translate.TranslateService} translateService
 *     The translation service.
 * @return {!angular.Directive} The directive.
 * @ngInject
 */
e2email.components.userlist.userlistDirective = function(
    gmailService, translateService) {

  var link = function(scope, element, attrs) {

    scope['members'] = [];

    // Watch for any changes in the model, and update the scope as
    // needed.
    scope.$watch('ulMembers', function(newMembers, oldMembers) {
      var members = [];
      if (goog.isArray(newMembers)) {
        goog.array.forEach(newMembers, function(item) {
          var name = null;
          if (item !== gmailService.mailbox.email) {
            // Use the first part of the address, not including the
            // domain.
            var parsed = goog.format.EmailAddress.parse(item);
            if (parsed.isValid()) {
              var addr = parsed.getAddress();
              if (addr.indexOf('@') > 0) {
                name = addr.substring(0, addr.indexOf('@'));
              }
            }
          } else {
            name = translateService.getMessage('me');
          }
          if (goog.isDefAndNotNull(name)) {
            members.push({'displayName': name});
          }
        });
      }
      if (members.length === 0) {
        // Fallback to always adding me as a name.
        members.push({'displayName': translateService.getMessage('me')});
      }
      scope['members'] = members;
    }, true);
  };

  return {
    restrict: 'E',
    scope: {
      ulMembers: '='
    },
    replace: true,
    templateUrl: 'components/userlist/userlist.html',
    link: link
  };
};


/**
 * Angular module.
 * @type {!angular.Module}
 */
e2email.components.userlist.module = angular
    .module(
        'e2email.components.userlist.UserlistDirective', [])
    .directive(
        'userlist',
        e2email.components.userlist.userlistDirective);

});  // goog.scope
