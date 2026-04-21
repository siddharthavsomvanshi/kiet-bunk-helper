import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Panel } from '../components/UI';

interface ExamResource {
  id: string;
  subject: string;
  type: string;
  title: string;
  file_url: string;
  year?: number | null;
  status: string;
  created_at: string;
}

export function AdminPanel() {
  const navigate = useNavigate();
  const [loadingSession, setLoadingSession] = useState(true);
  
  // Form State
  const [subject, setSubject] = useState('');
  const [type, setType] = useState('notes');
  const [title, setTitle] = useState('');
  const [year, setYear] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [externalUrl, setExternalUrl] = useState('');
  const [uploadMode, setUploadMode] = useState<'file' | 'link'>('file');
  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');
  
  const [uploading, setUploading] = useState(false);
  const [resources, setResources] = useState<ExamResource[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    checkSession();
    fetchResources();
  }, []);

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/admin-login');
    } else {
      setLoadingSession(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin-login');
  };

  const fetchResources = async () => {
    const { data, error } = await supabase
      .from('exam_resources')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setResources(data);
    if (error) console.error('Error fetching resources:', error);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !title || !type) {
      setError('Please fill all required fields');
      return;
    }
    if (uploadMode === 'file' && !file) {
      setError('Please select a file');
      return;
    }
    if (uploadMode === 'link' && !externalUrl) {
      setError('Please provide a URL');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      let finalUrl = externalUrl;

      // 1. Upload File if mode is file
      if (uploadMode === 'file' && file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `files/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('exam-files')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('exam-files').getPublicUrl(filePath);
        finalUrl = data.publicUrl;
      }

      // 2. Save to Database
      const { error: dbError } = await supabase.from('exam_resources').insert({
        subject: subject.toUpperCase().trim(),
        type,
        title: title.trim(),
        file_url: finalUrl,
        year: year ? parseInt(year) : null,
        status: 'approved' // Admin uploads are auto-approved
      });

      if (dbError) throw dbError;

      setSuccess('Resource added successfully!');
      // Reset form
      setTitle('');
      setFile(null);
      setExternalUrl('');
      setYear('');
      fetchResources();
      
    } catch (err: any) {
      setError(err.message || 'An error occurred during upload');
    } finally {
      setUploading(false);
    }
  };

  const handleApprove = async (resource: ExamResource) => {
    try {
      const { error } = await supabase.from('exam_resources').update({ status: 'approved' }).eq('id', resource.id);
      if (error) throw error;
      
      setResources(resources.map(r => r.id === resource.id ? { ...r, status: 'approved' } : r));
    } catch (err: any) {
      alert(`Error approving: ${err.message}`);
    }
  };

  const handleDelete = async (resource: ExamResource) => {
    if (!window.confirm(`Delete ${resource.title}?`)) return;
    
    try {
      // 1. Delete from storage if it's a hosted file
      if (resource.file_url.includes('supabase.co/storage')) {
        const urlParts = resource.file_url.split('/exam-files/');
        if (urlParts.length > 1) {
          const path = urlParts[1];
          await supabase.storage.from('exam-files').remove([path]);
        }
      }

      // 2. Delete from DB
      const { error } = await supabase.from('exam_resources').delete().eq('id', resource.id);
      if (error) throw error;
      
      setResources(resources.filter(r => r.id !== resource.id));
    } catch (err: any) {
      alert(`Error deleting: ${err.message}`);
    }
  };

  if (loadingSession) return <div style={{ padding: 40, textAlign: 'center' }}>Loading Admin Panel...</div>;

  const inputStyle = {
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1px solid rgba(15, 23, 42, 0.1)',
    fontSize: '14px',
    width: '100%',
    boxSizing: 'border-box' as const,
    fontFamily: 'inherit',
  };

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '24px', color: '#0f172a' }}>Admin Panel</h1>
        <button onClick={handleLogout} className="action-button action-button--secondary" style={{ padding: '8px 16px' }}>
          Logout
        </button>
      </div>

      <Panel title="Upload New Resource" subtitle="Add notes, PYQs, or links for students.">
        <form onSubmit={handleUpload} style={{ padding: '20px', display: 'grid', gap: '16px', background: '#f8fafc', borderRadius: '16px' }}>
          {error && <div style={{ padding: '10px', background: '#fee2e2', color: '#991b1b', borderRadius: '8px' }}>{error}</div>}
          {success && <div style={{ padding: '10px', background: '#dcfce7', color: '#166534', borderRadius: '8px' }}>{success}</div>}
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ display: 'grid', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700 }}>Subject Code / Name</label>
              <input type="text" placeholder="e.g. LAE, CO, DBMS" value={subject} onChange={(e) => setSubject(e.target.value)} style={inputStyle} required />
            </div>
            <div style={{ display: 'grid', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700 }}>Type</label>
              <select value={type} onChange={(e) => setType(e.target.value)} style={inputStyle}>
                <option value="notes">Notes</option>
                <option value="pyq">PYQ</option>
                <option value="important">Important Topics</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
            <div style={{ display: 'grid', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700 }}>Title</label>
              <input type="text" placeholder="e.g. Unit 1 Handwritten Notes" value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} required />
            </div>
            {type === 'pyq' && (
              <div style={{ display: 'grid', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700 }}>Year (Optional)</label>
                <input type="number" placeholder="2023" value={year} onChange={(e) => setYear(e.target.value)} style={inputStyle} />
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '16px', padding: '10px 0' }}>
            <label style={{ display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer' }}>
              <input type="radio" checked={uploadMode === 'file'} onChange={() => setUploadMode('file')} /> Upload File
            </label>
            <label style={{ display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer' }}>
              <input type="radio" checked={uploadMode === 'link'} onChange={() => setUploadMode('link')} /> External Link
            </label>
          </div>

          {uploadMode === 'file' ? (
             <div style={{ display: 'grid', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700 }}>Select File (PDF, etc.)</label>
                <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} style={inputStyle} accept=".pdf,.doc,.docx,.jpg,.png" />
             </div>
          ) : (
            <div style={{ display: 'grid', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700 }}>External URL</label>
                <input type="url" placeholder="https://drive.google.com/..." value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} style={inputStyle} />
            </div>
          )}

          <button type="submit" disabled={uploading} className="action-button action-button--primary" style={{ justifySelf: 'start', padding: '10px 24px', opacity: uploading ? 0.7 : 1 }}>
            {uploading ? 'Uploading...' : 'Publish Resource'}
          </button>
        </form>
      </Panel>

      <Panel title="Manage Resources" subtitle={`${resources.length} items total.`}>
         <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
           <button 
             onClick={() => setActiveTab('pending')}
             style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: activeTab === 'pending' ? '#2563eb' : '#e2e8f0', color: activeTab === 'pending' ? '#fff' : '#475569', fontWeight: 600, cursor: 'pointer' }}
           >
             Pending Approvals ({resources.filter(r => r.status === 'pending').length})
           </button>
           <button 
             onClick={() => setActiveTab('approved')}
             style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: activeTab === 'approved' ? '#2563eb' : '#e2e8f0', color: activeTab === 'approved' ? '#fff' : '#475569', fontWeight: 600, cursor: 'pointer' }}
           >
             Live Resources ({resources.filter(r => r.status === 'approved').length})
           </button>
         </div>

         <div style={{ display: 'grid', gap: '12px', padding: '10px' }}>
           {resources.filter(r => r.status === activeTab).map(res => (
             <div key={res.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: '#fff', borderRadius: '12px', border: '1px solid rgba(15,23,42,0.1)' }}>
               <div>
                 <div style={{ fontWeight: 700, color: '#0f172a' }}>{res.title}</div>
                 <div style={{ fontSize: '13px', color: '#64748b', display: 'flex', gap: '8px', marginTop: '4px' }}>
                   <span style={{ background: '#e2e8f0', padding: '2px 8px', borderRadius: '4px' }}>{res.subject}</span>
                   <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>{res.type}</span>
                   {res.year && <span style={{ color: '#475569' }}>• {res.year}</span>}
                 </div>
               </div>
               <div style={{ display: 'flex', gap: '10px' }}>
                 <a href={res.file_url} target="_blank" rel="noreferrer" style={{ fontSize: '14px', color: '#2563eb', textDecoration: 'none', padding: '8px' }}>View</a>
                 {res.status === 'pending' && (
                   <button onClick={() => handleApprove(res)} style={{ background: '#dcfce7', color: '#166534', border: 'none', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Approve</button>
                 )}
                 <button onClick={() => handleDelete(res)} style={{ background: '#fee2e2', color: '#991b1b', border: 'none', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Delete</button>
               </div>
             </div>
           ))}
           {resources.filter(r => r.status === activeTab).length === 0 && <div style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>No resources found.</div>}
         </div>
      </Panel>
    </div>
  );
}
