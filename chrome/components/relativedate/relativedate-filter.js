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
 * @fileoverview Angular filter that formats a date, also taking into
 *     account how recent the date is.
 */

goog.provide('e2email.components.relativedate');
goog.provide('e2email.components.relativedate.module');


goog.scope(function() {


/**
 * A filter that converts a Date into a suitable locale-specific
 * string, but also taking into account how recent the date is. Dates
 * that occur "today" show just the hour and minute. Dates that fall
 * in the same year are formatted with the day and month. All
 * other dates are formatted with their numerical day month and year.
 *
 * @param {!angular.$filter} $filter The Angular filter service.
 * @return {function (!Date): string} The filter.
 * @ngInject
 */
e2email.components.relativedate.dateFormatFilter = function($filter) {
  /** @type {function(!Date, string): string} */
  var ngDateFilter = $filter('date');

  return function(input) {
    // Verify the types as this comes from angularjs.
    if (!goog.isObject(input) ||
        !(typeof input.getFullYear == 'function') ||
        !(typeof input.getMonth == 'function') ||
        !(typeof input.getDay == 'function')) {
      // Return an error message so we can track the issue.
      return 'relativedate expects a Date object.';
    }

    var now = new Date();

    // Return the 'shortDate' format if we're in different years.
    if (now.getFullYear() !== input.getFullYear()) {
      return ngDateFilter(input, 'shortDate');
    }
    // Return the 'month day' format if this Date does not occur today.
    if ((now.getMonth() !== input.getMonth()) ||
        (now.getDate() !== input.getDate())) {
      return ngDateFilter(input, 'MMM d');
    }
    // Return the 'shortTime' format for Dates that occur today.
    return ngDateFilter(input, 'shortTime');
  };
};


/**
 * Angular module.
 * @type {!angular.Module}
 */
e2email.components.relativedate.module = angular
    .module('e2email.components.relativedate.DateFormatFilter', [])
    .filter('relativedate',
            e2email.components.relativedate.dateFormatFilter);

});  // goog.scope
