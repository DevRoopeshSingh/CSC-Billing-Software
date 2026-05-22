import { getDb, schema } from "../db";
import { eq } from "drizzle-orm";
import { logAudit } from "../handlers/audit";

interface SmsPayload {
  mobile: string;
  invoiceNo: string;
  total: number;
}

export async function sendInvoiceSms(invoiceId: number, mobile: string, invoiceNo: string, total: number | string) {
  const db = getDb();
  
  try {
    const [profile] = await db
      .select()
      .from(schema.centerProfiles)
      .where(eq(schema.centerProfiles.id, 1))
      .limit(1);

    if (!profile || !profile.smsEnabled || !profile.smsApiToken) {
      return; // Silently abort if not configured/enabled
    }

    if (profile.smsProvider === "fast2sms") {
      await sendFast2Sms(profile.smsApiToken, profile.smsSenderId, profile.smsTemplateId, mobile, invoiceNo, total);
    } else {
      // Future: handle msg91 or other providers here
      console.warn(`Unsupported SMS provider: ${profile.smsProvider}`);
    }

    await logAudit({
      userId: 1, // System action implicitly
      action: "SEND_SMS",
      entityType: "INVOICE",
      entityId: String(invoiceId),
      details: { mobile, invoiceNo, provider: profile.smsProvider },
    });

  } catch (error) {
    console.error("SMS Dispatch Failed:", error);
    await logAudit({
      userId: 1,
      action: "SMS_FAILED",
      entityType: "INVOICE",
      entityId: String(invoiceId),
      details: { error: error instanceof Error ? error.message : "Unknown error", mobile },
    });
  }
}

async function sendFast2Sms(
  token: string, 
  senderId: string | null, 
  templateId: string | null, 
  mobile: string, 
  invoiceNo: string, 
  total: number | string
) {
  // Fast2SMS API V3
  // If templateId is provided, we use the DLT approved template route.
  // Variables are usually passed sequentially in Fast2SMS V3.
  // Example: variables_values: "John|1000|12345"

  const url = "https://www.fast2sms.com/dev/bulkV2";
  
  // Format mobile correctly (ensure 10 digits)
  const cleanMobile = mobile.replace(/\\D/g, "").slice(-10);

  const payload: any = {
    route: "dlt",
    sender_id: senderId || "FSTSMS",
    message: templateId,
    variables_values: `${invoiceNo}|${total}`, // Assumes template expects Invoice No and Total
    numbers: cleanMobile,
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "authorization": token,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const result = await response.json();
  if (!result.return) {
    throw new Error(result.message || "Fast2SMS API rejected the request");
  }
}
