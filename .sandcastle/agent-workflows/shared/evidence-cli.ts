import * as fs from "node:fs";
import * as path from "node:path";
import { EVIDENCE_DIR, embedEvidence, publishEvidence } from "./evidence.ts";

// Usage:
//   node evidence-cli.ts publish <owner/name> <folder> <map.json>
//     Publishes every PNG in /tmp/evidence to the Enrolled repo's evidence
//     branch, with the token in GH_TOKEN (Contents: write), and writes
//     <map.json>: the screenshots, and the URL of each one that published.
//     A failure to publish is a warning, never a failed step: the comment or
//     pull request still goes out, and says which screenshots are missing.
//   node evidence-cli.ts embed <map.json> <body.md> [<prefix>]
//     Rewrites <body.md> in place, pointing its screenshots at their URLs.
//     The screenshots named <prefix>* are its own: any it doesn't reference
//     are appended. With no prefix, all of them are.
//
// The rules and their tests are in evidence.ts. The publish-evidence action
// runs this. Node runs this file as it is, with no `npm ci`: it imports only
// Node's builtins and `./evidence.ts`.

interface EvidenceMap {
  files: string[];
  urls: Record<string, string>;
}

const [command, ...args] = process.argv.slice(2);

if (command === "publish" && args.length === 3) {
  const [repo, folder, mapFile] = args as [string, string, string];
  const files = fs.existsSync(EVIDENCE_DIR)
    ? fs
        .readdirSync(EVIDENCE_DIR)
        .filter((name) => name.toLowerCase().endsWith(".png"))
        .toSorted()
    : [];
  let urls: Record<string, string> = {};
  try {
    urls = await publishEvidence({
      repo,
      folder,
      screenshots: files.map((name) => ({
        name,
        bytes: fs.readFileSync(path.join(EVIDENCE_DIR, name)),
      })),
      token: process.env.GH_TOKEN ?? "",
      message: `Screenshots from ${process.env.RUN_URL ?? folder}`,
      fetch,
      api: process.env.GITHUB_API_URL,
      server: process.env.GITHUB_SERVER_URL,
    });
    console.log(`Published ${files.length} screenshot(s) to ${repo}.`);
  } catch (error) {
    console.log(`::warning::The screenshots could not be published: ${String(error)}`);
  }
  const map: EvidenceMap = { files, urls };
  fs.writeFileSync(mapFile, JSON.stringify(map));
} else if (command === "embed" && (args.length === 2 || args.length === 3)) {
  const [mapFile, bodyFile, prefix = ""] = args as [string, string, string?];
  const { files, urls } = JSON.parse(fs.readFileSync(mapFile, "utf8")) as EvidenceMap;
  const own = files.filter((name) => name.startsWith(prefix));
  fs.writeFileSync(bodyFile, embedEvidence(fs.readFileSync(bodyFile, "utf8"), urls, own));
} else {
  console.error(
    "Usage: evidence-cli.ts publish <owner/name> <folder> <map.json>\n" +
      "       evidence-cli.ts embed <map.json> <body.md> [<prefix>]",
  );
  process.exit(1);
}
