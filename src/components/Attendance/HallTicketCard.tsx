import React, { useState } from 'react';
import type { StudentDetails } from '../../types/kiet';
import type { SubjectSummary } from '../../utils/attendanceCalculations';

interface HallTicketCardProps {
  attendance: StudentDetails | null;
  subjects: SubjectSummary[];
  overallSummary?: {
    present: number;
    total: number;
    percentage: number;
  } | null;
}

export function HallTicketCard({ attendance, subjects, overallSummary }: HallTicketCardProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const openErpPortal = () => {
    window.open('https://kiet.cybervidya.net/main/dashboard', '_blank', 'noopener,noreferrer');
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
        gap: 16,
        boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
      }}
    >
      {/* Header Bar (Non-print controls + Title) */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          borderBottom: '1px solid var(--border)',
          paddingBottom: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>🎫</span>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Examination Hall Ticket
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
              Official admit card preview, attendance eligibility, and PDF download.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="action-button action-button--secondary"
            style={{ padding: '8px 14px', fontSize: 13 }}
          >
            {isCollapsed ? 'Show Preview' : 'Collapse'}
          </button>
          <button
            onClick={openErpPortal}
            className="action-button action-button--secondary"
            style={{ padding: '8px 14px', fontSize: 13 }}
          >
            🌐 CyberVidya ERP
          </button>
          <button
            onClick={handlePrint}
            className="action-button action-button--primary"
            style={{ padding: '8px 18px', fontSize: 13, fontWeight: 700 }}
          >
            🖨️ Print / Download PDF
          </button>
        </div>
      </div>

      {/* Hall Ticket Printable Card Content */}
      {!isCollapsed && (
        <div
          className="printable-hall-ticket"
          style={{
            border: '2px solid var(--border)',
            borderRadius: 16,
            padding: 24,
            background: 'var(--bg-card-subtle)',
            display: 'grid',
            gap: 20,
          }}
        >
          {/* Printable Header */}
          <div
            style={{
              textAlign: 'center',
              borderBottom: '2px solid var(--border)',
              paddingBottom: 16,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              KIET Group of Institutions, Ghaziabad
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 800, margin: '6px 0 4px 0', color: 'var(--text-primary)' }}>
              ADMIT CARD / HALL TICKET
            </h1>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>
              End Semester Examinations • Academic Year 2024-25
            </div>
          </div>

          {!attendance ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
              Log in with KIET CyberVidya to auto-generate your official Hall Ticket & eligibility breakdown.
            </div>
          ) : (
            <>
              {/* Student Bio Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: 16,
                  padding: 16,
                  borderRadius: 12,
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                }}
              >
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Student Name</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
                    {attendance.fullName || 'N/A'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Roll / Reg. No</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
                    {attendance.registrationNumber || 'N/A'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Branch & Semester</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                    {attendance.branchShortName || 'N/A'} — {attendance.semesterName || 'N/A'} ({attendance.sectionName || 'Sec N/A'})
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Overall Attendance</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: isEligible ? 'var(--success)' : isConditional ? 'var(--warning)' : 'var(--danger)', marginTop: 2 }}>
                    {overallPct.toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Eligibility Alert Banner */}
              <div
                style={{
                  padding: '12px 18px',
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  background: isEligible ? 'var(--success-soft)' : isConditional ? 'var(--warning-soft)' : 'var(--danger-soft)',
                  border: `1px solid ${isEligible ? 'var(--success)' : isConditional ? 'var(--warning)' : 'var(--danger)'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 20 }}>{isEligible ? '✅' : isConditional ? '⚠️' : '🚨'}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {isEligible
                        ? 'Eligible for Examination'
                        : isConditional
                        ? 'Conditional Eligibility (HOD Clearance Needed)'
                        : 'Attendance Shortage Warning (<75%)'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {isEligible
                        ? 'Your attendance meets the minimum 75% criterion required for sitting in exams.'
                        : isConditional
                        ? 'Overall attendance is between 70-75%. Medical/Duty leave approvals required.'
                        : 'Attendance is below 70%. You risk debarment in end-sem examinations.'}
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    padding: '6px 14px',
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    background: isEligible ? 'var(--success)' : isConditional ? 'var(--warning)' : 'var(--danger)',
                    color: '#fff',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isEligible ? 'CLEARED' : isConditional ? 'CONDITIONAL' : 'SHORTAGE'}
                </div>
              </div>

              {/* Course Attendance & Examination Clearance Schedule */}
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 10px 0', color: 'var(--text-primary)' }}>
                  Registered Courses & Eligibility Status
                </h3>
                {subjects.length === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No courses available.</div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table
                      style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: 13,
                        textAlign: 'left',
                      }}
                    >
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-muted)' }}>
                          <th style={{ padding: '8px 10px' }}>Course Code</th>
                          <th style={{ padding: '8px 10px' }}>Course Title</th>
                          <th style={{ padding: '8px 10px' }}>Component</th>
                          <th style={{ padding: '8px 10px', textAlign: 'center' }}>Attended / Total</th>
                          <th style={{ padding: '8px 10px', textAlign: 'right' }}>Percentage</th>
                          <th style={{ padding: '8px 10px', textAlign: 'center' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subjects.map((sub) => {
                          const subEligible = sub.percentage >= 75;
                          const subWarning = sub.percentage >= 70 && sub.percentage < 75;
                          return (
                            <tr key={sub.id} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td style={{ padding: '10px', fontWeight: 700, fontFamily: 'monospace' }}>
                                {sub.courseCode}
                              </td>
                              <td style={{ padding: '10px', fontWeight: 600 }}>{sub.title}</td>
                              <td style={{ padding: '10px', color: 'var(--text-secondary)' }}>
                                {sub.componentName}
                              </td>
                              <td style={{ padding: '10px', textAlign: 'center' }}>
                                {sub.present} / {sub.total}
                              </td>
                              <td
                                style={{
                                  padding: '10px',
                                  textAlign: 'right',
                                  fontWeight: 700,
                                  color: subEligible ? 'var(--success)' : subWarning ? 'var(--warning)' : 'var(--danger)',
                                }}
                              >
                                {sub.percentage.toFixed(1)}%
                              </td>
                              <td style={{ padding: '10px', textAlign: 'center' }}>
                                <span
                                  style={{
                                    padding: '4px 10px',
                                    borderRadius: 999,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    background: subEligible
                                      ? 'var(--success-soft)'
                                      : subWarning
                                      ? 'var(--warning-soft)'
                                      : 'var(--danger-soft)',
                                    color: subEligible
                                      ? 'var(--success)'
                                      : subWarning
                                      ? 'var(--warning)'
                                      : 'var(--danger)',
                                  }}
                                >
                                  {subEligible ? 'Eligible' : subWarning ? 'Caution' : 'Shortage'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Instructions & Official Stamp Seals */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-end',
                  flexWrap: 'wrap',
                  gap: 16,
                  paddingTop: 12,
                  borderTop: '1px dashed var(--border)',
                }}
              >
                <div style={{ maxWidth: '65%', fontSize: 11, color: 'var(--text-muted)', lineHeight: '1.5' }}>
                  <strong>Important Examination Rules:</strong>
                  <ol style={{ margin: '4px 0 0 0', paddingLeft: 16 }}>
                    <li>Students must carry their official KIET physical ID card along with this Hall Ticket.</li>
                    <li>Electronic devices, smartwatches, and unauthorized notes are strictly prohibited inside the examination hall.</li>
                    <li>Ensure attendance eligibility meets the 75% cutoff to avoid debarment.</li>
                  </ol>
                </div>

                <div style={{ textAlign: 'right', fontSize: 12 }}>
                  <div
                    style={{
                      display: 'inline-block',
                      border: '1px solid var(--border)',
                      padding: '8px 16px',
                      borderRadius: 8,
                      textAlign: 'center',
                      background: 'var(--bg-card)',
                    }}
                  >
                    <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
                      Controller of Examinations
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 800, marginTop: 4, color: 'var(--text-primary)' }}>
                      KIET ERP VERIFIED
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--success)', fontWeight: 700 }}>✓ Digitally Signed</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Print Stylesheet injection */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .no-print {
            display: none !important;
          }
          .hall-ticket-container, .printable-hall-ticket, .printable-hall-ticket * {
            visibility: visible;
          }
          .hall-ticket-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none !important;
            box-shadow: none !important;
            background: #fff !important;
            color: #000 !important;
          }
          .printable-hall-ticket {
            border: 2px solid #000 !important;
            background: #fff !important;
            color: #000 !important;
          }
        }
      `}</style>
    </div>
  );
}
