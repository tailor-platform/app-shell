import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { renderReport } from "./local-review.mjs";

const headSha = "a".repeat(40);
const nextHeadSha = "b".repeat(40);
const workflowSha = "c".repeat(40);
const repository = "example/app-shell";
const reportUrl = "https://github.com/example/app-shell/pull/123#issuecomment-456";
const validatorSource = readFileSync(new URL("./local-review.mjs", import.meta.url), "utf8");
const workflow = readFileSync(
  new URL("../.github/workflows/local-review-gate.yaml", import.meta.url),
  "utf8",
);
const lines = workflow.split("\n");
const scriptStart = lines.findIndex((line) => line === "          script: |");
assert(scriptStart >= 0, "The gate must have an inline github-script block.");
const scriptLines = [];
for (const line of lines.slice(scriptStart + 1)) {
  if (line.trim() && !line.startsWith("            ")) break;
  scriptLines.push(line.slice(12));
}
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const execute = new AsyncFunction("github", "context", "core", "process", scriptLines.join("\n"));

function report(sha = headSha) {
  return renderReport({
    plan: {
      version: 1,
      repository,
      prNumber: 123,
      branch: "feature",
      headRepository: repository,
      headRef: "feature",
      baseSha: "d".repeat(40),
      headSha: sha,
      mergeBaseSha: "e".repeat(40),
      files: ["src/button.tsx"],
    },
    review: {
      completed: true,
      files: [{ path: "src/button.tsx", status: "reviewed" }],
      findings: [],
      checks: ["Read the changed file and its callers."],
      limitations: ["Tests were not run."],
    },
  });
}

function comment(body = report(), login = "author", type = "User") {
  return { body, user: { login, type }, html_url: reportUrl };
}

async function runGate(options = {}) {
  const statuses = [];
  const failures = [];
  const permissionCalls = [];
  const validatorCalls = [];
  const paginationCalls = [];
  const summary = [];
  let prCalls = 0;
  const heads = options.heads ?? [headSha];
  const github = {
    rest: {
      pulls: {
        get: async (args) => {
          assert.deepEqual(args, { owner: "example", repo: "app-shell", pull_number: 123 });
          if (options.prError) throw new Error(options.prError);
          const sha = heads[Math.min(prCalls++, heads.length - 1)];
          return {
            data: { state: options.state ?? "open", head: { sha }, user: { login: "author" } },
          };
        },
      },
      repos: {
        createCommitStatus: async (args) => {
          statuses.push(args);
          return { data: args };
        },
        getContent: async (args) => {
          validatorCalls.push(args);
          assert.deepEqual(args, {
            owner: "example",
            repo: "app-shell",
            path: "scripts/local-review.mjs",
            ref: workflowSha,
          });
          assert.notEqual(args.ref, headSha);
          if (options.validatorError) throw new Error(options.validatorError);
          return {
            data: {
              type: "file",
              encoding: "base64",
              content: Buffer.from(validatorSource)
                .toString("base64")
                .match(/.{1,60}/g)
                .join("\n"),
            },
          };
        },
        getCollaboratorPermissionLevel: async (args) => {
          permissionCalls.push(args);
          assert.equal(args.owner, "example");
          assert.equal(args.repo, "app-shell");
          if (options.permissionError) throw new Error(options.permissionError);
          return { data: { permission: options.permission ?? "read" } };
        },
      },
      issues: {
        listComments: async () =>
          assert.fail("Use github.paginate rather than reading just one page."),
      },
    },
    paginate: async (method, args) => {
      assert.equal(method, github.rest.issues.listComments);
      assert.deepEqual(args, {
        owner: "example",
        repo: "app-shell",
        issue_number: 123,
        per_page: 100,
      });
      paginationCalls.push(args);
      if (options.commentsError) throw new Error(options.commentsError);
      return options.comments ?? [];
    },
  };
  const core = {
    info() {},
    error() {},
    setFailed(message) {
      failures.push(message);
    },
    summary: {
      addHeading(value) {
        summary.push(value);
        return this;
      },
      addRaw(value) {
        summary.push(value);
        return this;
      },
      async write() {},
    },
  };
  const context = {
    repo: { owner: "example", repo: "app-shell" },
    payload: options.payload ?? { pull_request: { number: 123 } },
    serverUrl: "https://github.com",
    runId: 789,
  };
  await execute(github, context, core, { env: { VALIDATOR_REF: workflowSha } });
  assert(statuses.every((status) => status.context === "local-review/report"));
  return { statuses, failures, permissionCalls, validatorCalls, paginationCalls, summary, prCalls };
}

