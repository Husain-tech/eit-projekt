import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ProfileForm } from '../components/ProfileForm';
import { profileTagline } from '../components/ProfileSummary';
import { HouseMark } from '../components/ui';
import { useApp } from '../state/AppContext';
import { logEvent } from '../state/testLog';
import type { Role } from '../types';

function parseRole(value: string | undefined): Role | null {
  if (value === 'studerende') return 'student';
  if (value === 'vaert') return 'host';
  return null;
}

/** Front page: what this is, how it works, and two ways in. */
export function Start() {
  const { me, t } = useApp();
  return (
    <>
      <section className="hero">
        <div className="hero__text">
          <h1 tabIndex={-1}>{t.start.title}</h1>
          <p className="lead">{t.start.lead}</p>
          {me ? (
            <div className="actions">
              <Link to="/forslag" className="btn btn--primary">{t.start.continueAs(me.firstName)}</Link>
            </div>
          ) : (
            <div className="actions actions--stack">
              <Link to="/start/vaert" className="btn btn--primary">{t.start.hostCta}</Link>
              <Link to="/start/studerende" className="btn btn--secondary">{t.start.studentCta}</Link>
            </div>
          )}
        </div>
        <div className="hero__art">
          <HouseMark size={300} animate />
        </div>
      </section>

      <section className="how" aria-labelledby="how-title">
        <h2 id="how-title">{t.start.howTitle}</h2>
        <ol className="how__list">
          {t.start.how.map((item) => (
            <li key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}

/** After choosing a role: make your own profile, or try a made-up one. */
export function ChooseProfile() {
  const { role: roleParam } = useParams();
  const role = parseRole(roleParam);
  const { students, hosts, selectProfile, t } = useApp();
  const navigate = useNavigate();
  if (!role) return <Navigate to="/" replace />;

  const list = role === 'student' ? students : hosts;
  const pick = (p: (typeof list)[number]) => {
    logEvent({ type: 'profile_picked', role, other: p.isDemo ? p.firstName : '#own' });
    selectProfile(p.id);
    navigate('/forslag');
  };

  return (
    <div className="narrow">
      <h1 tabIndex={-1}>{role === 'student' ? t.choose.titleStudent : t.choose.titleHost}</h1>
      <p className="lead">{t.choose.lead}</p>
      <div className="actions">
        <Link to={`/opret/${roleParam}`} className="btn btn--primary">{t.choose.makeProfile}</Link>
      </div>
      {role === 'host' && (
        <>
          <p className="helper__start">{t.helper.startHint}</p>
          <div className="actions">
            <Link to={`/opret/${roleParam}?hjaelper=1`} className="btn btn--secondary">{t.helper.startLink}</Link>
          </div>
        </>
      )}

      <section className="demo" aria-labelledby="demo-title">
        <h2 id="demo-title">{t.choose.demoTitle}</h2>
        <p>{t.choose.demoText}</p>
        <ul className="picklist">
          {list.map((p) => (
            <li key={p.id}>
              <button type="button" className="pick" onClick={() => pick(p)}>
                <span className="pick__name">{t.choose.tryAs(p.firstName)}</span>
                <span className="pick__meta">{profileTagline(p, t)}{p.role === 'student' ? `. ${p.verifiedDomain ? t.verify.badge : t.verify.notBadge}` : ''}{p.isDemo ? '' : t.choose.ownProfile}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export function CreateProfile() {
  const { role: roleParam } = useParams();
  const role = parseRole(roleParam);
  const { saveProfile, t } = useApp();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  if (!role) return <Navigate to="/" replace />;

  return (
    <div className="narrow">
      <h1 tabIndex={-1}>{t.create.title}</h1>
      <p className="lead">{role === 'student' ? t.create.leadStudent : t.create.leadHost}</p>
      <ProfileForm
        role={role}
        saveLabel={t.create.save}
        startWithHelper={params.get('hjaelper') === '1'}
        onSave={(profile) => {
          saveProfile(profile);
          navigate('/forslag');
        }}
      />
    </div>
  );
}
