const sgMail = require("@sendgrid/mail");
const config = require("../config/config");
const { sendSMSToContacts } = require('./sms.service');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function sendEmail(emailData) {
    const mailOptions = {
      from: config.fromEmail,
      to: emailData.to,
      subject: emailData.subject,
      html: emailData.html,
    };
  
    try {
      await sgMail.send(mailOptions);
      console.log('Email sent successfully');
      
      // Send SMS notification if phone is provided
      if (emailData.phone) {
        const smsContent = emailData.smsContent || 
          `${emailData.subject}. Please check your email for details.`;
        
        await sendSMSToContacts(
          [{ phone: emailData.phone }],
          `[MetabolixMD] ${smsContent}`
        );
        console.log('SMS notification sent');
      }
    } catch (error) {
      console.error('Error sending email:', error);
    }
}

async function sendEmailMultiple(emailData) {
  const mailOptions = {
    from: 'reg@noreply.futrconnect.io',
    personalizations: emailData.recipients.map(recipient => ({
      to: recipient.email,
      subject: recipient.subject || emailData.subject,
      dynamic_template_data: recipient.dynamicData || {},
    })),
    html: emailData.html,
  };

  try {
    await sgMail.send(mailOptions);
    console.log('Emails sent successfully');
    
    // Send SMS notifications if recipients have phone numbers
    if (emailData.recipients && emailData.sendSms) {
      for (const recipient of emailData.recipients) {
        if (recipient.phone) {
          const smsContent = recipient.smsContent || 
            `${recipient.subject || emailData.subject}. Please check your email for details.`;
          
          await sendSMSToContacts(
            [{ phone: recipient.phone }],
            `[MetabolixMD] ${smsContent}`
          );
        }
      }
      console.log('SMS notifications sent to recipients with phone numbers');
    }
  } catch (error) {
    console.error('Error sending emails:', error);
  }
}

module.exports = {
    sendEmail,
    sendEmailMultiple
};