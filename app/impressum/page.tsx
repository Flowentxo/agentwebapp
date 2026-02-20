'use client';

import { motion } from 'framer-motion';
import { FlowentLogo } from '@/components/ui/FlowentLogo';
import { PublicNavbar } from '@/components/layout/PublicNavbar';

export default function ImpressumPage() {
  return (
    <div className="min-h-screen bg-[#09090b] noise-overlay page-dot-grid">
      <div className="aura-glow" aria-hidden="true" />
      <div className="bg-mesh" aria-hidden="true" />

      {/* Navigation */}
      <PublicNavbar />

      {/* Content */}
      <article className="relative z-10 max-w-xl mx-auto px-6 py-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 pb-16 md:p-8 md:pb-20 shadow-2xl">
            {/* ── Zone 1: Header ──────────────────────── */}
            <div className="flex justify-center mb-4">
              <div className="w-9 h-9 rounded-lg bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
                <FlowentLogo className="w-4 h-4 text-violet-400" />
              </div>
            </div>

            <h1 className="text-2xl font-bold tracking-tight mb-1 bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-500">
              Impressum
            </h1>
            <p className="text-zinc-500 text-xs mb-8">
              Angaben gem&auml;&szlig; &sect; 5 TMG
            </p>

            {/* ── Zone 2: Data Grid ──────────────────── */}
            <dl className="text-sm">
              {/* Anbieter (merged with Vertreten durch) */}
              <div className="flex gap-4 py-3">
                <dt className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold w-32 flex-shrink-0 pt-0.5">
                  Anbieter
                </dt>
                <dd className="text-zinc-200">
                  Luis Ens &ndash; Flowent<br />
                  Am Neugraben 9, 79112 Freiburg<br />
                  <span className="text-zinc-400">Vertreten durch:</span> Luis Ens
                </dd>
              </div>

              {/* Kontakt */}
              <div className="flex gap-4 py-3 border-t border-white/5">
                <dt className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold w-32 flex-shrink-0 pt-0.5">
                  Kontakt
                </dt>
                <dd className="text-zinc-200">
                  Tel:{' '}
                  <a href="tel:+4915215463383" className="text-purple-400 link-glow">
                    +49 1521 5463383
                  </a>
                  <br />
                  E-Mail:{' '}
                  <a href="mailto:anfrage@flowent.de" className="text-purple-400 link-glow">
                    anfrage@flowent.de
                  </a>
                </dd>
              </div>

              {/* Verantwortlich */}
              <div className="flex gap-4 py-3 border-t border-white/5">
                <dt className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold w-32 flex-shrink-0 pt-0.5">
                  Verantwortlich
                </dt>
                <dd className="text-zinc-200">
                  Luis Ens<br />
                  Am Neugraben 9, 79112 Freiburg<br />
                  <span className="text-zinc-500 text-xs">gem. &sect; 55 Abs. 2 RStV</span>
                </dd>
              </div>

              {/* USt-ID */}
              <div className="flex gap-4 py-3 border-t border-white/5">
                <dt className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold w-32 flex-shrink-0 pt-0.5">
                  USt-IdNr.
                </dt>
                <dd className="text-white font-medium">
                  DE454099153
                </dd>
              </div>
            </dl>

            {/* ── Zone 3: Legal Fine Print ────────────── */}
            <div className="border-t border-white/5 pt-6 mt-6 space-y-8 text-sm leading-relaxed text-zinc-300">
              {/* EU-Streitschlichtung */}
              <div>
                <h2 className="text-xs uppercase tracking-widest text-zinc-400 font-bold mb-3">
                  EU-Streitschlichtung
                </h2>
                <p className="mb-4">
                  Die Europ&auml;ische Kommission stellt eine Plattform zur
                  Online-Streitbeilegung (OS) bereit:{' '}
                  <a
                    href="https://ec.europa.eu/consumers/odr/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-400 link-glow"
                  >
                    ec.europa.eu/consumers/odr
                  </a>
                </p>
                <p className="mb-5">
                  Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren
                  vor einer Verbraucherschlichtungsstelle teilzunehmen.
                </p>
              </div>

              {/* Haftung für Inhalte */}
              <div>
                <h2 className="text-xs uppercase tracking-widest text-zinc-400 font-bold mb-3">
                  Haftung f&uuml;r Inhalte
                </h2>
                <p className="mb-4">
                  Als Diensteanbieter sind wir gem. &sect; 7 Abs. 1 TMG f&uuml;r eigene Inhalte
                  auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach
                  &sect;&sect; 8 bis 10 TMG sind wir jedoch nicht verpflichtet, &uuml;bermittelte oder
                  gespeicherte fremde Informationen zu &uuml;berwachen.
                </p>
                <p className="mb-5">
                  Eine diesbez&uuml;gliche Haftung ist erst ab Kenntnis einer konkreten
                  Rechtsverletzung m&ouml;glich. Bei Bekanntwerden werden wir diese Inhalte
                  umgehend entfernen.
                </p>
              </div>

              {/* Haftung für Links */}
              <div>
                <h2 className="text-xs uppercase tracking-widest text-zinc-400 font-bold mb-3">
                  Haftung f&uuml;r Links
                </h2>
                <p className="mb-4">
                  Unser Angebot enth&auml;lt Links zu externen Websites Dritter, auf deren
                  Inhalte wir keinen Einfluss haben. F&uuml;r die Inhalte der verlinkten
                  Seiten ist stets der jeweilige Anbieter verantwortlich.
                </p>
                <p className="mb-5">
                  Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf m&ouml;gliche
                  Rechtsverst&ouml;&szlig;e &uuml;berpr&uuml;ft. Bei Bekanntwerden von Rechtsverletzungen werden
                  wir derartige Links umgehend entfernen.
                </p>
              </div>

              {/* Urheberrecht */}
              <div>
                <h2 className="text-xs uppercase tracking-widest text-zinc-400 font-bold mb-3">
                  Urheberrecht
                </h2>
                <p className="mb-4">
                  Die durch den Seitenbetreiber erstellten Inhalte und Werke unterliegen
                  dem deutschen Urheberrecht. Vervielf&auml;ltigung, Bearbeitung und Verwertung
                  au&szlig;erhalb des Urheberrechtes bed&uuml;rfen der schriftlichen Zustimmung.
                </p>
                <p className="mb-5">
                  Von KI-Agenten generierte Inhalte unterliegen den jeweiligen
                  Nutzungsbedingungen. Downloads und Kopien sind nur f&uuml;r den privaten,
                  nicht kommerziellen Gebrauch gestattet.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </article>
    </div>
  );
}
