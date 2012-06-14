// Copyright 2012 Software Freedom Conservancy
//
// Licensed under the Apache License, Version 2.0 (the 'License');
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/** @fileoverview Provides a filesystem API. */

goog.provide('fxdriver.files');
goog.provide('fxdriver.files.File');

/**
 * Creates a temporary text file starting with opt_prefix and ending with
 * opt_suffix.
 *
 * The file will be stored in the active firefox profile directory.
 *
 * @param {string=} opt_prefix Prefix of filename.
 * @param {string=} opt_suffix Suffix of filename.
 * @return {!fxdriver.files.File} The newly created file.
 */
fxdriver.files.createTempFile = function(opt_prefix, opt_suffix) {
  var prefix = opt_prefix || '';
  var suffix = opt_suffix || '';

  var tmpdir = Components.classes['@mozilla.org/file/directory_service;1'].
      getService(Components.interfaces.nsIProperties).
      get('ProfD', Components.interfaces.nsIFile);
  var exists = true;
  var file;
  while (exists) {
    var path =
        prefix + Math.round(Math.random() * new Date().getTime()) + suffix;
    file = tmpdir.clone();
    file.append(path);
    exists = file.exists();
  }
  file.createUnique(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 0666);
  return new fxdriver.files.File(file);
};

/**
 * An file abstraction.
 *
 * @param {!nsIFile} nsIFile the nsIFile to wrap
 * @constructor
 */
fxdriver.files.File = function(nsIFile) {
  /**
   * @type {!nsIFile}
   * @private
   **/
  this.nsIFile_ = nsIFile;
};

/**
 * Mode for opening files for append.
 * 0x02 = write
 * 0x10 = append
 * See https://developer.mozilla.org/en/PR_Open#Parameters
 *
 * @const
 * @private
 * @type {number}
 */
fxdriver.files.APPEND_MODE_ = 0x02 | 0x10;

/**
 * Mode for opening files for read.
 * 0x01 = read
 * See https://developer.mozilla.org/en/PR_Open#Parameters
 *
 * @const
 * @private
 * @type {number}
 */
fxdriver.files.READ_MODE_ = 0x01;

/**
 * Appends toAppend to the file.
 *
 * @param {string} toAppend Text to append.
 */
fxdriver.files.File.prototype.append = function(toAppend) {
  var ostream = Components.classes['@mozilla.org/network/file-output-stream;1']
      .createInstance(Components.interfaces['nsIFileOutputStream']);
  ostream.init(this.nsIFile_, fxdriver.files.APPEND_MODE_, 0666, 0);

  var converter =
      Components.classes['@mozilla.org/intl/converter-output-stream;1']
          .createInstance(Components.interfaces['nsIConverterOutputStream']);
  converter.init(ostream, 'UTF-8', 0, 0);

  converter.writeString(toAppend);

  converter.close();
  ostream.close();
};

/**
 * Reads the whole contents of the file.
 *
 * @return {string} Entire contents of the file.
 */
fxdriver.files.File.prototype.read = function() {
  var istream = Components.classes['@mozilla.org/network/file-input-stream;1']
      .createInstance(Components.interfaces['nsIFileInputStream']);
  istream.init(this.nsIFile_, fxdriver.files.READ_MODE_, 0666, 0);

  var scriptableStream =
      Components.classes['@mozilla.org/scriptableinputstream;1']
	  .createInstance(Components.interfaces.nsIScriptableInputStream);
  scriptableStream.init(istream);

  // TODO(dawagner): Chunk output if we need to read more than 10MB.
  // Currently if the log file is >10MB, we will just return the truncated file.

  var bytesToRead = Math.min(istream.available(), 10485760);
  // TODO(dawagner): Use NetUtil.jsm#readInputStreamToString when we drop
  // support for FF<4
  var toReturn = scriptableStream.readBytes(bytesToRead);

  scriptableStream.close();
  istream.close();

  return toReturn;
};

