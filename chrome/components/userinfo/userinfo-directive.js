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
 * @fileoverview Angular directive that provides more detailed
 *     information about a user as a popover.
 */

goog.provide('e2email.components.userinfo');
goog.provide('e2email.components.userinfo.module');

goog.scope(function() {


/**
 * A directive that takes an email address and adds a popover to
 * reveal more detailed information about the user.
 * @param {!angular.$timeout} $timeout The angular $timeout service.
 * @param {!e2email.components.contacts.ContactsService} contactsService The
 *     Contacts service.
 * @param {!e2email.components.translate.TranslateService} translateService
 *     The translation service.
 * @return {!angular.Directive} The directive.
 * @ngInject
 */
e2email.components.userinfo.userinfoDirective = function(
    $timeout, contactsService, translateService) {

  var link = function(scope, element, attrs) {
    // Locate the popover div.
    var popover = angular.element(element.find('div')[1]);

    // And the main label section.
    var label = angular.element(element.find('b')[0]);

    var showing = false;

    scope['help'] = false;

    scope['maybeClose'] = function() {
      if (showing) {
        scope['toggle'](null);
      }
    };

    scope['toggle'] = function(event) {
      scope['help'] = false;
      if (showing) {
        popover.removeClass('in');
        // Remove the display after a timeout
        $timeout(function() {
          popover.removeClass('show');
          showing = false;
        }, 200);
      } else {
        popover.addClass('show');
        // Add the fade-in class in the next cycle.
        $timeout(function() {
          popover.addClass('in');
          showing = true;
        }, 0);
      }
      if (goog.isDefAndNotNull(event)) {
        event.stopPropagation();
      }
    };

    scope['toggleHelp'] = function(event) {
      if (scope['help']) {
        scope['help'] = false;
        scope['toggle'](event);
      } else {
        scope['help'] = true;
        event.stopPropagation();
      }
    };

    scope.$watch('uiUser', function(newUser, oldUser) {
      scope['info'] = contactsService.users[newUser];
      label.bind('click', scope['toggle']);
    }, false);
  };


  return {
    restrict: 'E',
    scope: {
      uiUser: '='
    },
    replace: true,
    templateUrl: 'components/userinfo/userinfo.html',
    link: link
  };
};


/**
 * Angular module.
 * @type {!angular.Module}
 */
e2email.components.userinfo.module = angular
    .module(
        'e2email.components.userinfo.UserinfoDirective', [])
    .directive(
        'userinfo',
        e2email.components.userinfo.userinfoDirective);

});  // goog.scope
