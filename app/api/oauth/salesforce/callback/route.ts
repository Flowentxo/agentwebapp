/**
 * Salesforce OAuth Callback
 *
 * Handles the OAuth callback from Salesforce after user authorization
 */

import { NextRequest, NextResponse } from "next/server";
import { createSalesforceService } from "@/lib/integrations/adapters/salesforce";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");
    const state = searchParams.get("state");

    // Handle OAuth errors
    if (error) {
      console.error("[SALESFORCE_OAUTH] Error:", error, errorDescription);
      return NextResponse.redirect(
        new URL(
          `/integrations?error=${encodeURIComponent(errorDescription || error)}`,
          req.url
        )
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
    const salesforce = createSalesforceService(userId);
    const tokens = await salesforce.exchangeCode(code);

    console.log("[SALESFORCE_OAUTH] Successfully connected to instance:", tokens.instanceUrl);

    // Redirect to integrations page with success
    return NextResponse.redirect(
      new URL(
        `/integrations?success=salesforce`,
        req.url
      )
    );
  } catch (error) {
    console.error("[SALESFORCE_OAUTH_ERROR]", error);
    return NextResponse.redirect(
      new URL("/integrations?error=oauth_failed", req.url)
    );
  }
}
