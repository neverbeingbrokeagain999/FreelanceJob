import { ProjectTemplate } from '../models/ProjectTemplate.js';
import { errorResponse } from '../utils/errorHandler.js';
import { logger } from '../config/logger.js';

// @desc    Get all templates with filters, sorting and pagination
// @route   GET /api/project-templates
// @access  Private
export const getTemplates = async (req, res) => {
  try {
    const { 
      search,
      category,
      tags,
      visibility,
      isActive
    } = req.query;

    // Build query
    const query = {};

    // Search by name or description
    if (search) {
      query.$text = { $search: search };
    }

    // Filter by category
    if (category) {
      query.category = category;
    }

    // Filter by tags
    if (tags) {
      query.tags = { $in: Array.isArray(tags) ? tags : [tags] };
    }

    // Filter by visibility
    if (visibility && visibility !== 'all') {
      query.visibility = visibility;
    }

    // Filter by active status
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    // Add visibility restrictions for non-admin users
    if (req.user.role !== 'admin') {
      query.$or = [
        { visibility: 'public' },
        { createdBy: req.user._id }
      ];
    }

    const templates = await ProjectTemplate.find(query)
      .populate('createdBy', 'name email')
      .sort(req.sort)
      .skip(req.pagination.skip)
      .limit(req.pagination.limit);

    const total = await ProjectTemplate.countDocuments(query);

    res.json({
      success: true,
      data: templates,
      pagination: {
        page: req.pagination.page,
        limit: req.pagination.limit,
        total
      }
    });
  } catch (error) {
    logger.error('Error fetching templates:', error);
    return errorResponse(res, 500, 'Error fetching templates');
  }
};

// @desc    Get single template by ID
// @route   GET /api/project-templates/:id
// @access  Private
export const getTemplate = async (req, res) => {
  try {
    const template = await ProjectTemplate.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!template) {
      return errorResponse(res, 404, 'Template not found');
    }

    // Check access rights
    if (template.visibility === 'private' && 
        template.createdBy.toString() !== req.user._id.toString() && 
        req.user.role !== 'admin') {
      return errorResponse(res, 403, 'Not authorized to access this template');
    }

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    logger.error('Error fetching template:', error);
    return errorResponse(res, 500, 'Error fetching template');
  }
};

// @desc    Create new template
// @route   POST /api/project-templates
// @access  Private
export const createTemplate = async (req, res) => {
  try {
    const template = new ProjectTemplate({
      ...req.body,
      createdBy: req.user._id
    });

    await template.save();

    res.status(201).json({
      success: true,
      data: template
    });
  } catch (error) {
    logger.error('Error creating template:', error);
    return errorResponse(res, 500, 'Error creating template');
  }
};

// @desc    Update template
// @route   PUT /api/project-templates/:id
// @access  Private
export const updateTemplate = async (req, res) => {
  try {
    const template = await ProjectTemplate.findById(req.params.id);

    if (!template) {
      return errorResponse(res, 404, 'Template not found');
    }

    // Check ownership
    if (template.createdBy.toString() !== req.user._id.toString() && 
        req.user.role !== 'admin') {
      return errorResponse(res, 403, 'Not authorized to update this template');
    }

    // Update template
    Object.assign(template, req.body);
    await template.save();

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    logger.error('Error updating template:', error);
    return errorResponse(res, 500, 'Error updating template');
  }
};

// @desc    Delete template
// @route   DELETE /api/project-templates/:id
// @access  Private
export const deleteTemplate = async (req, res) => {
  try {
    const template = await ProjectTemplate.findById(req.params.id);

    if (!template) {
      return errorResponse(res, 404, 'Template not found');
    }

    // Check ownership
    if (template.createdBy.toString() !== req.user._id.toString() && 
        req.user.role !== 'admin') {
      return errorResponse(res, 403, 'Not authorized to delete this template');
    }

    await template.remove();

    res.json({
      success: true,
      data: {}
    });
  } catch (error) {
    logger.error('Error deleting template:', error);
    return errorResponse(res, 500, 'Error deleting template');
  }
};

// @desc    Rate template
// @route   POST /api/project-templates/:id/rate
// @access  Private
export const rateTemplate = async (req, res) => {
  try {
    const { rating } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return errorResponse(res, 400, 'Invalid rating value');
    }

    const template = await ProjectTemplate.findById(req.params.id);

    if (!template) {
      return errorResponse(res, 404, 'Template not found');
    }

    await template.updateRating(rating);

    res.json({
      success: true,
      data: {
        averageRating: template.averageRating,
        ratingCount: template.ratingCount
      }
    });
  } catch (error) {
    logger.error('Error rating template:', error);
    return errorResponse(res, 500, 'Error rating template');
  }
};

// @desc    Get popular templates
// @route   GET /api/project-templates/popular
// @access  Private
export const getPopularTemplates = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const templates = await ProjectTemplate.getPopularTemplates(limit);

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    logger.error('Error fetching popular templates:', error);
    return errorResponse(res, 500, 'Error fetching popular templates');
  }
};

export default {
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  rateTemplate,
  getPopularTemplates
};
