'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';

export default function Home() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.type !== 'application/pdf') {
        setError('Please select a valid PDF file.');
        return;
      }
      setFile(selected);
      setError(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const dropped = e.dataTransfer.files[0];
      if (dropped.type !== 'application/pdf') {
        setError('Please drop a valid PDF file.');
        return;
      }
      setFile(dropped);
      setError(null);
    }
  };

  const handleSummarize = async () => {
    if (!file) {
      setError('Please upload a PDF file first.');
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('https://summerized-application-using-ai.onrender.com/api/summarize-pdf', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to summarize document.');
      }

      setData(result);
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-white">
            AI Document Summarizer
          </h1>
          <p className="text-zinc-400 text-sm sm:text-base">
            Upload long PDFs or book chapters to receive a concise, structured executive brief.
          </p>
        </div>

        {/* Upload Zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
            isDragging
              ? 'border-indigo-500 bg-indigo-500/10'
              : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
          }`}
        >
          <input
            type="file"
            id="pdf-upload"
            accept="application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />
          <label
            htmlFor="pdf-upload"
            className="cursor-pointer flex flex-col items-center justify-center space-y-3"
          >
            <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            <div>
              <span className="text-indigo-400 font-medium hover:underline">
                Click to upload
              </span>{' '}
              <span className="text-zinc-400">or drag and drop</span>
            </div>
            <p className="text-xs text-zinc-500">PDF up to 25MB</p>
          </label>

          {file && (
            <div className="mt-4 inline-flex items-center gap-2 bg-zinc-800/80 px-3 py-1.5 rounded-full text-xs text-zinc-200">
              <span>📄 {file.name}</span>
              <span className="text-zinc-500">
                ({(file.size / (1024 * 1024)).toFixed(2)} MB)
              </span>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="flex justify-center">
          <button
            onClick={handleSummarize}
            disabled={!file || loading}
            className={`w-full sm:w-auto px-8 py-3 rounded-lg font-medium text-sm transition-all shadow-md ${
              !file || loading
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer'
            }`}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                Processing & Synthesizing...
              </span>
            ) : (
              'Generate Summary'
            )}
          </button>
        </div>

        {/* Error Feedback */}
        {error && (
          <div className="p-4 rounded-lg bg-red-950/40 border border-red-900 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Output Section */}
        {data && (
          <div className="space-y-4">
            <div className="flex justify-between items-center text-xs text-zinc-500 border-b border-zinc-800 pb-2">
              <span>Pages: {data.totalPages}</span>
              <span>Characters: {data.charactersExtracted.toLocaleString()}</span>
            </div>

            <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl max-w-none text-zinc-300 leading-relaxed text-sm sm:text-base prose prose-invert">
              <ReactMarkdown>{data.summary}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
