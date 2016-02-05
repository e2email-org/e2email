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
 * @fileoverview small utility for email related functions
 */

goog.provide('e2email.util.Email');

goog.require('goog.format.EmailAddress');

goog.scope(function() {


var Email = e2email.util.Email;


/**
 * Given a string, parses a bare email address from it, or returns
 * null if it was unable to find a valid email address.
 * @param {?string} content The string containing the email address.
 * @return {?string} A bare email address, or null if none was found.
 */
Email.parseEmail = function(content) {
  if (!goog.isDefAndNotNull(content)) {
    return null;
  }
  var parsed = goog.format.EmailAddress.parse(content);
  if (parsed.isValid()) {
    return parsed.getAddress();
  } else {
    return null;
  }
};




});  // goog.scope
