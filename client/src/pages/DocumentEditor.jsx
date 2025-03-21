import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { CollaborativeEditor } from '../components/document/CollaborativeEditor';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useFetch } from '../hooks/useFetch';

const DocumentEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showSidebar, setShowSidebar] = useState(false);
  const [activeTab, setActiveTab] = useState('comments');

  // Fetch document details
  const {
    data: document,
    error,
    loading,
    mutate
  } = useFetch(`/api/documents/${id}`);

  // Handle fetch error
  useEffect(() => {
    if (error) {
      // Handle 404 or unauthorized access
      if (error.status === 404) {
        navigate('/documents', {
          replace: true,
          state: { error: 'Document not found' }
        });
      } else if (error.status === 403) {
        navigate('/documents', {
          replace: true,
          state: { error: 'You don\'t have access to this document' }
        });
      }
    }
  }, [error, navigate]);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Main editor area */}
      <div className={`flex-1 flex flex-col ${showSidebar ? 'mr-96' : ''}`}>
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b bg-white">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/documents')}
              className="text-gray-600 hover:text-gray-900"
            >
              ←
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {document?.title || 'Untitled Document'}
              </h1>
              <p className="text-sm text-gray-500">
                Last edited {document?.updatedAt ? new Date(document.updatedAt).toLocaleString() : 'Never'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Document actions */}
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-2 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100"
              title="Toggle sidebar"
            >
              ☰
            </button>
          </div>
        </header>

        {/* Editor */}
        {document && (
          <CollaborativeEditor
            documentId={id}
            initialContent={document.content}
            readOnly={!document.canEdit}
          />
        )}
      </div>

      {/* Sidebar */}
      {showSidebar && (
        <aside className="fixed right-0 top-0 bottom-0 w-96 bg-white border-l">
          {/* Sidebar header */}
          <div className="px-6 py-4 border-b">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Document Details</h2>
              <button
                onClick={() => setShowSidebar(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            {/* Tab navigation */}
            <div className="flex space-x-4 border-b">
              <button
                className={`
                  py-2 px-4 -mb-px border-b-2
                  ${activeTab === 'comments'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500'}
                `}
                onClick={() => setActiveTab('comments')}
              >
                Comments
              </button>
              <button
                className={`
                  py-2 px-4 -mb-px border-b-2
                  ${activeTab === 'history'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500'}
                `}
                onClick={() => setActiveTab('history')}
              >
                History
              </button>
              <button
                className={`
                  py-2 px-4 -mb-px border-b-2
                  ${activeTab === 'share'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500'}
                `}
                onClick={() => setActiveTab('share')}
              >
                Share
              </button>
            </div>
          </div>

          {/* Tab content */}
          <div className="p-6">
            {activeTab === 'comments' && (
              <div>
                {/* Comments list or CommentThread component */}
                <p className="text-gray-500">No comments yet</p>
              </div>
            )}

            {activeTab === 'history' && (
              <div>
                {/* Version history list */}
                <p className="text-gray-500">No version history available</p>
              </div>
            )}

            {activeTab === 'share' && (
              <div>
                {/* Sharing and collaborator management */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-2">
                      Owner
                    </h3>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">
                        {document?.owner?.name || 'Unknown'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-2">
                      Collaborators
                    </h3>
                    {document?.collaborators?.length > 0 ? (
                      <ul className="space-y-2">
                        {document.collaborators.map(collaborator => (
                          <li
                            key={collaborator.user._id}
                            className="flex items-center justify-between"
                          >
                            <span className="text-sm text-gray-500">
                              {collaborator.user.name}
                            </span>
                            <span className="text-xs text-gray-400">
                              {collaborator.role}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500">
                        No collaborators yet
                      </p>
                    )}

                    {/* Add collaborator button */}
                    {document?.canEdit && (
                      <button
                        className="mt-4 w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                        onClick={() => {
                          // Open add collaborator modal
                        }}
                      >
                        Add Collaborator
                      </button>
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-2">
                      Share Link
                    </h3>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        readOnly
                        value={`${window.location.origin}/documents/${id}`}
                        className="flex-1 p-2 text-sm border rounded"
                      />
                      <button
                        className="p-2 text-blue-600 hover:text-blue-700"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            `${window.location.origin}/documents/${id}`
                          );
                        }}
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>
      )}
    </div>
  );
};

export default DocumentEditor;
