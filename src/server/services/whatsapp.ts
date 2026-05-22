import { getCenterProfile } from "../handlers/center";
import { getInvoice, type InvoiceDetailShape } from "../handlers/invoices";
import { logAudit } from "../handlers/audit";

// Meta Cloud API Docs: https://developers.facebook.com/docs/whatsapp/cloud-api/messages/text-messages

export async function sendWhatsAppMessage(toPhone: string, message: string, centerProfile: any) {
  if (!centerProfile || !centerProfile.whatsappEnabled) {
    console.log("WhatsApp notifications are disabled or center profile is missing.");
    return false;
  }

  const { whatsappApiToken, whatsappPhoneId } = centerProfile;
  if (!whatsappApiToken || !whatsappPhoneId) {
    console.error("WhatsApp is enabled but missing API token or Phone ID.");
    return false;
  }

  // Ensure standard +91 format for Indian numbers if not already provided
  let formattedPhone = toPhone.replace(/\D/g, "");
  if (formattedPhone.length === 10) {
    formattedPhone = `91${formattedPhone}`;
  }

  try {
    const url = `https://graph.facebook.com/v18.0/${whatsappPhoneId}/messages`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${whatsappApiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: formattedPhone,
        type: "text",
        text: {
          preview_url: true,
          body: message,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("WhatsApp API Error:", errorData);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Failed to send WhatsApp message:", err);
    return false;
  }
}

export async function dispatchInvoiceNotification(invoiceId: number) {
  try {
    const invoice = await getInvoice(invoiceId);
    if (!invoice || !invoice.customer || !invoice.customer.mobile) {
      return;
    }

    if (!invoice.customer.whatsappOptIn) {
      console.log(`Skipping WhatsApp for invoice ${invoice.invoiceNo} (Customer opted out)`);
      return;
    }

    const centerProfile = await getCenterProfile();
    if (!centerProfile || !centerProfile.whatsappEnabled) {
      return;
    }

    // Determine public URL for the PDF (if hosted on a standard domain)
    // Note: Since this is a local/desktop hybrid, standard domain might be tricky.
    // If NEXT_PUBLIC_BASE_URL is set, we use it, otherwise fallback.
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://csc-billing.vercel.app";
    const pdfUrl = `${baseUrl}/api/invoices/${invoiceId}/pdf?download=1`;

    const message = `Hello ${invoice.customer.name},\n\nYour invoice ${invoice.invoiceNo} for ₹${invoice.total} has been generated.\n\n`
      + `Status: ${invoice.status}\n`
      + `Balance Due: ₹${invoice.balanceAmount}\n\n`
      + `You can view and download your invoice here: ${pdfUrl}\n\n`
      + `Thank you for your business!\n${centerProfile.centerName || 'CSC Center'}`;

    const success = await sendWhatsAppMessage(invoice.customer.mobile, message, centerProfile);

    if (!success) {
      await logAudit({
        userId: null,
        action: "UPDATE", // Using UPDATE for now since MESSAGE isn't in standard list
        entityType: "INVOICE",
        entityId: String(invoiceId),
        details: { message: "Failed to dispatch WhatsApp notification" },
      });
    }

  } catch (err) {
    console.error("Error in dispatchInvoiceNotification:", err);
  }
}
