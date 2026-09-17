import React, { useState, useEffect } from 'react';
import type { StudentDetails } from '../../types/kiet';
import type { SubjectSummary } from '../../utils/attendanceCalculations';
import type { ExamSession, HallTicketOption } from '../../types/bridge';
import {
  fetchStudentIdUnified,
  fetchExamSessionsUnified,
  fetchHallTicketOptionsUnified,
  downloadHallTicketPdfUnified,
  getStoredSession,
} from '../../services/cybervidyaApi';

interface HallTicketCardProps {
  attendance: StudentDetails | null;
  subjects: SubjectSummary[];
  overallSummary?: {
    present: number;
    total: number;
    percentage: number;
  } | null;
}

export function HallTicketCard({ attendance, overallSummary }: HallTicketCardProps) {
  const [resolvedStudentId, setResolvedStudentId] = useState<number | string | null>(null);
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | string | null>(null);
  const [hallTicketOptions, setHallTicketOptions] = useState<HallTicketOption[]>([]);

  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | string | null>(null);
  const [previewingId, setPreviewingId] = useState<number | string | null>(null);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>('');

  const [error, setError] = useState<string | null>(null);

  // Step 1: Resolve Student ID
  useEffect(() => {
    let isMounted = true;
    async function resolveStudent() {
      const session = getStoredSession();
      if (attendance?.studentId) {
        if (isMounted) setResolvedStudentId(attendance.studentId);
        return;
      }
      if (session.studentId) {
        if (isMounted) setResolvedStudentId(session.studentId);
        return;
      }
      if (session.hasToken) {
        try {
          const info = await fetchStudentIdUnified();
          if (isMounted && info.studentId) {
            setResolvedStudentId(info.studentId);
          }
        } catch (err) {
          console.warn('Could not auto-resolve studentId:', err);
        }
      }
    }
    resolveStudent();
    return () => {
      isMounted = false;
    };
  }, [attendance]);

  // Step 2: Fetch Academic Exam Sessions when studentId is resolved
  useEffect(() => {
    if (!resolvedStudentId) return;

    let isMounted = true;
    async function loadSessions() {
      setLoadingSessions(true);
      setError(null);
      try {
        const fetchedSessions = await fetchExamSessionsUnified(resolvedStudentId!);
        if (!isMounted) return;
        setSessions(fetchedSessions);
        if (fetchedSessions.length > 0) {
          setSelectedSessionId(fetchedSessions[0].sessionId);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('Error fetching exam sessions:', err);
          setError(err.message || 'Failed to fetch exam sessions.');
        }
      } finally {
        if (isMounted) setLoadingSessions(false);
      }
    }

    loadSessions();
    return () => {
      isMounted = false;
    };
  }, [resolvedStudentId]);

  // Step 3: Fetch Available Hall Ticket Options when selectedSessionId changes
  useEffect(() => {
    if (!selectedSessionId) {
      setHallTicketOptions([]);
      return;
    }

    let isMounted = true;
    async function loadOptions() {
      setLoadingOptions(true);
      setError(null);
      try {
        const options = await fetchHallTicketOptionsUnified(selectedSessionId!);
        if (isMounted) {
          setHallTicketOptions(options);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('Error fetching hall ticket options:', err);
          setError(err.message || 'Failed to fetch hall ticket options.');
          setHallTicketOptions([]);
        }
      } finally {
        if (isMounted) setLoadingOptions(false);
      }
    }

    loadOptions();
    return () => {
      isMounted = false;
    };
  }, [selectedSessionId]);

  // Step 4: Download Binary PDF File
  const handleDownloadPdf = async (option: HallTicketOption) => {
    setDownloadingId(option.id);
    try {
      const blob = await downloadHallTicketPdfUnified(option.id);
      const url = URL.createObjectURL(blob);
      const cleanTitle = (option.title || 'Hall_Ticket').replace(/[^a-zA-Z0-9]/g, '_');
      const a = document.createElement('a');
      a.href = url;
      a.download = `${cleanTitle}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err: any) {
      alert(`Download failed: ${err.message || String(err)}`);
    } finally {
      setDownloadingId(null);
    }
  };

  // Preview PDF Inline
  const handlePreviewPdf = async (option: HallTicketOption) => {
    setPreviewingId(option.id);
    try {
      const blob = await downloadHallTicketPdfUnified(option.id);
      const url = URL.createObjectURL(blob);
      setPreviewPdfUrl(url);
      setPreviewTitle(option.title);
    } catch (err: any) {
      alert(`Preview failed: ${err.message || String(err)}`);
    } finally {
      setPreviewingId(null);
    }
  };

  const closePreviewModal = () => {
    if (previewPdfUrl) {
      URL.revokeObjectURL(previewPdfUrl);
    }
    setPreviewPdfUrl(null);
    setPreviewTitle('');
  };

  const overallPct = overallSummary?.percentage ?? 0;
  const isEligible = overallPct >= 75;
  const isConditional = overallPct >= 70 && overallPct < 75;

  return (
    <div
      className="hall-ticket-container"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 20,
        padding: '20px 24px',
        display: 'grid',
        gap: 20,
        boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          borderBottom: '1px solid var(--border)',
          paddingBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 28 }}>🎫</span>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              Official Examination Hall Ticket
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '3px 0 0 0' }}>
              Fetch and download your official admit card directly from KIET CyberVidya.
            </p>
          </div>
        </div>

        {/* Exam Session Dropdown */}
        {sessions.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Session:
            </label>
            <select
              value={selectedSessionId ?? ''}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="standard-input"
              style={{
                padding: '8px 12px',
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 600,
                background: 'var(--bg-card-subtle)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {sessions.map((sess) => (
                <option key={sess.sessionId} value={sess.sessionId}>
                  {sess.sessionName}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Eligibility & Student Info Summary */}
      {attendance && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
            padding: 16,
            borderRadius: 14,
            background: 'var(--bg-card-subtle)',
            border: '1px solid var(--border)',
          }}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Student Name</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
              {attendance.fullName || 'N/A'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Roll / Reg. No</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
              {attendance.registrationNumber || 'N/A'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Branch & Semester</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
              {attendance.branchShortName || 'N/A'} — {attendance.semesterName || 'N/A'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Exam Eligibility</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: isEligible ? 'var(--success)' : isConditional ? 'var(--warning)' : 'var(--danger)', marginTop: 2 }}>
              {overallPct.toFixed(1)}% ({isEligible ? 'Eligible' : isConditional ? 'Conditional' : 'Shortage'})
            </div>
          </div>
        </div>
      )}

      {/* Main Hall Tickets Options Section */}
      {!attendance && !getStoredSession().hasToken ? (
        <div
          style={{
            padding: '32px 24px',
            textAlign: 'center',
            background: 'var(--bg-card-subtle)',
            borderRadius: 16,
            border: '1px dashed var(--border)',
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔐</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
            CyberVidya Session Required
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            Log in to CyberVidya ERP via Bunk Helper to fetch and download your official exam Hall Tickets directly.
          </div>
        </div>
      ) : loadingSessions ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
          🔄 Loading academic exam sessions...
        </div>
      ) : error ? (
        <div
          style={{
            padding: 16,
            borderRadius: 12,
            background: 'var(--danger-soft)',
            border: '1px solid var(--danger)',
            color: 'var(--text-primary)',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>⚠️ {error}</span>
          {resolvedStudentId && (
            <button
              onClick={() => {
                setError(null);
                const currentId = resolvedStudentId;
                setResolvedStudentId(null);
                setTimeout(() => setResolvedStudentId(currentId), 10);
              }}
              className="action-button action-button--secondary"
              style={{ padding: '6px 12px', fontSize: 12 }}
            >
              Retry
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Available Admit Cards / Hall Tickets
            </h3>
            {loadingOptions && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>🔄 Fetching options...</span>
            )}
          </div>

          {hallTicketOptions.length === 0 ? (
            <div
              style={{
                padding: '24px',
                textAlign: 'center',
                background: 'var(--bg-card-subtle)',
                borderRadius: 14,
                color: 'var(--text-muted)',
                fontSize: 13,
              }}
            >
              {loadingOptions
                ? 'Checking for available hall tickets...'
                : 'No hall tickets have been issued yet for this examination session.'}
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {hallTicketOptions.map((opt) => (
                <div
                  key={opt.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12,
                    padding: '16px 20px',
                    borderRadius: 14,
                    background: 'var(--bg-card-subtle)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: '1 1 240px' }}>
                    <span style={{ fontSize: 24 }}>📄</span>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {opt.title}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                        Official CyberVidya Hall Ticket • ID #{opt.id}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                      onClick={() => handlePreviewPdf(opt)}
                      disabled={previewingId === opt.id}
                      className="action-button action-button--secondary"
                      style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600 }}
                    >
                      {previewingId === opt.id ? '⌛ Loading...' : '👁️ View PDF'}
                    </button>
                    <button
                      onClick={() => handleDownloadPdf(opt)}
                      disabled={downloadingId === opt.id}
                      className="action-button action-button--primary"
                      style={{ padding: '8px 18px', fontSize: 13, fontWeight: 700 }}
                    >
                      {downloadingId === opt.id ? '⌛ Downloading...' : '⬇️ Download PDF'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PDF Inline Viewer Modal */}
      {previewPdfUrl && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 20,
              width: '95%',
              maxWidth: 900,
              height: '90vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '14px 20px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--bg-card-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20 }}>📜</span>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                    {previewTitle}
                  </h3>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
                    Official Hall Ticket Document Preview
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <a
                  href={previewPdfUrl}
                  download={`${previewTitle.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`}
                  className="action-button action-button--primary"
                  style={{ padding: '6px 14px', fontSize: 12, textDecoration: 'none' }}
                >
                  ⬇️ Download
                </a>
                <button
                  onClick={closePreviewModal}
                  className="action-button action-button--secondary"
                  style={{ padding: '6px 14px', fontSize: 12 }}
                >
                  ✕ Close
                </button>
              </div>
            </div>

            {/* Modal Body / PDF iframe */}
            <div style={{ flex: 1, width: '100%', background: '#525659' }}>
              <iframe
                src={previewPdfUrl}
                title={previewTitle}
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
