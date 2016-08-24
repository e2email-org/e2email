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
 * @fileoverview Typedefs for a user's mailbox.
 */

goog.provide('e2email.models.mail.Attachment');
goog.provide('e2email.models.mail.Mail');
goog.provide('e2email.models.mail.Mailbox');
goog.provide('e2email.models.mail.Thread');


/**
 * This is the model for the attachments support.
 * The filename is the attachment's name, size is its size in bytes,
 * encoding is the encoding of the attachment, content is the string
 * with its content, type is the atttachment's type.
 * @typedef {{
 * filename: string,
 * type: string,
 * encoding: string,
 * content: string,
 * size: number
 * }}
 */
e2email.models.mail.Attachment;


/**
 * @typedef {{
 *   id: string,
 *   subject: string,
 *   from: string,
 *   messageId: string,
 *   to: !Array.<string>,
 *   created: !Date,
 *   warning: ?string,
 *   unread: boolean,
 *   status: ?string,
 *   hasErrors: ?string,
 *   mimeContent: ?Array.<{content: string, type: string, url: string, filename: string}>
 * }}
 */
e2email.models.mail.Mail;


/**
 * This is the model for a Safe Mail user's mailbox. The email is the
 * user's email address, the threads represents all the mail threads
 * in the user's mailbox, and the status describes any (transient)
 * operations in the background.
 * @typedef {{
 *   email: string,
 *   threads: !Array.<!e2email.models.mail.Thread>,
 *   status: ?string
 * }}
 */
e2email.models.mail.Mailbox;


/**
 * @typedef {{
 *   id: string,
 *   subject: string,
 *   updated: !Date,
 *   from: string,
 *   messageId: string,
 *   participants: !Array.<string>,
 *   to: !Array.<string>,
 *   snippet: string,
 *   mails: !Array.<!e2email.models.mail.Mail>,
 *   unread: boolean,
 *   isMarked: boolean
 * }}
 */
e2email.models.mail.Thread;



