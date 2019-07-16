const fs = require('fs');
const path = require('path');
const program = require('commander');
const { promisify } = require('util');

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

program
  .version('0.1.0')
  .option('-f, --file <string>', 'Which build file would you like to move to api/v2/abi')
  .parse(process.argv);

(async function start() {
  const parentDir = path.dirname(
    path.dirname(
      process.mainModule.filename,
    ),
  );
  const buildFile = await readFile(
    path.join(
      parentDir,
      'build',
      'contracts',
      `${program.file}.json`,
    ),
  );
  const contractJson = JSON.parse(buildFile);
  delete contractJson.sourceMap;
  delete contractJson.deployedSourceMap;
  delete contractJson.sourcePath;
  delete contractJson.ast;
  delete contractJson.legacyAST;
  const destination = path.join(
    path.dirname(parentDir),
    'meridio-api',
    'api',
    'v2',
    'abis',
    `${program.file}.json`,
  );
  await writeFile(
    destination,
    JSON.stringify(contractJson),
    'utf8',
  );
  process.exit();
}());
