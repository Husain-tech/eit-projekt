import { useState, type FormEvent } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Avatar, Field, describe } from '../components/ui';
import { isEnded, isMutual, useApp, viewFor } from '../state/AppContext';
import { logEvent, otherLabel } from '../state/testLog';

function clock(at: number, lang: string): string {
  return new Date(at).toLocaleString(lang === 'da' ? 'da-DK' : 'en-GB', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
}

/**
 * A simple message thread for a pair after a mutual match. The text stays in
 * this browser. The test log only records that a message was sent, never what it said.
 */
export function MessagesPage() {
  const { id } = useParams();
  const { me, t, state, getProfile, isHidden, sendMessage } = useApp();
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const connection = state.connections.find((c) => c.id === id);
  const m = t.messages;

  if (!me || !connection || !isMutual(connection)) return <Navigate to="/forslag" replace />;
  const other = getProfile(viewFor(me.role, connection).otherId);
  if (!other || isHidden(other.id)) return <Navigate to="/forslag" replace />;
  const closed = isEnded(connection);
  const messages = connection.messages ?? [];

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!text.trim()) {
      setError(m.error);
      logEvent({ type: 'validation_error', step: 'messages', field: 'message', role: me.role });
      return;
    }
    setError('');
    sendMessage(connection.id, text);
    logEvent({ type: 'message_sent', role: me.role, other: otherLabel(other), value: String(messages.length + 1) });
    setText('');
  };

  return (
    <div className="narrow">
      <div className="who">
        <Avatar name={other.firstName} size="lg" />
        <h1 tabIndex={-1}>{m.title(other.firstName)}</h1>
      </div>
      <p className="lead">{m.lead}</p>

      <section aria-label={m.listLabel}>
        {messages.length === 0 ? <p>{m.empty}</p> : (
          <ol className="thread" aria-live="polite">
            {messages.map((msg, i) => {
              const mine = msg.from === me.role;
              return (
                <li key={`${msg.at}-${i}`} className={mine ? 'msg msg--mine' : 'msg'}>
                  <p className="msg__who">
                    <strong>{mine ? m.you : m.them(other.firstName)}</strong>
                    {' · '}
                    <span>{clock(msg.at, state.lang)}</span>
                  </p>
                  <p className="msg__text">{msg.text}</p>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {closed ? <p className="notice">{m.closed}</p> : (
        <form className="form" onSubmit={submit} noValidate>
          <Field id="msg-text" label={m.label} error={error}>
            <textarea
              id="msg-text" rows={3} value={text} onChange={(e) => setText(e.target.value)}
              {...describe('msg-text', undefined, error)}
            />
          </Field>
          <div className="actions">
            <button type="submit" className="btn btn--primary">{m.send(other.firstName)}</button>
          </div>
          {state.autoReplies && <p className="field__hint">{m.autoNote}</p>}
        </form>
      )}

      <p className="quiet"><Link to="/forslag">{m.back}</Link></p>
    </div>
  );
}
