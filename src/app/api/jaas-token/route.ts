import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: Request) {
  try {
    const { roomName, user } = await request.json();

    const appId = process.env.JAAS_APP_ID;
    // The private key from JaaS — newlines are stored escaped in .env
    const privateKey = process.env.JAAS_PRIVATE_KEY?.replace(/\\n/g, "\n");
    const kid = process.env.JAAS_API_KEY_ID;

    if (!appId || !privateKey || !kid) {
      return NextResponse.json(
        { error: "JaaS is not configured. Add JAAS_APP_ID, JAAS_API_KEY_ID, and JAAS_PRIVATE_KEY to .env.local" },
        { status: 500 }
      );
    }

    const now = Math.floor(Date.now() / 1000);

    const payload = {
      aud: "jitsi",
      iss: "chat",
      sub: appId,
      room: roomName || "*",
      exp: now + 3600, // Token valid for 1 hour
      nbf: now - 10, // Allow 10 seconds clock skew
      context: {
        user: {
          id: user?.id || uuidv4(),
          name: user?.name || "Participant",
          email: user?.email || "",
          avatar: "",
          moderator: user?.isModerator ? "true" : "false",
        },
        features: {
          recording: "false",
          livestreaming: "false",
          "outbound-call": "false",
          "sip-outbound-call": "false",
          transcription: "false",
        },
      },
    };

    const token = jwt.sign(payload, privateKey, {
      algorithm: "RS256",
      header: {
        kid: kid,
        typ: "JWT",
        alg: "RS256",
      },
    });

    return NextResponse.json({ token });
  } catch (err) {
    console.error("Failed to generate JaaS token:", err);
    return NextResponse.json(
      { error: "Failed to generate meeting token" },
      { status: 500 }
    );
  }
}
