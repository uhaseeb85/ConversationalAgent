/**
 * mailer.ts — Sends password reset emails via SMTP (nodemailer).
 * Falls back to console.log in dev when SMTP is not configured.
 */
import nodemailer from 'nodemailer'

function getTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env
  if (!SMTP_HOST) return null
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT ?? 587),
    secure: Number(SMTP_PORT ?? 587) === 465,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  })
}

export async function sendPasswordResetEmail(
  toEmail: string,
  resetToken: string
): Promise<void> {
  const appUrl = process.env.APP_URL || 'http://localhost:5173'
  const resetLink = `${appUrl}/reset-password?token=${resetToken}`
  const from = process.env.SMTP_FROM || 'Onboarding Flow Builder <noreply@example.com>'

  const transport = getTransport()

  if (!transport) {
    // Development fallback — print link to server console
    console.log('\n─────────────────────────────────────────────')
    console.log(`[password-reset] Reset link for ${toEmail}:`)
    console.log(`  ${resetLink}`)
    console.log('─────────────────────────────────────────────\n')
    return
  }

  await transport.sendMail({
    from,
    to: toEmail,
    subject: 'Reset your password',
    text: `Click the link below to reset your password (expires in 1 hour):\n\n${resetLink}\n\nIf you didn't request this, you can ignore this email.`,
    html: `
      <p>Click the button below to reset your password. This link expires in <strong>1 hour</strong>.</p>
      <p style="margin:24px 0">
        <a href="${resetLink}"
           style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
          Reset password
        </a>
      </p>
      <p style="color:#888;font-size:13px">If you didn't request a password reset you can safely ignore this email.</p>
      <p style="color:#bbb;font-size:12px">Link: ${resetLink}</p>
    `,
  })
}
