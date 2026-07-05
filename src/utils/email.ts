// Note: Sending emails via an API key directly from the frontend is not secure
// for a production application as it exposes the API key to users.
// This is done here for demonstration purposes based on the provided requirements.

const BREVO_API_KEY = import.meta.env.VITE_BREVO_API_KEY;

export const sendOtpEmail = async (email: string, otp: string) => {
  const url = 'https://api.brevo.com/v3/smtp/email';
  
  const payload = {
    sender: {
      name: 'Data Garments',
      email: import.meta.env.VITE_BREVO_SENDER_EMAIL || 'noreply@datagarments.com',
    },
    to: [
      {
        email: email,
      },
    ],
    subject: 'Your Data Garments Verification Code',
    htmlContent: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #630620; text-align: center;">Data Garments Verification</h2>
        <p style="font-size: 16px; color: #333;">Hello,</p>
        <p style="font-size: 16px; color: #333;">Your One-Time Password (OTP) for verifying your email is:</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #630620; background-color: #fce8ee; padding: 10px 20px; border-radius: 8px;">${otp}</span>
        </div>
        <p style="font-size: 14px; color: #666;">This code is valid for 10 minutes. If you did not request this code, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #999; text-align: center;">&copy; ${new Date().getFullYear()} Data Garments. All rights reserved.</p>
      </div>
    `,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Brevo API Error:', errorData);
      throw new Error('Failed to send email');
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw error;
  }
};
