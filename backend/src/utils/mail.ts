import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
        user: process.env.SMTP_USER || 'fira.de00@gmail.com',
        pass: process.env.SMTP_PASS || 'wwhn klmg setb yxdc',
    },
});

export const sendResetEmail = async (to: string, token: string) => {
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    const mailOptions = {
        from: `"Awash Edir" <${process.env.SMTP_FROM || 'fira.de00@gmail.com'}>`,
        to,
        subject: 'Password Reset Request',
        html: `
            <h2>Password Reset</h2>
            <p>You requested a password reset. Click the link below to set a new password:</p>
            <a href="${resetLink}" style="display:inline-block;padding:10px 20px;background:#000080;color:#fff;text-decoration:none;border-radius:5px;">Reset Password</a>
            <p>If you did not request this, please ignore this email.</p>
            <p>This link expires in 1 hour.</p>
        `,
    };

    await transporter.sendMail(mailOptions);
};