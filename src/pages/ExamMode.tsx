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

const FALLBACK_RESOURCES: ExamResource[] = [
  {
    id: 'curated-1',
    subject: 'DBMS',
    type: 'notes',
    title: 'Database Management Systems — Units 1-5 Handwritten Notes',
    file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    year: 2024,
    status: 'approved',
    created_at: new Date().toISOString(),
  },
  {
    id: 'curated-2',
    subject: 'DBMS',
    type: 'pyq',
    title: 'AKTU DBMS End-Sem Solved Question Papers (2020 - 2023)',
    file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    year: 2023,
    status: 'approved',
    created_at: new Date().toISOString(),
  },
  {
    id: 'curated-3',
    subject: 'DBMS',
    type: 'important',
    title: 'DBMS Normalization & ER Diagram Cheat Sheet',
    file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    year: 2024,
    status: 'approved',
    created_at: new Date().toISOString(),
  },
  {
    id: 'curated-4',
    subject: 'OPERATING SYSTEMS',
    type: 'notes',
    title: 'Operating Systems — Complete Lecture Notes & Diagrams',
    file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    year: 2024,
    status: 'approved',
    created_at: new Date().toISOString(),
  },
  {
    id: 'curated-5',
    subject: 'OPERATING SYSTEMS',
    type: 'pyq',
    title: 'AKTU Operating Systems PYQs & Solution Bank',
    file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    year: 2023,
    status: 'approved',
    created_at: new Date().toISOString(),
  },
  {
    id: 'curated-6',
    subject: 'COMPUTER NETWORKS',
    type: 'notes',
    title: 'Computer Networks — OSI & TCP/IP Model Summary',
    file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    year: 2024,
    status: 'approved',
    created_at: new Date().toISOString(),
  },
  {
    id: 'curated-7',
    subject: 'COMPUTER NETWORKS',
    type: 'pyq',
    title: 'AKTU CN Previous Year Question Papers',
    file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    year: 2023,
    status: 'approved',
    created_at: new Date().toISOString(),
  },
  {
    id: 'curated-8',
    subject: 'DATA STRUCTURES',
    type: 'notes',
    title: 'Data Structures & Algorithms — Quick Revision Guide',
    file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    year: 2024,
    status: 'approved',
    created_at: new Date().toISOString(),
  },
  {
    id: 'curated-9',
    subject: 'WEB TECHNOLOGY',
    type: 'notes',
    title: 'Web Tech — HTML, CSS, JS, Node.js & React Core Concepts',
    file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    year: 2024,
    status: 'approved',
    created_at: new Date().toISOString(),
  },
];

