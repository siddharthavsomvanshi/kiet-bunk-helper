import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Panel } from '../components/UI';

export function Contribute() {
  const navigate = useNavigate();
  const [subject, setSubject] = useState('');
  const [type, setType] = useState('notes');
  const [title, setTitle] = useState('');
  const [year, setYear] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Validation: PDF only
      if (selectedFile.type !== 'application/pdf') {
        setError('Only PDF files are allowed.');
        setFile(null);
        e.target.value = ''; // Reset input
        return;
      }
      
      // Validation: Max 40 MB
      if (selectedFile.size > 40 * 1024 * 1024) {
        setError('File size must be under 40 MB.');
        setFile(null);
        e.target.value = ''; // Reset input
        return;
      }

      setError('');
      setFile(selectedFile);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !title || !file) {
      setError('Please fill all required fields and select a PDF file.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // 1. Upload to Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `contributions/${fileName}`; // Separate folder for contributions

      const { error: uploadError } = await supabase.storage
        .from('exam-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('exam-files')
        .getPublicUrl(filePath);

      // 2. Save to Database as Pending
      const { error: dbError } = await supabase.from('exam_resources').insert({
        subject: subject.toUpperCase().trim(),
        type,
        title: title.trim(),
        file_url: publicUrl,
        year: year ? parseInt(year) : null,
        status: 'pending'
      });

      if (dbError) throw dbError;

      setSuccess('Thank you! Your notes have been submitted and are pending admin approval.');
      setSubject('');
      setTitle('');
      setYear('');
      setFile(null);
      // Reset file input is handled by React state unbinding in standard form resets, 
      // but to be perfectly safe, we would use a ref. Here resetting state is fine.
    } catch (err: any) {
      setError(err.message || 'An error occurred during upload.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1px solid rgba(15, 23, 42, 0.1)',
    fontSize: '14px',
    width: '100%',
    boxSizing: 'border-box' as const,
    outline: 'none',
  };

  return (
    <section style={{ display: 'grid', gap: 14, maxWidth: '800px', margin: '0 auto' }}>
      <button 
        onClick={() => navigate('/exam')}
        style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', textAlign: 'left', padding: 0, fontWeight: 600 }}
      >
        ← Back to Exam Mode
      </button>

      <Panel title="Contribute Notes 🚀" subtitle="Help your classmates by uploading your study materials.">
        <form onSubmit={handleUpload} style={{ display: 'grid', gap: '20px', padding: '10px 0' }}>
          
          {error && <div style={{ padding: '12px', background: '#fee2e2', color: '#991b1b', borderRadius: '10px', fontSize: '14px' }}>{error}</div>}
          {success && <div style={{ padding: '12px', background: '#dcfce7', color: '#166534', borderRadius: '10px', fontSize: '14px' }}>{success}</div>}

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 200px', display: 'grid', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>Subject Code / Name *</label>
              <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. EC or Environmental Chemistry" style={inputStyle} required />
            </div>
            <div style={{ flex: '1 1 200px', display: 'grid', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>Type *</label>
              <select value={type} onChange={e => setType(e.target.value)} style={inputStyle}>
                <option value="notes">Notes</option>
                <option value="pyq">PYQs</option>
                <option value="important">Important Topics</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: '2 1 300px', display: 'grid', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>Title *</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Unit 2 Full Notes" style={inputStyle} required />
            </div>
            <div style={{ flex: '1 1 100px', display: 'grid', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>Year (Optional)</label>
              <input type="number" value={year} onChange={e => setYear(e.target.value)} placeholder="e.g. 2023" style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'grid', gap: '6px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid rgba(15,23,42,0.05)' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>Select PDF File *</label>
            <input 
              type="file" 
              accept=".pdf"
              onChange={handleFileChange} 
              style={{ fontSize: '14px' }} 
            />
            {file && file.size > 15 * 1024 * 1024 && (
              <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#ca8a04', fontWeight: 600 }}>
                ⚠️ Large files ({'>'}15MB) may upload slowly. Please compress if possible.
              </p>
            )}
            <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#64748b' }}>Max file size: 40 MB. PDF only.</p>
          </div>

          <button 
            type="submit" 
            disabled={loading || !file}
            style={{
              padding: '14px 24px',
              borderRadius: '12px',
              border: 'none',
              background: loading || !file ? '#cbd5e1' : '#2563eb',
              color: '#fff',
              fontSize: '15px',
              fontWeight: 700,
              cursor: loading || !file ? 'not-allowed' : 'pointer',
              marginTop: '10px'
            }}
          >
            {loading ? 'Uploading...' : 'Submit for Approval'}
          </button>

        </form>
      </Panel>
    </section>
  );
}
