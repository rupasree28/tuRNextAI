/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { UserIcon, LogoutIcon, EditIcon } from './icons';
// @ts-ignore - using esm.sh import
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from 'react-image-crop';
// import 'react-image-crop/dist/ReactCrop.css'; // This line was causing a fatal error and has been removed.

type EditableField = 'username' | 'email' | 'bio';

interface ProfileScreenProps {
    user: User;
    onLogout: () => void;
    onUpdateProfile: (updatedData: Partial<Omit<User, 'id'>>) => void;
    onBack: () => void;
}

// Helper function to generate a cropped image from a canvas
function getCroppedImg(
    image: HTMLImageElement,
    crop: Crop,
): Promise<string> {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    // Ensure width and height are numbers
    const cropWidth = crop.width || 0;
    const cropHeight = crop.height || 0;

    canvas.width = cropWidth;
    canvas.height = cropHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        return Promise.reject(new Error('Canvas context is not available.'));
    }

    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = cropWidth * pixelRatio;
    canvas.height = cropHeight * pixelRatio;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
        image,
        (crop.x || 0) * scaleX,
        (crop.y || 0) * scaleY,
        cropWidth * scaleX,
        cropHeight * scaleY,
        0,
        0,
        cropWidth,
        cropHeight
    );

    return new Promise((resolve) => {
        resolve(canvas.toDataURL('image/jpeg'));
    });
}


