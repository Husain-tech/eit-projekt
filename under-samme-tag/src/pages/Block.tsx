import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../state/AppContext';
import { logEvent, otherLabel } from '../state/testLog';
import type { BlockReason } from '../types';

const REASONS: (BlockReason | 'none')[] = ['rude', 'fake', 'unsafe', 'other', 'none'];

/**
 * Block (and, in a real service, report) another person. The reason is a
 * fixed choice, never free text, so nothing personal ends up in the log.
 */
export function BlockPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { me, t, getProfile, block } = useApp();
  const [reason, setReason] = useState<BlockReason | 'none'>('none');
  const other = id ? getProfile(id) : undefined;
  const b = t.block;

  if (!me || !other || other.role === me.role) return <Navigate to="/forslag" replace />;

  const confirm = () => {
    const chosen = reason === 'none' ? null : reason;
    logEvent({ type: 'blocked', role: me.role, other: otherLabel(other), value: chosen ?? 'none' });
    block(other.id, chosen);
    navigate('/forslag', { state: { blocked: other.firstName } });
  };

  return (
    <div className="narrow">
      <h1 tabIndex={-1}>{b.title(other.firstName)}</h1>
      <p className="lead">{b.lead(other.firstName)}</p>

      <fieldset className="field">
        <legend className="field__label">{b.reasonLegend}</legend>
        <div className="checks">
          {REASONS.map((r) => (
            <label key={r} className="check">
              <input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} />
              <span>{b.reasons[r]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <p className="legal">{b.simulation}</p>

      <div className="actions">
        <button type="button" className="btn btn--primary btn--danger" onClick={confirm}>{b.confirm(other.firstName)}</button>
        <button type="button" className="btn btn--secondary" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}>{t.common.cancel}</button>
      </div>
    </div>
  );
}
