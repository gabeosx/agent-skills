'use strict';

function outputOk(operation, results) {
  process.stdout.write(JSON.stringify({ operation, status: 'ok', results, error: null }) + '\n');
  process.exit(0);
}

function outputError(operation, code, message) {
  process.stdout.write(JSON.stringify({ operation, status: 'error', results: null, error: { code, message } }) + '\n');
  process.exit(1);
}

module.exports = { outputOk, outputError };
