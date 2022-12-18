import * as core from '@actions/core';
import {spawnSync, SpawnSyncReturns} from 'child_process';

const COL_FILE_PATH = 0;
const COL_FUNC_NAME = 1;
const COL_COVERAGE = 2;
const TOTAL_PATH_KEY = "total:";

interface CoverResult {
  path: string;
  funcName: string;
  coverage: number;
}

const buildGoTestShell = (): string => {
  const path = core.getInput('path', {required: false});

  return `#!/bin/bash
argPath=${path}

go test $argPath -cover -coverprofile=cover.out`;
};

const buildCoverageShell = (): string => {
  const threshold = core.getInput('threshold', {required: false});

  return `#!/bin/bash
argThreshold=${threshold}

tests=\`go tool cover -func=cover.out\`
echo "$tests"
`;
};

const outputTest = (result: SpawnSyncReturns<Buffer>): void => {
  if (result.status == 1) {
    core.setFailed('Failed');
    core.error(result.stdout.toString());
  } else {
    core.info(result.stdout.toString());
  }
}

const outputCoverage = (result: CoverResult): void => {
  if (result.path == TOTAL_PATH_KEY) {
    const threshold = core.getInput('threshold', {required: false});
    if (result.coverage < Number(threshold)) {
      core.setFailed(`Coverage is lower than threshold.`);
      core.setFailed(`Total: ${result.coverage}%`);
      core.setFailed(`Threshold: ${threshold}%`);
    } else {
      core.info(`Total: ${result.coverage}%`);
    }
  } else {
    core.info(`path: ${result.path}, funcName: ${result.funcName}, coverage: ${result.coverage}%`);
  }
}

const parseCoverResult = (result: string): CoverResult => {
  const cols = result.split(/\t/);
  let buildCols = [];
  for (let i = 0; i < cols.length; i++) {
    if (cols[i] != "") {
      buildCols.push(cols[i]);
    }
  }

  return {
    path: buildCols[COL_FILE_PATH],
    funcName: buildCols[COL_FUNC_NAME],
    coverage: Number(buildCols[COL_COVERAGE].replace("%", "")),
  }
}

const run = async () => {
  try {
    // go test
    core.startGroup('go test');
    const goTestShell = buildGoTestShell();
    let result = spawnSync(goTestShell, {shell: '/bin/bash'});
    outputTest(result);
    core.endGroup();

    if (result.status == 1) {
      return;
    }

    // go text coverage
    core.startGroup('test coverage');
    const coverageShell = buildCoverageShell();
    result = spawnSync(coverageShell, {shell: '/bin/bash'});
    const rows = result.stdout.toString().split(/\n/);
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row != "") {
        const coverResult = parseCoverResult(row);
        outputCoverage(coverResult);
      }
    }
    core.endGroup();
  } catch (error: any) {
    core.setFailed(error.status);
    core.setFailed(error.message);
    core.setFailed(error.stderr.toString());
    core.setFailed(error.stdout.toString());
  }
};

run();
