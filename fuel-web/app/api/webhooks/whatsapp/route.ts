import { NextRequest, NextResponse } from "next/server";

const VERIFY_TOKEN = "fuel1"; // same as Meta dashboard

// ---------------- VERIFY WEBHOOK (Meta handshake) ----------------
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  console.log("Webhook verify request:", { mode, token, challenge });

  // Check required params
  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verified successfully 🚀");

    // IMPORTANT: return raw challenge string
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

// ---------------- RECEIVE MESSAGES (POST) ----------------
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    console.log("📩 Incoming WhatsApp Webhook:", JSON.stringify(body, null, 2));

    // Example: extract message
    const message =
      body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (message) {
      const from = message.from;
      const text = message?.text?.body;

      console.log("From:", from);
      console.log("Message:", text);

      // 👉 Here you will later:
      // - update Prisma trial status
      // - handle YES / NO logic
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}