const nodemailer = require('nodemailer')

const REQUIRED_SMTP_ENV = [
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASS',
    'MAIL_FROM'
]

function parseSmtpSecure(value) {
    return String(value || '').toLowerCase() === 'true'
}

function missingSmtpConfig() {
    return REQUIRED_SMTP_ENV.filter((key) => !process.env[key])
}

function assertEmailConfiguration() {
    const missing = missingSmtpConfig()

    if (missing.length) {
        const error = new Error(`Missing SMTP configuration: ${missing.join(', ')}`)
        error.code = 'SMTP_CONFIG_MISSING'
        throw error
    }

    const port = Number(process.env.SMTP_PORT)
    if (!Number.isInteger(port) || port <= 0) {
        const error = new Error('SMTP_PORT must be a valid port number')
        error.code = 'SMTP_CONFIG_INVALID'
        throw error
    }
}

function createTransporter() {
    assertEmailConfiguration()

    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: parseSmtpSecure(process.env.SMTP_SECURE),
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    })
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

// This is where the magic happens
async function sendPasswordResetEmail({ to, name, resetUrl }) {
    const transporter = createTransporter()
    const displayName = name || 'there'

    await transporter.sendMail({
        from: process.env.MAIL_FROM,
        to,
        subject: 'Reset your NEXA password',
        text: [
            `Hi ${displayName},`,
            '',
            'We received a request to reset your NEXA password.',
            `Reset your password here: ${resetUrl}`,
            '',
            'This link expires in 60 minutes. If you did not request this, you can ignore this email.'
        ].join('\n'),
        html: `
            <p>Hi ${escapeHtml(displayName)},</p>
            <p>We received a request to reset your NEXA password.</p>
            <p>You can reset your password <a href="${escapeHtml(resetUrl)}">here</a>.</p>
            <p>This link expires in 60 minutes. If you did not request this, you can ignore this email.</p>
        `
    })
}

module.exports = {
    assertEmailConfiguration,
    sendPasswordResetEmail
}
