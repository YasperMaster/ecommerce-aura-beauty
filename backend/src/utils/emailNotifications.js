import UserModel from "../models/UserModel.js";

const RESEND_API_URL = "https://api.resend.com/emails";
const EMAIL_TIMEOUT_MS = 8000;

const isConfigured = () => Boolean(process.env.RESEND_API_KEY);

const getAdminRecipients = async () => {
  const admins = await UserModel.find({ isAdmin: true })
    .select("email")
    .lean();

  const emails = admins.map((a) => a.email).filter(Boolean);

  if (emails.length > 0) return emails;

  return process.env.ADMIN_NOTIFICATION_EMAIL
    ? [process.env.ADMIN_NOTIFICATION_EMAIL]
    : [];
};

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatOrderItems = (order) =>
  order.items
    .map(
      (item) =>
        `- ${item.title} x${item.quantity} — ARS ${item.unitPrice * item.quantity}`,
    )
    .join("\n");

export const sendAdminPurchaseEmail = async (order) => {
  if (!isConfigured()) {
    console.log(
      "Skipping admin email notification: RESEND_API_KEY not configured",
    );
    return;
  }

  const recipients = await getAdminRecipients();

  if (recipients.length === 0) {
    console.log(
      "Skipping admin email notification: no admin user found and ADMIN_NOTIFICATION_EMAIL is not set",
    );
    return;
  }

  const subject = `Nueva compra aprobada - Orden ${escapeHtml(String(order._id))}`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1f2937;">
      <h2>Nueva compra aprobada</h2>
      <p><strong>Orden:</strong> ${escapeHtml(String(order._id))}</p>
      <p><strong>Cliente:</strong> ${escapeHtml(order.userEmail)}</p>
      <p><strong>Total:</strong> ARS ${escapeHtml(String(order.totalAmount))}</p>
      <p><strong>Estado:</strong> ${escapeHtml(order.status)}</p>
      <h3>Productos</h3>
      <ul>
        ${order.items
          .map(
            (item) =>
              `<li>${escapeHtml(item.title)} x${escapeHtml(String(item.quantity))} — ARS ${escapeHtml(String(item.unitPrice * item.quantity))}</li>`,
          )
          .join("")}
      </ul>
    </div>
  `;

  const text = [
    "Nueva compra aprobada",
    `Orden: ${order._id}`,
    `Cliente: ${order.userEmail}`,
    `Total: ARS ${order.totalAmount}`,
    "Productos:",
    formatOrderItems(order),
  ].join("\n");

  await sendEmail({ to: recipients, subject, html, text });
};

/**
 * Sends the 6-digit confirmation code to a user who just registered.
 * Unlike sendAdminPurchaseEmail (fire-and-forget, safe to skip), this is on
 * the critical path: if it can't be sent, the user can never confirm their
 * account, so callers MUST propagate failures instead of swallowing them.
 * Throws if RESEND_API_KEY isn't configured or the send fails.
 */
export const sendVerificationEmail = async ({ email, username, code }) => {
  if (!isConfigured()) {
    throw new Error(
      "Cannot send verification email: RESEND_API_KEY is not configured",
    );
  }

  const emailFrom =
    process.env.EMAIL_FROM || "Aura Beauty <onboarding@resend.dev>";

  const subject = "Confirmá tu email - Aura Beauty";

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1f2937;">
      <h2>¡Hola, ${escapeHtml(username)}!</h2>
      <p>Usá este código para confirmar tu email y activar tu cuenta:</p>
      <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 24px 0;">
        ${escapeHtml(code)}
      </p>
      <p>El código vence en 15 minutos. Si vos no creaste esta cuenta, podés ignorar este email.</p>
    </div>
  `;

  const text = [
    `Hola, ${username}!`,
    `Tu código de confirmación es: ${code}`,
    "Vence en 15 minutos.",
    "Si vos no creaste esta cuenta, podés ignorar este email.",
  ].join("\n");

  await sendEmail({ to: [email], subject, html, text, from: emailFrom });
};

async function sendEmail({ to, subject, html, text, from }) {
  const emailFrom = from || process.env.EMAIL_FROM || "Aura Beauty <onboarding@resend.dev>";

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), EMAIL_TIMEOUT_MS);

  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: emailFrom, to, subject, html, text }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Email send failed: ${response.status} ${body}`);
    }
  } finally {
    clearTimeout(timeoutId);
  }
}
