import { z } from 'zod';

export const elementSchema = z.object({
  body: z.object({
    type: z.enum(['path', 'line', 'rectangle', 'circle', 'text', 'image']),
    x: z.number()
      .min(-10000, 'X coordinate too small')
      .max(10000, 'X coordinate too large'),
    y: z.number()
      .min(-10000, 'Y coordinate too small')
      .max(10000, 'Y coordinate too large'),
    width: z.number().optional(),
    height: z.number().optional(),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid color format').optional(),
    strokeWidth: z.number().min(0.1).max(50).optional(),
    fill: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid fill color format').optional(),
    text: z.string().max(1000).optional(),
    fontSize: z.number().min(8).max(144).optional(),
    fontFamily: z.string().optional(),
    path: z.string().optional(),
    points: z.array(z.object({
      x: z.number(),
      y: z.number()
    })).optional(),
    radius: z.number().min(0).max(1000).optional(),
    rotation: z.number().min(-360).max(360).optional(),
    scale: z.number().min(0.1).max(10).optional(),
    imageUrl: z.string().url().optional(),
    opacity: z.number().min(0).max(1).optional(),
    zIndex: z.number().int().optional()
  })
});

export const createWhiteboardSchema = z.object({
  body: z.object({
    title: z.string()
      .min(2, 'Title must be at least 2 characters')
      .max(100, 'Title cannot exceed 100 characters'),
    type: z.enum(['meeting', 'standalone']),
    settings: z.object({
      maxElements: z.number().int().min(10).max(10000).optional(),
      allowExport: z.boolean().optional(),
      exportFormats: z.array(z.enum(['png', 'svg', 'json'])).optional(),
      gridEnabled: z.boolean().optional(),
      gridSize: z.number().min(5).max(100).optional(),
      snapToGrid: z.boolean().optional(),
      backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid background color format').optional()
    }).optional(),
    canvas: z.object({
      width: z.number().min(100).max(5000).optional(),
      height: z.number().min(100).max(5000).optional(),
      zoom: z.number().min(0.1).max(5).optional(),
      offset: z.object({
        x: z.number(),
        y: z.number()
      }).optional()
    }).optional()
  })
});

export const updateWhiteboardSchema = z.object({
  body: z.object({
    title: z.string()
      .min(2, 'Title must be at least 2 characters')
      .max(100, 'Title cannot exceed 100 characters')
      .optional(),
    settings: z.object({
      maxElements: z.number().int().min(10).max(10000).optional(),
      allowExport: z.boolean().optional(),
      exportFormats: z.array(z.enum(['png', 'svg', 'json'])).optional(),
      gridEnabled: z.boolean().optional(),
      gridSize: z.number().min(5).max(100).optional(),
      snapToGrid: z.boolean().optional(),
      backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid background color format').optional()
    }).optional(),
    canvas: z.object({
      width: z.number().min(100).max(5000).optional(),
      height: z.number().min(100).max(5000).optional(),
      zoom: z.number().min(0.1).max(5).optional(),
      offset: z.object({
        x: z.number(),
        y: z.number()
      }).optional()
    }).optional()
  })
});

export const collaboratorSchema = z.object({
  body: z.object({
    userId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID'),
    role: z.enum(['editor', 'viewer'])
  })
});

export const querySchema = z.object({
  query: z.object({
    sort: z.string().optional(),
    limit: z.string()
      .refine(val => !isNaN(parseInt(val)), 'Limit must be a number')
      .refine(val => parseInt(val) > 0, 'Limit must be positive')
      .optional(),
    skip: z.string()
      .refine(val => !isNaN(parseInt(val)), 'Skip must be a number')
      .refine(val => parseInt(val) >= 0, 'Skip must be non-negative')
      .optional(),
    filter: z.object({
      type: z.enum(['meeting', 'standalone']).optional(),
      createdAt: z.object({
        from: z.string().datetime().optional(),
        to: z.string().datetime().optional()
      }).optional(),
      hasElements: z.boolean().optional()
    }).optional()
  })
});

// Export specific format schema for the export endpoint
export const exportFormatSchema = z.object({
  query: z.object({
    format: z.enum(['png', 'svg', 'json']),
    quality: z.number().min(0.1).max(1).optional(), // For PNG compression
    scale: z.number().min(0.1).max(3).optional(), // For export scaling
    includeHistory: z.boolean().optional(), // For JSON export
    prettify: z.boolean().optional() // For JSON export
  })
});

export default {
  elementSchema,
  createWhiteboardSchema,
  updateWhiteboardSchema,
  collaboratorSchema,
  querySchema,
  exportFormatSchema
};
