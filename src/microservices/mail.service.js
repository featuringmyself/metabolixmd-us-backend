const sgMail = require("@sendgrid/mail");
const config = require("../config/config");
sgMail.setApiKey(config.sendGrid.password);

async function sendEmail(emailData) {
    const mailOptions = {
      from: config.fromEmail,
      to: emailData.to,
      subject: emailData.subject,
      html: emailData.html,
    };
  
    sgMail.send(mailOptions)
    .then(() => console.log('Email sent successfully'))
    .catch(error => console.error(error));
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

  sgMail
    .send(mailOptions)
    .then(() => console.log('Emails sent successfully'))
    .catch(error => console.error(error));
}
module.exports = {
    sendEmail,
    sendEmailMultiple
};

