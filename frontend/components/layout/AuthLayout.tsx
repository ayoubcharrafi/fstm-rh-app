'use client';

import Image from 'next/image';

export function AuthLayout({ side, title, subtitle, formKey, children }: {
  side: 'left' | 'right';
  title: string;
  subtitle: string;
  formKey: string;
  children: React.ReactNode;
}) {
  const decorARoite = side === 'right';

  // Le S rentre jusqu'à ~72% de la largeur du volet. Le bloc de texte est donc
  // borné en largeur et calé du côté plein, à l'opposé de la découpe — laquelle
  // change de bord quand les volets s'échangent.
  const rembourrage = decorARoite ? '0 76px 0 92px' : '0 92px 0 76px';
  const rembourrageBas = decorARoite ? '0 76px 54px 92px' : '0 92px 54px 76px';

  return (
    <main className="auth-scene relative flex min-h-screen overflow-hidden bg-white">
      <AuthCurveDefs />

      <span
        aria-hidden="true"
        className={`auth-decor-glow hidden lg:block ${decorARoite ? 'right-1/2 -mr-32' : 'left-1/2 -ml-32'}`}
      />

      <section
        aria-hidden="true"
        className={`auth-panel auth-decor relative hidden overflow-hidden lg:flex lg:flex-col
          ${decorARoite ? 'order-2 auth-decor-mirror auth-slide-right' : 'order-1 auth-slide-left'}`}
        style={{
          background: 'linear-gradient(145deg, #071b45 0%, #0c397f 52%, #0d6fc8 100%)',
        }}
      >
        <svg
          viewBox="0 0 700 900"
          preserveAspectRatio="xMidYMid slice"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        >
          <defs>
            <radialGradient id="authHalo" cx="72%" cy="12%" r="62%">
              <stop offset="0%" stopColor="#cbeeff" stopOpacity="0.55" />
              <stop offset="38%" stopColor="#4d9cff" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#4d9cff" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="authHaloBas" cx="18%" cy="92%" r="55%">
              <stop offset="0%" stopColor="#7fd4ff" stopOpacity="0.26" />
              <stop offset="100%" stopColor="#7fd4ff" stopOpacity="0" />
            </radialGradient>
            {/* Les lignes s'effacent près des bords pour éviter que leurs
                extrémités ne dessinent une arête nette contre la découpe. */}
            <radialGradient id="authFadeLignes" cx="42%" cy="50%" r="62%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="62%" stopColor="#ffffff" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
            <mask id="authMasqueLignes">
              <rect width="700" height="900" fill="url(#authFadeLignes)" />
            </mask>
          </defs>

          <rect width="700" height="900" fill="url(#authHalo)" />
          <rect width="700" height="900" fill="url(#authHaloBas)" />

          {/* Nappe de courbes en S décalées verticalement : même géométrie que la
              séparation, ce qui fait lire le fond et la découpe comme un seul
              mouvement. L'amplitude horizontale reprend celle du clipPath. */}
          <g mask="url(#authMasqueLignes)" fill="none" stroke="#dbf1ff">
            {Array.from({ length: 14 }, (_, i) => {
              const y = -40 + i * 74;
              return (
                <path
                  key={i}
                  d={`M -40 ${y} C 300 ${y + 150}, 190 ${y + 290}, 340 ${y + 420} S 560 ${y + 560}, 760 ${y + 690}`}
                  strokeWidth={i % 3 === 0 ? 1.5 : 1}
                  strokeOpacity={i % 3 === 0 ? 0.15 : 0.08}
                />
              );
            })}
          </g>
        </svg>

        <div style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: '460px',
          margin: decorARoite ? 'auto 0 auto auto' : 'auto auto auto 0',
          padding: rembourrage,
        }}>
          <p style={{ margin: '0 0 22px', color: '#bfe6ff', fontSize: '11px', fontWeight: 700, letterSpacing: '0.22em' }}>
            PORTAIL RH
          </p>
          <h2 style={{ margin: 0, color: '#ffffff', fontSize: 'clamp(44px, 4.4vw, 72px)', fontWeight: 700, lineHeight: 1, letterSpacing: '-0.05em' }}>
            Bienvenue&nbsp;!
          </h2>
          <p style={{ maxWidth: '380px', margin: '24px 0 0', color: '#d8ecff', fontSize: '17px', lineHeight: 1.65 }}>
            Connectez-vous à votre espace pour gérer vos démarches administratives.
          </p>

          <div style={{ marginTop: '46px', paddingTop: '28px', borderTop: '1px solid rgba(255,255,255,0.16)' }}>
            <p style={{ margin: 0, color: '#ffffff', fontSize: '15px', fontWeight: 600, lineHeight: 1.5 }}>
              Faculté des Sciences et Techniques
              <br />
              de Mohammedia
            </p>
            <p style={{ margin: '8px 0 0', color: '#a9dbff', fontSize: '13px', letterSpacing: '0.01em' }}>
              Université Hassan II — Casablanca
            </p>
          </div>
        </div>

        <p style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: '460px',
          margin: decorARoite ? '0 0 0 auto' : '0 auto 0 0',
          padding: rembourrageBas,
          color: 'rgba(218,238,255,0.56)',
          fontSize: '10px',
          fontWeight: 700,
          letterSpacing: '0.12em',
          whiteSpace: 'nowrap',
        }}>
          ESPACE NUMERIQUE / RESSOURCES HUMAINES
        </p>
      </section>

      <section
        className={`auth-panel auth-form-panel relative z-[1] flex w-full flex-col items-center justify-center bg-white px-6 py-12 lg:w-1/2
          ${decorARoite ? 'order-1 auth-form-panel-mirror auth-slide-left' : 'order-2 auth-slide-right'}`}
      >
        <div key={formKey} className="auth-form w-full max-w-sm">
          <Image
            src="/logo_FSTMohammedia.png"
            alt="FST Mohammedia - Universite Hassan II"
            width={611}
            height={325}
            priority
            className="mx-auto mb-10 h-auto w-40 object-contain"
          />

          <div className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{title}</h1>
            <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
          </div>

          {children}
        </div>
      </section>
    </main>
  );
}

/* Les deux tracés de découpe, en unités relatives (0 → 1) pour rester
   proportionnels quelle que soit la largeur du volet.

   Un S impose deux courbures *opposées* : le bord part vers la droite en haut
   (concave), s'inverse au point d'inflexion à mi-hauteur, puis repart vers la
   gauche en bas (convexe). Deux courbes orientées dans le même sens ne donnent
   qu'un ventre unique, pas un S — et le tracé doit rejoindre les coins haut et
   bas sans segment droit, sinon la jonction fait un angle visible. */
function AuthCurveDefs() {
  return (
    <svg aria-hidden="true" width="0" height="0" style={{ position: 'absolute' }}>
      <defs>
        <clipPath id="authCurveLeft" clipPathUnits="objectBoundingBox">
          <path d="M0,0 H0.70 C0.99,0.18 0.72,0.34 0.72,0.5 C0.72,0.66 0.48,0.82 0.60,1 H0 Z" />
        </clipPath>
        <clipPath id="authCurveRight" clipPathUnits="objectBoundingBox">
          <path d="M1,0 H0.30 C0.01,0.18 0.28,0.34 0.28,0.5 C0.28,0.66 0.52,0.82 0.40,1 H1 Z" />
        </clipPath>
      </defs>
    </svg>
  );
}
