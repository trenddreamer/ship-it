import { sign } from "node:crypto";
import { z } from "zod";

/** The Feedback App's credentials: what it needs to mint an installation token. */
export type FeedbackApp = {
  /** The App's ID, from its settings page. */
  appId: string;
  /** The App's private key, in PEM. */
  privateKey: string;
  /** The ID of the App's installation on the repo Feedback is filed in. */
  installationId: string;
};

const mintedToken = z.object({ token: z.string() });

/**
 * Mints a short-lived installation token for the Feedback App: it signs an
 * App JWT (RS256) with the App's private key, then exchanges it at GitHub.
 */
export async function appInstallationToken(
  { appId, privateKey, installationId }: FeedbackApp,
  callGitHub: typeof fetch,
): Promise<string> {
  const response = await callGitHub(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${appJwt(appId, privateKey)}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "feedback-tracker",
      },
    },
  ).catch((error: unknown) => {
    throw new Error(`GitHub couldn't be reached to mint a Feedback App token: ${error}`, {
      cause: error,
    });
  });
  if (!response.ok) {
    throw new Error(
      `GitHub didn't mint a Feedback App token: ${response.status} ${await response.text()}`,
    );
  }
  const minted = mintedToken.safeParse(await response.json().catch(() => undefined));
  if (!minted.success) throw new Error("GitHub's answer had no Feedback App token in it");
  return minted.data.token;
}

/**
 * A JWT that proves to GitHub this is the App: signed with its key, issued by
 * its ID. It is dated a minute back in case GitHub's clock is behind, and
 * lives 9 minutes from now, inside the 10 GitHub allows.
 */
function appJwt(appId: string, privateKey: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url({ alg: "RS256", typ: "JWT" });
  const payload = base64url({ iat: now - 60, exp: now + 540, iss: appId });
  const signature = sign("sha256", Buffer.from(`${header}.${payload}`), privateKey);
  return `${header}.${payload}.${signature.toString("base64url")}`;
}

function base64url(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}