function formatResourceType(type: string): string {
  switch (type.toLowerCase()) {
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
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubject, setFilterSubject] = useState('All');
  const [filterType, setFilterType] = useState('All');

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: sbError } = await supabase
        .from('exam_resources')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (sbError) {
        throw sbError;
      }

      if (data && data.length > 0) {
        setResources(data);
        setIsUsingFallback(false);
      } else {
        // Fallback to curated resources if database is empty
        setResources(FALLBACK_RESOURCES);
        setIsUsingFallback(true);
      }
    } catch (err: any) {
      console.warn('Supabase fetch failed, displaying curated fallback resources:', err);
      setError(err.message || 'Could not connect to live database.');
      setResources(FALLBACK_RESOURCES);
      setIsUsingFallback(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  // Extract unique subjects and types for dropdowns
  const uniqueSubjects = useMemo(() => {
    const subs = new Set(resources.map((r) => r.subject));
    return ['All', ...Array.from(subs).sort()];
  }, [resources]);

  const uniqueTypes = useMemo(() => {
    const types = new Set(resources.map((r) => r.type));
    return ['All', ...Array.from(types).sort()];
  }, [resources]);

  // Filter and group resources
  const groupedResources = useMemo(() => {
    let filtered = resources;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (r) => r.title.toLowerCase().includes(q) || r.subject.toLowerCase().includes(q)
      );
    }

    if (filterSubject !== 'All') {
      filtered = filtered.filter((r) => r.subject === filterSubject);
    }
    if (filterType !== 'All') {
      filtered = filtered.filter((r) => r.type === filterType);
    }

    // Group by Subject
    return filtered.reduce((acc, resource) => {
      if (!acc[resource.subject]) acc[resource.subject] = [];
      acc[resource.subject].push(resource);
      return acc;
    }, {} as Record<string, ExamResource[]>);
  }, [resources, searchQuery, filterSubject, filterType]);

  const totalFilteredCount = useMemo(() => {
    return Object.values(groupedResources).reduce((acc, items) => acc + items.length, 0);
  }, [groupedResources]);

  const selectStyle: React.CSSProperties = {
    padding: '10px 14px',
    borderRadius: '12px',
    border: '1px solid var(--border)',
    fontSize: '14px',
    background: 'var(--bg-card)',
    outline: 'none',
    color: 'var(--text-primary)',
    cursor: 'pointer',
  };

  const inputStyle: React.CSSProperties = {
    padding: '10px 14px',
    borderRadius: '12px',
    border: '1px solid var(--border)',
    fontSize: '14px',
    background: 'var(--bg-card)',
    outline: 'none',
    color: 'var(--text-primary)',
    width: '100%',
  };

  if (loading) {
    return (
      <section style={{ display: 'grid', gap: 14 }}>
        <Panel title="Exam Mode" subtitle="Loading exam resources...">
          <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Getting notes and PYQs ready...
          </div>
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
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/contribute')}
              className="action-button action-button--primary"
              style={{ padding: '8px 16px', fontSize: '13px' }}
            >
              Share a resource
            </button>
          </div>
        }
      >
        <div style={{ display: 'grid', gap: '20px', padding: '10px 0' }}>
          {/* Supabase Notice Banner if using fallback */}
          {isUsingFallback && (
            <div
              className="standard-card"
              style={{
                padding: '14px 18px',
                borderRadius: 16,
                background: 'var(--bg-card-subtle)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18 }}>📚</span>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  Showing curated offline study resources.{' '}
                  {error && <span style={{ color: 'var(--text-muted)' }}>({error})</span>}
                </div>
              </div>
              <button
                onClick={fetchResources}
                className="action-button action-button--secondary"
                style={{ padding: '6px 14px', fontSize: 12 }}
              >
                🔄 Refresh Live Sync
              </button>
            </div>
          )}

          {/* Quick Stats Header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 12,
            }}
          >
            <div
              className="standard-card"
              style={{ padding: '16px 20px', borderRadius: 16, background: 'var(--bg-card)' }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Total Resources
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
                {resources.length}
              </div>
            </div>
            <div
              className="standard-card"
              style={{ padding: '16px 20px', borderRadius: 16, background: 'var(--bg-card)' }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Subjects
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
                {uniqueSubjects.filter((s) => s !== 'All').length}
              </div>
            </div>
            <div
              className="standard-card"
              style={{ padding: '16px 20px', borderRadius: 16, background: 'var(--bg-card)' }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Filtered Results
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary)', marginTop: 4 }}>
                {totalFilteredCount}
              </div>
            </div>
          </div>

          {/* Search & Filters */}
          <div
            className="surface-card"
            style={{
              display: 'grid',
              gap: '14px',
              background: 'var(--bg-card-subtle)',
              padding: '18px',
              borderRadius: '20px',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'grid', gap: '6px' }}>
              <label
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                }}
              >
                Search Resources
              </label>
              <input
                className="standard-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title or subject (e.g. DBMS, Operating Systems, PYQ...)"
                style={inputStyle}
              />
            </div>

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ display: 'grid', gap: '6px', flex: '1 1 200px' }}>
                <label
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                  }}
                >
                  Subject
                </label>
                <select
                  className="standard-input"
                  value={filterSubject}
                  onChange={(e) => setFilterSubject(e.target.value)}
                  style={selectStyle}
                >
                  {uniqueSubjects.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gap: '6px', flex: '1 1 200px' }}>
                <label
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                  }}
                >
                  Type
                </label>
                <select
                  className="standard-input"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  style={selectStyle}
                >
                  <option value="All">All types</option>
                  <option value="notes">Notes</option>
                  <option value="pyq">PYQs</option>
                  <option value="important">Important Topics</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Resources List */}
          {Object.keys(groupedResources).length === 0 ? (
            <EmptyMessage message="No resources match your search or filter criteria." />
          ) : (
            <div style={{ display: 'grid', gap: '24px' }}>
              {Object.entries(groupedResources)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([subject, items]) => (
                  <div
                    key={subject}
                    className="standard-card rise-in border-l-primary"
                    style={{ display: 'grid', gap: '16px' }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: '2px solid var(--border)',
                        paddingBottom: '10px',
                      }}
                    >
                      <h3
                        style={{
                          margin: 0,
                          fontSize: '18px',
                          fontWeight: 800,
                          color: 'var(--text-primary)',
                        }}
                      >
                        {subject}
                      </h3>
                      <span
                        className="status-badge status-badge--neutral"
                        style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 700 }}
                      >
                        {items.length} {items.length === 1 ? 'file' : 'files'}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gap: '12px' }}>
                      {items.map((resource) => (
                        <div
                          key={resource.id}
                          className="standard-card interactive-row"
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '16px',
                            gap: '12px',
                            flexWrap: 'wrap',
                          }}
                        >
                          <div style={{ flex: '1 1 240px' }}>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '15px' }}>
                              {resource.title}
                            </div>
                            <div
                              style={{
                                fontSize: '12px',
                                color: 'var(--text-secondary)',
                                display: 'flex',
                                gap: '8px',
                                marginTop: '6px',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                              }}
                            >
                              <span
                                className="status-badge status-badge--info"
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  textTransform: 'uppercase',
                                  fontWeight: 700,
                                  fontSize: '11px',
                                }}
                              >
                                {formatResourceType(resource.type)}
                              </span>
                              {resource.year && (
                                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                                  Year {resource.year}
                                </span>
                              )}
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button
                              onClick={() => handleCopyLink(resource.file_url, resource.id)}
                              className="action-button action-button--secondary"
                              style={{ padding: '8px 14px', fontSize: '13px' }}
                              title="Copy link to clipboard"
                            >
                              {copiedId === resource.id ? '✓ Copied!' : '🔗 Copy'}
                            </button>
                            <button
                              onClick={() => window.open(resource.file_url, '_blank')}
                              className="action-button action-button--primary"
                              style={{ padding: '8px 16px', fontSize: '13px' }}
                            >
                              View PDF
                            </button>
                          </div>
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

