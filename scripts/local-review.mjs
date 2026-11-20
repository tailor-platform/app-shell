#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const marker = "<!-- local-review-report -->";
const severities = { high: "🔴 **High**", medium: "🟠 **Medium**", low: "🔵 **Low**" };
const sha = /^[a-f0-9]{40}$/;
const repository = /^[A-Za-z0-9][A-Za-z0-9-]*\/(?!\.{1,2}$)[A-Za-z0-9_.-]+$/;
const isText = (value) => typeof value === "string" && value.trim().length > 0;

function object(value, fields, label) {
  assert(
    value && typeof value === "object" && !Array.isArray(value),
    `${label} must be an object.`,
  );
  assert(
    Object.keys(value).every((key) => fields.includes(key)),
    `${label} has unknown fields.`,
  );
}

function texts(value, label) {
  assert(
    Array.isArray(value) && value.every(isText),
    `${label} must be an array of non-empty strings.`,
  );
}

export function validateReport(payload, expected = {}) {
  object(payload, ["plan", "review"], "Report");
  const { plan, review } = payload;
  object(
    plan,
    [
      "repository",
      "prNumber",
      "branch",
      "headRepository",
      "headRef",
      "baseSha",
      "headSha",
      "mergeBaseSha",
      "files",
    ],
    "Plan",
  );
  assert(
    typeof plan.repository === "string" && repository.test(plan.repository),
    "Invalid repository.",
  );
  assert(
    typeof plan.headRepository === "string" && repository.test(plan.headRepository),
    "Invalid head repository.",
  );
  assert(Number.isSafeInteger(plan.prNumber) && plan.prNumber > 0, "Invalid PR number.");
  assert(isText(plan.branch) && isText(plan.headRef), "Missing branch information.");
  for (const field of ["baseSha", "headSha", "mergeBaseSha"]) {
    assert(typeof plan[field] === "string" && sha.test(plan[field]), `Invalid ${field}.`);
  }
  texts(plan.files, "Plan files");
  const paths = new Set(plan.files);
  assert(
    paths.size > 0 && paths.size === plan.files.length,
    "Plan files must be non-empty and unique.",
  );
  for (const field of ["repository", "prNumber", "headSha"]) {
    if (expected[field] !== undefined)
      assert(plan[field] === expected[field], `Report ${field} does not match the PR.`);
  }

  object(review, ["completed", "files", "findings"], "Review");
  assert(review.completed === true, "The review did not complete.");
  assert(Array.isArray(review.files), "Missing file review results.");
  const seen = new Set();
  for (const file of review.files) {
    object(file, ["path", "status", "reason"], "File result");
    assert(paths.has(file.path) && !seen.has(file.path), "Unknown or duplicate file result.");
    assert(["reviewed", "skipped"].includes(file.status), "Invalid file review status.");
    if (file.status === "skipped" || file.reason !== undefined)
      assert(isText(file.reason), "A skipped file needs a reason.");
    seen.add(file.path);
  }
  assert(seen.size === paths.size, "Some changed files have no review result.");
  assert(Array.isArray(review.findings), "Findings must be an array.");
  for (const finding of review.findings) {
    object(finding, ["path", "severity", "message", "line"], "Finding");
    assert(paths.has(finding.path), "A finding must refer to a changed file.");
    assert(
      typeof finding.severity === "string" && Object.hasOwn(severities, finding.severity),
      "Invalid finding severity.",
    );
    assert(isText(finding.message), "A finding needs a message.");
    if (finding.line !== undefined)
      assert(Number.isSafeInteger(finding.line) && finding.line > 0, "Invalid finding line.");
  }
  return payload;
}

const escape = (value) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const code = (value) => `<code>${escape(value)}</code>`;

export function renderReport(payload) {
  const { plan, review } = validateReport(payload);
  const reviewed = review.files.filter((file) => file.status === "reviewed").length;
  const findings = Object.entries(severities)
    .flatMap(([severity, label]) =>
      review.findings
        .filter((finding) => finding.severity === severity)
        .map(
          (finding) =>
            `- ${label} — ${code(finding.path)}${finding.line ? `:${finding.line}` : ""}\n  ${escape(finding.message).replace(/\n/g, "\n  ")}`,
        ),
    )
    .join("\n\n");
  const files = review.files
    .map(
      (file) =>
        `- ${code(file.path)}: ${file.status}${file.reason ? ` — ${escape(file.reason)}` : ""}`,
    )
    .join("\n");
  const data = Buffer.from(JSON.stringify(payload)).toString("base64");
  const body = `${marker}
## Local review report

**Reviewed HEAD:** ${code(plan.headSha)}
**Diff base:** ${code(plan.mergeBaseSha)}

### Findings
${findings || "No findings."}

<details>
<summary>File coverage — ${reviewed} reviewed, ${plan.files.length - reviewed} skipped</summary>

${files}

</details>

<!-- local-review-data ${data} -->`;
  // shortcut: one GitHub comment per report; split the protocol if reports outgrow GitHub's comment limit.
  assert(
    body.length <= 65536,
    "Report exceeds GitHub's comment limit; shorten the report without omitting file results.",
  );
  return body;
}

export function parseReport(body) {
  assert(typeof body === "string" && body.startsWith(`${marker}\n`), "Not a local review report.");
  const match = body.match(/\n<!-- local-review-data ([A-Za-z0-9+/]+={0,2}) -->$/);
  assert(match, "Missing local review data.");
  const decoded = Buffer.from(match[1], "base64");
  assert(decoded.toString("base64") === match[1], "Invalid local review encoding.");
  const payload = validateReport(JSON.parse(decoded.toString("utf8")));
  assert(renderReport(payload) === body, "The report text no longer matches its review data.");
  return payload;
}

