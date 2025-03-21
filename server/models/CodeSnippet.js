import mongoose from 'mongoose';

const codeSnippetSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  code: {
    type: String,
    required: [true, 'Code content is required'],
    trim: true
  },
  language: {
    type: String,
    required: [true, 'Programming language is required'],
    trim: true
  },
  author: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Author is required']
  },
  tags: [{
    type: String,
    trim: true
  }],
  version: {
    type: Number,
    default: 1
  },
  visibility: {
    type: String,
    enum: ['public', 'private', 'team'],
    default: 'private'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for faster searches
codeSnippetSchema.index({ title: 'text', description: 'text', tags: 'text' });

const CodeSnippet = mongoose.model('CodeSnippet', codeSnippetSchema);

export { CodeSnippet };
