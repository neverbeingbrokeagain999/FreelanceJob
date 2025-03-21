import Joi from 'joi';

export const registerSchema = Joi.object({
  name: Joi.string()
    .required()
    .min(2)
    .max(50)
    .trim()
    .messages({
      'string.empty': 'Name is required',
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot be longer than 50 characters'
    }),
  
  email: Joi.string()
    .required()
    .email()
    .trim()
    .lowercase()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Please provide a valid email'
    }),
  
  password: Joi.string()
    .required()
    .min(8)
    .max(100)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\w\W]{8,}$/)
    .messages({
      'string.empty': 'Password is required',
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    }),
  
  role: Joi.string()
    .required()
    .valid('client', 'freelancer')
    .messages({
      'any.only': 'Role must be either client or freelancer'
    })
});

export const loginSchema = Joi.object({
  email: Joi.string()
    .required()
    .email()
    .trim()
    .lowercase()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Please provide a valid email'
    }),
  
  password: Joi.string()
    .required()
    .messages({
      'string.empty': 'Password is required'
    })
});

export const updatePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'string.empty': 'Current password is required'
    }),
  
  newPassword: Joi.string()
    .required()
    .min(8)
    .max(100)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\w\W]{8,}$/)
    .messages({
      'string.empty': 'New password is required',
      'string.min': 'New password must be at least 8 characters long',
      'string.pattern.base': 'New password must contain at least one uppercase letter, one lowercase letter, and one number'
    })
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string()
    .required()
    .email()
    .trim()
    .lowercase()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Please provide a valid email'
    })
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string()
    .required()
    .messages({
      'string.empty': 'Reset token is required'
    }),
  
  password: Joi.string()
    .required()
    .min(8)
    .max(100)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\w\W]{8,}$/)
    .messages({
      'string.empty': 'Password is required',
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    })
});

export const updateEmailSchema = Joi.object({
  email: Joi.string()
    .required()
    .email()
    .trim()
    .lowercase()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Please provide a valid email'
    }),
  
  password: Joi.string()
    .required()
    .messages({
      'string.empty': 'Password is required for email update'
    })
});

export const updateProfileSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(50)
    .trim()
    .messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot be longer than 50 characters'
    }),
  
  bio: Joi.string()
    .max(500)
    .trim()
    .allow('')
    .messages({
      'string.max': 'Bio cannot be longer than 500 characters'
    }),
  
  location: Joi.string()
    .max(100)
    .trim()
    .allow('')
    .messages({
      'string.max': 'Location cannot be longer than 100 characters'
    }),
  
  skills: Joi.array()
    .items(Joi.string().trim())
    .unique()
    .max(20)
    .messages({
      'array.max': 'Cannot have more than 20 skills'
    })
});