function command(program, args, input) {
  return execFileSync(program, args, {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    stdio: [input === undefined ? "ignore" : "pipe", "pipe", "pipe"],
    input,
  });
}

function localState(run) {
  let branch;
  try {
    branch = run("git", ["symbolic-ref", "--quiet", "--short", "HEAD"]).trim();
  } catch {
    throw new Error("Use a branch, not a detached HEAD.");
  }
  assert(
    !run("git", [
      "status",
      "--porcelain=v1",
      "--untracked-files=all",
      "--ignore-submodules=none",
      "-z",
    ]),
    "Commit or remove local changes before reviewing.",
  );
  return { branch, headSha: run("git", ["rev-parse", "HEAD"]).trim() };
}

const currentRepository = (run) =>
  JSON.parse(run("gh", ["repo", "view", "--json", "nameWithOwner"])).nameWithOwner;
const getPR = (run, repo, number) =>
  JSON.parse(run("gh", ["api", `repos/${repo}/pulls/${number}`]));
const changedFiles = (run, base, head) =>
  run("git", [
    "--no-pager",
    "diff",
    "--no-ext-diff",
    "--no-textconv",
    "--no-renames",
    "--no-relative",
    "--ignore-submodules=none",
    "--name-only",
    "-z",
    base,
    head,
    "--",
  ])
    .split("\0")
    .filter(Boolean);

function checkPR(pr, plan) {
  assert(pr.state === "open", "The PR is not open.");
  assert(pr.number === plan.prNumber, "The PR number changed.");
  assert(pr.base.repo.full_name === plan.repository, "The PR repository changed.");
  assert(
    pr.head.repo?.full_name === plan.headRepository && pr.head.ref === plan.headRef,
    "The PR head branch changed.",
  );
  assert(
    pr.head.sha === plan.headSha,
    "PR HEAD differs from the reviewed HEAD; push or prepare again.",
  );
}

export function prepare(run = command) {
  const local = localState(run);
  const repo = currentRepository(run);
  assert(typeof repo === "string" && repository.test(repo), "Invalid repository.");
  const { number } = JSON.parse(run("gh", ["pr", "view", "--json", "number"]));
  assert(Number.isSafeInteger(number) && number > 0, "No PR found for the current branch.");
  const pr = getPR(run, repo, number);
  assert(pr.head.repo, "The PR head repository is unavailable.");
  const pages = JSON.parse(
    run("gh", [
      "api",
      "--method",
      "GET",
      "--paginate",
      "--slurp",
      `repos/${repo}/pulls`,
      "-f",
      "state=open",
      "-f",
      `head=${pr.head.repo.owner.login}:${pr.head.ref}`,
    ]),
  );
  assert(
    pages.flat().length === 1 && pages.flat()[0].number === number,
    "Multiple or no open PRs match this head branch; resolve the ambiguity first.",
  );
  const plan = {
    repository: repo,
    prNumber: number,
    branch: local.branch,
    headRepository: pr.head.repo.full_name,
    headRef: pr.head.ref,
    baseSha: pr.base.sha,
    headSha: local.headSha,
  };
  checkPR(pr, plan);
  assert(sha.test(plan.baseSha) && sha.test(plan.headSha), "Invalid PR commit SHA.");
  try {
    plan.mergeBaseSha = run("git", ["merge-base", plan.baseSha, plan.headSha]).trim();
  } catch {
    throw new Error(
      "The PR base commit is unavailable locally; fetch the base branch and run prepare again.",
    );
  }
  plan.files = changedFiles(run, plan.mergeBaseSha, plan.headSha);
  assert(plan.files.length > 0, "The PR has no changed files to review.");
  assert.deepEqual(localState(run), local, "The branch or HEAD changed during preparation.");
  return plan;
}

export function publish(payload, run = command) {
  const { plan } = validateReport(payload);
  assert.deepEqual(
    localState(run),
    { branch: plan.branch, headSha: plan.headSha },
    "The local branch or HEAD changed; prepare again.",
  );
  assert(
    currentRepository(run) === plan.repository,
    "The current repository differs from the reviewed repository.",
  );
  checkPR(getPR(run, plan.repository, plan.prNumber), plan);
  assert(
    run("git", ["merge-base", plan.baseSha, plan.headSha]).trim() === plan.mergeBaseSha,
    "The diff base is invalid.",
  );
  assert.deepEqual(
    changedFiles(run, plan.mergeBaseSha, plan.headSha),
    plan.files,
    "The changed-file list does not match Git.",
  );
  const body = renderReport(payload);
  checkPR(getPR(run, plan.repository, plan.prNumber), plan);
  assert.deepEqual(
    localState(run),
    { branch: plan.branch, headSha: plan.headSha },
    "The local branch or HEAD changed before posting.",
  );
  const commentUrl = run(
    "gh",
    ["pr", "comment", String(plan.prNumber), "--repo", plan.repository, "--body-file", "-"],
    body,
  ).trim();
  assert(
    /^https?:\/\/\S+$/.test(commentUrl),
    "No comment URL returned; inspect live PR comments before retrying publication.",
  );
  return { prNumber: plan.prNumber, headSha: plan.headSha, commentUrl };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const [operation, ...args] = process.argv.slice(2);
    assert(
      args.length === 0 && ["prepare", "publish"].includes(operation),
      "Usage: node scripts/local-review.mjs prepare|publish (publish reads JSON from stdin).",
    );
    const result =
      operation === "prepare" ? prepare() : publish(JSON.parse(readFileSync(0, "utf8")));
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(`local-review: ${error.message}`);
    process.exitCode = 1;
  }
}
