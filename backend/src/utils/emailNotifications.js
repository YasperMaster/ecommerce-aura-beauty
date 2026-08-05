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
    .replace(/&/g, "\x26amp;")
    .replace(/</g, "\x26lt;")
    .replace(/>/g, "\x26gt;")
    .replace(/"/g, "\x26quot;")
    .replace(/'/g, "\x26#39;");

const formatPrice = (value) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number(value));

const formatOrderItems = (order) =>
  order.items
    .map(
      (item) =>
        `- ${item.title} x${item.quantity} — ${formatPrice(item.unitPrice * item.quantity)}`,
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

  const subject = `Tenés una nueva venta - Orden ${escapeHtml(String(order._id))}`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto;">
      <div style="background: #ec4899; padding: 24px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0; color: #ffffff;">¡Tenés una nueva venta!</h2>
      </div>
      <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        <p style="color: #6b7280; font-size: 14px; margin-bottom: 16px;">
          Orden #${escapeHtml(String(order._id))}
        </p>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #374151; width: 100px;">Cliente</td>
            <td style="padding: 8px 0; color: #1f2937;">
              ${escapeHtml(order.username || "No informado")}<br>
              <span style="color: #6b7280; font-size: 14px;">${escapeHtml(order.userEmail)}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #374151;">Teléfono</td>
            <td style="padding: 8px 0; color: #1f2937;">${escapeHtml(order.userPhone || "No informado")}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #374151;">Total</td>
            <td style="padding: 8px 0; color: #1f2937; font-size: 18px; font-weight: bold;">${escapeHtml(formatPrice(order.totalAmount))}</td>
          </tr>
        </table>

        <h3 style="color: #374151; margin-bottom: 12px;">Productos</h3>
        <table style="width: 100%; border-collapse: collapse;">
          ${order.items
            .map(
              (item) =>
                `<tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #1f2937;">
                    ${escapeHtml(item.title)} <span style="color: #6b7280;">x${escapeHtml(String(item.quantity))}</span>
                  </td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; text-align: right; color: #1f2937; white-space: nowrap;">
                    ${escapeHtml(formatPrice(item.unitPrice * item.quantity))}
                  </td>
                </tr>`,
            )
            .join("")}
        </table>
      </div>
    </div>
  `;

  const text = [
    "¡Tenés una nueva venta!",
    `Orden #${order._id}`,
    "",
    `Cliente: ${order.username || "No informado"}`,
    `Email: ${order.userEmail}`,
    `Teléfono: ${order.userPhone || "No informado"}`,
    `Total: ${formatPrice(order.totalAmount)}`,
    "",
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
      "No se pudo enviar el email de verificación: RESEND_API_KEY no está configurado.",
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

/**
 * Sends the 6-digit code used to confirm a "forgot password" request.
 * Same critical-path behavior as sendVerificationEmail: throws instead of
 * silently skipping, since a user waiting to reset their password needs to
 * know immediately if the email couldn't be sent.
 */
export const sendPasswordResetEmail = async ({ email, username, code }) => {
  if (!isConfigured()) {
    throw new Error(
      "No se pudo enviar el email de restablecimiento: RESEND_API_KEY no está configurado.",
    );
  }

  const emailFrom =
    process.env.EMAIL_FROM || "Aura Beauty <onboarding@resend.dev>";

  const subject = "Restablecé tu contraseña - Aura Beauty";

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1f2937;">
      <h2>¡Hola, ${escapeHtml(username)}!</h2>
      <p>Recibimos una solicitud para restablecer tu contraseña. Usá este código para continuar:</p>
      <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 24px 0;">
        ${escapeHtml(code)}
      </p>
      <p>El código vence en 15 minutos. Si vos no pediste esto, podés ignorar este email — tu contraseña actual seguirá funcionando.</p>
    </div>
  `;

  const text = [
    `Hola, ${username}!`,
    "Recibimos una solicitud para restablecer tu contraseña.",
    `Tu código es: ${code}`,
    "Vence en 15 minutos.",
    "Si vos no pediste esto, podés ignorar este email.",
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