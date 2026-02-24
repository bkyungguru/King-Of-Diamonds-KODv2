import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Upload, X, Image, Video, Loader2, Check, Eye } from 'lucide-react';
import { toast } from 'sonner';

export const FileUpload = ({ 
    onUpload, 
    accept = "image/*,video/*", 
    multiple = false,
    category = "content",
    maxSize = 100, // MB
    className = ""
}) => {
    const { api } = useAuth();
    const [uploading, setUploading] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [pendingFiles, setPendingFiles] = useState([]); // Files selected but not uploaded
    const [dragActive, setDragActive] = useState(false);
    const [previewFile, setPreviewFile] = useState(null); // For full preview modal
    const inputRef = useRef(null);

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files);
        }
    };

    const handleChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFileSelect(e.target.files);
        }
    };

    // Show preview before upload
    const handleFileSelect = async (files) => {
        const fileArray = Array.from(files);
        
        // Validate file size
        for (const file of fileArray) {
            if (file.size > maxSize * 1024 * 1024) {
                toast.error(`File ${file.name} exceeds ${maxSize}MB limit`);
                return;
            }
        }

        // Create preview URLs
        const previews = fileArray.map(file => ({
            file,
            name: file.name,
            type: file.type.startsWith('video') ? 'video' : 'image',
            previewUrl: URL.createObjectURL(file),
            size: (file.size / (1024 * 1024)).toFixed(2) + ' MB'
        }));

        setPendingFiles(prev => multiple ? [...prev, ...previews] : previews);
    };

    // Upload selected files
    const uploadFiles = async () => {
        if (pendingFiles.length === 0) return;

        setUploading(true);
        const urls = [];

        try {
            for (const pending of pendingFiles) {
                const formData = new FormData();
                formData.append('file', pending.file);

                console.log('Uploading file:', pending.name, 'to', `/uploads/${category}`);
                
                const response = await api().post(`/uploads/${category}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                console.log('Upload response:', response.data);

                urls.push({
                    url: response.data.url,
                    type: pending.type,
                    name: pending.name
                });
            }

            // Clean up preview URLs
            pendingFiles.forEach(p => URL.revokeObjectURL(p.previewUrl));
            
            setUploadedFiles(prev => multiple ? [...prev, ...urls] : urls);
            setPendingFiles([]);
            onUpload(multiple ? [...uploadedFiles, ...urls] : urls);
            toast.success(`${urls.length} file${urls.length > 1 ? 's' : ''} uploaded!`);
        } catch (error) {
            console.error('Upload error:', error);
            console.error('Error response:', error.response?.data);
            toast.error('Upload failed: ' + (error.response?.data?.detail || error.message));
        } finally {
            setUploading(false);
        }
    };

    const removePendingFile = (index) => {
        const file = pendingFiles[index];
        URL.revokeObjectURL(file.previewUrl);
        setPendingFiles(prev => prev.filter((_, i) => i !== index));
    };

    const removeUploadedFile = (index) => {
        const newFiles = uploadedFiles.filter((_, i) => i !== index);
        setUploadedFiles(newFiles);
        onUpload(newFiles);
    };

    return (
        <div className={className}>
            {/* Upload Area */}
            <div
                className={`border-2 border-dashed rounded-sm p-6 text-center transition-colors cursor-pointer ${
                    dragActive 
                        ? 'border-gold bg-gold/10' 
                        : 'border-white/20 hover:border-gold/50'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                data-testid="file-upload-area"
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept={accept}
                    multiple={multiple}
                    onChange={handleChange}
                    className="hidden"
                    data-testid="file-input"
                />

                {uploading ? (
                    <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-10 h-10 text-gold animate-spin" />
                        <p className="text-white/70">Uploading...</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-3">
                        <Upload className="w-10 h-10 text-gold/50" />
                        <p className="text-white/70">
                            Drag & drop or click to select
                        </p>
                        <p className="text-white/40 text-sm">
                            {accept.includes('video') ? 'Images & Videos' : 'Images'} up to {maxSize}MB
                        </p>
                    </div>
                )}
            </div>

            {/* Pending Files Preview (before upload) */}
            {pendingFiles.length > 0 && (
                <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-white/70 text-sm">Ready to upload ({pendingFiles.length})</span>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                uploadFiles();
                            }}
                            disabled={uploading}
                            className="px-4 py-1.5 bg-gold text-black text-sm font-medium rounded hover:bg-gold-light transition-colors flex items-center gap-2"
                            data-testid="confirm-upload-btn"
                        >
                            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            Confirm Upload
                        </button>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        {pendingFiles.map((file, index) => (
                            <div 
                                key={index} 
                                className="relative aspect-square bg-obsidian rounded overflow-hidden group border-2 border-yellow-500/50"
                            >
                                {file.type === 'video' ? (
                                    <video 
                                        src={file.previewUrl} 
                                        className="w-full h-full object-cover"
                                        muted
                                    />
                                ) : (
                                    <img 
                                        src={file.previewUrl} 
                                        alt={file.name}
                                        className="w-full h-full object-cover"
                                    />
                                )}
                                
                                {/* Preview button */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setPreviewFile(file);
                                    }}
                                    className="absolute top-1 left-1 p-1 bg-black/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Preview"
                                >
                                    <Eye className="w-4 h-4 text-white" />
                                </button>
                                
                                {/* Remove button */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removePendingFile(index);
                                    }}
                                    className="absolute top-1 right-1 p-1 bg-black/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    data-testid={`remove-pending-${index}`}
                                >
                                    <X className="w-4 h-4 text-white" />
                                </button>
                                
                                {/* File info */}
                                <div className="absolute bottom-0 left-0 right-0 bg-black/80 px-2 py-1">
                                    <p className="text-white text-xs truncate">{file.name}</p>
                                    <p className="text-white/50 text-xs">{file.size}</p>
                                </div>
                                
                                {/* Pending indicator */}
                                <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-yellow-500 rounded text-xs text-black font-medium">
                                    Pending
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Uploaded Files Preview */}
            {uploadedFiles.length > 0 && (
                <div className="mt-4">
                    <span className="text-white/70 text-sm mb-2 block">Uploaded ({uploadedFiles.length})</span>
                    <div className="grid grid-cols-3 gap-3">
                        {uploadedFiles.map((file, index) => (
                            <div 
                                key={index} 
                                className="relative aspect-square bg-obsidian rounded overflow-hidden group"
                            >
                                {file.type === 'video' ? (
                                    <div className="w-full h-full flex items-center justify-center bg-black">
                                        <Video className="w-8 h-8 text-gold/50" />
                                    </div>
                                ) : (
                                    <img 
                                        src={file.url} 
                                        alt={file.name}
                                        className="w-full h-full object-cover"
                                    />
                                )}
                                
                                {/* Remove button */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeUploadedFile(index);
                                    }}
                                    className="absolute top-1 right-1 p-1 bg-black/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    data-testid={`remove-file-${index}`}
                                >
                                    <X className="w-4 h-4 text-white" />
                                </button>
                                
                                {/* Uploaded indicator */}
                                <div className="absolute bottom-1 left-1 p-1 bg-green-500 rounded-full">
                                    <Check className="w-3 h-3 text-white" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Full Preview Modal */}
            {previewFile && (
                <div 
                    className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
                    onClick={() => setPreviewFile(null)}
                >
                    <button 
                        className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20"
                        onClick={() => setPreviewFile(null)}
                    >
                        <X className="w-6 h-6 text-white" />
                    </button>
                    <div className="max-w-4xl max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
                        {previewFile.type === 'video' ? (
                            <video 
                                src={previewFile.previewUrl} 
                                className="max-w-full max-h-[80vh]"
                                controls
                                autoPlay
                            />
                        ) : (
                            <img 
                                src={previewFile.previewUrl} 
                                alt={previewFile.name}
                                className="max-w-full max-h-[80vh] object-contain"
                            />
                        )}
                        <div className="text-center mt-4">
                            <p className="text-white">{previewFile.name}</p>
                            <p className="text-white/50">{previewFile.size}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FileUpload;
