import { formatKr, formatMonth, helpList, motivationList } from '../labels';
import type { Dict } from '../i18n';
import { useApp } from '../state/AppContext';
import type { Profile } from '../types';

/** The facts about a profile, shown on match cards and on "Min profil". */
export function ProfileSummary({ profile }: { profile: Profile }) {
  const { t } = useApp();
  const s = t.summary;
  if (profile.role === 'student') {
    return (
      <div className="summary">
        <p className="summary__intro">{profile.intro}</p>
        <dl className="facts">
          <div><dt>{s.offers}</dt><dd>{helpList(profile.offers, t)}</dd></div>
          <div><dt>{s.time}</dt><dd>{s.hours(profile.hoursPerWeek)}</dd></div>
          <div><dt>{s.reason}</dt><dd>{motivationList(profile.motivations, t)}</dd></div>
          <div><dt>{s.canPay}</dt><dd>{s.upTo(formatKr(profile.budget, t))}</dd></div>
          <div><dt>{s.moveIn}</dt><dd>{formatMonth(profile.moveIn, t)}</dd></div>
          <div><dt>{s.wantsToLive}</dt><dd>{profile.areas.length ? profile.areas.join(', ') : s.everywhere}</dd></div>
          <div><dt>{s.pet}</dt><dd>{profile.hasPet ? t.common.yes : t.common.no}</dd></div>
          <div><dt>{s.smokes}</dt><dd>{profile.smokes ? t.common.yes : t.common.no}</dd></div>
          <div><dt>{t.verify.fact}</dt><dd>{profile.verifiedDomain ? t.verify.factYes(profile.verifiedDomain) : t.verify.factNo}</dd></div>
        </dl>
      </div>
    );
  }
  return (
    <div className="summary">
      <p className="summary__intro">{profile.intro}</p>
      <dl className="facts">
        <div><dt>{s.room}</dt><dd>{profile.roomDescription}</dd></div>
        <div><dt>{s.rent}</dt><dd>{s.perMonth(formatKr(profile.rent, t))}</dd></div>
        <div><dt>{s.availableFrom}</dt><dd>{formatMonth(profile.availableFrom, t)}</dd></div>
        <div><dt>{s.wants}</dt><dd>{helpList(profile.wants, t)}</dd></div>
        <div><dt>{s.time}</dt><dd>{s.hours(profile.hoursWanted)}</dd></div>
        <div><dt>{s.pet}</dt><dd>{profile.petsAllowed ? s.allowed : s.notAllowed}</dd></div>
        <div><dt>{s.smoking}</dt><dd>{profile.smokingAllowed ? s.allowed : s.notAllowed}</dd></div>
        {profile.quietHours && <div><dt>{s.quiet}</dt><dd>{profile.quietHours}</dd></div>}
        <div><dt>{t.helper.fact}</dt><dd>{profile.helper ? t.helper.factYes(profile.firstName, t.helper.who[profile.helper]) : t.helper.factNo}</dd></div>
      </dl>
    </div>
  );
}

/** One line under the name: who is this? */
export function profileTagline(profile: Profile, t: Dict): string {
  return profile.role === 'student' ? profile.study : t.summary.hostTagline(profile.area);
}
