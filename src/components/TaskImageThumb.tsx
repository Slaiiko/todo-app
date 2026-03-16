import { useEffect, useState } from 'react';
import { getAPIUrl } from '../utils/api';

interface Props {
  taskId: number;
  imageData?: string | null;
  alt: string;
  className: string;
  onHasImageChange?: (hasImage: boolean) => void;
}

const documentImageCache = new Map<number, string | null>();
const inflightLoads = new Map<number, Promise<string | null>>();

const getImageFromDocuments = async (taskId: number): Promise<string | null> => {
  if (!taskId) return null;

  if (documentImageCache.has(taskId)) {
    return documentImageCache.get(taskId) ?? null;
  }

  if (inflightLoads.has(taskId)) {
    return inflightLoads.get(taskId) ?? null;
  }

  const loadPromise = (async () => {
    try {
      const response = await fetch(getAPIUrl(`/documents/task/${taskId}`));
      if (!response.ok) {
        documentImageCache.set(taskId, null);
        return null;
      }

      const docs = await response.json();
      const imageDoc = Array.isArray(docs)
        ? docs.find((doc: any) => {
            const mimeType = String(doc?.mime_type || '').toLowerCase();
            const dataUrl = String(doc?.data_url || '');
            return mimeType.startsWith('image/') || dataUrl.startsWith('data:image/');
          })
        : null;

      const preview = imageDoc?.data_url || null;
      documentImageCache.set(taskId, preview);
      return preview;
    } catch {
      documentImageCache.set(taskId, null);
      return null;
    } finally {
      inflightLoads.delete(taskId);
    }
  })();

  inflightLoads.set(taskId, loadPromise);
  return loadPromise;
};

export default function TaskImageThumb({ taskId, imageData, alt, className, onHasImageChange }: Props) {
  const [previewSrc, setPreviewSrc] = useState<string | null>(imageData || null);

  useEffect(() => {
    onHasImageChange?.(Boolean(previewSrc));
  }, [previewSrc, onHasImageChange]);

  useEffect(() => {
    if (imageData) {
      setPreviewSrc(imageData);
      return;
    }

    let isCancelled = false;
    const load = async () => {
      const fromDocs = await getImageFromDocuments(taskId);
      if (!isCancelled) {
        setPreviewSrc(fromDocs);
      }
    };

    load();

    return () => {
      isCancelled = true;
    };
  }, [taskId, imageData]);

  useEffect(() => {
    if (imageData) return;

    const handleTaskMoved = async () => {
      documentImageCache.delete(taskId);
      const fromDocs = await getImageFromDocuments(taskId);
      setPreviewSrc(fromDocs);
    };

    window.addEventListener('taskMoved', handleTaskMoved);
    return () => {
      window.removeEventListener('taskMoved', handleTaskMoved);
    };
  }, [taskId, imageData]);

  if (!previewSrc) return null;

  return <img src={previewSrc} alt={alt} className={className} />;
}
