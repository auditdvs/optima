import { Pencil } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import Cropper from 'react-easy-crop';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Button } from "./ui/button";

const defaultProfilePics = [
  'https://keamzxefzypvbaxjyacv.supabase.co/storage/v1/object/public/profile-pics//default1.png',
  'https://keamzxefzypvbaxjyacv.supabase.co/storage/v1/object/public/profile-pics//default2.png',
  'https://keamzxefzypvbaxjyacv.supabase.co/storage/v1/object/public/profile-pics//default3.png',
  'https://keamzxefzypvbaxjyacv.supabase.co/storage/v1/object/public/profile-pics//default4.png',
];

const AccountSettings = ({
  isOpen,
  onClose,
  onAccountUpdate,
  isStandalone = false,
}) => {
  const { user } = useAuth();
  const [accountData, setAccountData] = useState<any>(null);
  const [newNickname, setNewNickname] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if ((isOpen || isStandalone) && user) fetchAccountData();
    // eslint-disable-next-line
  }, [isOpen, isStandalone, user]);

  const fetchAccountData = async () => {
    if (!user) return;
    try {
      const defaultData = {
        full_name: 'User',
        nickname: 'Add your nickname',
        profile_pic: defaultProfilePics[0],
      };
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      const { data: accountData } = await supabase
        .from('account')
        .select('*')
        .eq('id', user.id)
        .single();
      const combinedData = {
        ...defaultData,
        ...(profileData || {}),
        ...(accountData || {}),
      };
      setAccountData(combinedData);
      setNewNickname(combinedData.nickname || '');
      setNewFullName(combinedData.full_name || '');
    } catch (error) {
      toast.error('Failed to fetch account data');
    }
  };

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    setSelectedImage(e.target.files[0]);
    setCropModalOpen(true);
  };

  const handleChooseDefaultPic = async (url: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('account')
        .update({ profile_pic: url, user_id: user.id })
        .eq('id', user.id);
      if (error) throw error;
      setAccountData({ ...accountData, profile_pic: url });
      if (onAccountUpdate) onAccountUpdate();
      toast.success('Profile picture updated!');
    } catch {
      toast.error('Failed to update profile picture');
    }
  };

  const handleUpdateAccount = async () => {
    if (!user) return;
    if (
      (!newNickname.trim() || newNickname === accountData?.nickname) &&
      (!newFullName.trim() || newFullName === accountData?.full_name)
    ) {
      toast.error('No changes to update');
      return;
    }
    try {
      const updates: any = {};
      if (newNickname.trim() && newNickname !== accountData?.nickname) {
        updates.nickname = newNickname.trim();
      }
      if (newFullName.trim() && newFullName !== accountData?.full_name) {
        updates.full_name = newFullName.trim();
      }
      if (Object.keys(updates).length === 0) return;
      const { error } = await supabase
        .from('account')
        .update(updates)
        .eq('id', user.id);
      if (error) throw error;
      setAccountData({ ...accountData, ...updates });
      if (onAccountUpdate) onAccountUpdate();
      toast.success('Account updated successfully');
    } catch (error) {
      toast.error('Failed to update account');
    }
  };

  const onCropComplete = (croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const getCroppedImg = async (imageSrc: string, pixelCrop: any): Promise<Blob> => {
    const image = new window.Image();
    image.src = imageSrc;
    return new Promise((resolve, reject) => {
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('No canvas context'));
        canvas.width = pixelCrop.width;
        canvas.height = pixelCrop.height;
        ctx.drawImage(
          image,
          pixelCrop.x,
          pixelCrop.y,
          pixelCrop.width,
          pixelCrop.height,
          0,
          0,
          pixelCrop.width,
          pixelCrop.height
        );
        canvas.toBlob((blob) => {
          if (!blob) return reject(new Error('Canvas is empty'));
          resolve(blob);
        }, 'image/jpeg');
      };
      image.onerror = () => reject(new Error('Error loading image'));
    });
  };

  const uploadCroppedImage = async (blob: Blob) => {
    if (!user) return;
    const fileName = `${user.id}-${Date.now()}.jpg`;
    const filePath = `profile-pics/${fileName}`;
    try {
      const { error } = await supabase.storage
        .from('profile-pics')
        .upload(filePath, blob, { cacheControl: '3600', upsert: true });
      if (error) throw error;
      const { data: publicUrlData } = supabase.storage
        .from('profile-pics')
        .getPublicUrl(filePath);
      const publicUrl = publicUrlData.publicUrl;
      const { error: updateError } = await supabase
        .from('account')
        .update({ profile_pic: publicUrl, user_id: user.id })
        .eq('id', user.id);
      if (updateError) throw updateError;
      setAccountData({ ...accountData, profile_pic: publicUrl });
      if (onAccountUpdate) onAccountUpdate();
      toast.success('Profile picture updated successfully');
    } catch {
      toast.error('Failed to update profile picture');
    }
  };

  if (!isOpen && !isStandalone) return null;

  return (
    <div className="h-full flex items-center w-full">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-8 py-12 w-full max-w-[600px] min-h-[600px] flex flex-col items-center">
        <h1 className="text-2xl font-bold mb-3 mt-0 w-full text-center">Profile Settings</h1>
        <div className="flex flex-col items-center w-full max-w-md mx-auto">
          {/* Foto profil */}
          <div className="relative group w-40 h-40 mb-2">
            <img
              src={accountData?.profile_pic || defaultProfilePics[0]}
              alt="Profile"
              className="w-40 h-40 rounded-full object-cover border-4 border-indigo-100 bg-indigo-50"
              onClick={() => fileInputRef.current?.click()}
              onError={e => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = defaultProfilePics[0];
              }}
            />
            <button
              type="button"
              className="absolute bottom-3 right-3 bg-white rounded-full p-1 shadow"
              onClick={e => {
          e.stopPropagation();
          fileInputRef.current?.click();
              }}
              title="Upload custom photo"
            >
              <Pencil className="w-6 h-6 text-gray-700" />
            </button>
            <input
              type="file"
              accept="image/*"
              onChange={handleProfilePictureChange}
              ref={fileInputRef}
              className="hidden"
            />
          </div>
          <span className="text-xl text-gray-500 mb-4">Choose default profile</span>
          <div className="flex justify-center space-x-3 mb-6 w-full">
            {defaultProfilePics.map((url, idx) => (
              <img
              key={idx}
              src={url}
              alt={`Default ${idx + 1}`}
              className={`w-24 h-24 rounded-full ring-2 cursor-pointer transition-all duration-150 ${accountData?.profile_pic === url ? 'ring-indigo-500' : 'ring-gray-200'} hover:ring-indigo-400`}
              onClick={() => handleChooseDefaultPic(url)}
              />
            ))}
            </div>
          {/* Form container */}
          <div className="w-full max-w-md mx-auto flex flex-col items-center">
            {/* Nickname */}
            <div className="w-full mb-4">
              <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-1">
                Nickname
              </label>
              <input
                type="text"
                id="nickname"
                value={newNickname}
                onChange={(e) => setNewNickname(e.target.value)}
                placeholder="Enter nickname"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            {/* Full Name */}
            <div className="w-full mb-6">
              <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                id="full_name"
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
                placeholder="Enter full name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <Button
              onClick={handleUpdateAccount}
              disabled={
                (!newNickname.trim() || newNickname === accountData?.nickname) &&
                (!newFullName.trim() || newFullName === accountData?.full_name)
              }
              className="w-full py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Update Profile
            </Button>
          </div>
        </div>
        {/* Crop Modal tetap di sini */}
        {cropModalOpen && selectedImage && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-60">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-semibold mb-4">Crop Profile Picture</h2>
              <div className="relative h-64 w-full mb-4">
                <Cropper
                  image={URL.createObjectURL(selectedImage)}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              </div>
              <div className="mb-4">
                <label htmlFor="zoom" className="block text-sm font-medium text-gray-700 mb-1">
                  Zoom: {zoom.toFixed(1)}x
                </label>
                <input
                  id="zoom"
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setCropModalOpen(false);
                    setSelectedImage(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      const croppedImage = await getCroppedImg(
                        URL.createObjectURL(selectedImage),
                        croppedAreaPixels
                      );
                      await uploadCroppedImage(croppedImage);
                      setCropModalOpen(false);
                      setSelectedImage(null);
                    } catch (error) {
                      toast.error("Error cropping/uploading image");
                    }
                  }}
                  className="px-4 py-2 bg-indigo-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-indigo-700"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Kanan: Statistik/Chart (slot, bisa isi <AuditStats />) */}
      <div className="col-span-2 flex flex-col gap-6">
        {/* Tempatkan komponen statistik di sini, misal: */}
        {/* <AuditStats /> */}
      </div>
    </div>
  );
};

export default AccountSettings;