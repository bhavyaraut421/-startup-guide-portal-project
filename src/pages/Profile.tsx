import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import {
  User,
  Lightbulb,
  BookOpen,
  Settings,
  Camera,
  Trash2,
  ArrowRight,
  FileText,
  CheckCircle2,
  ExternalLink,
  X,
  Loader2
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

type Tab = 'profile' | 'ideas' | 'schemes' | 'settings';

type IdeaItem = {
  id: string;
  title: string;
  description: string;
  date: string;
  tagline?: string;
  estimatedCost?: string;
  firstStep?: string;
};

type SchemeItem = {
  id: string;
  title: string;
  agency: string;
  status: string;
  schemeId?: string;
  date?: string;
};

export default function Profile() {
  const { user, token, login } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const initialTab = (searchParams.get('tab') as Tab) || 'profile';

  const [activeTab, setActiveTab] = useState<Tab>(
    ['profile', 'ideas', 'schemes', 'settings'].includes(initialTab)
      ? initialTab
      : 'profile'
  );

  const [ideas, setIdeas] = useState<IdeaItem[]>([]);
  const [schemes, setSchemes] = useState<SchemeItem[]>([]);
  const [toast, setToast] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);
  const [isDeletingPicture, setIsDeletingPicture] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deletingIdeaId, setDeletingIdeaId] = useState<string | null>(null);
  const [deletingSchemeId, setDeletingSchemeId] = useState<string | null>(null);

  const [selectedIdea, setSelectedIdea] = useState<IdeaItem | null>(null);
  const [selectedScheme, setSelectedScheme] = useState<SchemeItem | null>(null);

  const [profile, setProfile] = useState({
    name: '',
    email: '',
    stage: '',
    bio: '',
    profilePicture: '',
  });

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') as Tab | null;
    if (tabFromUrl && ['profile', 'ideas', 'schemes', 'settings'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    if (user) {
      setProfile({
        name: user.name || '',
        email: user.email || '',
        stage: user.stage || '',
        bio: user.bio || '',
        profilePicture: user.profilePicture || '',
      });
    }
  }, [user]);

  useEffect(() => {
    const fetchIdeas = async () => {
      if (!token) return;

      try {
        const res = await fetch('/api/my-ideas', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || 'Failed to load ideas');
        }

        const formattedIdeas = (data.ideas || []).map((idea: any) => ({
          id: String(idea.id),
          title: idea.title,
          description: idea.description,
          date: new Date(idea.created_at).toLocaleDateString(),
          tagline: idea.tagline || '',
          estimatedCost: idea.estimated_cost || '',
          firstStep: idea.first_step || '',
        }));

        setIdeas(formattedIdeas);
      } catch (error) {
        console.error('Failed to fetch ideas:', error);
      }
    };

    fetchIdeas();
  }, [token]);

  useEffect(() => {
    const fetchSchemes = async () => {
      if (!token) return;

      try {
        const res = await fetch('/api/my-schemes', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || 'Failed to load schemes');
        }

        const formattedSchemes = (data.schemes || []).map((scheme: any) => ({
          id: String(scheme.id),
          title: scheme.scheme_name || scheme.scheme_id,
          agency: scheme.offered_by || 'Government Portal',
          status: 'Saved',
          schemeId: scheme.scheme_id,
          date: scheme.created_at ? new Date(scheme.created_at).toLocaleDateString() : '',
        }));

        setSchemes(formattedSchemes);
      } catch (error) {
        console.error('Failed to fetch schemes:', error);
      }
    };

    fetchSchemes();
  }, [token]);

  const changeTab = (tab: Tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const convertFileToBase64 = (file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();

      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert image'));
        }
      };

      reader.onerror = () => reject(new Error('Failed to read image'));
      reader.readAsDataURL(file);
    });
  };

  const handleChoosePicture = () => {
    fileInputRef.current?.click();
  };

  const handleProfilePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!token) {
      showToast('Please login again');
      return;
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showToast('Please upload PNG, JPG, JPEG or WEBP image');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast('Image size must be less than 2MB');
      return;
    }

    try {
      setIsUploadingPicture(true);

      const base64Image = await convertFileToBase64(file);

      const res = await fetch('/api/upload-profile-picture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          imageData: base64Image,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to upload profile picture');
      }

      const newProfilePicture = data.imageUrl || '';

      setProfile((prev) => ({
        ...prev,
        profilePicture: newProfilePicture,
      }));

      if (login && user) {
        login(token, {
          ...user,
          profilePicture: newProfilePicture,
        });
      }

      showToast('Profile picture uploaded successfully');
    } catch (error: any) {
      console.error('Upload profile picture error:', error);
      showToast(error.message || 'Failed to upload profile picture');
    } finally {
      setIsUploadingPicture(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteProfilePicture = async () => {
    if (!token) {
      showToast('Please login again');
      return;
    }

    if (!profile.profilePicture) {
      showToast('No profile picture to delete');
      return;
    }

    const confirmed = window.confirm('Are you sure you want to delete your profile picture?');
    if (!confirmed) return;

    try {
      setIsDeletingPicture(true);

      const res = await fetch('/api/delete-profile-picture', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to delete profile picture');
      }

      setProfile((prev) => ({
        ...prev,
        profilePicture: '',
      }));

      if (login && user) {
        login(token, {
          ...user,
          profilePicture: '',
        });
      }

      showToast('Profile picture deleted successfully');
    } catch (error: any) {
      console.error('Delete profile picture error:', error);
      showToast(error.message || 'Failed to delete profile picture');
    } finally {
      setIsDeletingPicture(false);
    }
  };

  const handleDeleteIdea = async (id: string) => {
    if (!token) {
      showToast('Please login again');
      return;
    }

    try {
      setDeletingIdeaId(id);

      const res = await fetch(`/api/delete-idea/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to delete idea');
      }

      setIdeas((prev) => prev.filter((i) => i.id !== id));

      if (selectedIdea?.id === id) {
        setSelectedIdea(null);
      }

      showToast('Idea deleted successfully');
    } catch (error: any) {
      console.error('Delete idea error:', error);
      showToast(error.message || 'Failed to delete idea');
    } finally {
      setDeletingIdeaId(null);
    }
  };

  const handleDeleteScheme = async (id: string) => {
    if (!token) {
      showToast('Please login again');
      return;
    }

    try {
      setDeletingSchemeId(id);

      const res = await fetch(`/api/delete-scheme/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to remove scheme');
      }

      setSchemes((prev) => prev.filter((s) => s.id !== id));

      if (selectedScheme?.id === id) {
        setSelectedScheme(null);
      }

      showToast('Scheme removed successfully');
    } catch (error: any) {
      console.error('Delete scheme error:', error);
      showToast(error.message || 'Failed to remove scheme');
    } finally {
      setDeletingSchemeId(null);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      showToast('Please login again');
      return;
    }

    try {
      setIsSavingProfile(true);

      const res = await fetch('/api/update-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: profile.name,
          email: profile.email,
          stage: profile.stage,
          bio: profile.bio,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to update profile');
      }

      if (login && user) {
        login(token, {
          ...user,
          name: data.user?.name ?? profile.name,
          email: data.user?.email ?? profile.email,
          stage: data.user?.stage ?? profile.stage,
          bio: data.user?.bio ?? profile.bio,
          profilePicture: data.user?.profilePicture ?? profile.profilePicture,
        });
      }

      setProfile((prev) => ({
        ...prev,
        name: data.user?.name ?? prev.name,
        email: data.user?.email ?? prev.email,
        stage: data.user?.stage ?? prev.stage,
        bio: data.user?.bio ?? prev.bio,
        profilePicture: data.user?.profilePicture ?? prev.profilePicture,
      }));

      showToast('Profile updated successfully');
    } catch (error: any) {
      console.error('Update profile error:', error);
      showToast(error.message || 'Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!token) {
      showToast('Please login again');
      return;
    }

    const confirmed = window.confirm(
      'Are you sure you want to permanently delete your account? This action cannot be undone.'
    );

    if (!confirmed) return;

    try {
      setIsDeletingAccount(true);

      const res = await fetch('/api/delete-account', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to delete account');
      }

      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');

      showToast('Account deleted successfully');

      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    } catch (error: any) {
      console.error('Delete account error:', error);
      showToast(error.message || 'Failed to delete account');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Eligible':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Interested':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Applied':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Saved':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile Info', icon: <User className="w-4 h-4 mr-2" /> },
    { id: 'ideas', label: 'My Saved Ideas', icon: <Lightbulb className="w-4 h-4 mr-2" /> },
    { id: 'schemes', label: 'My Saved Schemes', icon: <BookOpen className="w-4 h-4 mr-2" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4 mr-2" /> },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className="fixed bottom-8 left-1/2 z-50 flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="font-medium">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedIdea && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/40 z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedIdea(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 20 }}
              className="fixed left-1/2 top-1/2 z-50 w-[95%] max-w-2xl -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl border border-slate-200"
            >
              <div className="flex items-start justify-between p-6 border-b border-slate-100">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">{selectedIdea.title}</h3>
                  <p className="text-sm text-emerald-600 mt-1">
                    {selectedIdea.tagline || 'Saved business idea'}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedIdea(null)}
                  className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <h4 className="text-sm font-semibold text-slate-500 mb-2">Description</h4>
                  <p className="text-slate-700 leading-relaxed">{selectedIdea.description}</p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <h4 className="text-sm font-semibold text-slate-500 mb-2">Estimated Cost</h4>
                    <p className="text-slate-900 font-medium">
                      {selectedIdea.estimatedCost || 'Not available'}
                    </p>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <h4 className="text-sm font-semibold text-slate-500 mb-2">Saved On</h4>
                    <p className="text-slate-900 font-medium">{selectedIdea.date}</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-slate-500 mb-2">First Step</h4>
                  <p className="text-slate-700">{selectedIdea.firstStep || 'Not available'}</p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedScheme && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/40 z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedScheme(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 20 }}
              className="fixed left-1/2 top-1/2 z-50 w-[95%] max-w-2xl -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl border border-slate-200"
            >
              <div className="flex items-start justify-between p-6 border-b border-slate-100">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">{selectedScheme.title}</h3>
                  <p className="text-sm text-slate-500 mt-1">{selectedScheme.agency}</p>
                </div>
                <button
                  onClick={() => setSelectedScheme(null)}
                  className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <h4 className="text-sm font-semibold text-slate-500 mb-2">Scheme ID</h4>
                    <p className="text-slate-900 font-medium">
                      {selectedScheme.schemeId || 'Not available'}
                    </p>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <h4 className="text-sm font-semibold text-slate-500 mb-2">Saved On</h4>
                    <p className="text-slate-900 font-medium">
                      {selectedScheme.date || 'Not available'}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-slate-500 mb-2">Status</h4>
                  <span
                    className={`px-3 py-1 text-xs font-bold rounded-full border ${getStatusColor(
                      selectedScheme.status
                    )}`}
                  >
                    {selectedScheme.status}
                  </span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row gap-8">
        <div className="md:w-64 shrink-0">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sticky top-24">
            <div className="flex items-center gap-3 mb-6 px-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xl shrink-0 overflow-hidden">
                {profile.profilePicture ? (
                  <img
                    src={profile.profilePicture}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  profile.name ? profile.name.charAt(0).toUpperCase() : 'U'
                )}
              </div>
              <div className="overflow-hidden">
                <h2 className="font-bold text-slate-900 truncate">{profile.name || 'User'}</h2>
                <p className="text-sm text-slate-500 truncate">{profile.email || 'No email'}</p>
              </div>
            </div>

            <nav className="flex md:flex-col overflow-x-auto md:overflow-visible gap-1 pb-2 md:pb-0 hide-scrollbar">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => changeTab(tab.id as Tab)}
                  className={`flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        <div className="flex-1">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 min-h-[500px]">
            {activeTab === 'profile' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Profile Information</h2>
                  <p className="text-slate-500 mt-1">Update your personal details and startup stage.</p>
                </div>

                <div className="flex items-center gap-6 flex-wrap">
                  <div
                    className="relative group cursor-pointer"
                    onClick={handleChoosePicture}
                    title="Upload profile picture"
                  >
                    <div className="w-24 h-24 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden group-hover:border-emerald-500 transition-colors">
                      {profile.profilePicture ? (
                        <img
                          src={profile.profilePicture}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-10 h-10 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                      )}
                    </div>

                    <div className="absolute bottom-0 right-0 bg-white border border-slate-200 p-1.5 rounded-full shadow-sm text-slate-600 group-hover:text-emerald-600 transition-colors">
                      {isUploadingPicture ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Camera className="w-4 h-4" />
                      )}
                    </div>
                  </div>

                  <div className="flex-1">
                    <h3 className="font-medium text-slate-900">Profile Picture</h3>
                    <p className="text-sm text-slate-500 mt-1">
                      PNG, JPG, JPEG or WEBP. Max size 2MB.
                    </p>

                    <div className="flex gap-3 mt-4 flex-wrap">
                      <button
                        type="button"
                        onClick={handleChoosePicture}
                        disabled={isUploadingPicture}
                        className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-70"
                      >
                        {isUploadingPicture ? 'Uploading...' : 'Upload Picture'}
                      </button>

                      {profile.profilePicture && (
                        <button
                          type="button"
                          onClick={handleDeleteProfilePicture}
                          disabled={isDeletingPicture}
                          className="px-4 py-2 bg-white border border-red-200 text-red-600 font-medium rounded-lg hover:bg-red-50 transition-colors disabled:opacity-70"
                        >
                          {isDeletingPicture ? 'Deleting...' : 'Delete Picture'}
                        </button>
                      )}
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      className="hidden"
                      onChange={handleProfilePictureUpload}
                    />
                  </div>
                </div>

                <form onSubmit={handleProfileUpdate} className="space-y-6 max-w-2xl">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Full Name</label>
                      <input
                        type="text"
                        value={profile.name}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
                      <input
                        type="email"
                        value={profile.email}
                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Startup Stage</label>
                    <select
                      value={profile.stage}
                      onChange={(e) => setProfile({ ...profile, stage: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-colors appearance-none"
                    >
                      <option value="Just Exploring">Just Exploring</option>
                      <option value="Ideation">Ideation</option>
                      <option value="MVP">MVP (Minimum Viable Product)</option>
                      <option value="Scaling">Scaling</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Bio</label>
                    <textarea
                      rows={4}
                      value={profile.bio}
                      onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-colors resize-none"
                    />
                  </div>

                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className="px-6 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-70"
                    >
                      {isSavingProfile ? 'Updating...' : 'Update Profile'}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {activeTab === 'ideas' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">My Saved Ideas</h2>
                  <p className="text-slate-500 mt-1">Review and manage your generated business concepts.</p>
                </div>

                {ideas.length > 0 ? (
                  <div className="grid gap-4">
                    {ideas.map((idea) => (
                      <div
                        key={idea.id}
                        className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center group hover:border-emerald-200 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-bold text-slate-900">{idea.title}</h3>
                            <span className="text-xs text-slate-400 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                              {idea.date}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 line-clamp-2">{idea.description}</p>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <button
                            onClick={() => setSelectedIdea(idea)}
                            className="flex-1 sm:flex-none px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 hover:text-emerald-600 transition-colors flex items-center justify-center"
                          >
                            <FileText className="w-4 h-4 mr-2" /> View Plan
                          </button>
                          <button
                            onClick={() => handleDeleteIdea(idea.id)}
                            disabled={deletingIdeaId === idea.id}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100 disabled:opacity-60"
                            title="Delete Idea"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 px-6 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                    <Lightbulb className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                    <h3 className="text-lg font-bold text-slate-900">No saved ideas yet</h3>
                    <p className="mt-2 text-slate-500 max-w-sm mx-auto mb-6">
                      You haven't saved any business ideas to your profile. Head over to the generator to get started.
                    </p>
                    <Link
                      to="/idea-generator"
                      className="inline-flex items-center px-6 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-colors shadow-sm"
                    >
                      Generate your first idea now! <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'schemes' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">My Saved Schemes</h2>
                  <p className="text-slate-500 mt-1">Track the government initiatives you are interested in.</p>
                </div>

                {schemes.length > 0 ? (
                  <div className="grid gap-4">
                    {schemes.map((scheme) => (
                      <div
                        key={scheme.id}
                        className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div>
                          <h3 className="font-bold text-slate-900 text-lg">{scheme.title}</h3>
                          <p className="text-sm text-slate-500 mt-1">Agency: {scheme.agency}</p>
                        </div>
                        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                          <span className={`px-3 py-1 text-xs font-bold rounded-full border ${getStatusColor(scheme.status)}`}>
                            {scheme.status}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSelectedScheme(scheme)}
                              className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-transparent hover:border-emerald-100"
                              title="View Details"
                            >
                              <ExternalLink className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteScheme(scheme.id)}
                              disabled={deletingSchemeId === scheme.id}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100 disabled:opacity-60"
                              title="Remove Scheme"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 px-6 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                    <BookOpen className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                    <h3 className="text-lg font-bold text-slate-900">No saved schemes</h3>
                    <p className="mt-2 text-slate-500 max-w-sm mx-auto mb-6">
                      Bookmark government schemes to track your eligibility and applications.
                    </p>
                    <Link
                      to="/schemes"
                      className="inline-flex items-center px-6 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-colors shadow-sm"
                    >
                      Explore Schemes <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Account Settings</h2>
                  <p className="text-slate-500 mt-1">Manage your account security and data.</p>
                </div>

                <div className="space-y-4 max-w-2xl">
                  <div className="pt-6 mt-6 border-t border-slate-200">
                    <h4 className="font-semibold text-red-600 mb-2">Danger Zone</h4>
                    <p className="text-sm text-slate-500 mb-4">Permanently delete your account and all saved data.</p>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={isDeletingAccount}
                      className="px-4 py-2 bg-white border border-red-200 text-red-600 font-medium rounded-lg hover:bg-red-50 transition-colors disabled:opacity-70"
                    >
                      {isDeletingAccount ? 'Deleting Account...' : 'Delete Account'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}