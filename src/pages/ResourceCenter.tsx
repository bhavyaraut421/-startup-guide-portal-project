import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  Download,
  FileText,
  FileSpreadsheet,
  FileIcon,
  Eye,
  CheckCircle2,
  X,
  Loader2,
  Presentation,
  Trash2
} from 'lucide-react';

type FileType = 'PDF' | 'XLSX' | 'PPTX' | 'DOCX';
type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';

/* ✅ ONLY DOWNLOADS NOW */
type Category = 'All' | 'Downloads';

interface Resource {
  id: string;
  title: string;
  type: FileType;
  difficulty: Difficulty;
  category: 'Downloads';
  description: string;
  fileName?: string;
  createdAt?: string;
  sourceType?: string;
  isBackendDownload?: boolean;
}

/* ✅ ONLY TWO TABS */
const categories: Category[] = ['All', 'Downloads'];

export default function ResourceCenter() {
  const { token } = useAuth();

  const [resources, setResources] = useState<Resource[]>([]);
  const [loadingResources, setLoadingResources] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category>('All');

  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [toast, setToast] = useState<{ show: boolean; message: string }>({
    show: false,
    message: '',
  });

  const [previewResource, setPreviewResource] = useState<Resource | null>(null);

  useEffect(() => {
    const fetchDownloads = async () => {
      if (!token) {
        setResources([]);
        setLoadingResources(false);
        return;
      }

      setLoadingResources(true);

      try {
        const res = await fetch('/api/my-downloads', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || 'Failed to load downloads');
        }

        const downloads: Resource[] = (data.downloads || []).map((item: any) => ({
          id: String(item.id),
          title: item.title || 'Untitled File',
          type: mapMimeOrNameToType(item.mime_type, item.file_name),
          difficulty: inferDifficulty(item.source_type),
          category: 'Downloads',
          description: buildDescription(item.source_type, item.title),
          fileName: item.file_name,
          createdAt: item.created_at,
          sourceType: item.source_type || 'general',
          isBackendDownload: true,
        }));

        setResources(downloads);
      } catch (error) {
        console.error('Failed to fetch downloads:', error);
        setResources([]);
      } finally {
        setLoadingResources(false);
      }
    };

    fetchDownloads();
  }, [token]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const showToast = (message: string) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  };

  const handleDownload = async (resource: Resource) => {
    if (!token) return;

    try {
      setDownloadingId(resource.id);

      const res = await fetch(`/api/downloads/${resource.id}/file`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        let message = 'Download failed';
        try {
          const data = await res.json();
          message = data.message || message;
        } catch {
          //
        }
        throw new Error(message);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download =
        resource.fileName ||
        `${resource.title.replace(/\s+/g, '_')}.${resource.type.toLowerCase()}`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
      showToast('Download started');
    } catch (error: any) {
      console.error('Download failed:', error);
      showToast(error.message || 'Download failed');
    } finally {
      setDownloadingId(null);
    }
  };

  const handlePreview = async (resource: Resource) => {
    if (!token) return;

    setPreviewResource(resource);
    setPreviewLoading(true);

    try {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }

      const res = await fetch(`/api/downloads/${resource.id}/view`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        let message = 'Preview failed';
        try {
          const data = await res.json();
          message = data.message || message;
        } catch {
          //
        }
        throw new Error(message);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      setPreviewUrl(url);
    } catch (error: any) {
      console.error('Preview failed:', error);
      showToast(error.message || 'Preview failed');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDelete = async (resourceId: string) => {
    if (!token) return;

    try {
      setDeletingId(resourceId);

      const res = await fetch(`/api/delete-download/${resourceId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to delete download');
      }

      setResources((prev) => prev.filter((item) => item.id !== resourceId));

      if (previewResource?.id === resourceId) {
        closePreview();
      }

      showToast('Download removed successfully');
    } catch (error: any) {
      console.error('Delete failed:', error);
      showToast(error.message || 'Failed to delete download');
    } finally {
      setDeletingId(null);
    }
  };

  const closePreview = () => {
    setPreviewResource(null);
    setPreviewLoading(false);

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const filteredResources = useMemo(() => {
    return resources.filter((resource) => {
      const matchesSearch =
        resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        resource.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        activeCategory === 'All' || resource.category === activeCategory;

      return matchesSearch && matchesCategory;
    });
  }, [resources, searchQuery, activeCategory]);

  const getFileIcon = (type: FileType) => {
    switch (type) {
      case 'PDF':
        return <FileText className="w-5 h-5 text-red-500" />;
      case 'XLSX':
        return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />;
      case 'PPTX':
        return <Presentation className="w-5 h-5 text-orange-500" />;
      case 'DOCX':
        return <FileIcon className="w-5 h-5 text-blue-500" />;
      default:
        return <FileIcon className="w-5 h-5 text-slate-500" />;
    }
  };

  const getDifficultyColor = (difficulty: Difficulty) => {
    switch (difficulty) {
      case 'Beginner':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Intermediate':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Advanced':
        return 'bg-rose-100 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-8">

      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className="fixed bottom-8 left-1/2 z-50 flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="font-medium">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          Downloads
        </h1>
        <p className="text-slate-500 mt-2 max-w-2xl">
          View your downloaded files from the backend and manage them here.
        </p>
      </div>

      {/* Search */}
      <div className="relative w-full md:w-72">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-slate-400" />
        </div>
        <input
          type="text"
          placeholder="Search downloads..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl"
        />
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {filteredResources.map((resource) => (
          <div key={resource.id} className="bg-white p-6 rounded-2xl border">

            <div className="flex justify-between mb-4">
              {getFileIcon(resource.type)}
              <span className={`text-xs px-2 py-1 border rounded ${getDifficultyColor(resource.difficulty)}`}>
                {resource.difficulty}
              </span>
            </div>

            <h3 className="font-bold mb-2">{resource.title}</h3>

            <p className="text-sm text-slate-500">{resource.description}</p>

            <div className="flex gap-2 mt-4">

              <button
                onClick={() => handleDownload(resource)}
                className="flex-1 bg-emerald-600 text-white px-3 py-2 rounded-lg flex items-center justify-center gap-1"
              >
                <Download className="w-4 h-4" /> Download
              </button>

              <button
                onClick={() => handlePreview(resource)}
                className="p-2 border rounded-lg"
              >
                <Eye className="w-4 h-4" />
              </button>

              <button
                onClick={() => handleDelete(resource.id)}
                className="p-2 border rounded-lg"
              >
                <Trash2 className="w-4 h-4" />
              </button>

            </div>

          </div>
        ))}

      </div>
    </div>
  );
}

/* helpers */

function mapMimeOrNameToType(mimeType?: string, fileName?: string): FileType {
  const lowerName = (fileName || '').toLowerCase();
  if (lowerName.endsWith('.pdf')) return 'PDF';
  if (lowerName.endsWith('.xlsx')) return 'XLSX';
  if (lowerName.endsWith('.pptx')) return 'PPTX';
  return 'DOCX';
}

function inferDifficulty(): Difficulty {
  return 'Beginner';
}

function buildDescription(): string {
  return 'Downloaded file from your portal.';
}