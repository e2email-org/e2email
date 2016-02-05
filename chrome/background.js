/**
 * @license
 * Copyright 2016 E2EMail authors. All rights reserved.
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

(function() {
  chrome.app.runtime.onLaunched.addListener(function(data) {
    chrome.app.window.create('../index.html', {
      id: 'e2email',
      innerBounds: {
        width: 440,
        height: 680,
        minWidth: 440,
        minHeight: 680
      }
    }, function(win) {
      if (win) {
        win.show();
        win.focus();
      }
    });
  });

  chrome.runtime.onInstalled.addListener(function() {
    console.log('installed');
  });

  chrome.runtime.onSuspend.addListener(function() {
    console.log('suspended');
  });
})();
