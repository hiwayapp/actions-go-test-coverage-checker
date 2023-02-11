import * as core from '@actions/core';
import {spawnSync, SpawnSyncReturns} from 'child_process';
import { IncomingWebhook } from '@slack/webhook';

const COL_FILE_PATH = 0;
const COL_FUNC_NAME = 1;
const COL_COVERAGE = 2;
const TOTAL_ROW = "total:";

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
    core.info(result.stdout.toString());
  } else {
    core.info(result.stdout.toString());
  }
}

const buildLowerThanThresholdLog = (coverage: number, threshold: string): string[] => {
  return [
    "Coverage is lower than threshold.",
    `Total: ${coverage}%`,
    `Threshold: ${threshold}%`
  ];
}

const buildTotalInfoLog = (coverage: number): string => {
  return `Total: ${coverage}%`;
}

const buildFuncCoverageLog = (path: string, funcName: string, coverage: number): string => {
  return `path: ${path}, funcName: ${funcName}, coverage: ${coverage}%`;
}

const outputCoverage = (result: CoverResult): string[] => {
  if (result.path == TOTAL_ROW) {
    const threshold = core.getInput('threshold', {required: false});
    if (result.coverage < Number(threshold)) {
      const logLevel = core.getInput('logLevel', {required: false});
      var logs = buildLowerThanThresholdLog(result.coverage, threshold);
      if (logLevel == "error") {
        logs.forEach(function(log) {
          core.setFailed(log);
        });
      } else {
        logs.forEach(function(log) {
          core.info(log);
        });
      }
      return logs;
    } else {
      var log = buildTotalInfoLog(result.coverage);
      core.info(log);
      return [log];
    }
  } else {
    var log = buildFuncCoverageLog(result.path, result.funcName, result.coverage);
    core.info(log);
    return [log];
  }
}

const notifySlack = (slackWebhookUrl: string, message: string): void => {
  const webhook = new IncomingWebhook(slackWebhookUrl);
  (async () => {
    await webhook.send({
      text: message,
    });
  })();
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

    const slackWebhookUrl = core.getInput('slackWebhookUrl', {required: false});
    if (slackWebhookUrl != "") {
      var logs: string[] = [];
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row != "") {
          const coverResult = parseCoverResult(row);
          logs = logs.concat(outputCoverage(coverResult));
        }
      }
      const message = logs.join("\n");
      notifySlack(slackWebhookUrl, message);
    }
  } catch (error: any) {
    core.setFailed(error.status);
    core.setFailed(error.message);
    core.setFailed(error.stderr.toString());
    core.setFailed(error.stdout.toString());
  }
};

run();
