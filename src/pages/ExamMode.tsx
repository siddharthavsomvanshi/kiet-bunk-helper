import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Panel, EmptyMessage } from '../App';

interface ExamResource {
  id: string;
  subject: string;
  type: string;
  title: string;
  file_url: string;
  year?: number | null;
  created_at: string;
}

export function ExamMode() {
  const [resources, setResources] = useState<ExamResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [filterSubject, setFilterSubject] = useState('All');
  const [filterType, setFilterType] = useState('All');

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    try {
      const { data, error } = await supabase
        .from('exam_resources')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResources(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load resources');
    } finally {
      setLoading(false);
    }
  };

  // Extract unique subjects and types for the dropdowns
  const uniqueSubjects = useMemo(() => {
    const subs = new Set(resources.map(r => r.subject));
    return ['All', ...Array.from(subs).sort()];
  }, [resources]);

  const uniqueTypes = useMemo(() => {
    const types = new Set(resources.map(r => r.type));
    return ['All', ...Array.from(types).sort()];
  }, [resources]);

  // Filter and group resources
  const groupedResources = useMemo(() => {
    let filtered = resources;

    if (filterSubject !== 'All') {
      filtered = filtered.filter(r => r.subject === filterSubject);
    }
    if (filterType !== 'All') {
      filtered = filtered.filter(r => r.type === filterType);
    }

    // Group by Subject
    const grouped = filtered.reduce((acc, resource) => {
      if (!acc[resource.subject]) acc[resource.subject] = [];
      acc[resource.subject].push(resource);
      return acc;
    }, {} as Record<string, ExamResource[]>);

    return grouped;
  }, [resources, filterSubject, filterType]);

  const selectStyle = {
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1px solid rgba(15, 23, 42, 0.1)',
    fontSize: '14px',
    background: '#ffffff',
    outline: 'none',
    color: '#0f172a',
    cursor: 'pointer'
  };

  if (loading) {
    return (
      <section style={{ display: 'grid', gap: 14 }}>
        <Panel title="Exam Mode 📚" subtitle="Loading resources...">
           <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Fetching materials...</div>
        </Panel>
      </section>
    );
  }

  if (error) {
    return (
      <section style={{ display: 'grid', gap: 14 }}>
        <Panel title="Exam Mode 📚" subtitle="Error loading resources">
           <div style={{ padding: '24px', color: '#991b1b', background: '#fee2e2', borderRadius: '16px' }}>{error}</div>
        </Panel>
      </section>
    );
  }

  return (
    <section style={{ display: 'grid', gap: 14 }}>
      <Panel title="Exam Mode 📚" subtitle="Access notes, PYQs, and important topics to prepare for exams.">
        <div style={{ display: 'grid', gap: '20px', padding: '10px 0' }}>
          
          {/* Filters */}
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid rgba(15,23,42,0.05)' }}>
            <div style={{ display: 'grid', gap: '6px', flex: '1 1 200px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Subject</label>
              <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} style={selectStyle}>
                {uniqueSubjects.map(sub => <option key={sub} value={sub}>{sub}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gap: '6px', flex: '1 1 200px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Type</label>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={selectStyle}>
                <option value="All">All Types</option>
                <option value="notes">Notes</option>
                <option value="pyq">PYQs</option>
                <option value="important">Important Topics</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Resources List */}
          {Object.keys(groupedResources).length === 0 ? (
             <EmptyMessage message="📭 No resources found matching your filters." />
          ) : (
             <div style={{ display: 'grid', gap: '24px' }}>
               {Object.entries(groupedResources).sort(([a], [b]) => a.localeCompare(b)).map(([subject, items]) => (
                 <div key={subject} className="surface-card rise-in" style={{ padding: '20px', borderRadius: '20px', border: '1px solid rgba(15,23,42,0.08)' }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 800, color: '#0f172a', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>
                      {subject}
                    </h3>
                    
                    <div style={{ display: 'grid', gap: '12px' }}>
                      {items.map(resource => (
                        <div key={resource.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#f8fafc', borderRadius: '12px', border: '1px solid rgba(15,23,42,0.05)' }}>
                          <div>
                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '15px' }}>{resource.title}</div>
                            <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', gap: '8px', marginTop: '4px', alignItems: 'center' }}>
                              <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 600 }}>{resource.type}</span>
                              {resource.year && <span style={{ color: '#475569', fontWeight: 500 }}>• Year: {resource.year}</span>}
                            </div>
                          </div>
                          <button 
                            onClick={() => window.open(resource.file_url, '_blank')} 
                            className="action-button action-button--primary"
                            style={{ padding: '8px 16px', fontSize: '13px' }}
                          >
                            Open
                          </button>
                        </div>
                      ))}
                    </div>
                 </div>
               ))}
             </div>
          )}

        </div>
      </Panel>
    </section>
  );
}
