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
 * @fileoverview Angular directive providing an expression that
 * can be called when a click occurs outside a given element block.
 */

goog.provide('e2email.components.outerclick');
goog.provide('e2email.components.outerclick.module');

goog.scope(function() {


/**
 * A directive that provides an attribute which evaluates an expression
 * if a click occurs outside its element block.
 * @param {!angular.JQLite} $document The angular $document service.
 * @return {!angular.Directive} The directive.
 * @ngInject
 */
e2email.components.outerclick.outerclickDirective = function($document) {

  var link = function(scope, element, attrs) {
    var handler = function(event) {
      if ((element.length > 0) &&
          (event.target !== element[0]) &&
          (goog.isFunction(element[0].contains)) &&
          !element[0].contains(event.target)) {
        scope.$apply(attrs.outerclick);
      }
    };
    $document.on('click', handler);
    scope.$on('$destroy', function() {
      $document.off('click', handler);
    });
  };

  return {
    restrict: 'A',
    link: link
  };
};


/**
 * Angular module.
 * @type {!angular.Module}
 */
e2email.components.outerclick.module = angular
    .module(
        'e2email.components.outerclick.outerclickDirective', [])
    .directive(
        'outerclick',
        e2email.components.outerclick.outerclickDirective);

});  // goog.scope
