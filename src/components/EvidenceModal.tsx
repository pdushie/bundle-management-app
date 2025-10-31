'use client';

import React, { useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Download } from 'lucide-react';

interface EvidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  evidenceUrl: string;
  title?: string;
}

export default function EvidenceModal({ isOpen, onClose, evidenceUrl, title }: EvidenceModalProps) {
  const [zoom, setZoom] = React.useState(1);
  const [rotation, setRotation] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.25));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(prev => Math.max(0.25, Math.min(3, prev + delta)));
  };

  const handleDoubleClick = () => {
    handleReset();
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = evidenceUrl;
    link.download = title || 'evidence';
    link.target = '_blank';
    link.click();
  };

  if (!isOpen) return null;

  const isImage = evidenceUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) || evidenceUrl.includes('image');
  const isPdf = evidenceUrl.includes('.pdf') || evidenceUrl.includes('pdf');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop - clickable to close */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-75 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative z-10 max-w-[95vw] max-h-[95vh] bg-white rounded-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gray-50 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            {title || 'Evidence'}
          </h3>
          
          {/* Controls */}
          <div className="flex items-center space-x-2">
            {isImage && (
              <>
                <button
                  onClick={handleZoomOut}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-600 min-w-[60px] text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={handleZoomIn}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={handleRotate}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded"
                  title="Rotate"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <button
                  onClick={handleReset}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded"
                  title="Reset View"
                >
                  Reset
                </button>
                <div className="w-px h-6 bg-gray-300" />
              </>
            )}
            <button
              onClick={handleDownload}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="relative overflow-hidden bg-gray-100" style={{ width: '70vw', height: '70vh' }}>
          {isImage ? (
            <div
              className="w-full h-full flex items-center justify-center cursor-move"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
              onDoubleClick={handleDoubleClick}
            >
              <img
                src={evidenceUrl}
                alt="Evidence"
                className="max-w-none select-none"
                style={{
                  transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                  cursor: isDragging ? 'grabbing' : 'grab'
                }}
                draggable={false}
                onLoad={() => {
                  // Auto-fit image to container on load
                  const img = new Image();
                  img.onload = () => {
                    const containerWidth = window.innerWidth * 0.7;
                    const containerHeight = window.innerHeight * 0.7;
                    const aspectRatio = img.width / img.height;
                    const containerAspectRatio = containerWidth / containerHeight;
                    
                    if (aspectRatio > containerAspectRatio) {
                      // Image is wider than container
                      setZoom(containerWidth / img.width);
                    } else {
                      // Image is taller than container
                      setZoom(containerHeight / img.height);
                    }
                  };
                  img.src = evidenceUrl;
                }}
              />
            </div>
          ) : isPdf ? (
            <div className="w-full h-full">
              <iframe
                src={evidenceUrl}
                className="w-full h-full border-0"
                title="PDF Evidence"
              />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <p className="text-gray-600 mb-4">Preview not available for this file type</p>
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Download File
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        {isImage && (
          <div className="px-4 py-2 bg-gray-50 border-t text-xs text-gray-500 text-center">
            Use mouse wheel to zoom • Drag to pan • Double-click to reset • Press ESC to close
          </div>
        )}
      </div>
    </div>
  );
}