const ProfileScreen: React.FC<ProfileScreenProps> = ({ user, onLogout, onUpdateProfile, onBack }) => {
    const [editingField, setEditingField] = useState<EditableField | null>(null);
    const [formData, setFormData] = useState({
        username: user.username,
        email: user.email,
        bio: user.bio || '',
    });
    const [errors, setErrors] = useState<{ [key in EditableField]?: string }>({});

    // State for image cropping
    const [imgSrc, setImgSrc] = useState<string>('');
    const [crop, setCrop] = useState<Crop>();
    const [completedCrop, setCompletedCrop] = useState<Crop | null>(null);
    const [isCropping, setIsCropping] = useState(false);
    const imageRef = useRef<HTMLImageElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // Reset form data if the user prop changes
    useEffect(() => {
        setFormData({
            username: user.username,
            email: user.email,
            bio: user.bio || '',
        });
    }, [user]);

    const handleEdit = (field: EditableField) => {
        // Reset form data to current user state before editing
        setFormData({
            username: user.username,
            email: user.email,
            bio: user.bio || '',
        });
        setEditingField(field);
        setErrors({}); // Clear errors when starting an edit
    };

    const handleCancel = () => {
        setEditingField(null);
        setErrors({}); // Clear errors on cancel
    };

    const handleSave = () => {
        if (!editingField) return;
        
        // --- Validation Logic ---
        const value = formData[editingField];
        let error = '';

        if (editingField === 'username') {
            if (!value.trim()) {
                error = 'Username cannot be empty.';
            } else if (value.length < 3 || value.length > 20) {
                error = 'Username must be between 3 and 20 characters.';
            } else if (!/^[a-zA-Z0-9_]+$/.test(value)) {
                error = 'Username can only contain letters, numbers, and underscores.';
            }
        } else if (editingField === 'email') {
            if (!value.trim()) {
                error = 'Email cannot be empty.';
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                error = 'Please enter a valid email address.';
            }
        } else if (editingField === 'bio') {
            if (value.length > 200) {
                error = 'Bio cannot exceed 200 characters.';
            }
        }
        
        if (error) {
            setErrors({ [editingField]: error });
            return;
        }

        // --- If validation passes ---
        onUpdateProfile({ [editingField]: value });
        setEditingField(null);
        setErrors({});
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setCrop(undefined); // Makes crop preview update between images.
            const reader = new FileReader();
            reader.addEventListener('load', () =>
                setImgSrc(reader.result?.toString() || '')
            );
            reader.readAsDataURL(e.target.files[0]);
            setIsCropping(true);
        }
    };

    const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        imageRef.current = e.currentTarget;
        const { width, height } = e.currentTarget;
        const crop = centerCrop(
            makeAspectCrop(
                {
                    unit: '%',
                    width: 90,
                },
                1, // Aspect ratio 1:1
                width,
                height
            ),
            width,
            height
        );
        setCrop(crop);
        setCompletedCrop(crop);
    };

    const handleSaveCrop = async () => {
        if (completedCrop && imageRef.current) {
            try {
                const croppedImageUrl = await getCroppedImg(imageRef.current, completedCrop);
                onUpdateProfile({ picture: croppedImageUrl });
                setIsCropping(false);
                setImgSrc('');
            } catch (e) {
                console.error(e);
            }
        }
    };

    const renderField = (field: EditableField, label: string, type: 'text' | 'textarea' = 'text') => {
        const isEditing = editingField === field;
        const value = (field === 'bio' ? user.bio : user[field]) || '';

        return (
            <div>
                <label className="block text-sm font-medium text-gray-500">{label}</label>
                {isEditing ? (
                    <div className="mt-1">
                        {type === 'textarea' ? (
                            <textarea
                                value={formData[field]}
                                onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                                rows={3}
                                className="w-full p-2 border border-pink-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500"
                            />
                        ) : (
                            <input
                                type={type}
                                value={formData[field]}
                                onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                                className="w-full p-2 border border-pink-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500"
                            />
                        )}
                        {errors[field] && <p className="text-red-500 text-xs mt-1">{errors[field]}</p>}
                        <div className="flex gap-2 mt-2">
                            <button onClick={handleSave} className="bg-pink-500 text-white font-semibold py-1 px-3 rounded-md hover:bg-pink-600 transition">Save</button>
                            <button onClick={handleCancel} className="bg-gray-200 text-gray-700 font-semibold py-1 px-3 rounded-md hover:bg-gray-300 transition">Cancel</button>
                        </div>
                    </div>
                ) : (
                    <div className="flex justify-between items-center mt-1">
                        <p className="text-gray-800 text-lg truncate">{field === 'bio' && !value ? <span className="italic text-gray-400">No bio yet.</span> : value}</p>
                        <button onClick={() => handleEdit(field)} className="text-gray-400 hover:text-pink-500 p-1 rounded-full">
                            <EditIcon className="w-5 h-5" />
                        </button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="w-full max-w-2xl animate-fade-in self-start mt-24">
            <button onClick={onBack} className="flex items-center text-gray-200 font-semibold hover:text-white mb-4 transition-colors opacity-80 hover:opacity-100">
                &larr; Back
            </button>
            <div className="bg-white/90 backdrop-blur-sm p-8 rounded-3xl shadow-2xl w-full border border-white/20">
                <h1 className="text-4xl font-bold text-pink-500 mb-6">Profile</h1>

                {isCropping ? (
                    <div className="space-y-4">
                        <h2 className="text-xl font-semibold text-gray-700">Crop Your New Photo</h2>
                        {imgSrc && (
                            <ReactCrop
                                crop={crop}
                                onChange={(_, percentCrop) => setCrop(percentCrop)}
                                onComplete={(c) => setCompletedCrop(c)}
                                aspect={1}
                            >
                                <img
                                    ref={imageRef}
                                    alt="Crop me"
                                    src={imgSrc}
                                    onLoad={onImageLoad}
                                    className="max-h-[50vh] object-contain"
                                />
                            </ReactCrop>
                        )}
                        <div className="flex gap-2">
                            <button onClick={handleSaveCrop} className="bg-pink-500 text-white font-semibold py-2 px-4 rounded-md hover:bg-pink-600 transition">Save Photo</button>
                            <button onClick={() => setIsCropping(false)} className="bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-md hover:bg-gray-300 transition">Cancel</button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="flex items-center gap-6">
                            <div className="relative">
                                {user.picture ? (
                                    <img src={user.picture} alt="Profile" className="w-24 h-24 rounded-full object-cover" />
                                ) : (
                                    <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
                                        <UserIcon className="w-12 h-12 text-gray-400" />
                                    </div>
                                )}
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute bottom-0 right-0 bg-white p-1.5 rounded-full shadow-md hover:bg-pink-100 transition"
                                    title="Change profile picture"
                                >
                                    <EditIcon className="w-5 h-5 text-pink-500" />
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                    accept="image/*"
                                    className="hidden"
                                />
                            </div>
                            <div>
                                <h2 className="text-3xl font-bold text-gray-800">{user.name || user.username}</h2>
                                <p className="text-gray-500">@{user.username}</p>
                            </div>
                        </div>
                        
                        <hr className="border-pink-100"/>
                        
                        <div className="space-y-4">
                            {renderField('username', 'Username')}
                            {user.googleId ? (
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">Email</label>
                                    <p className="text-gray-500 text-lg mt-1">{user.email} (Managed by Google)</p>
                                </div>
                            ) : renderField('email', 'Email')}
                            {renderField('bio', 'Bio', 'textarea')}
                        </div>

                        <hr className="border-pink-100"/>
                        
                        <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 font-semibold py-3 px-4 border border-red-200 rounded-xl hover:bg-red-100 transition">
                            <LogoutIcon className="w-6 h-6" />
                            Logout
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProfileScreen;