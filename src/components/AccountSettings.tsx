import { Pencil, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import Cropper from 'react-easy-crop';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import getCroppedImg from '../utils/cropImage';
import { Button } from "./ui/button";

interface AccountSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountUpdate?: () => void;
}

const AccountSettings = ({ isOpen, onClose, onAccountUpdate }: AccountSettingsProps) => {
  const { user } = useAuth();
  const [accountData, setAccountData] = useState<any>(null);
  const [newNickname, setNewNickname] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [showDefaultPicChooser, setShowDefaultPicChooser] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Daftar default profile pics
  const defaultProfilePics = [
    'https://keamzxefzypvbaxjyacv.supabase.co/storage/v1/object/public/profile-pics//default1.png',
    'https://keamzxefzypvbaxjyacv.supabase.co/storage/v1/object/public/profile-pics//default2.png',
    'https://keamzxefzypvbaxjyacv.supabase.co/storage/v1/object/public/profile-pics//default3.png',
    'https://keamzxefzypvbaxjyacv.supabase.co/storage/v1/object/public/profile-pics//default4.png',
  ];

  useEffect(() => {
    if (isOpen && user) {
      fetchAccountData();
    }
  }, [isOpen, user]);

  const fetchAccountData = async () => {
    if (!user) return;

    try {
      // Default data
      const defaultData = {
        full_name: 'User',
        nickname: 'Add your nickname',
        profile_pic: 'https://keamzxefzypvbaxjyacv.supabase.co/storage/v1/object/public/profile-pics//default.jfif'
      };

      // First try to get data from profiles
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      // Try to get data from account table
      const { data: accountData } = await supabase
        .from('account')
        .select('*')
        .eq('id', user.id)
        .single();

      const combinedData = {
        ...defaultData,
        ...(profileData || {}),
        ...(accountData || {}) // role akan ikut terisi dari sini
      };

      setAccountData(combinedData);
      setNewNickname(combinedData.nickname || '');
      setNewFullName(combinedData.full_name || '');
    } catch (error) {
      console.error('Error fetching account data:', error);
    }
  };

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    setSelectedImage(e.target.files[0]);
    setCropModalOpen(true);
  };

  const handleNicknameUpdate = async () => {
    if (!user || !newNickname.trim()) return;

    try {
      console.log("Updating nickname for user:", user.id);

      // Cek apakah row sudah ada
      const { data: existingAccount, error: checkError } = await supabase
        .from('account')
        .select('id')
        .eq('id', user.id)
        .single(); // <-- gunakan single agar hasilnya objek atau null

      if (existingAccount) {
        // Jika sudah ada, lakukan update
        const { error: updateError } = await supabase
          .from('account')
          .update({ nickname: newNickname.trim() })
          .eq('id', user.id);

        if (updateError) throw updateError;
      } else {
        // Jika belum ada, lakukan insert
        const { error: insertError } = await supabase
          .from('account')
          .insert({
            id: user.id,
            user_id: user.id,
            nickname: newNickname.trim(),
            profile_pic: accountData?.profile_pic || 'https://keamzxefzypvbaxjyacv.supabase.co/storage/v1/object/public/profile-pics//default.jfif'
          });

        if (insertError) throw insertError;
      }

      setAccountData({
        ...accountData,
        nickname: newNickname.trim()
      });

      if (onAccountUpdate) {
        onAccountUpdate();
      }

      toast.success('Nickname updated successfully');
    } catch (error) {
      console.error('Error updating nickname:', error);
      toast.error('Failed to update nickname: ' + (error.message || 'Unknown error'));
    }
  };

  const handleFullNameUpdate = async () => {
    if (!user || !newFullName.trim()) return;

    try {
      // Update di tabel account
      const { error: updateError } = await supabase
        .from('account')
        .update({ full_name: newFullName.trim() })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setAccountData({
        ...accountData,
        full_name: newFullName.trim()
      });

      if (onAccountUpdate) {
        onAccountUpdate();
      }

      toast.success('Full name updated successfully');
    } catch (error) {
      console.error('Error updating full name:', error);
      toast.error('Failed to update full name: ' + (error.message || 'Unknown error'));
    }
  };

  const onCropComplete = (croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const uploadCroppedImage = async (blob: Blob) => {
    if (!user) return;
    const fileExt = 'jpg';
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `profile-pics/${fileName}`;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const { error } = await supabase.storage
        .from('profile-pics')
        .upload(filePath, blob, {
          cacheControl: '3600',
          upsert: true,
        });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from('profile-pics')
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;

      const { error: updateError } = await supabase
        .from('account')
        .update({ 
          profile_pic: publicUrl,
          user_id: user.id
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setAccountData({
        ...accountData,
        profile_pic: publicUrl
      });

      if (onAccountUpdate) {
        onAccountUpdate();
      }

      toast.success('Profile picture updated successfully');
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      toast.error('Failed to update profile picture');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Tambahkan fungsi update gabungan
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

      setAccountData({
        ...accountData,
        ...updates
      });

      if (onAccountUpdate) {
        onAccountUpdate();
      }

      toast.success('Account updated successfully');
    } catch (error) {
      console.error('Error updating account:', error);
      toast.error('Failed to update account: ' + (error.message || 'Unknown error'));
    }
  };

  // Handler untuk memilih default profile pic
  const handleChooseDefaultPic = async (url: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('account')
        .update({ profile_pic: url, user_id: user.id })
        .eq('id', user.id);

      if (error) throw error;

      setAccountData({
        ...accountData,
        profile_pic: url
      });

      if (onAccountUpdate) {
        onAccountUpdate();
      }

      toast.success('Profile picture updated!');
    } catch (error) {
      toast.error('Failed to update profile picture');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
        <Button
          onClick={onClose}
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 p-1"
        >
          <X className="h-4 w-4" />
        </Button>
        
        <h3 className="text-lg font-semibold mb-4">Account Settings</h3>
        
        <div className="space-y-6">
          {/* Profile Picture Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Profile Picture</label>
            <div className="flex flex-col items-center">
              {/* Foto profil dengan icon pensil */}
              <div className="relative group w-24 h-24 mb-2">
                <img
                  src={accountData?.profile_pic || defaultProfilePics[0]}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover border-4 border-indigo-100 bg-indigo-50 cursor-pointer"
                  onClick={() => setShowDefaultPicChooser(true)}
                  onError={e => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = defaultProfilePics[0];
                  }}
                />
                {/* Icon pensil dari lucide-react */}
                <button
                  type="button"
                  className="absolute bottom-2 right-2 bg-white rounded-full p-1 shadow group-hover:opacity-100 opacity-0 transition-opacity"
                  onClick={e => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  title="Upload custom photo"
                >
                  <Pencil className="w-5 h-5 text-gray-700" />
                </button>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePictureChange}
                  ref={fileInputRef}
                  className="hidden"
                />
              </div>
              {/* Pilihan default profile */}
              <span className="text-xs text-gray-500 mb-2">Choose default profile</span>
              <div className="flex space-x-4 mb-4">
                {defaultProfilePics.map((url, idx) => (
                  <img
                    key={idx}
                    src={url}
                    alt={`Default ${idx + 1}`}
                    className={`w-16 h-16 rounded-full ring-2 cursor-pointer transition-all duration-150 ${accountData?.profile_pic === url ? 'ring-indigo-500' : 'ring-gray-200'} hover:ring-indigo-400`}
                    onClick={() => handleChooseDefaultPic(url)}
                  />
                ))}
              </div>
            </div>
          </div>
          
          {/* Nickname Section */}
          <div>
            <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-2">
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

          {/* Full Name Section */}
          <div>
            <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-2">
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

          {/* Single Update Button */}
          <Button
            onClick={handleUpdateAccount}
            disabled={
              (!newNickname.trim() || newNickname === accountData?.nickname) &&
              (!newFullName.trim() || newFullName === accountData?.full_name)
            }
            className="w-full mt-4"
          >
            Update
          </Button>
        </div>

        {cropModalOpen && selectedImage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
            <div className="bg-white rounded-lg p-4 w-[90vw] max-w-md relative flex flex-col items-center">
              {/* Container cropper dengan tinggi tetap */}
              <div style={{ position: 'relative', width: 250, height: 250, background: '#eee' }}>
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
              {/* Slider dan instruksi di bawah cropper */}
              <div className="mt-4 flex flex-col items-center w-full">
                <span className="text-xs text-gray-500 mb-2">Geser gambar untuk crop, gunakan slider untuk zoom</span>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-40"
                />
              </div>
              {/* Tombol di bawah slider */}
              <div className="flex justify-end mt-4 space-x-2 w-full">
                <Button onClick={() => setCropModalOpen(false)} variant="outline">Cancel</Button>
                <Button
                  onClick={async () => {
                    const croppedBlob = await getCroppedImg(
                      URL.createObjectURL(selectedImage),
                      croppedAreaPixels
                    );
                    await uploadCroppedImage(croppedBlob);
                    setCropModalOpen(false);
                    setSelectedImage(null);
                  }}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountSettings;