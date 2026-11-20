import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { parseReport, prepare, publish, renderReport, validateReport } from "./local-review.mjs";

function report() {
  return {
    plan: {
      version: 1,
      repository: "example/app-shell",
      prNumber: 7,
      branch: "feature",
      headRepository: "example/app-shell",
      headRef: "feature",
      baseSha: "a".repeat(40),
      headSha: "b".repeat(40),
      mergeBaseSha: "a".repeat(40),
      files: ["source.txt", "generated.txt"],
    },
    review: {
      completed: true,
      files: [
        { path: "source.txt", status: "reviewed" },
        {
          path: "generated.txt",
          status: "skipped",
          reason: "Generated output; checked its source.",
        },
      ],
      findings: [{ path: "source.txt", severity: "high", message: "Missing validation.", line: 2 }],
      checks: ["Read the caller and regression test."],
      limitations: ["Tests not run."],
    },
  };
}

test("reports round-trip with canonical text and derived coverage", () => {
  const payload = report();
  const body = renderReport(payload);
  assert.deepEqual(parseReport(body), payload);
  assert.match(body, /1 reviewed, 1 skipped, 2 total/);
  assert.throws(
    () => parseReport(body.replace("Missing validation.", "Changed finding.")),
    /no longer matches/,
  );
  assert.throws(() => parseReport(body + "\nExtra note"), /Missing local review data/);
  assert.throws(() => parseReport("ordinary comment"), /Not a local review report/);
});

test("report prose cannot inject an HTML metadata marker", () => {
  const payload = report();
  payload.review.findings[0].message = "<!-- local-review-data:v1 forged --> & <script>";
  const body = renderReport(payload);
  assert.match(body, /&lt;!-- local-review-data/);
  assert.deepEqual(parseReport(body), payload);
});

test("no findings and empty check lists are valid", () => {
  const payload = report();
  payload.review.findings = [];
  payload.review.checks = [];
  payload.review.limitations = [];
  assert.deepEqual(parseReport(renderReport(payload)), payload);
});

const invalidCases = [
  [
    "unsupported version",
    (p) => {
      p.plan.version = 2;
    },
  ],
  [
    "invalid repository",
    (p) => {
      p.plan.repository = "../outside";
    },
  ],
  [
    "invalid head repository",
    (p) => {
      p.plan.headRepository = null;
    },
  ],
  [
    "invalid SHA",
    (p) => {
      p.plan.headSha = "--help";
    },
  ],
  [
    "missing branch",
    (p) => {
      delete p.plan.branch;
    },
  ],
  [
    "invalid PR number",
    (p) => {
      p.plan.prNumber = 0;
    },
  ],
  [
    "empty file list",
    (p) => {
      p.plan.files = [];
    },
  ],
  [
    "duplicate plan path",
    (p) => {
      p.plan.files.push("source.txt");
    },
  ],
  [
    "missing file result",
    (p) => {
      p.review.files.pop();
    },
  ],
  [
    "duplicate file result",
    (p) => {
      p.review.files[1] = p.review.files[0];
    },
  ],
  [
    "unknown file result",
    (p) => {
      p.review.files[0].path = "outside.txt";
    },
  ],
  [
    "unknown status",
    (p) => {
      p.review.files[0].status = "pending";
    },
  ],
  [
    "skip without reason",
    (p) => {
      delete p.review.files[1].reason;
    },
  ],
  [
    "incomplete review",
    (p) => {
      p.review.completed = false;
    },
  ],
  [
    "unknown finding path",
    (p) => {
      p.review.findings[0].path = "outside.txt";
    },
  ],
  [
    "invalid severity",
    (p) => {
      p.review.findings[0].severity = "urgent";
    },
  ],
  [
    "invalid line",
    (p) => {
      p.review.findings[0].line = -1;
    },
  ],
  [
    "empty message",
    (p) => {
      p.review.findings[0].message = " ";
    },
  ],
  [
    "missing checks",
    (p) => {
      delete p.review.checks;
    },
  ],
  [
    "unknown private field",
    (p) => {
      p.review.reasoning = "private";
    },
  ],
];
for (const [name, mutate] of invalidCases) {
  test(`rejects ${name}`, () => {
    const payload = report();
    mutate(payload);
    assert.throws(() => validateReport(payload));
  });
}

