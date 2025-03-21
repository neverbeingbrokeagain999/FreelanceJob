// Placeholder SMS service
// TODO: Implement actual SMS service integration (e.g., Twilio)
export const sendSMS = async (phoneNumber, message) => {
    console.log(`[SMS Service] Would send SMS to ${phoneNumber}: ${message}`);
    // For development, just return success
    return true;
};
