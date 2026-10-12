import { useState, useMemo, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import * as store from '../lib/store';
import type { Document, DocumentType, DocumentCategory } from '../lib/types';
import { Button, Input, Select, Textarea, Modal, SearchInput, Badge, Card, EmptyState, Dropdown, ConfirmDialog, showToast } from '../components/ui';
import {
  FileText, Plus, Trash2, Download, Eye, Star, MoreVertical,
  Upload, File, Image, FileSpreadsheet
} from 'lucide-react';

const docTypes: DocumentType[] = ['Invoice', 'Receipt', 'Contract', 'License', 'Membership', 'Warranty', 'Certificate', 'Other'];
const docCategories: DocumentCategory[] = ['Finance', 'Legal', 'Work', 'Personal', 'Other'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function Documents() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [showAdd, setShowAdd] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const documents = useMemo(() => {
    if (!user) return [];
    return store.getDocuments(user.id);
  }, [user]);

  const filtered = useMemo(() => {
    let items = documents;
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(d => d.name.toLowerCase().includes(q) || d.fileName.toLowerCase().includes(q));
    }
    if (typeFilter !== 'All') items = items.filter(d => d.type === typeFilter);
    if (categoryFilter !== 'All') items = items.filter(d => d.category === categoryFilter);
    return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [documents, search, typeFilter, categoryFilter]);

  const toggleFavorite = (id: string) => {
    if (!user) return;
    const doc = documents.find(d => d.id === id);
    if (doc) store.createDocument(user.id, { ...doc, favorite: !doc.favorite });
  };

  const handleDownload = (doc: Document) => {
    const link = document.createElement('a');
    link.href = `data:${doc.mimeType};base64,${doc.data}`;
    link.download = doc.fileName;
    link.click();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Documents</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{documents.length} document{documents.length !== 1 ? 's' : ''} stored</p>
        </div>
        <Button onClick={() => setShowAdd(true)}><Plus size={16} /> Upload Document</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search documents..." className="flex-1" />
        <Select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          options={[{ value: 'All', label: 'All Types' }, ...docTypes.map(t => ({ value: t, label: t }))]} className="sm:w-40" />
        <Select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          options={[{ value: 'All', label: 'All Categories' }, ...docCategories.map(c => ({ value: c, label: c }))]} className="sm:w-44" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<FileText size={24} className="text-gray-400" />}
          title={search || typeFilter !== 'All' ? 'No matching documents' : 'No documents yet'}
          description={search || typeFilter !== 'All' ? 'Try adjusting your filters' : 'Upload invoices, receipts, contracts, and more'}
          action={!search && typeFilter === 'All' ? <Button onClick={() => setShowAdd(true)}><Upload size={16} /> Upload Document</Button> : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(doc => (
            <Card key={doc.id} className="relative">
              <div className="flex items-start gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg shrink-0 ${
                  doc.mimeType.startsWith('image/') ? 'bg-purple-100 dark:bg-purple-900/20' :
                  doc.mimeType === 'application/pdf' ? 'bg-red-100 dark:bg-red-900/20' :
                  'bg-blue-100 dark:bg-blue-900/20'
                }`}>
                  {doc.mimeType.startsWith('image/') ? <Image size={18} className="text-purple-600 dark:text-purple-400" /> :
                   doc.mimeType === 'application/pdf' ? <FileText size={18} className="text-red-600 dark:text-red-400" /> :
                   <File size={18} className="text-blue-600 dark:text-blue-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{doc.name}</p>
                    {doc.favorite && <Star size={12} className="text-yellow-500 fill-yellow-500 shrink-0" />}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{doc.fileName}</p>
                </div>
                <Dropdown
                  trigger={<button className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><MoreVertical size={14} className="text-gray-500" /></button>}
                  items={[
                    { label: 'Preview', icon: <Eye size={14} />, onClick: () => setPreviewDoc(doc) },
                    { label: 'Download', icon: <Download size={14} />, onClick: () => handleDownload(doc) },
                    { label: 'Delete', icon: <Trash2 size={14} />, onClick: () => setDeleteConfirm(doc.id), danger: true },
                  ]}
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge>{doc.type}</Badge>
                <Badge variant="info">{doc.category}</Badge>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-between text-xs text-gray-400 dark:text-gray-500">
                <span>{(doc.fileSize / 1024).toFixed(1)} KB</span>
                <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showAdd && (
        <DocumentUploadForm
          accounts={user ? store.getAccounts(user.id) : []}
          subscriptions={user ? store.getSubscriptions(user.id) : []}
          onClose={() => setShowAdd(false)}
          onSave={(data) => {
            if (!user) return;
            store.createDocument(user.id, { ...data, userId: user.id } as any);
            showToast('success', 'Document uploaded');
            setShowAdd(false);
          }}
        />
      )}

      {previewDoc && (
        <Modal isOpen={true} onClose={() => setPreviewDoc(null)} title={previewDoc.name} size="xl">
          <div className="space-y-4">
            {previewDoc.mimeType.startsWith('image/') ? (
              <img src={`data:${previewDoc.mimeType};base64,${previewDoc.data}`} alt={previewDoc.name} className="max-w-full max-h-96 mx-auto rounded-lg" />
            ) : previewDoc.mimeType === 'application/pdf' ? (
              <iframe src={`data:application/pdf;base64,${previewDoc.data}`} className="w-full h-96 rounded-lg border" title={previewDoc.name} />
            ) : (
              <div className="flex items-center justify-center h-48 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <div className="text-center">
                  <File size={48} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">Preview not available for this file type</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => handleDownload(previewDoc)}>
                    <Download size={14} /> Download
                  </Button>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500 dark:text-gray-400">Type:</span> <span className="text-gray-900 dark:text-gray-100">{previewDoc.type}</span></div>
              <div><span className="text-gray-500 dark:text-gray-400">Category:</span> <span className="text-gray-900 dark:text-gray-100">{previewDoc.category}</span></div>
              <div><span className="text-gray-500 dark:text-gray-400">Size:</span> <span className="text-gray-900 dark:text-gray-100">{(previewDoc.fileSize / 1024).toFixed(1)} KB</span></div>
              <div><span className="text-gray-500 dark:text-gray-400">Uploaded:</span> <span className="text-gray-900 dark:text-gray-100">{new Date(previewDoc.createdAt).toLocaleDateString()}</span></div>
            </div>
            {previewDoc.notes && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Notes</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{previewDoc.notes}</p>
              </div>
            )}
          </div>
        </Modal>
      )}

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => {
          if (user && deleteConfirm) {
            store.deleteDocument(user.id, deleteConfirm);
            showToast('success', 'Document deleted');
          }
        }}
        title="Delete Document"
        message="Are you sure you want to delete this document? This action cannot be undone."
        confirmText="Delete"
        danger
      />
    </div>
  );
}

function DocumentUploadForm({ accounts, subscriptions, onClose, onSave }: {
  accounts: { id: string; serviceName: string }[];
  subscriptions: { id: string; serviceName: string }[];
  onClose: () => void;
  onSave: (data: any) => void;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<DocumentType>('Other');
  const [category, setCategory] = useState<DocumentCategory>('Other');
  const [relatedAccountId, setRelatedAccountId] = useState('');
  const [relatedSubscriptionId, setRelatedSubscriptionId] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileData, setFileData] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_FILE_SIZE) {
      setError('File size must be under 5MB');
      return;
    }
    setError('');
    setFile(f);
    if (!name) setName(f.name.replace(/\.[^/.]+$/, ''));

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setFileData(result.split(',')[1]);
    };
    reader.readAsDataURL(f);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !fileData) { setError('Please select a file'); return; }
    onSave({
      name: name || file.name,
      type, category,
      relatedAccountId: relatedAccountId || null,
      relatedSubscriptionId: relatedSubscriptionId || null,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      data: fileData,
      notes,
      tags: [],
      favorite: false,
    });
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Upload Document" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* File Upload Area */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
        >
          {file ? (
            <div className="flex items-center justify-center gap-3">
              <File size={24} className="text-blue-500" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{file.name}</p>
                <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
          ) : (
            <>
              <Upload size={32} className="mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-600 dark:text-gray-400">Click to upload or drag and drop</p>
              <p className="text-xs text-gray-400 mt-1">PDF, PNG, JPG, WEBP up to 5MB</p>
            </>
          )}
          <input ref={fileInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={handleFileChange} className="hidden" />
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Document Name *" value={name} onChange={e => setName(e.target.value)} placeholder="Invoice - Adobe" required />
          <Select label="Type" value={type} onChange={e => setType(e.target.value as DocumentType)} options={docTypes.map(t => ({ value: t, label: t }))} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select label="Category" value={category} onChange={e => setCategory(e.target.value as DocumentCategory)} options={docCategories.map(c => ({ value: c, label: c }))} />
          <Select label="Related Account" value={relatedAccountId} onChange={e => setRelatedAccountId(e.target.value)}
            options={[{ value: '', label: 'None' }, ...accounts.map(a => ({ value: a.id, label: a.serviceName }))]} />
        </div>
        <Select label="Related Subscription" value={relatedSubscriptionId} onChange={e => setRelatedSubscriptionId(e.target.value)}
          options={[{ value: '', label: 'None' }, ...subscriptions.map(s => ({ value: s.id, label: s.serviceName }))]} />
        <Textarea label="Notes" placeholder="Additional notes..." value={notes} onChange={e => setNotes(e.target.value)} />

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit"><Upload size={14} /> Upload</Button>
        </div>
      </form>
    </Modal>
  );
}