function assertStatus(result, state, sha = headSha) {
  assert.deepEqual(
    result.statuses.map((status) => status.state),
    ["pending", state],
  );
  assert.equal(result.statuses.at(-1).sha, sha);
}

test("no report fails the current PR head", async () => {
  const result = await runGate();
  assertStatus(result, "failure");
  assert.deepEqual(result.failures, []);
});

test("a real current-head report from the PR author succeeds", async () => {
  const result = await runGate({ comments: [comment()] });
  assertStatus(result, "success");
  assert.equal(result.statuses.at(-1).target_url, reportUrl);
  assert.deepEqual(result.permissionCalls, []);
  assert.equal(result.validatorCalls.length, 1);
  assert(result.summary.join("").includes("Require `local-review/report`"));
});

test("a report for an old head does not certify the current head", async () => {
  const result = await runGate({ comments: [comment(report(nextHeadSha))] });
  assertStatus(result, "failure");
});

test("a real report for a different PR is rejected", async () => {
  const body = report();
  const encoded = body.match(/local-review-data:v1 ([A-Za-z0-9+/=]+) -->$/)[1];
  const payload = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
  payload.plan.prNumber = 124;
  const result = await runGate({ comments: [comment(renderReport(payload))] });
  assertStatus(result, "failure");
});

for (const permission of ["write", "maintain", "admin"]) {
  test(`a non-author with ${permission} permission may submit a report`, async () => {
    const result = await runGate({ comments: [comment(report(), "maintainer")], permission });
    assertStatus(result, "success");
    assert.equal(result.permissionCalls[0].username, "maintainer");
  });
}

test("an unrelated read-only commenter cannot satisfy the gate", async () => {
  const result = await runGate({ comments: [comment(report(), "outsider")] });
  assertStatus(result, "failure");
});

test("bot reports do not satisfy the gate", async () => {
  const result = await runGate({ comments: [comment(report(), "author", "Bot")] });
  assertStatus(result, "failure");
  assert.deepEqual(result.permissionCalls, []);
});

test("a deleted report is not accepted from the historical event payload", async () => {
  const result = await runGate({
    payload: { issue: { number: 123, pull_request: {} }, comment: comment(), action: "deleted" },
    comments: [],
  });
  assertStatus(result, "failure");
  assert.equal(result.paginationCalls.length, 1);
});

test("an edited report must still match the real validator's canonical text", async () => {
  const result = await runGate({
    payload: { issue: { number: 123, pull_request: {} }, comment: comment(), action: "edited" },
    comments: [comment(report().replace("No findings.", "Changed by hand."))],
  });
  assertStatus(result, "failure");
});

test("paginated comments can find a valid report after the first hundred comments", async () => {
  const comments = Array.from({ length: 100 }, () => comment("An ordinary comment."));
  comments.push(comment());
  const result = await runGate({ comments });
  assertStatus(result, "success");
  assert.equal(result.paginationCalls.length, 1);
});

test("a push during validation fails the new head instead of certifying the old report", async () => {
  const result = await runGate({ heads: [headSha, nextHeadSha], comments: [comment()] });
  assertStatus(result, "failure", nextHeadSha);
  assert.equal(result.statuses[0].sha, headSha);
  assert.match(result.failures[0], /PR HEAD changed/);
});

for (const [field, message] of [
  ["validatorError", "Validator API unavailable"],
  ["commentsError", "Comments API unavailable"],
  ["permissionError", "Permission API unavailable"],
]) {
  test(`${field} revokes success rather than passing open`, async () => {
    const result = await runGate({ [field]: message, comments: [comment(report(), "maintainer")] });
    assertStatus(result, "failure");
    assert.deepEqual(result.failures, [message]);
  });
}

test("closed PRs receive no status writes", async () => {
  const result = await runGate({ state: "closed" });
  assert.deepEqual(result.statuses, []);
  assert.deepEqual(result.validatorCalls, []);
});

test("an unavailable PR API cannot invent a SHA but marks the job failed", async () => {
  const result = await runGate({ prError: "PR API unavailable" });
  assert.deepEqual(result.statuses, []);
  assert.deepEqual(result.failures, ["PR API unavailable"]);
});
