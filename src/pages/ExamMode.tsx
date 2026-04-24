import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Panel, EmptyMessage } from '../components/UI';

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

function formatResourceType(type: string): string {
  switch (type) {
    case 'notes':
      return 'Notes';
    case 'pyq':
      return 'PYQs';
    case 'important':
      return 'Important topics';
    default:
      return 'Other';
  }
}

export function ExamMode() {
  const navigate = useNavigate();
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
        .eq('status', 'approved')
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
    border: '1px solid var(--border)',
    fontSize: '14px',
    background: 'var(--bg-card)',
    outline: 'none',
    color: 'var(--text-primary)',
    cursor: 'pointer'
  };

  if (loading) {
    return (
      <section style={{ display: 'grid', gap: 14 }}>
        <Panel title="Exam Mode" subtitle="Loading exam resources...">
           <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Getting everything ready...</div>
        </Panel>
      </section>
    );
  }

  if (error) {
    return (
      <section style={{ display: 'grid', gap: 14 }}>
        <Panel title="Exam Mode" subtitle="Couldn't load resources">
           <div className="notice-banner" style={{ padding: '24px', color: 'var(--danger)', background: 'var(--danger-soft)', borderRadius: '16px' }}>{error}</div>
        </Panel>
      </section>
    );
  }

  return (
    <section style={{ display: 'grid', gap: 14 }}>
      <Panel 
        title="Exam Mode" 
        subtitle="Notes, PYQs, and key topics, organized and ready."
        headerAction={
          <button 
            onClick={() => navigate('/contribute')}
            className="action-button action-button--primary"
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            Share a resource
          </button>
        }
      >
        <div style={{ display: 'grid', gap: '20px', padding: '10px 0' }}>
          
          {/* Filters */}
          <div className="surface-card" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', background: 'var(--bg-card-subtle)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'grid', gap: '6px', flex: '1 1 200px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Subject</label>
              <select className="standard-input" value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} style={selectStyle}>
                {uniqueSubjects.map(sub => <option key={sub} value={sub}>{sub}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gap: '6px', flex: '1 1 200px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Type</label>
              <select className="standard-input" value={filterType} onChange={(e) => setFilterType(e.target.value)} style={selectStyle}>
                <option value="All">All types</option>
                <option value="notes">Notes</option>
                <option value="pyq">PYQs</option>
                <option value="important">Important Topics</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Resources List */}
          {Object.keys(groupedResources).length === 0 ? (
             <EmptyMessage message="No resources match these filters." />
          ) : (
             <div style={{ display: 'grid', gap: '24px' }}>
               {Object.entries(groupedResources).sort(([a], [b]) => a.localeCompare(b)).map(([subject, items]) => (
                 <div key={subject} className="standard-card rise-in border-l-primary" style={{ display: 'grid', gap: '16px' }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', borderBottom: '2px solid var(--border)', paddingBottom: '8px' }}>
                      {subject}
                    </h3>
                    
                    <div style={{ display: 'grid', gap: '12px' }}>
                      {items.map(resource => (
                        <div key={resource.id} className="standard-card interactive-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px' }}>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '15px' }}>{resource.title}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', gap: '8px', marginTop: '6px', alignItems: 'center' }}>
                              <span className="status-badge status-badge--info" style={{ padding: '4px 10px', borderRadius: '6px', textTransform: 'uppercase', fontWeight: 700 }}>{formatResourceType(resource.type)}</span>
                              {resource.year && <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Year {resource.year}</span>}
                            </div>
                          </div>
                          <button 
                            onClick={() => window.open(resource.file_url, '_blank')} 
                            className="action-button action-button--secondary"
                            style={{ padding: '8px 16px', fontSize: '13px' }}
                          >
                            View
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
