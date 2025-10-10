'use server';

import { Logger } from 'lib/logger';

const logger = new Logger('notifications-email');

const RESEND_API_URL = 'https://api.resend.com/emails';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'no-reply@kapgel.dev';

export type VendorApprovalEmailPayload = {
  to: string;
  businessName?: string | null;
};

export async function sendVendorApprovalEmail({ to, businessName }: VendorApprovalEmailPayload) {
  if (!RESEND_API_KEY) {
    logger.warn('Resend API key missing, skipping vendor approval email', { to });
    return { ok: false, skipped: true } as const;
  }

  const subject = 'KapGel | İşletme Başvurun Onaylandı';
  const safeBusinessName = businessName?.trim() || 'İşletmen';
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <h2 style="color: #EF6C37;">Tebrikler! ${safeBusinessName} KapGel'de yayında 🎉</h2>
      <p>KapGel işletme başvurun onaylandı. Artık vendor paneline giriş yaparak menünü yönetebilir, siparişleri takip edebilir ve kurye ekibini oluşturabilirsin.</p>
      <p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://kapgel.app'}/vendor" style="background: linear-gradient(90deg,#F97316,#EF4444); color: #fff; padding: 12px 20px; border-radius: 999px; text-decoration: none; display: inline-block;">
          Vendor Paneline Git
        </a>
      </p>
      <p>Eğer soruların olursa bizimle <a href="mailto:support@kapgel.com">support@kapgel.com</a> üzerinden iletişime geçebilirsin.</p>
      <hr style="border: none; border-top: 1px solid #FDE68A; margin: 24px 0;" />
      <p style="font-size: 12px; color: #6B7280;">Bu e-posta KapGel tarafından otomatik olarak gönderildi.</p>
    </div>
  `;

  const body = {
    from: RESEND_FROM_EMAIL,
    to: [to],
    subject,
    html,
  } satisfies Record<string, unknown>;

  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'unknown error');
    logger.error('Failed to send vendor approval email', { to, error: errorText });
    throw new Error(`Vendor approval email failed: ${response.status}`);
  }

  logger.info('Vendor approval email sent', { to });
  return { ok: true } as const;
}
