// Wrapper to import pdf-parse without triggering its debug self-test under Turbopack.
// pdf-parse's index.js contains a self-test guarded by `!module.parent`.
// Importing the internal implementation directly avoids that side effect.
// See: node_modules/pdf-parse/index.js vs node_modules/pdf-parse/lib/pdf-parse.js
// eslint-disable-next-line import/no-extraneous-dependencies
// @ts-expect-error - package doesn't ship types for deep import
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
export default pdfParse;
