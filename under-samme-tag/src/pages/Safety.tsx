import { useNavigate } from 'react-router-dom';
import { useApp } from '../state/AppContext';

/** "Tryghed og gode råd": practical advice. No names, numbers or organisations except 112. */
export function SafetyPage() {
  const { t } = useApp();
  const navigate = useNavigate();
  const s = t.safety;
  return (
    <div className="narrow">
      <h1 tabIndex={-1}>{s.title}</h1>
      <p className="lead">{s.lead}</p>
      {s.sections.map((section, i) => (
        <section key={section.title} className="block advice" aria-labelledby={`advice-${i}`}>
          <h2 id={`advice-${i}`}>{section.title}</h2>
          <ul className="ticks">
            {section.items.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
      ))}
      <div className="actions">
        <button type="button" className="btn btn--secondary" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}>{s.back}</button>
      </div>
    </div>
  );
}
