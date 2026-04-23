const RESEND_API_KEY = process.env["RESEND_API_KEY"];
const FROM_ADDRESS = process.env["EMAIL_FROM"] ?? "iNi Platform <noreply@inventninvest.com>";
const ADMIN_EMAIL = process.env["MASTER_EMAIL"] ?? "venu.vegi@inventninvest.com";

export interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}

export async function sendEmail(payload: EmailPayload): Promise<{ ok: boolean; error?: string }> {
  if (!RESEND_API_KEY) {
    console.log(`[email] RESEND_API_KEY not configured — would send to ${Array.isArray(payload.to) ? payload.to.join(", ") : payload.to}: "${payload.subject}"`);
    return { ok: true };
  }

  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: Array.isArray(payload.to) ? payload.to : [payload.to],
        subject: payload.subject,
        html: payload.html,
        reply_to: payload.replyTo,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error("[email] Resend error:", text);
      return { ok: false, error: text };
    }

    return { ok: true };
  } catch (err) {
    const msg = (err as Error).message;
    console.error("[email] Send failed:", msg);
    return { ok: false, error: msg };
  }
}

function baseLayout(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; margin: 0; padding: 0; }
    .wrapper { max-width: 560px; margin: 40px auto; background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }
    .header { background: #1e3a5f; padding: 24px 32px; }
    .header-logo { color: #fff; font-size: 20px; font-weight: 900; letter-spacing: -0.5px; }
    .header-sub { color: #93c5fd; font-size: 12px; margin-top: 2px; }
    .body { padding: 32px; }
    .title { font-size: 18px; font-weight: 800; color: #0f172a; margin: 0 0 8px; }
    .text { font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 16px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px; margin: 20px 0; }
    .card-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
    .card-row:last-child { border-bottom: none; }
    .card-label { color: #64748b; font-weight: 500; }
    .card-value { color: #1e293b; font-weight: 600; }
    .btn { display: inline-block; background: #1d4ed8; color: #fff; font-size: 14px; font-weight: 700; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 8px; }
    .btn-success { background: #16a34a; }
    .btn-danger { background: #dc2626; }
    .footer { padding: 20px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 99px; font-size: 11px; font-weight: 700; }
    .badge-pending { background: #fef3c7; color: #92400e; }
    .badge-approved { background: #dcfce7; color: #166534; }
    .badge-denied { background: #fee2e2; color: #991b1b; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="header-logo">iNi Platform</div>
      <div class="header-sub">Invent N Invest — Finance Intelligence</div>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      iNi — Invent N Invest &bull; <a href="https://inventninvest.com" style="color:#94a3b8">inventninvest.com</a><br/>
      This is an automated notification. Do not reply to this email.
    </div>
  </div>
</body>
</html>`;
}

export interface AccessRequestData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  role: string;
  aum: string;
  message?: string;
}

export async function notifyAdminNewRequest(req: AccessRequestData): Promise<void> {
  const adminUrl = `https://inventninvest.com/admin`;
  const html = baseLayout(`
    <div class="title">New Platform Access Request</div>
    <p class="text">A new user has requested access to the iNi platform and is waiting for review.</p>
    <div class="card">
      <div class="card-row"><span class="card-label">Name</span><span class="card-value">${req.firstName} ${req.lastName}</span></div>
      <div class="card-row"><span class="card-label">Email</span><span class="card-value">${req.email}</span></div>
      <div class="card-row"><span class="card-label">Company</span><span class="card-value">${req.company || "—"}</span></div>
      <div class="card-row"><span class="card-label">Role</span><span class="card-value">${req.role}</span></div>
      <div class="card-row"><span class="card-label">AUM</span><span class="card-value">${req.aum || "—"}</span></div>
      <div class="card-row"><span class="card-label">Status</span><span class="card-value"><span class="badge badge-pending">Pending Review</span></span></div>
      ${req.message ? `<div class="card-row"><span class="card-label">Message</span><span class="card-value">${req.message}</span></div>` : ""}
    </div>
    <a class="btn" href="${adminUrl}">Review in Admin Panel →</a>
  `);

  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `New Access Request — ${req.firstName} ${req.lastName} (${req.company || req.email})`,
    html,
    replyTo: req.email,
  });
}

export async function notifyUserApproved(req: AccessRequestData, platformAccess: string): Promise<void> {
  const loginUrl = `https://inventninvest.com/sign-in`;
  const accessLabel = platformAccess === "admin" ? "Full Admin Access" : platformAccess === "app" ? "Full Platform Access" : platformAccess === "both" ? "Full Platform + Demo Access" : "Demo Access";

  const html = baseLayout(`
    <div class="title">You've been approved! 🎉</div>
    <p class="text">Hi ${req.firstName}, your request to access the iNi platform has been <strong>approved</strong>. You can now sign in and start using the platform.</p>
    <div class="card">
      <div class="card-row"><span class="card-label">Access Level</span><span class="card-value"><span class="badge badge-approved">${accessLabel}</span></span></div>
      <div class="card-row"><span class="card-label">Email</span><span class="card-value">${req.email}</span></div>
    </div>
    <p class="text">Use your email and password to sign in. If you haven't set a password yet, click "Forgot password" on the sign-in page.</p>
    <a class="btn btn-success" href="${loginUrl}">Sign In to iNi →</a>
  `);

  await sendEmail({
    to: req.email,
    subject: "Your iNi Platform access has been approved",
    html,
  });
}

export async function notifyUserDenied(req: AccessRequestData): Promise<void> {
  const html = baseLayout(`
    <div class="title">Update on your access request</div>
    <p class="text">Hi ${req.firstName}, thank you for your interest in the iNi platform. After review, we're unable to grant access at this time.</p>
    <p class="text">If you believe this is an error or would like to discuss further, please reach out to us directly at <a href="mailto:${ADMIN_EMAIL}">${ADMIN_EMAIL}</a>.</p>
    <p class="text">You're welcome to re-apply in the future if your circumstances change.</p>
  `);

  await sendEmail({
    to: req.email,
    subject: "Update on your iNi Platform access request",
    html,
  });
}

export async function notifySyncFailure(provider: string, error: string): Promise<void> {
  const settingsUrl = `https://inventninvest.com/settings/integrations`;
  const providerLabel = { quickbooks: "QuickBooks", hubspot: "HubSpot", stripe: "Stripe", sheets: "Google Sheets", gusto: "Gusto" }[provider] ?? provider;

  const html = baseLayout(`
    <div class="title">Integration Sync Failed — ${providerLabel}</div>
    <p class="text">An automatic sync with ${providerLabel} failed. Your dashboard data may be out of date.</p>
    <div class="card">
      <div class="card-row"><span class="card-label">Integration</span><span class="card-value">${providerLabel}</span></div>
      <div class="card-row"><span class="card-label">Time</span><span class="card-value">${new Date().toLocaleString()}</span></div>
      <div class="card-row"><span class="card-label">Error</span><span class="card-value" style="color:#dc2626;font-size:12px;max-width:280px;word-break:break-word">${error.slice(0, 300)}</span></div>
    </div>
    <a class="btn" href="${settingsUrl}">View Integration Settings →</a>
  `);

  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `Sync Failed — ${providerLabel}`,
    html,
  });
}
