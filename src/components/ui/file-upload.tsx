"use client";

import React, { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { Upload, FileText, Check, X, Loader2 } from 'lucide-react';
import { Button } from './button';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onUploadComplete?: (chatId: number) => void;
}

export function FileUpload({ onFileSelect, onUploadComplete }: FileUploadProps) {
  const dropzoneRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [uploadedFile, setUploadedFile] = React.useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = React.useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = React.useState<string>('');

  useEffect(() => {
    // Animate upload section entrance
    if (typeof window === 'undefined' || !dropzoneRef.current) return;
    gsap.fromTo(dropzoneRef.current,
      { opacity: 0, scale: 0.95 },
      { opacity: 1, scale: 1, duration: 0.6, ease: "back.out(1.2)" }
    );
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown'
    ];

    if (!allowedTypes.includes(file.type)) {
      setUploadStatus('error');
      setErrorMessage('Please upload a PDF, DOCX, TXT, or MD file.');
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setUploadStatus('error');
      setErrorMessage('File size must be less than 10MB.');
      return;
    }

    setUploadedFile(file);
    setUploadStatus('uploading');
    setErrorMessage('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setUploadStatus('success');
        onFileSelect(file);
        
        // Add success animation
        if (dropzoneRef.current) {
          gsap.to(dropzoneRef.current, {
            scale: 1.05,
            duration: 0.2,
            yoyo: true,
            repeat: 1,
            ease: "power2.inOut"
          });
        }

        // Call onUploadComplete with chatId if provided
        if (onUploadComplete && result.chatId) {
          onUploadComplete(result.chatId);
        }
      } else {
        setUploadStatus('error');
        setErrorMessage(result.error || 'Upload failed. Please try again.');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('error');
      setErrorMessage('Upload failed. Please check your connection and try again.');
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    setUploadStatus('idle');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Upload Your Document
        </h2>
        <p className="text-lg text-gray-600">
          Drop your PDF, Word document, or text file here to start analyzing
        </p>
      </div>

      <div
        ref={dropzoneRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleFileSelect}
        className={`
          relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300
          ${isDragOver 
            ? 'border-blue-500 bg-blue-50 scale-105' 
            : uploadStatus === 'success'
            ? 'border-green-500 bg-green-50'
            : uploadStatus === 'error'
            ? 'border-red-500 bg-red-50'
            : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileInputChange}
          accept=".pdf,.docx,.txt,.md"
          className="hidden"
        />

        {uploadStatus === 'idle' && (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto">
              <Upload className="h-8 w-8 text-white" />
            </div>
            <div>
              <p className="text-xl font-semibold text-gray-700 mb-2">
                Drop your file here, or <span className="text-blue-600">browse</span>
              </p>
              <p className="text-sm text-gray-500">
                Supports PDF, DOCX, TXT, and Markdown files up to 10MB
              </p>
            </div>
          </div>
        )}

        {uploadStatus === 'uploading' && uploadedFile && (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
            </div>
            <div>
              <p className="text-xl font-semibold text-gray-700 mb-2">
                Uploading {uploadedFile.name}...
              </p>
              <p className="text-sm text-gray-500">
                {formatFileSize(uploadedFile.size)}
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '70%' }}></div>
              </div>
            </div>
          </div>
        )}

        {uploadStatus === 'success' && uploadedFile && (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <p className="text-xl font-semibold text-green-700 mb-2">
                {uploadedFile.name} uploaded successfully!
              </p>
              <p className="text-sm text-gray-500">
                {formatFileSize(uploadedFile.size)} • Ready for analysis
              </p>
            </div>
          </div>
        )}

        {uploadStatus === 'error' && (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto">
              <X className="h-8 w-8 text-red-600" />
            </div>
            <div>
              <p className="text-xl font-semibold text-red-700 mb-2">
                Upload failed
              </p>
              <p className="text-sm text-gray-500">
                Please make sure your file is a valid PDF, DOCX, TXT, or MD file
              </p>
            </div>
          </div>
        )}
      </div>

      {/* File Actions */}
      {uploadedFile && uploadStatus === 'success' && (
        <div className="mt-6 flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">{uploadedFile.name}</p>
              <p className="text-sm text-gray-500">{formatFileSize(uploadedFile.size)}</p>
            </div>
          </div>
          <Button
            onClick={removeFile}
            variant="outline"
            size="sm"
            className="border-red-300 text-red-600 hover:bg-red-50"
          >
            <X className="h-4 w-4 mr-1" />
            Remove
          </Button>
        </div>
      )}

      {/* Supported Formats */}
      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { ext: 'PDF', desc: 'PDF Documents', color: 'red' },
          { ext: 'DOCX', desc: 'Word Documents', color: 'blue' },
          { ext: 'TXT', desc: 'Text Files', color: 'gray' },
          { ext: 'MD', desc: 'Markdown Files', color: 'green' }
        ].map((format) => (
          <div key={format.ext} className="text-center p-4 bg-white border border-gray-200 rounded-xl">
            <div className={`w-8 h-8 bg-${format.color}-100 rounded-lg flex items-center justify-center mx-auto mb-2`}>
              <FileText className={`h-4 w-4 text-${format.color}-600`} />
            </div>
            <p className="font-medium text-gray-900 text-sm">{format.ext}</p>
            <p className="text-xs text-gray-500">{format.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
