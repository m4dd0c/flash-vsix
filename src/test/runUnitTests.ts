import Module from 'module';
import * as mockVscode from './mockVscode';

// Hook require('vscode') to mockVscode
const originalRequire = (Module.prototype as any).require;
(Module.prototype as any).require = function (id: string, ...args: any[]) {
  if (id === 'vscode') {
    return mockVscode;
  }
  return originalRequire.apply(this, [id, ...args]);
};

import Mocha from 'mocha';
import * as path from 'path';

async function run() {
  const mocha = new Mocha({
    ui: 'bdd',
    color: true,
    timeout: 5000,
  });

  mocha.addFile(path.resolve(__dirname, 'suite/matcher.test.js'));
  mocha.addFile(path.resolve(__dirname, 'suite/labeler.test.js'));

  mocha.run((failures) => {
    if (failures > 0) {
      console.error(`${failures} tests failed.`);
      process.exit(1);
    } else {
      console.log('All tests passed successfully!');
      process.exit(0);
    }
  });
}

run();
