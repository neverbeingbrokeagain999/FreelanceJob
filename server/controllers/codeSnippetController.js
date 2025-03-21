import { CodeSnippet } from '../models/CodeSnippet.js';
import codeExecutionService from '../services/codeExecutionService.js';
import { errorHandler, errorResponse } from '../utils/errorHandler.js';
import { escape } from 'html-escaper';

export const createSnippet = async (req, res) => {
  try {
    const { title, content, language, description, visibility = 'private', executionConfig } = req.body;

    const snippet = await CodeSnippet.create({
      title,
      content,
      language,
      description,
      visibility,
      creator: req.user._id,
      executionConfig
    });

    res.status(201).json({
      success: true,
      data: snippet
    });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

export const getSnippets = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let query = {};
    const searchableFields = ['title', 'description', 'language', 'visibility'];

    // Build query based on filters
    searchableFields.forEach(field => {
      if (req.query[field]) {
        if (field === 'title' || field === 'description') {
          query[field] = { $regex: escape(req.query[field]), $options: 'i' };
        } else {
          query[field] = req.query[field];
        }
      }
    });

    // Access control
    if (req.query.visibility !== 'public') {
      query.$or = [
        { visibility: 'public' },
        { creator: req.user._id },
        { 'collaborators.user': req.user._id }
      ];
    }

    const [snippets, total] = await Promise.all([
      CodeSnippet.find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('creator', 'name email')
        .populate('collaborators.user', 'name email')
        .lean(),
      CodeSnippet.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: snippets,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

export const getSnippetById = async (req, res) => {
  try {
    const snippet = await CodeSnippet.findById(req.params.id)
      .populate('creator', 'name email')
      .populate('collaborators.user', 'name email')
      .populate('forkedFrom', 'title creator')
      .populate('pinnedComments');

    if (!snippet) {
      return errorResponse(res, 404, 'Snippet not found');
    }

    // Check access permission
    if (!snippet.canAccess(req.user._id)) {
      return errorResponse(res, 403, 'Access denied');
    }

    // Record view
    await snippet.addView(req.user._id);

    res.json({
      success: true,
      data: snippet
    });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

export const updateSnippet = async (req, res) => {
  try {
    const snippet = await CodeSnippet.findById(req.params.id);

    if (!snippet) {
      return errorResponse(res, 404, 'Snippet not found');
    }

    // Check edit permission
    if (!snippet.canEdit(req.user._id)) {
      return errorResponse(res, 403, 'Edit permission denied');
    }

    const allowedUpdates = ['title', 'content', 'description', 'visibility', 'executionConfig'];
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        snippet[key] = req.body[key];
      }
    });

    await snippet.save();

    res.json({
      success: true,
      data: snippet
    });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

export const deleteSnippet = async (req, res) => {
  try {
    const snippet = await CodeSnippet.findById(req.params.id);

    if (!snippet) {
      return errorResponse(res, 404, 'Snippet not found');
    }

    // Only creator or owner collaborator can delete
    const isOwner = snippet.collaborators.find(
      c => c.user.equals(req.user._id) && c.role === 'owner'
    );
    
    if (!snippet.creator.equals(req.user._id) && !isOwner) {
      return errorResponse(res, 403, 'Delete permission denied');
    }

    snippet.lastModifiedBy = req.user._id;
    await snippet.remove();

    res.json({
      success: true,
      data: {}
    });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

export const executeSnippet = async (req, res) => {
  try {
    const snippet = await CodeSnippet.findById(req.params.id);

    if (!snippet) {
      return errorResponse(res, 404, 'Snippet not found');
    }

    if (!snippet.canAccess(req.user._id)) {
      return errorResponse(res, 403, 'Access denied');
    }

    const { code, config = {} } = req.body;
    const executionConfig = {
      ...snippet.executionConfig,
      ...config
    };

    const result = await codeExecutionService.execute({
      content: code,
      language: snippet.language,
      executionConfig
    });

    // Record execution
    await snippet.addExecution();

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

export const createVersion = async (req, res) => {
  try {
    const snippet = await CodeSnippet.findById(req.params.id);

    if (!snippet) {
      return errorResponse(res, 404, 'Snippet not found');
    }

    if (!snippet.canEdit(req.user._id)) {
      return errorResponse(res, 403, 'Edit permission denied');
    }

    const { content, commitMessage } = req.body;

    snippet.versions.push({
      content: content || snippet.content,
      commitMessage,
      createdBy: req.user._id
    });

    await snippet.save();

    res.json({
      success: true,
      data: snippet.versions[snippet.versions.length - 1]
    });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

export const forkSnippet = async (req, res) => {
  try {
    const sourceSnippet = await CodeSnippet.findById(req.params.id);

    if (!sourceSnippet) {
      return errorResponse(res, 404, 'Source snippet not found');
    }

    if (!sourceSnippet.canAccess(req.user._id)) {
      return errorResponse(res, 403, 'Access denied');
    }

    const forkedSnippet = await CodeSnippet.create({
      title: `Fork of ${sourceSnippet.title}`,
      content: sourceSnippet.content,
      language: sourceSnippet.language,
      description: sourceSnippet.description,
      creator: req.user._id,
      forkedFrom: sourceSnippet._id,
      executionConfig: sourceSnippet.executionConfig
    });

    // Increment fork count of source snippet
    sourceSnippet.stats.forks += 1;
    await sourceSnippet.save();

    res.status(201).json({
      success: true,
      data: forkedSnippet
    });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

export const manageCollaborators = async (req, res) => {
  try {
    const snippet = await CodeSnippet.findById(req.params.id);

    if (!snippet) {
      return errorResponse(res, 404, 'Snippet not found');
    }

    // Only creator or owner collaborators can manage collaborators
    const isOwner = snippet.collaborators.find(
      c => c.user.equals(req.user._id) && c.role === 'owner'
    );
    if (!snippet.creator.equals(req.user._id) && !isOwner) {
      return errorResponse(res, 403, 'Permission denied');
    }

    const { action, email, role } = req.body;

    if (action === 'add') {
      // Add new collaborator
      const user = await User.findOne({ email });
      if (!user) {
        return errorResponse(res, 404, 'User not found');
      }

      // Check if already a collaborator
      if (snippet.isCollaborator(user._id)) {
        return errorResponse(res, 400, 'User is already a collaborator');
      }

      snippet.collaborators.push({
        user: user._id,
        role,
        addedBy: req.user._id
      });
    } else if (action === 'remove') {
      // Remove collaborator
      const collaborator = snippet.collaborators.id(req.body.collaboratorId);
      if (!collaborator) {
        return errorResponse(res, 404, 'Collaborator not found');
      }

      // Cannot remove the creator
      if (collaborator.user.equals(snippet.creator)) {
        return errorResponse(res, 400, 'Cannot remove snippet creator');
      }

      collaborator.remove();
    } else if (action === 'update') {
      // Update collaborator role
      const collaborator = snippet.collaborators.id(req.body.collaboratorId);
      if (!collaborator) {
        return errorResponse(res, 404, 'Collaborator not found');
      }

      collaborator.role = role;
    }

    await snippet.save();

    res.json({
      success: true,
      data: snippet
    });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};
