/**
 * Slack OAuth Callback
 *
 * Handles the OAuth callback from Slack after user authorization
 */

import { NextRequest, NextResponse } from "next/server";
import { createSlackService } from "@/lib/integrations/adapters/slack";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const state = searchParams.get("state");

    // Handle OAuth errors
    if (error) {
      console.error("[SLACK_OAUTH] Error:", error);
      return NextResponse.redirect(
        new URL(`/integrations?error=${encodeURIComponent(error)}`, req.url)
      );
    }

    // Validate code
    if (!code) {
      return NextResponse.redirect(
        new URL("/integrations?error=no_code", req.url)
      );
    }

    // Extract user ID from state (format: userId:nonce)
    const userId = state?.split(":")[0] || "demo-user";

    // Exchange code for tokens
    const slack = createSlackService(userId);
    const tokens = await slack.exchangeCode(code);

    console.log("[SLACK_OAUTH] Successfully connected to workspace:", tokens.teamName);

    // Redirect to integrations page with success
    return NextResponse.redirect(
      new URL(
        `/integrations?success=slack&team=${encodeURIComponent(tokens.teamName)}`,
        req.url
      )
    );
  } catch (error) {
    console.error("[SLACK_OAUTH_ERROR]", error);
    return NextResponse.redirect(
      new URL("/integrations?error=oauth_failed", req.url)
    );
  }
}
