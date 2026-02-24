import React, { useState, useRef, useCallback } from 'react';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { X, Check, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from './ui/dialog';

export const ImageCropper = ({ 
    open, 
    onClose, 
    onSave, 
    aspectRatio = 1, // 1 for square avatar
    title = "Crop Image"
}) => {
    const [imageSrc, setImageSrc] = useState(null);
    const [crop, setCrop] = useState({
        unit: '%',
        width: 80,
        aspect: aspectRatio
    });
    const [completedCrop, setCompletedCrop] = useState(null);
    const [scale, setScale] = useState(1);
    const [rotate, setRotate] = useState(0);
    const imgRef = useRef(null);
    const inputRef = useRef(null);

    const onSelectFile = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                setImageSrc(reader.result);
                setScale(1);
                setRotate(0);
            });
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const onImageLoad = useCallback((e) => {
        const { width, height } = e.currentTarget;
        const cropSize = Math.min(width, height) * 0.8;
        const centerX = (width - cropSize) / 2;
        const centerY = (height - cropSize) / 2;
        
        setCrop({
            unit: 'px',
            width: cropSize,
            height: cropSize,
            x: centerX,
            y: centerY
        });
    }, []);

    const getCroppedImg = useCallback(async () => {
        if (!imgRef.current || !completedCrop) return null;

        const image = imgRef.current;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        const scaleX = image.naturalWidth / image.width;
        const scaleY = image.naturalHeight / image.height;

        const pixelRatio = window.devicePixelRatio || 1;
        
        canvas.width = completedCrop.width * scaleX * pixelRatio;
        canvas.height = completedCrop.height * scaleY * pixelRatio;

        ctx.scale(pixelRatio, pixelRatio);
        ctx.imageSmoothingQuality = 'high';

        const cropX = completedCrop.x * scaleX;
        const cropY = completedCrop.y * scaleY;
        const cropWidth = completedCrop.width * scaleX;
        const cropHeight = completedCrop.height * scaleY;

        // Apply rotation
        const centerX = canvas.width / (2 * pixelRatio);
        const centerY = canvas.height / (2 * pixelRatio);
        
        ctx.translate(centerX, centerY);
        ctx.rotate((rotate * Math.PI) / 180);
        ctx.scale(scale, scale);
        ctx.translate(-centerX, -centerY);

        ctx.drawImage(
            image,
            cropX,
            cropY,
            cropWidth,
            cropHeight,
            0,
            0,
            cropWidth,
            cropHeight
        );

        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                resolve(blob);
            }, 'image/jpeg', 0.9);
        });
    }, [completedCrop, scale, rotate]);

    const handleSave = async () => {
        const croppedBlob = await getCroppedImg();
        if (croppedBlob) {
            onSave(croppedBlob);
            handleClose();
        }
    };

    const handleClose = () => {
        setImageSrc(null);
        setCrop({ unit: '%', width: 80, aspect: aspectRatio });
        setCompletedCrop(null);
        setScale(1);
        setRotate(0);
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="bg-obsidian border-white/10 max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="font-heading gold-text">{title}</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4 mt-4">
                    {!imageSrc ? (
                        <div 
                            className="border-2 border-dashed border-white/20 rounded-lg p-8 text-center cursor-pointer hover:border-gold/50 transition-colors"
                            onClick={() => inputRef.current?.click()}
                            data-testid="image-select-area"
                        >
                            <p className="text-white/70 mb-2">Click to select an image</p>
                            <p className="text-white/40 text-sm">JPG, PNG up to 10MB</p>
                            <input
                                ref={inputRef}
                                type="file"
                                accept="image/*"
                                onChange={onSelectFile}
                                className="hidden"
                            />
                        </div>
                    ) : (
                        <>
                            <div className="relative bg-black rounded-lg overflow-hidden" style={{ maxHeight: '400px' }}>
                                <ReactCrop
                                    crop={crop}
                                    onChange={(c) => setCrop(c)}
                                    onComplete={(c) => setCompletedCrop(c)}
                                    aspect={aspectRatio}
                                    circularCrop={aspectRatio === 1}
                                >
                                    <img
                                        ref={imgRef}
                                        src={imageSrc}
                                        alt="Crop preview"
                                        onLoad={onImageLoad}
                                        style={{
                                            maxHeight: '400px',
                                            transform: `scale(${scale}) rotate(${rotate}deg)`
                                        }}
                                    />
                                </ReactCrop>
                            </div>

                            {/* Controls */}
                            <div className="flex items-center justify-center gap-4">
                                <button
                                    onClick={() => setScale(s => Math.max(0.5, s - 0.1))}
                                    className="p-2 bg-white/10 rounded hover:bg-white/20 transition-colors"
                                    title="Zoom Out"
                                >
                                    <ZoomOut className="w-5 h-5 text-white" />
                                </button>
                                <span className="text-white/50 text-sm w-16 text-center">
                                    {Math.round(scale * 100)}%
                                </span>
                                <button
                                    onClick={() => setScale(s => Math.min(3, s + 0.1))}
                                    className="p-2 bg-white/10 rounded hover:bg-white/20 transition-colors"
                                    title="Zoom In"
                                >
                                    <ZoomIn className="w-5 h-5 text-white" />
                                </button>
                                <button
                                    onClick={() => setRotate(r => (r + 90) % 360)}
                                    className="p-2 bg-white/10 rounded hover:bg-white/20 transition-colors"
                                    title="Rotate"
                                >
                                    <RotateCw className="w-5 h-5 text-white" />
                                </button>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3">
                                <button
                                    onClick={handleClose}
                                    className="flex-1 py-3 btn-secondary flex items-center justify-center gap-2"
                                >
                                    <X className="w-5 h-5" />
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="flex-1 py-3 gold-btn flex items-center justify-center gap-2"
                                    data-testid="save-crop-btn"
                                >
                                    <Check className="w-5 h-5" />
                                    Save
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ImageCropper;
