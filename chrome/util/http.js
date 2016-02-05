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
 * @fileoverview small utility containing a function to validate http responses
 */

goog.provide('e2email.util.Http');


goog.scope(function() {


var http = e2email.util.Http;


/**
 * Given a http service response, determine if this was a successful
 * response from
 * @param {Object} response
 * @return {boolean} Returns true if this looks like a successful response.
 */
http.goodResponse = function(response) {
  return (goog.isDefAndNotNull(response.status) &&
      goog.isNumber(response.status) &&
      (response.status === 200) &&
      goog.isDefAndNotNull(response.data));
};




});  // goog.scope