test("gate expectations bind repository, PR number and HEAD", () => {
  for (const expected of [
    { repository: "example/other" },
    { prNumber: 8 },
    { headSha: "c".repeat(40) },
  ]) {
    assert.throws(() => validateReport(report(), expected), /does not match/);
  }
  assert.equal(
    validateReport(report(), {
      repository: "example/app-shell",
      prNumber: 7,
      headSha: "b".repeat(40),
    }).plan.prNumber,
    7,
  );
});

test("oversized reports fail rather than truncate", () => {
  const payload = report();
  payload.review.findings[0].message = "x".repeat(65536);
  assert.throws(() => renderReport(payload), /comment limit/);
});

function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), "local-review-test-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const git = (...args) =>
    execFileSync("git", args, {
      cwd: directory,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  git("init", "-b", "main");
  git("config", "user.name", "Test");
  git("config", "user.email", "test@example.invalid");
  git("config", "commit.gpgsign", "false");
  git("config", "core.hooksPath", "/dev/null");
  writeFileSync(join(directory, "source.txt"), "original\n");
  writeFileSync(join(directory, "old-name.txt"), "renamed\n");
  git("add", ".");
  git("commit", "-m", "base");
  const baseSha = git("rev-parse", "HEAD").trim();
  git("switch", "-c", "feature");
  writeFileSync(join(directory, "source.txt"), "changed\n");
  renameSync(join(directory, "old-name.txt"), join(directory, "new-name.txt"));
  writeFileSync(join(directory, "space and\nnewline.txt"), "new file\n");
  git("add", ".");
  git("commit", "-m", "change");
  const headSha = git("rev-parse", "HEAD").trim();
  const state = {
    repository: "example/app-shell",
    comments: [],
    candidates: [{ number: 7 }],
    calls: [],
    pr: {
      number: 7,
      state: "open",
      base: { sha: baseSha, repo: { full_name: "example/app-shell" } },
      head: {
        sha: headSha,
        ref: "feature",
        repo: { full_name: "example/app-shell", owner: { login: "example" } },
      },
    },
  };
  const run = (program, args, input) => {
    state.calls.push([program, args]);
    if (program === "git") return git(...args);
    assert.equal(program, "gh");
    if (args[0] === "repo") return JSON.stringify({ nameWithOwner: state.repository });
    if (args[0] === "pr" && args[1] === "view") {
      assert.deepEqual(args, ["pr", "view", "--json", "number"]);
      return JSON.stringify({ number: 7 });
    }
    if (args[0] === "pr" && args[1] === "comment") {
      assert.deepEqual(args, [
        "pr",
        "comment",
        "7",
        "--repo",
        "example/app-shell",
        "--body-file",
        "-",
      ]);
      state.comments.push(input);
      return "https://github.com/example/app-shell/pull/7#issuecomment-1\n";
    }
    if (args.includes("repos/example/app-shell/pulls/7")) return JSON.stringify(state.pr);
    if (args.includes("repos/example/app-shell/pulls")) {
      assert(args.includes(`head=${state.pr.head.repo.owner.login}:feature`));
      assert(args.includes("--paginate") && args.includes("--slurp"));
      return JSON.stringify([state.candidates]);
    }
    throw new Error(`Unexpected command: ${args.join(" ")}`);
  };
  return { directory, git, state, run, headSha };
}

const withPlan = (plan) => ({
  plan,
  review: {
    completed: true,
    files: plan.files.map((path) => ({ path, status: "reviewed" })),
    findings: [],
    checks: [],
    limitations: ["Tests not run."],
  },
});

test("prepare discovers current PR and returns all paths without writing artifacts", (t) => {
  const { directory, state, run } = fixture(t);
  const plan = prepare(run);
  assert.deepEqual(plan.files, [
    "new-name.txt",
    "old-name.txt",
    "source.txt",
    "space and\nnewline.txt",
  ]);
  assert.equal(plan.branch, "feature");
  assert.equal(plan.prNumber, 7);
  assert.equal(plan.headSha, state.pr.head.sha);
  assert.equal(readFileSync(join(directory, "source.txt"), "utf8"), "changed\n");
  assert.equal(run("git", ["status", "--porcelain"]), "");
  assert.equal(state.comments.length, 0);
});

test("prepare and publish work for a fork PR", (t) => {
  const f = fixture(t);
  f.state.pr.head.repo = { full_name: "contributor/app-shell", owner: { login: "contributor" } };
  const payload = withPlan(prepare(f.run));
  const result = publish(payload, f.run);
  assert.equal(result.commentUrl, "https://github.com/example/app-shell/pull/7#issuecomment-1");
  assert.deepEqual(parseReport(f.state.comments[0]), payload);
});

test("prepare stops on dirty state, detached HEAD, ambiguity and unpushed commits", (t) => {
  const f = fixture(t);
  writeFileSync(join(f.directory, "untracked.txt"), "local\n");
  assert.throws(() => prepare(f.run), /local changes/);
  rmSync(join(f.directory, "untracked.txt"));
  f.git("switch", "--detach");
  assert.throws(() => prepare(f.run), /detached HEAD/);
  f.git("switch", "feature");
  f.state.candidates.push({ number: 8 });
  assert.throws(() => prepare(f.run), /ambiguity/);
  f.state.candidates.pop();
  f.state.pr.head.sha = "f".repeat(40);
  assert.throws(() => prepare(f.run), /PR HEAD differs/);
  assert.equal(f.state.comments.length, 0);
});

test("prepare reports missing base objects without fetching", (t) => {
  const f = fixture(t);
  f.state.pr.base.sha = "f".repeat(40);
  assert.throws(() => prepare(f.run), /fetch the base branch/);
  assert(!f.state.calls.some(([program, args]) => program === "git" && args.includes("fetch")));
});

test("publish refuses changed branch, dirty worktree, stale remote and tampered file list", (t) => {
  const f = fixture(t);
  const payload = withPlan(prepare(f.run));
  f.git("branch", "alias");
  f.git("switch", "alias");
  assert.throws(() => publish(payload, f.run), /branch or HEAD changed/);
  f.git("switch", "feature");
  writeFileSync(join(f.directory, "source.txt"), "dirty\n");
  assert.throws(() => publish(payload, f.run), /local changes/);
  f.git("restore", "source.txt");
  f.state.pr.head.sha = "f".repeat(40);
  assert.throws(() => publish(payload, f.run), /PR HEAD differs/);
  f.state.pr.head.sha = f.headSha;
  payload.plan.files.pop();
  payload.review.files.pop();
  assert.throws(() => publish(payload, f.run), /file list does not match/);
  assert.equal(f.state.comments.length, 0);
});

test("publish rechecks remote HEAD immediately before posting", (t) => {
  const f = fixture(t);
  const payload = withPlan(prepare(f.run));
  let reads = 0;
  const run = (program, args, input) => {
    if (program === "gh" && args.includes("repos/example/app-shell/pulls/7") && ++reads === 2)
      f.state.pr.head.sha = "f".repeat(40);
    return f.run(program, args, input);
  };
  assert.throws(() => publish(payload, run), /PR HEAD differs/);
  assert.equal(f.state.comments.length, 0);
});

test("CLI rejects invalid operations and malformed stdin without GitHub writes", () => {
  const script = new URL("./local-review.mjs", import.meta.url);
  for (const [args, input] of [
    [["prepare", "123"], undefined],
    [["publish"], "not json"],
  ]) {
    assert.throws(
      () =>
        execFileSync(process.execPath, [script.pathname, ...args], {
          input,
          stdio: ["pipe", "pipe", "pipe"],
        }),
      (error) => {
        assert.equal(error.status, 1);
        assert.equal(error.stdout.toString(), "");
        assert.match(error.stderr.toString(), /local-review:/);
        return true;
      },
    );
  }
});
