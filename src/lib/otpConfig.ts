/**
 * OTP Configuration Utility
 * Centralized control for OTP functionality
 */

export const OTPConfig = {
  /**
   * Check if OTP is enabled system-wide
   */
  isEnabled(): boolean {
    // Default to true if not specified for backwards compatibility
    const enableOTP = process.env.ENABLE_OTP;
    if (enableOTP === undefined || enableOTP === null) {
      return true;
    }
    return enableOTP.toLowerCase() === 'true';
  },

  /**
   * Get OTP status message for UI
   */
  getStatusMessage(): string {
    return this.isEnabled() 
      ? 'OTP authentication is enabled'
      : 'OTP authentication is temporarily disabled';
  },

  /**
   * Check if email service is required
   */
  requiresEmailService(): boolean {
    return this.isEnabled();
  }
};