/**
 * Envía un mensaje a un canal de Discord vía webhook.
 * No lanza si Discord está caído sin razón fuerte para ello — el llamador
 * decide si un fallo de notificación debe tumbar el resto del chequeo
 * (normalmente no debería: el snapshot ya se guardó igual).
 */
export async function sendDiscordNotification(
  webhookUrl: string,
  message: string
): Promise<void> {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: message }),
  });
 
  if (!response.ok) {
    throw new Error(`Discord respondió con status ${response.status}`);
  }
}
 