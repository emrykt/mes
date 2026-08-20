import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

/**
 * Transactional email via AWS SES. Fully optional: when SES_FROM is not set the
 * mailer is a no-op (the invite link is still shown in the portal UI as the
 * fallback). Set SES_FROM to a verified sender once SES is configured.
 */

const FROM = process.env.SES_FROM || "";
export const mailEnabled = Boolean(FROM);

let client: SESv2Client | null = null;
function ses(): SESv2Client {
  if (!client) client = new SESv2Client({ region: process.env.AWS_REGION || "eu-central-1" });
  return client;
}

export interface InviteMail {
  to: string;
  name: string;
  inviterName?: string;
  companyName?: string;
  joinUrl: string;
}

/** Send a team-invite email. Returns true if sent, false if disabled/failed. */
export async function sendInviteEmail(m: InviteMail): Promise<boolean> {
  if (!mailEnabled) return false;
  const who = m.inviterName ? `${m.inviterName} invited you` : "You've been invited";
  const org = m.companyName ? ` to join ${m.companyName} on TURI` : " to TURI";
  const subject = `${who}${org}`;
  const text =
    `Hi ${m.name},\n\n${who}${org}.\n\n` +
    `Set your password and get started:\n${m.joinUrl}\n\n` +
    `If you weren't expecting this, you can ignore this email.`;
  const html =
    `<div style="font-family:system-ui,Arial,sans-serif;max-width:520px;margin:auto">` +
    `<h2 style="color:#0a616b">TURI</h2>` +
    `<p>Hi ${escapeHtml(m.name)},</p>` +
    `<p>${escapeHtml(who)}${escapeHtml(org)}.</p>` +
    `<p><a href="${m.joinUrl}" style="display:inline-block;background:#0e8390;color:#fff;` +
    `padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Accept invite</a></p>` +
    `<p style="color:#667">Or paste this link:<br>${escapeHtml(m.joinUrl)}</p>` +
    `<p style="color:#99a;font-size:12px">If you weren't expecting this, ignore this email.</p></div>`;

  try {
    await ses().send(
      new SendEmailCommand({
        FromEmailAddress: FROM,
        Destination: { ToAddresses: [m.to] },
        Content: {
          Simple: {
            Subject: { Data: subject },
            Body: { Text: { Data: text }, Html: { Data: html } },
          },
        },
      }),
    );
    return true;
  } catch (e) {
    console.error("SES sendInviteEmail failed:", e);
    return false;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c]!);
}
