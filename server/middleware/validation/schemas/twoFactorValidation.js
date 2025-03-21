import { object, string } from 'yup';

export const setup2FASchema = object({
  phoneNumber: string()
    .matches(/^\+[1-9]\d{1,14}$/, 'Invalid phone number format. Must include country code.')
    .required('Phone number is required'),
  backupEmail: string()
    .email('Must be a valid email')
    .required('Backup email is required')
});

export const verify2FASchema = object({
  code: string()
    .matches(/^\d{6}$/, 'Code must be 6 digits')
    .required('Verification code is required'),
  method: string()
    .oneOf(['sms', 'email', 'app'], 'Invalid verification method')
    .required('Verification method is required')
});

export const disable2FASchema = object({
  password: string()
    .min(8, 'Password must be at least 8 characters')
    .required('Password is required'),
  confirmDisable: string()
    .oneOf(['true'], 'Must confirm 2FA disable')
    .required('Confirmation is required')
});

export const recovery2FASchema = object({
  recoveryCode: string()
    .matches(/^[A-Z0-9]{16}$/, 'Invalid recovery code format')
    .required('Recovery code is required')
});
