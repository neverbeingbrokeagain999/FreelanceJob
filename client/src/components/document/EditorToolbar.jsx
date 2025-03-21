import React from 'react';
import { Editor, Transforms, Text } from 'slate';
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Link,
  Image,
  Save,
  Share,
  Lock,
  History
} from '../icons';

const EditorToolbar = ({ editor, readOnly }) => {
  // Text formatting helpers
  const toggleFormat = (format) => {
    const isActive = isFormatActive(format);
    Transforms.setNodes(
      editor,
      { [format]: isActive ? null : true },
      { match: Text.isText, split: true }
    );
  };

  const isFormatActive = (format) => {
    const [match] = Editor.nodes(editor, {
      match: n => n[format] === true,
      mode: 'all'
    });
    return !!match;
  };

  // Paragraph alignment helpers
  const setAlignment = (alignment) => {
    const isActive = isAlignmentActive(alignment);
    Transforms.setNodes(
      editor,
      { align: isActive ? null : alignment },
      { match: n => Editor.isBlock(editor, n) }
    );
  };

  const isAlignmentActive = (alignment) => {
    const [match] = Editor.nodes(editor, {
      match: n => n.align === alignment
    });
    return !!match;
  };

  // List helpers
  const toggleList = (format) => {
    const isActive = isListActive(format);
    Transforms.setNodes(
      editor,
      { type: isActive ? 'paragraph' : format },
      { match: n => Editor.isBlock(editor, n) }
    );
  };

  const isListActive = (format) => {
    const [match] = Editor.nodes(editor, {
      match: n => n.type === format
    });
    return !!match;
  };

  return (
    <div className="flex items-center gap-2 p-2 border-b bg-gray-50">
      {/* Basic formatting */}
      <ToolbarButton
        icon={<Bold />}
        label="Bold"
        active={isFormatActive('bold')}
        disabled={readOnly}
        onClick={() => toggleFormat('bold')}
      />
      <ToolbarButton
        icon={<Italic />}
        label="Italic"
        active={isFormatActive('italic')}
        disabled={readOnly}
        onClick={() => toggleFormat('italic')}
      />
      <ToolbarButton
        icon={<Underline />}
        label="Underline"
        active={isFormatActive('underline')}
        disabled={readOnly}
        onClick={() => toggleFormat('underline')}
      />

      <ToolbarDivider />

      {/* Text alignment */}
      <ToolbarButton
        icon={<AlignLeft />}
        label="Align Left"
        active={isAlignmentActive('left')}
        disabled={readOnly}
        onClick={() => setAlignment('left')}
      />
      <ToolbarButton
        icon={<AlignCenter />}
        label="Center"
        active={isAlignmentActive('center')}
        disabled={readOnly}
        onClick={() => setAlignment('center')}
      />
      <ToolbarButton
        icon={<AlignRight />}
        label="Align Right"
        active={isAlignmentActive('right')}
        disabled={readOnly}
        onClick={() => setAlignment('right')}
      />

      <ToolbarDivider />

      {/* Lists */}
      <ToolbarButton
        icon={<List />}
        label="Bullet List"
        active={isListActive('bulleted-list')}
        disabled={readOnly}
        onClick={() => toggleList('bulleted-list')}
      />
      <ToolbarButton
        icon={<ListOrdered />}
        label="Numbered List"
        active={isListActive('numbered-list')}
        disabled={readOnly}
        onClick={() => toggleList('numbered-list')}
      />

      <ToolbarDivider />

      {/* Insert elements */}
      <ToolbarButton
        icon={<Link />}
        label="Insert Link"
        disabled={readOnly}
        onClick={() => {
          const url = window.prompt('Enter link URL:');
          if (url) {
            // Insert link logic
          }
        }}
      />
      <ToolbarButton
        icon={<Image />}
        label="Insert Image"
        disabled={readOnly}
        onClick={() => {
          // Image upload/insert logic
        }}
      />

      <ToolbarDivider />

      {/* Document actions */}
      <ToolbarButton
        icon={<Save />}
        label="Save"
        onClick={() => {
          // Save document logic
        }}
      />
      <ToolbarButton
        icon={<Share />}
        label="Share"
        onClick={() => {
          // Share document logic
        }}
      />
      <ToolbarButton
        icon={<Lock />}
        label="Lock Section"
        disabled={readOnly}
        onClick={() => {
          // Lock section logic
        }}
      />
      <ToolbarButton
        icon={<History />}
        label="Version History"
        onClick={() => {
          // Show version history logic
        }}
      />
    </div>
  );
};

// Toolbar button component
const ToolbarButton = ({ icon, label, active, disabled, onClick }) => (
  <button
    type="button"
    title={label}
    className={`
      p-1.5 rounded hover:bg-gray-200 
      ${active ? 'bg-gray-200 text-blue-600' : 'text-gray-700'}
      ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      transition-colors duration-150
    `}
    disabled={disabled}
    onClick={onClick}
  >
    {icon}
  </button>
);

// Toolbar divider component
const ToolbarDivider = () => (
  <div className="w-px h-6 bg-gray-300 mx-2" />
);

export default EditorToolbar;
