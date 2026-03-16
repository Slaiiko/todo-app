import { useEffect, useRef, useState } from 'react';
import { FileText, Plus, Download, LoaderCircle, Trash2 } from 'lucide-react';
import { getAPIUrl } from '../utils/api';
import { DocumentAttachment } from '../types';

interface Props {
  entityType: 'task' | 'subtask';
  entityId: number;
  readOnly?: boolean;
  compact?: boolean;
}

const readFileAsDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('File read failed'));
    reader.readAsDataURL(file);
  });
};

export default function EntityDocuments({ entityType, entityId, readOnly = false, compact = false }: Props) {
  const [documents, setDocuments] = useState<DocumentAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingDocumentId, setDeletingDocumentId] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadDocuments = async () => {
    if (!entityId) return;
    setIsLoading(true);
    try {
      const response = await fetch(getAPIUrl(`/documents/${entityType}/${entityId}`));
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      setDocuments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load documents:', error);
      setDocuments([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [entityType, entityId]);

  const handleFilesSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    setIsUploading(true);
    try {
      for (const file of files) {
        const dataUrl = await readFileAsDataUrl(file);
        const response = await fetch(getAPIUrl('/documents'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entity_type: entityType,
            entity_id: entityId,
            file_name: file.name,
            mime_type: file.type || 'application/octet-stream',
            data_url: dataUrl
          })
        });

        if (!response.ok) {
          throw new Error(`Upload failed: HTTP ${response.status}`);
        }
      }

      await loadDocuments();
      window.dispatchEvent(new CustomEvent('taskMoved'));
    } catch (error) {
      console.error('Failed to upload documents:', error);
      alert('Erreur lors de l\'ajout du document.');
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const handleDeleteDocument = async (documentId: number) => {
    setDeletingDocumentId(documentId);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(getAPIUrl(`/documents/${documentId}`), {
        method: 'DELETE',
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Delete failed: HTTP ${response.status}`);
      }

      // Optimistic local update — no extra network call
      setDocuments(prev => prev.filter(d => d.id !== documentId));
      window.dispatchEvent(new CustomEvent('taskMoved'));
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        alert('La suppression a pris trop de temps. Vérifiez que le serveur est actif.');
      } else {
        console.error('Failed to delete document:', error);
        alert('Erreur lors de la suppression du document.');
      }
    } finally {
      setDeletingDocumentId(null);
    }
  };

  const badgeClass = compact
    ? 'inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg'
    : 'inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg';

  return (
    <div className="flex flex-wrap items-center gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
      {!readOnly && (
        <>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFilesSelected}
          />
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              inputRef.current?.click();
            }}
            className={`${badgeClass} text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors`}
            title="Ajouter des documents"
            disabled={isUploading}
          >
            {isUploading ? <LoaderCircle className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            Documents{documents.length > 0 ? ` (${documents.length})` : ''}
          </button>
        </>
      )}

      {readOnly && documents.length > 0 && (
        <span className={`${badgeClass} text-zinc-700 bg-zinc-100`}>
          <FileText className="w-3 h-3" />
          Documents ({documents.length})
        </span>
      )}

      {isLoading && documents.length === 0 && (
        <span className={`${badgeClass} text-zinc-500 bg-zinc-100`}>
          <LoaderCircle className="w-3 h-3 animate-spin" />
          Chargement...
        </span>
      )}

      {documents.map((document) => (
        <div key={document.id} className="inline-flex items-center gap-1 max-w-[280px]">
          <a
            href={document.data_url}
            download={document.file_name}
            onClick={(e) => e.stopPropagation()}
            className={`${badgeClass} text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors max-w-[220px]`}
            title={document.file_name}
          >
            <Download className="w-3 h-3 shrink-0" />
            <span className="truncate">{document.file_name}</span>
          </a>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleDeleteDocument(document.id);
            }}
            className="inline-flex items-center justify-center w-6 h-6 rounded-md text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Supprimer ce document"
            disabled={deletingDocumentId === document.id}
          >
            {deletingDocumentId === document.id ? (
              <LoaderCircle className="w-3 h-3 animate-spin" />
            ) : (
              <Trash2 className="w-3 h-3" />
            )}
          </button>
        </div>
      ))}
    </div>
  );
}
