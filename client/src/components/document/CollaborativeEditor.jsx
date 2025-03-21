import React, { useEffect, useRef, useMemo, useState } from 'react';
import { createEditor, Transforms, Editor } from 'slate';
import { Slate, Editable, withReact } from 'slate-react';
import useDocument from '../../hooks/useDocument';
import { 
  createInsertOp, 
  createDeleteOp, 
  applyOperation 
} from '../../utils/operationalTransform';
import { Avatar } from '../common/Avatar';
import { LoadingSpinner } from '../LoadingSpinner';
import { UserPresence } from './UserPresence';
import { EditorToolbar } from './EditorToolbar';

const CollaborativeEditor = ({ documentId }) => {
  const editor = useMemo(() => withReact(createEditor()), []);
  const editorRef = useRef(null);
  const selectionRef = useRef(null);
  const [readOnly, setReadOnly] = useState(false);

  // Connect to document
  const {
    document,
    content,
    status,
    error,
    cursors,
    activeUsers,
    locks,
    handleChange,
    updateCursor,
    acquireLock,
    releaseLock,
    updatePresence,
    isRangeLocked
  } = useDocument(documentId);

  // Initialize editor content
  useEffect(() => {
    if (content) {
      const initialValue = JSON.parse(content);
      editor.children = initialValue;
      Transforms.select(editor, { path: [0, 0], offset: 0 });
    }
  }, [content, editor]);

  // Handle cursor updates
  useEffect(() => {
    const handleSelectionChange = () => {
      const { selection } = editor;
      if (selection && !selectionRef.current?.isEqual(selection)) {
        selectionRef.current = selection;
        updateCursor({
          anchor: selection.anchor,
          focus: selection.focus
        });
      }
    };

    const handleDOMSelectionChange = () => {
      requestAnimationFrame(handleSelectionChange);
    };

    document.addEventListener('selectionchange', handleDOMSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleDOMSelectionChange);
    };
  }, [editor, updateCursor]);

  // Update user presence
  useEffect(() => {
    updatePresence('active');
    
    const handleVisibilityChange = () => {
      updatePresence(document.hidden ? 'away' : 'active');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      updatePresence('inactive');
    };
  }, [updatePresence]);

  // Handle text changes
  const handleEditorChange = operations => {
    operations.forEach(op => {
      // Skip selection-only changes
      if (op.type === 'set_selection') return;

      const { type, properties, newProperties, path } = op;
      
      switch (type) {
        case 'insert_text': {
          handleChange(createInsertOp(
            editor.pathToOffset(path),
            properties.text
          ));
          break;
        }
        case 'remove_text': {
          handleChange(createDeleteOp(
            editor.pathToOffset(path),
            properties.text.length
          ));
          break;
        }
        case 'insert_node': {
          // Convert node insert to text operation
          const nodeText = Node.string(newProperties);
          handleChange(createInsertOp(
            editor.pathToOffset(path),
            nodeText
          ));
          break;
        }
        case 'remove_node': {
          // Convert node removal to text operation
          const nodeText = Node.string(properties);
          handleChange(createDeleteOp(
            editor.pathToOffset(path),
            nodeText.length
          ));
          break;
        }
      }
    });
  };

  // Render loading state
  if (status === 'disconnected') {
    return <LoadingSpinner />;
  }

  // Render error state
  if (status === 'error') {
    return (
      <div className="p-4 text-red-500">
        Error: {error?.message || 'Failed to load document'}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with document info and active users */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold">
            {document?.title || 'Untitled Document'}
          </h1>
          <span className="text-sm text-gray-500">
            {status === 'connected' ? 'Connected' : 'Connecting...'}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {Array.from(activeUsers.values()).map(({ user, status }) => (
            <UserPresence 
              key={user._id}
              user={user}
              status={status}
            />
          ))}
        </div>
      </div>

      {/* Editor toolbar */}
      <EditorToolbar 
        editor={editor}
        readOnly={readOnly}
      />

      {/* Main editor */}
      <div 
        ref={editorRef}
        className="flex-1 overflow-auto p-4"
      >
        <Slate
          editor={editor}
          value={content ? JSON.parse(content) : [{ type: 'paragraph', children: [{ text: '' }] }]}
          onChange={handleEditorChange}
        >
          <Editable
            className="prose max-w-none"
            readOnly={readOnly}
            renderLeaf={props => <Leaf {...props} cursors={cursors} />}
            onKeyDown={event => {
              // Handle keyboard shortcuts here
              if (event.key === 'Tab') {
                event.preventDefault();
                editor.insertText('\t');
              }
            }}
          />
        </Slate>
      </div>

      {/* Lock indicator */}
      {locks.size > 0 && (
        <div className="fixed bottom-4 right-4 bg-yellow-100 text-yellow-800 px-4 py-2 rounded-lg shadow">
          {locks.size} section{locks.size !== 1 ? 's' : ''} locked
        </div>
      )}
    </div>
  );
};

// Render leaf with cursor indicators
const Leaf = ({ attributes, children, leaf, cursors }) => {
  const styles = {};
  
  // Add cursor indicators
  for (const [userId, position] of cursors) {
    if (position.focus.path.toString() === leaf.path.toString()) {
      styles.backgroundColor = `rgba(${userId.charCodeAt(0) % 255}, 100, 100, 0.2)`;
      break;
    }
  }

  return (
    <span
      {...attributes}
      style={styles}
    >
      {children}
    </span>
  );
};

export default CollaborativeEditor;
