#!/usr/bin/env bash
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
# 
#   http://www.apache.org/licenses/LICENSE-2.0
# 
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

set -o nounset
set -o errexit
set -o pipefail

cd ${0%/*}

readonly PYTHON_CMD="${PYTHON_CMD:-python}"
readonly JAVA_CMD="${JAVA_CMD:-java}"
readonly NPM_CMD="${NPM_CMD:-npm}"
readonly NODEJS_CMD="${NODEJS_CMD:-node}"
readonly LINT_CMD="${LINT_CMD:-gjslint}"
readonly JSCOMPILE="${JAVA_CMD} -jar chrome-lib/end-to-end/lib/closure-compiler/build/compiler.jar --flagfile=chrome/compiler.flags"
readonly BUILD="build"
readonly CHROME_BUILD="${BUILD}/e2email"
readonly LIB="chrome-lib"
readonly E2ELIB="${LIB}/end-to-end"

e2email_setup() {
  git submodule init
  git submodule update --recursive
  chrome-lib/end-to-end/do.sh install_deps
}

e2email_assert_npm() {
  # Check if nodejs and npm are installed.
  type "$NODEJS_CMD" >/dev/null 2>&1 || { echo >&2 "Please install nodejs to run tests."; exit 1; }
  type "$NPM_CMD" >/dev/null 2>&1 || { echo >&2 "Please install npm to run tests."; exit 1; }
}

e2email_assert_node_modules() {
  # Check or download required modules for karma
  ${NPM_CMD} install
}

e2email_check() {
  chrome-lib/end-to-end/do.sh check_deps
}

e2email_generate_jsdeps() {
  local deps=${1:-""}
  local src=${2:-""}
  local roots=( \
    ${E2ELIB}/lib/zlib.js \
    ${E2ELIB}/src/javascript/crypto/e2e )
  if [[ -n "$src" && -d "$src" ]]; then
    roots+=("$src")
  fi
  local depscmd="$PYTHON_CMD ${E2ELIB}/lib/closure-library/closure/bin/build/depswriter.py"
  for var in "${roots[@]}"
  do
    depscmd+=" --root=${var}"
  done
  $depscmd > "${deps}"
}

e2email_jscompile() {
  local out=$1
  local entry=$2
  local extra=$3
  local src_dirs=( \
    ${E2ELIB}/src \
    ${E2ELIB}/lib/closure-library/closure/goog \
    ${E2ELIB}/lib/closure-library/third_party/closure/goog \
    ${E2ELIB}/lib/zlib.js/src \
    ${E2ELIB}/lib/typedarray )

  local jscompile_e2email="${JSCOMPILE} ${extra}"
  for var in "${src_dirs[@]}"
  do
    jscompile_e2email+=" --js='$var/**.js'"
  done
  local exclude_dirs=( \
    ${E2ELIB}/lib/closure-library/closure/goog/demos \
    ${E2ELIB}/src/javascript/crypto/e2e/compatibility_tests \
    ${E2ELIB}/src/javascript/crypto/e2e/extension )
  for var in "${exclude_dirs[@]}"
  do
    jscompile_e2email+=" --js='!${var}/**.js'"
  done
  jscompile_e2email+=" --closure_entry_point ${entry} --js_output_file ${out}"
  # jscompile_e2email+=" --debug --formatting=PRETTY_PRINT -O WHITESPACE_ONLY"
  ${jscompile_e2email}
}

e2email_build_worker() {
  local debug=${1:-no}
  local extra=" --js='chrome/worker/**.js' --define=e2e.openpgp.ContextImpl.KEY_SERVER_URL='https://hkpserverext.appspot.com' --define=e2e.openpgp.ContextImpl.KEY_SERVER_URL='https://hkpserverext.appspot.com' --js ${BUILD}/e2e-deps.js"
  if [[ ${debug} == "debug" ]]; then
    extra+=" --debug --formatting=PRETTY_PRINT -O WHITESPACE_ONLY"
  fi
  e2email_jscompile "${CHROME_BUILD}/assets/js/worker_binary.js" "e2email.worker.bootstrap" "${extra}"
}

e2email_build_app() {
  local debug=${1:-no}
  local extra=" --js='chrome/**.js' --js='!chrome/worker/**.js' --js='!chrome/assets/**.js' --js='!chrome/background.js' --js='!chrome/karma/**.js' --define=e2email.components.openpgp.OpenPgpService.KEYSERVER_URL='https://hkpserverext.appspot.com' --define=e2email.components.openpgp.OpenPgpService.WORKER_BINARY_PATH='assets/js/worker_binary.js' --angular_pass=true --js ${BUILD}/e2email-deps.js"
  if [[ ${debug} == "debug" ]]; then
    extra+=" --debug --formatting=PRETTY_PRINT -O WHITESPACE_ONLY"
  fi
  e2email_jscompile "${CHROME_BUILD}/e2email_binary.js" "e2email.application.module" "${extra}"
}

e2email_build() {
  local debug=${1:-no}
  e2email_check
  echo "Building e2email app to ${CHROME_BUILD}"
  rm -rf "${BUILD}"
  mkdir -p "${CHROME_BUILD}/assets/js"
  e2email_generate_jsdeps "${BUILD}/e2e-deps.js"
  e2email_generate_jsdeps "${BUILD}/e2email-deps.js" "chrome"

  echo "Building worker..."
  e2email_build_worker ${debug}
  echo "Building app..."
  e2email_build_app ${debug}

  echo "Copying assets..."
  # Copy assets
  cp -pr chrome/assets \
    chrome/manifest.json \
    chrome/_locales \
    chrome/background.js \
    "${CHROME_BUILD}"
  # Copy html
  pushd chrome > /dev/null
  local html=$(find . -name \*html)
  popd > /dev/null
  tar -C chrome -cf - ${html} | tar -C "${CHROME_BUILD}" -xf -
  # Copy css
  find chrome -name assets -prune -o -type f -name \*css -exec cat '{}' \; > ${CHROME_BUILD}/assets/css/styles-bundle.css
  echo "Unpacked app available at ${CHROME_BUILD}"
}

e2email_clean() {
  if [[ -x ${E2ELIB}/do.sh ]]; then
    ${E2ELIB}/do.sh clean
  fi
  rm -rf ${BUILD}
  rm -rf node_modules
}

e2email_prepare_karma() {
  e2email_assert_npm
  e2email_check
  e2email_assert_node_modules
  echo Building debug version of app...
  e2email_build
}

e2email_karma() {
  e2email_prepare_karma
  ${NODEJS_CMD} ./node_modules/karma/bin/karma start chrome/karma/karma.conf.js
}

e2email_test_app() {
  e2email_prepare_karma
  ${NODEJS_CMD} ./node_modules/karma/bin/karma --single-run --browsers Chrome start chrome/karma/karma.conf.js
}

e2email_lint() {
  type "$LINT_CMD" >/dev/null 2>&1 || { echo >&2 "Please install Closure Linter (https://developers.google.com/closure/utilities/docs/linter_howto) first."; exit 1; }

  ${LINT_CMD} --strict --closurized_namespaces=goog,e2e --limited_doc_files=_test.js -r chrome -e chrome/assets,chrome/karma
}

readonly CMD=${1:-help}

case "$CMD" in
  build)
    e2email_build;
    ;;
  clean)
    e2email_clean;
    ;;
  karma)
    e2email_karma;
    ;;
  lint)
    e2email_lint;
    ;;
  setup)
    e2email_setup;
    ;;
  test_app)
    e2email_test_app;
    ;;
  *)
    echo "Usage: $0 {build|clean|karma|lint|setup|test_app}"
    exit 1
esac
