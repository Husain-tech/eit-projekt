import { useEffect, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LANGS } from '../i18n';
import { useApp } from '../state/AppContext';
import { logEvent, routePattern } from '../state/testLog';
import type { TextSize } from '../types';
import { HouseMark } from './ui';

const SIZES: TextSize[] = [0, 1, 2];

export function Layout({ children }: { children: ReactNode }) {
  const { state, t, me, setTextSize, setLang, setAutoReplies, resetDemo, signOut } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const onTestPage = location.pathname === '/test';

  // Start every page at the top and move focus to the heading, so screen
  // reader and keyboard users notice the page change.
  useEffect(() => {
    window.scrollTo(0, 0);
    document.querySelector<HTMLElement>('main h1')?.focus();
  }, [location.pathname]);

  // The test log records which pages a tester opens. Not the test page itself.
  useEffect(() => {
    if (!onTestPage) logEvent({ type: 'page_view', step: routePattern(location.pathname), role: me?.role });
    // Only on page change, not when the profile changes.
  }, [location.pathname]);

  const handleReset = () => {
    if (window.confirm(t.layout.resetConfirm)) {
      resetDemo();
      navigate('/');
    }
  };

  return (
    <div className="page">
      <a className="skip" href="#indhold">{t.layout.skip}</a>
      <header className="top">
        <div className="top__inner">
          <Link to={me ? '/forslag' : '/'} className="brand">
            <HouseMark size={36} />
            <span>{t.layout.brand}</span>
          </Link>

          <div className="top__tools">
            <div className="textsize" role="group" aria-label={t.layout.textSizeGroup}>
              <span className="textsize__label" aria-hidden="true">{t.layout.textLabel}</span>
              {SIZES.map((size) => (
                <button
                  key={size}
                  type="button"
                  className={`textsize__btn textsize__btn--${size}`}
                  aria-pressed={state.textSize === size}
                  onClick={() => {
                    setTextSize(size);
                    logEvent({ type: 'text_size', value: String(size), role: me?.role });
                  }}
                >
                  {t.layout.sizes[size]}
                </button>
              ))}
            </div>

            <div className="textsize" role="group" aria-label={t.layout.langGroup}>
              <span className="textsize__label" aria-hidden="true">{t.layout.langLabel}</span>
              {LANGS.map((l) => (
                <button
                  key={l.value}
                  type="button"
                  lang={l.value}
                  className="textsize__btn"
                  aria-pressed={state.lang === l.value}
                  onClick={() => {
                    setLang(l.value);
                    logEvent({ type: 'language', value: l.value, role: me?.role });
                  }}
                >
                  {l.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {me && (
          <nav className="nav" aria-label={t.layout.menu}>
            <div className="nav__inner">
              <span className="nav__who">{t.layout.youAre(me.firstName)}</span>
              <NavLink to="/forslag" className="nav__link">{t.layout.suggestions}</NavLink>
              <NavLink to="/profil" className="nav__link">{t.layout.myProfile}</NavLink>
              <button
                type="button"
                className="nav__link nav__link--button"
                onClick={() => { signOut(); navigate('/'); }}
              >
                {t.layout.switchProfile}
              </button>
            </div>
          </nav>
        )}
      </header>

      <main id="indhold" className="main">{children}</main>

      <footer className="foot">
        <div className="foot__inner">
          <p>{t.layout.footer}</p>
          <div className="foot__tools">
            <label className="foot__check">
              <input
                type="checkbox"
                checked={state.autoReplies}
                onChange={(e) => setAutoReplies(e.target.checked)}
              />
              <span>{t.layout.autoReplies}</span>
            </label>
            <Link to="/tryghed" className="foot__link">{t.safety.link}</Link>
            <button type="button" className="linkbutton" onClick={handleReset}>{t.layout.reset}</button>
            <Link to="/test" className="foot__quiet">{t.layout.testLeader}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
