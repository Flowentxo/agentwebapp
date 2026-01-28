/**
 * Slack Integration API
 *
 * Endpoints:
 * GET - Get Slack connection status
 * POST - Send message to Slack
 * DELETE - Disconnect Slack
 */

import { NextRequest, NextResponse } from "next/server";
import { createSlackService, SlackService } from "@/lib/integrations/adapters/slack";

async function getAuthenticatedUserId(req: NextRequest): Promise<string | null> {
  const userId = req.headers.get("x-user-id");
  return userId || null;
}

/**
 * GET - Get Slack connection status and info
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const slack = createSlackService(userId);
    const info = await slack.getConnectionInfo();

    if (!info.connected) {
      return NextResponse.json({
        connected: false,
        authUrl: slack.getAuthorizationUrl(),
      });
    }

    // Get additional info if connected
    try {
      const channels = await slack.getChannels(50);
      return NextResponse.json({
        connected: true,
        teamName: info.teamName,
        teamId: info.teamId,
        channelCount: channels.length,
        channels: channels.slice(0, 10), // Return first 10 channels
      });
    } catch {
      return NextResponse.json({
        connected: true,
        teamName: info.teamName,
        teamId: info.teamId,
      });
    }
  } catch (error) {
    console.error("[SLACK_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to get Slack status" },
      { status: 500 }
    );
  }
}

/**
 * POST - Send message to Slack
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, channel, text, blocks, userId: targetUserId } = body;

    const slack = createSlackService(userId);
    const isConnected = await slack.isConnected();

    if (!isConnected) {
      return NextResponse.json(
        { error: "Not connected to Slack" },
        { status: 400 }
      );
    }

    switch (action) {
      case "sendMessage": {
        if (!channel || !text) {
          return NextResponse.json(
            { error: "channel and text are required" },
            { status: 400 }
          );
        }
        const result = await slack.sendMessage({ channel, text, blocks });
        return NextResponse.json({ success: true, ...result });
      }

      case "sendDM": {
        if (!targetUserId || !text) {
          return NextResponse.json(
            { error: "userId and text are required" },
            { status: 400 }
          );
        }
        const result = await slack.sendDirectMessage(targetUserId, text, blocks);
        return NextResponse.json({ success: true, ...result });
      }

      case "getChannels": {
        const channels = await slack.getChannels();
        return NextResponse.json({ success: true, channels });
      }

      case "getUsers": {
        const users = await slack.getUsers();
        return NextResponse.json({ success: true, users });
      }

      case "joinChannel": {
        if (!channel) {
          return NextResponse.json(
            { error: "channel is required" },
            { status: 400 }
          );
        }
        await slack.joinChannel(channel);
        return NextResponse.json({ success: true });
      }

      case "createChannel": {
        const { name, isPrivate } = body;
        if (!name) {
          return NextResponse.json(
            { error: "name is required" },
            { status: 400 }
          );
        }
        const newChannel = await slack.createChannel(name, isPrivate);
        return NextResponse.json({ success: true, channel: newChannel });
      }

      case "sendAgentMessage": {
        const { agentName, agentIcon, message, metadata } = body;
        if (!channel || !agentName || !message) {
          return NextResponse.json(
            { error: "channel, agentName, and message are required" },
            { status: 400 }
          );
        }
        const agentBlocks = SlackService.buildAgentMessageBlocks(
          agentName,
          agentIcon || "🤖",
          message,
          metadata
        );
        const result = await slack.sendMessage({
          channel,
          text: `${agentName}: ${message}`,
          blocks: agentBlocks,
        });
        return NextResponse.json({ success: true, ...result });
      }

      case "sendNotification": {
        const { title, message: notifMessage, context } = body;
        if (!channel || !title || !notifMessage) {
          return NextResponse.json(
            { error: "channel, title, and message are required" },
            { status: 400 }
          );
        }
        const notifBlocks = SlackService.buildNotificationBlocks(
          title,
          notifMessage,
          context
        );
        const result = await slack.sendMessage({
          channel,
          text: `${title}: ${notifMessage}`,
          blocks: notifBlocks,
        });
        return NextResponse.json({ success: true, ...result });
      }

      default:
        return NextResponse.json(
          { error: "Unknown action. Valid actions: sendMessage, sendDM, getChannels, getUsers, joinChannel, createChannel, sendAgentMessage, sendNotification" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[SLACK_POST_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to perform Slack action" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Disconnect Slack integration
 */
export async function DELETE(req: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const slack = createSlackService(userId);
    await slack.disconnect();

    return NextResponse.json({
      success: true,
      message: "Slack disconnected successfully",
    });
  } catch (error) {
    console.error("[SLACK_DELETE_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to disconnect Slack" },
      { status: 500 }
    );
  }
}
