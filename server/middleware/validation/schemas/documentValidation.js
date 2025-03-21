import { object, string, array, boolean, number, date } from 'yup';
import { isValidObjectId } from 'mongoose';

// Common validation rules
const commonValidations = {
  objectId: string()
    .test('isValidObjectId', 'Invalid ID format', value => !value || isValidObjectId(value)),
  
  position: object({
    line: number().min(0).required(),
    column: number().min(0).required()
  })
};

// Query schema for listing documents
export const querySchema = object({
  query: object({
    q: string(),
    tags: array().of(string()),
    collaborator: commonValidations.objectId,
    isPublic: boolean(),
    from: date(),
    to: date().test('date-range', 'End date must be after start date', function(to) {
      const from = this.parent.from;
      if (!from || !to) return true;
      return to > from;
    }),
    sort: string(),
    page: number().min(1),
    limit: number().min(1).max(100)
  })
});

// Validation schema for creating a new document
export const createDocumentSchema = object({
  body: object({
    title: string()
      .required('Document title is required')
      .trim()
      .max(200, 'Title cannot exceed 200 characters'),
    
    content: string().default(''),
    
    isPublic: boolean(),
    
    tags: array()
      .of(string().trim().max(50))
      .max(10, 'Maximum 10 tags allowed'),
    
    metadata: object({
      language: string(),
      theme: string(),
      fontSize: number().min(8).max(32),
      lineNumbers: boolean(),
      wordWrap: boolean(),
      autoSave: boolean()
    })
  })
});

// Validation schema for updating document content
export const updateDocumentSchema = object({
  params: object({
    id: commonValidations.objectId.required('Document ID is required')
  }),
  body: object({
    content: string().required('Content is required'),
    version: number().min(0).required('Version number is required')
  })
});

// Validation schema for updating document metadata
export const updateMetadataSchema = object({
  params: object({
    id: commonValidations.objectId.required('Document ID is required')
  }),
  body: object({
    metadata: object({
      language: string(),
      theme: string(),
      fontSize: number().min(8).max(32),
      lineNumbers: boolean(),
      wordWrap: boolean(),
      autoSave: boolean()
    }).required('Metadata is required')
  })
});

// Validation schema for managing collaborators
export const collaboratorSchema = object({
  params: object({
    id: commonValidations.objectId.required('Document ID is required')
  }),
  body: object({
    userId: commonValidations.objectId.required('User ID is required'),
    role: string().oneOf(['editor', 'viewer']).required('Role is required')
  })
});

// Validation schema for adding comments
export const commentSchema = object({
  params: object({
    id: commonValidations.objectId.required('Document ID is required')
  }),
  body: object({
    content: string().required('Comment content is required'),
    position: commonValidations.position.required('Comment position is required')
  })
});

// Validation schema for replying to comments
export const replySchema = object({
  params: object({
    id: commonValidations.objectId.required('Document ID is required'),
    commentId: commonValidations.objectId.required('Comment ID is required')
  }),
  body: object({
    content: string().required('Reply content is required')
  })
});

// Validation schema for generating share link
export const shareLinkSchema = object({
  params: object({
    id: commonValidations.objectId.required('Document ID is required')
  }),
  body: object({
    expiryHours: number().min(1).max(168).default(24) // Max 1 week
  })
});

// Validation schema for saving document version
export const versionSchema = object({
  params: object({
    id: commonValidations.objectId.required('Document ID is required')
  }),
  body: object({
    content: string().required('Content is required'),
    description: string().max(500, 'Description cannot exceed 500 characters')
  })
});

// Validation schema for operation transformation
export const operationSchema = object({
  params: object({
    id: commonValidations.objectId.required('Document ID is required')
  }),
  body: object({
    operation: object({
      type: string().oneOf(['insert', 'delete', 'retain']).required('Operation type is required'),
      position: number().min(0).required('Position is required'),
      chars: string().when('type', {
        is: type => ['insert', 'retain'].includes(type),
        then: string().required('Characters are required for insert/retain operations')
      }),
      count: number().min(1).when('type', {
        is: 'delete',
        then: number().required('Count is required for delete operations')
      })
    }).required('Operation details are required'),
    baseVersion: number().min(0).required('Base version is required')
  })
});

// Validation schema for searching documents
export const searchSchema = object({
  query: object({
    q: string().trim(),
    tags: array().of(string().trim()),
    collaborator: commonValidations.objectId,
    isPublic: boolean(),
    from: date(),
    to: date().test('date-range', 'End date must be after start date', function(to) {
      const from = this.parent.from;
      if (!from || !to) return true;
      return to > from;
    }),
    sort: string().oneOf(['title', '-title', 'updatedAt', '-updatedAt']),
    page: number().min(1),
    limit: number().min(1).max(100)
  })
});

export default {
  createDocumentSchema,
  updateDocumentSchema,
  updateMetadataSchema,
  collaboratorSchema,
  commentSchema,
  replySchema,
  shareLinkSchema,
  versionSchema,
  operationSchema,
  searchSchema
};
