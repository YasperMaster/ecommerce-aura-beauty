const RESEND_API_URL = "https://api.resend.com/emails";
const EMAIL_TIMEOUT_MS = 8000;

const isConfigured = () =>
  Boolean(process.env.RESEND_API_KEY && process.env.ADMIN_NOTIFICATION_EMAIL);

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
      "Skipping admin email notification: RESEND_API_KEY or ADMIN_NOTIFICATION_EMAIL not configured",
    );
    return;
  }

  const emailFrom =
    process.env.EMAIL_FROM || "Aura Beauty <onboarding@resend.dev>";

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
      body: JSON.stringify({
        from: emailFrom,
        to: [process.env.ADMIN_NOTIFICATION_EMAIL],
        subject,
        html,
        text,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Admin email notification failed: ${response.status} ${body}`,
      );
    }
  } finally {
    clearTimeout(timeoutId);
  }
};
