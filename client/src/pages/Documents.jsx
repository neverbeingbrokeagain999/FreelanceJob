import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useFetch from '../hooks/useFetch';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatDistance } from 'date-fns';

const Documents = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all'); // all, owned, shared
  const [sortBy, setSortBy] = useState('updatedAt'); // updatedAt, title, type

  // Fetch documents
  const {
    data: documents,
    loading,
    error,
    mutate
  } = useFetch('/api/documents');

  // Filter and sort documents
  const filteredDocuments = documents?.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' ||
      (filter === 'owned' && doc.isOwner) ||
      (filter === 'shared' && !doc.isOwner);
    return matchesSearch && matchesFilter;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'title':
        return a.title.localeCompare(b.title);
      case 'type':
        return a.type.localeCompare(b.type);
      case 'updatedAt':
      default:
        return new Date(b.updatedAt) - new Date(a.updatedAt);
    }
  });

  // Create new document
  const createDocument = async () => {
    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Untitled Document',
          type: 'rich-text'
        })
      });

      if (!response.ok) throw new Error('Failed to create document');

      const data = await response.json();
      mutate(); // Refresh documents list
      navigate(`/documents/${data.data._id}`);
    } catch (error) {
      console.error('Error creating document:', error);
    }
  };

  // Delete document
  const deleteDocument = async (id) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      const response = await fetch(`/api/documents/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete document');

      mutate(); // Refresh documents list
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="p-4 text-red-500">
        Error loading documents: {error.message}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
        <button
          onClick={createDocument}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          New Document
        </button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search documents..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border rounded-md"
          />
        </div>
        <div className="flex gap-4">
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="px-4 py-2 border rounded-md bg-white"
          >
            <option value="all">All Documents</option>
            <option value="owned">My Documents</option>
            <option value="shared">Shared with Me</option>
          </select>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="px-4 py-2 border rounded-md bg-white"
          >
            <option value="updatedAt">Last Modified</option>
            <option value="title">Title</option>
            <option value="type">Type</option>
          </select>
        </div>
      </div>

      {/* Documents List */}
      {filteredDocuments?.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No documents found</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredDocuments?.map(doc => (
            <div
              key={doc._id}
              className="relative group p-4 border rounded-lg hover:shadow-md transition-shadow"
            >
              <Link to={`/documents/${doc._id}`} className="block">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-gray-900 truncate">
                    {doc.title}
                  </h3>
                  <span className={`
                    px-2 py-1 text-xs rounded
                    ${doc.type === 'rich-text' ? 'bg-blue-100 text-blue-800' : ''}
                    ${doc.type === 'code' ? 'bg-purple-100 text-purple-800' : ''}
                    ${doc.type === 'markdown' ? 'bg-green-100 text-green-800' : ''}
                  `}>
                    {doc.type}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  Last modified{' '}
                  {formatDistance(new Date(doc.updatedAt), new Date(), {
                    addSuffix: true
                  })}
                </p>
                <div className="flex items-center text-sm text-gray-500">
                  <span className="flex items-center">
                    {doc.isOwner ? 'Owner' : 'Collaborator'} •{' '}
                    {doc.collaborators?.length || 0} collaborator
                    {doc.collaborators?.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </Link>

              {/* Action buttons */}
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                {doc.isOwner && (
                  <button
                    onClick={() => deleteDocument(doc._id)}
                    className="p-1 text-gray-500 hover:text-red-600"
                    title="Delete document"
                  >
                    🗑
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Documents;
