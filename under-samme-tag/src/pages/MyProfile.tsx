import { Link, useNavigate } from 'react-router-dom';
import { ProfileForm } from '../components/ProfileForm';
import { ProfileSummary, profileTagline } from '../components/ProfileSummary';
import { clearDraft } from '../data/store';
import { Avatar } from '../components/ui';
import { useApp } from '../state/AppContext';
import { logEvent, otherLabel } from '../state/testLog';

export function MyProfile() {
  const { me, deleteProfile, t, myBlocks, unblock } = useApp();
  const navigate = useNavigate();
  if (!me) return null;

  const remove = () => {
    if (window.confirm(t.myProfile.deleteConfirm)) {
      deleteProfile(me.id);
      navigate('/');
    }
  };

  return (
    <div className="narrow">
      <div className="who">
        <Avatar name={me.firstName} size="lg" />
        <h1 tabIndex={-1}>{t.myProfile.title}</h1>
      </div>
      <p className="lead">{me.firstName}. {profileTagline(me, t)}.</p>
      <ProfileSummary profile={me} />
      <div className="actions">
        <Link to="/profil/ret" className="btn btn--primary">{t.myProfile.edit}</Link>
      </div>
      <section className="block" aria-labelledby="blocks-title">
        <h2 id="blocks-title">{t.block.listTitle}</h2>
        {myBlocks.length === 0 ? <p>{t.block.listEmpty}</p> : (
          <ul className="rows">
            {myBlocks.map(({ profile }) => (
              <li key={profile.id} className="rowcard rowcard--quiet">
                <div><h3>{profile.firstName}</h3></div>
                <button
                  type="button" className="btn btn--secondary"
                  onClick={() => {
                    logEvent({ type: 'unblocked', role: me.role, other: otherLabel(profile) });
                    unblock(profile.id);
                  }}
                >
                  {t.block.unblock(profile.firstName)}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="quiet">
        {t.myProfile.leaveQuestion}{' '}
        <button type="button" className="linkbutton linkbutton--danger" onClick={remove}>{t.myProfile.delete}</button>
      </p>
    </div>
  );
}

export function EditProfile() {
  const { me, saveProfile, t } = useApp();
  const navigate = useNavigate();
  if (!me) return null;
  return (
    <div className="narrow">
      <h1 tabIndex={-1}>{t.myProfile.editTitle}</h1>
      <ProfileForm
        role={me.role}
        existing={me}
        saveLabel={t.myProfile.saveChanges}
        onSave={(profile) => {
          saveProfile(profile);
          navigate('/profil');
        }}
      />
      <p className="quiet"><Link to="/profil" onClick={() => clearDraft(`rediger.${me.id}`)}>{t.myProfile.cancelEdit}</Link></p>
    </div>
  );
}
