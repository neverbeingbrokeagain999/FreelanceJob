// Basic email service stub - can be implemented with actual email provider later
export const sendEmail = async (to, subject, text) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('Development mode - email not sent:');
    console.log({ to, subject, text });
    return true;
  }
  
  // TODO: Implement actual email sending
  return true;
};

export default {
  sendEmail
};
