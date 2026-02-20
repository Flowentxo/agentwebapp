'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { FlowentLogo } from '@/components/ui/FlowentLogo';
import { PublicNavbar } from '@/components/layout/PublicNavbar';

export default function AVVPage() {
  return (
    <div className="min-h-screen bg-[#09090b] noise-overlay page-dot-grid">
      <div className="aura-glow" aria-hidden="true" />
      <div className="bg-mesh" aria-hidden="true" />

      {/* Navigation */}
      <PublicNavbar />

      {/* Content */}
      <article className="relative z-10 max-w-7xl mx-auto px-6 py-32 flex flex-col lg:flex-row gap-16">
        {/* Sticky sidebar — desktop only */}
        <aside className="hidden lg:flex flex-col w-1/4 shrink-0">
          <div className="sticky top-32 h-fit">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-6">Inhalt</p>
            <nav className="flex flex-col gap-4">
              <a href="#gegenstand" className="text-sm text-zinc-400 hover:text-purple-400 transition-colors">&sect; 1 Gegenstand</a>
              <a href="#pflichten" className="text-sm text-zinc-400 hover:text-purple-400 transition-colors">&sect; 2 Pflichten</a>
              <a href="#unterauftragsverarbeiter" className="text-sm text-zinc-400 hover:text-purple-400 transition-colors">&sect; 3 Unterauftragsverarbeiter</a>
              <a href="#toms" className="text-sm text-zinc-400 hover:text-purple-400 transition-colors">&sect; 4 TOMs (Sicherheit)</a>
            </nav>
          </div>
        </aside>

        {/* Content column */}
        <div className="w-full lg:w-3/4 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 pb-20 md:p-12 md:pb-32 shadow-2xl text-zinc-300">
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
                <FlowentLogo className="w-5 h-5 text-violet-400" />
              </div>
            </div>

            <h1 className="text-4xl font-bold tracking-tight mb-2 bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-500">
              Auftragsverarbeitungsvertrag
            </h1>
            <p className="text-zinc-500 mb-12">gem&auml;&szlig; Art.&nbsp;28 DSGVO &ndash; G&uuml;ltig ab: 20. Februar 2026</p>

            {/* ── § 1 Gegenstand und Dauer ────────────────────────────── */}
            <div>
              <h2 id="gegenstand" className="text-sm font-bold text-purple-400 uppercase tracking-widest mt-0 mb-6 scroll-mt-32">
                &sect; 1 Gegenstand und Dauer der Verarbeitung
              </h2>
              <p className="leading-relaxed mb-6">
                Dieser Auftragsverarbeitungsvertrag (nachfolgend &ldquo;AVV&rdquo;) regelt die
                Verarbeitung personenbezogener Daten durch Luis Ens &ndash; Flowent,
                Am Neugraben 9, 79112 Freiburg (nachfolgend &ldquo;Auftragsverarbeiter&rdquo;)
                im Auftrag des Kunden (nachfolgend &ldquo;Verantwortlicher&rdquo;) im Rahmen
                der Nutzung der Flowent AI-Plattform.
              </p>
              <p className="leading-relaxed mb-6">
                <span className="text-white font-medium">Art der verarbeiteten Daten:</span>
              </p>
              <ul className="list-disc list-inside mb-6 space-y-2">
                <li>Konversationsdaten (Eingaben an KI-Agenten und generierte Outputs)</li>
                <li>Nutzerprofildaten (Name, E-Mail-Adresse, Firmenname)</li>
                <li>Workflow-Konfigurationen und Pipeline-Definitionen</li>
                <li>Metadaten (Zeitstempel, Token-Counts, Modell-Auswahl, Session-IDs)</li>
              </ul>
              <p className="leading-relaxed mb-6">
                <span className="text-white font-medium">Kategorien betroffener Personen:</span>{' '}
                Mitarbeiter, Beauftragte und sonstige Vertreter des Verantwortlichen, die
                die Plattform im Rahmen ihrer beruflichen T&auml;tigkeit nutzen.
              </p>
              <p className="leading-relaxed mb-6">
                <span className="text-white font-medium">Zweck der Verarbeitung:</span>{' '}
                Bereitstellung der KI-Agenten-Services, Ausf&uuml;hrung automatisierter
                Workflows (Pipelines), Speicherung von Konversationshistorien sowie
                die damit verbundene technische Infrastruktur.
              </p>
              <p className="leading-relaxed">
                <span className="text-white font-medium">Dauer:</span>{' '}
                Die Verarbeitung erfolgt f&uuml;r die Dauer des Hauptvertrages
                (Allgemeine Gesch&auml;ftsbedingungen). Nach Beendigung des Vertrages
                werden die Daten gem&auml;&szlig; &sect;&nbsp;2 Abs.&nbsp;6 dieses AVV gel&ouml;scht
                oder zur&uuml;ckgegeben.
              </p>
            </div>

            {/* ── § 2 Pflichten des Auftragsverarbeiters ──────────────── */}
            <div>
              <h2 id="pflichten" className="text-sm font-bold text-purple-400 uppercase tracking-widest mt-20 mb-6 scroll-mt-32">
                &sect; 2 Pflichten des Auftragsverarbeiters
              </h2>
              <p className="leading-relaxed mb-6">
                Der Auftragsverarbeiter verpflichtet sich zu folgenden Ma&szlig;nahmen:
              </p>
              <ul className="list-disc list-inside mb-6 space-y-3">
                <li>
                  <span className="text-white font-medium">Weisungsgebundenheit:</span>{' '}
                  Die Verarbeitung personenbezogener Daten erfolgt ausschlie&szlig;lich auf
                  Grundlage dokumentierter Weisungen des Verantwortlichen. Sofern der
                  Auftragsverarbeiter der Auffassung ist, dass eine Weisung gegen
                  datenschutzrechtliche Vorschriften verst&ouml;&szlig;t, informiert er den
                  Verantwortlichen unverz&uuml;glich.
                </li>
                <li>
                  <span className="text-white font-medium">Vertraulichkeit:</span>{' '}
                  Alle Personen, die Zugang zu personenbezogenen Daten haben, sind zur
                  Vertraulichkeit verpflichtet und wurden &uuml;ber die datenschutzrechtlichen
                  Anforderungen belehrt.
                </li>
                <li>
                  <span className="text-white font-medium">Betroffenenrechte (Art.&nbsp;15&ndash;22 DSGVO):</span>{' '}
                  Der Auftragsverarbeiter unterst&uuml;tzt den Verantwortlichen bei der
                  Erf&uuml;llung von Anfragen betroffener Personen (Auskunft, Berichtigung,
                  L&ouml;schung, Einschr&auml;nkung, Daten&uuml;bertragbarkeit, Widerspruch). Anfragen
                  werden unverz&uuml;glich an den Verantwortlichen weitergeleitet.
                </li>
                <li>
                  <span className="text-white font-medium">Meldung von Datenschutzverletzungen:</span>{' '}
                  Der Auftragsverarbeiter meldet Verletzungen des Schutzes personenbezogener
                  Daten unverz&uuml;glich, sp&auml;testens jedoch innerhalb von 24 Stunden nach
                  Bekanntwerden, an den Verantwortlichen. Die Meldung enth&auml;lt alle nach
                  Art.&nbsp;33 Abs.&nbsp;3 DSGVO erforderlichen Informationen.
                </li>
                <li>
                  <span className="text-white font-medium">L&ouml;schung und R&uuml;ckgabe:</span>{' '}
                  Nach Beendigung des Vertrages l&ouml;scht der Auftragsverarbeiter s&auml;mtliche
                  personenbezogenen Daten innerhalb von 30 Tagen, sofern nicht gesetzliche
                  Aufbewahrungspflichten entgegenstehen. Auf Wunsch des Verantwortlichen
                  erfolgt stattdessen eine R&uuml;ckgabe in einem maschinenlesbaren Format (JSON/CSV).
                </li>
                <li>
                  <span className="text-white font-medium">Audits und Inspektionen:</span>{' '}
                  Der Auftragsverarbeiter stellt dem Verantwortlichen alle erforderlichen
                  Informationen zum Nachweis der Einhaltung der in Art.&nbsp;28 DSGVO
                  niedergelegten Pflichten zur Verf&uuml;gung und erm&ouml;glicht &Uuml;berpr&uuml;fungen
                  einschlie&szlig;lich Inspektionen. Audits sind mit einer Vorlauffrist von
                  mindestens 14 Tagen anzuk&uuml;ndigen.
                </li>
              </ul>
            </div>

            {/* ── § 3 Unterauftragsverarbeiter ────────────────────────── */}
            <div>
              <h2 id="unterauftragsverarbeiter" className="text-sm font-bold text-purple-400 uppercase tracking-widest mt-20 mb-6 scroll-mt-32">
                &sect; 3 Unterauftragsverarbeiter
              </h2>
              <p className="leading-relaxed mb-6">
                Der Verantwortliche erteilt dem Auftragsverarbeiter eine allgemeine
                Genehmigung zum Einsatz von Unterauftragsverarbeitern. Der
                Auftragsverarbeiter informiert den Verantwortlichen &uuml;ber jede
                beabsichtigte &Auml;nderung in Bezug auf die Hinzuziehung oder Ersetzung
                von Unterauftragsverarbeitern. Der Verantwortliche hat das Recht,
                innerhalb von 14 Tagen nach Mitteilung Einspruch zu erheben.
              </p>
              <p className="leading-relaxed mb-6">
                <span className="text-white font-medium">Aktuelle Unterauftragsverarbeiter:</span>
              </p>
              <div className="overflow-x-auto mb-6">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 pr-4 text-white font-medium">Dienstleister</th>
                      <th className="text-left py-3 pr-4 text-white font-medium">Zweck</th>
                      <th className="text-left py-3 text-white font-medium">Standort</th>
                    </tr>
                  </thead>
                  <tbody className="text-zinc-400">
                    <tr className="border-b border-white/5">
                      <td className="py-3 pr-4">OpenAI, Inc.</td>
                      <td className="py-3 pr-4">KI-Modell-Inference (GPT)</td>
                      <td className="py-3">USA (DPA + SCCs)</td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="py-3 pr-4">Vercel, Inc.</td>
                      <td className="py-3 pr-4">Hosting &amp; Edge Functions</td>
                      <td className="py-3">USA/EU (SCCs)</td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="py-3 pr-4">Supabase, Inc.</td>
                      <td className="py-3 pr-4">PostgreSQL-Datenbank</td>
                      <td className="py-3">EU (Frankfurt)</td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-4">Stripe, Inc.</td>
                      <td className="py-3 pr-4">Zahlungsabwicklung</td>
                      <td className="py-3">USA/EU (SCCs)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="leading-relaxed">
                Der Auftragsverarbeiter stellt vertraglich sicher, dass die Unterauftragsverarbeiter
                dieselben Datenschutzverpflichtungen einhalten, die in diesem AVV festgelegt sind.
                F&uuml;r Drittlandtransfers (USA) sind Standardvertragsklauseln (SCCs) gem&auml;&szlig;
                Durchf&uuml;hrungsbeschluss (EU) 2021/914 abgeschlossen. Erg&auml;nzende
                Ma&szlig;nahmen (Verschl&uuml;sselung, Pseudonymisierung) werden gem&auml;&szlig;
                den Empfehlungen des EDSA umgesetzt.
              </p>
            </div>

            {/* ── § 4 Technische und organisatorische Maßnahmen ───────── */}
            <div>
              <h2 id="toms" className="text-sm font-bold text-purple-400 uppercase tracking-widest mt-20 mb-6 scroll-mt-32">
                &sect; 4 Technische und organisatorische Ma&szlig;nahmen (TOMs)
              </h2>
              <p className="leading-relaxed mb-6">
                Der Auftragsverarbeiter trifft gem&auml;&szlig; Art.&nbsp;32 DSGVO folgende
                technische und organisatorische Ma&szlig;nahmen zum Schutz der
                verarbeiteten personenbezogenen Daten:
              </p>

              <div className="space-y-6">
                <div>
                  <p className="text-white font-medium mb-2">Zutrittskontrolle</p>
                  <p className="leading-relaxed text-zinc-400">
                    Die gesamte Infrastruktur wird &uuml;ber Cloud-Dienste betrieben. Es
                    existieren keine physischen Server. Der Zugang zu Cloud-Management-Konsolen
                    ist durch MFA und IP-Allowlisting gesichert.
                  </p>
                </div>

                <div>
                  <p className="text-white font-medium mb-2">Zugangskontrolle</p>
                  <p className="leading-relaxed text-zinc-400">
                    Passw&ouml;rter m&uuml;ssen mindestens 8 Zeichen umfassen und Gro&szlig;buchstaben,
                    Ziffern sowie Sonderzeichen enthalten. Multi-Faktor-Authentifizierung (MFA)
                    ist verf&uuml;gbar. Sessions werden &uuml;ber JWT-Tokens mit begrenzter
                    Laufzeit (7 Tage) verwaltet. Session-Cookies sind httpOnly und Secure.
                  </p>
                </div>

                <div>
                  <p className="text-white font-medium mb-2">Zugriffskontrolle</p>
                  <p className="leading-relaxed text-zinc-400">
                    Der Zugriff auf Daten erfolgt rollenbasiert (RBAC). S&auml;mtliche
                    API-Zugriffe werden protokolliert (Audit-Log). API-Keys und
                    Zugangsdaten zu Drittdiensten werden mit AES-256 verschl&uuml;sselt
                    gespeichert.
                  </p>
                </div>

                <div>
                  <p className="text-white font-medium mb-2">Weitergabekontrolle</p>
                  <p className="leading-relaxed text-zinc-400">
                    S&auml;mtliche Daten&uuml;bertragungen erfolgen ausschlie&szlig;lich &uuml;ber
                    TLS&nbsp;1.3. API-Keys werden at-rest verschl&uuml;sselt. Die
                    Kommunikation mit Unterauftragsverarbeitern (OpenAI, Supabase, Stripe)
                    erfolgt ausschlie&szlig;lich &uuml;ber verschl&uuml;sselte Kan&auml;le.
                  </p>
                </div>

                <div>
                  <p className="text-white font-medium mb-2">Eingabekontrolle</p>
                  <p className="leading-relaxed text-zinc-400">
                    Vollst&auml;ndiges Audit-Logging mit Erfassung von Benutzer-ID,
                    Aktion, Zeitstempel und betroffener Ressource. Konversationshistorien
                    werden pro Nutzer und Agent getrennt gespeichert und sind nachvollziehbar.
                  </p>
                </div>

                <div>
                  <p className="text-white font-medium mb-2">Verf&uuml;gbarkeitskontrolle</p>
                  <p className="leading-relaxed text-zinc-400">
                    T&auml;gliche automatisierte Backups der PostgreSQL-Datenbank &uuml;ber
                    Supabase mit Point-in-Time Recovery. Angestrebte Verf&uuml;gbarkeit
                    von 99,5&nbsp;% im Jahresmittel (gem&auml;&szlig; AGB &sect;&nbsp;6).
                    Disaster-Recovery-Prozeduren sind dokumentiert.
                  </p>
                </div>

                <div>
                  <p className="text-white font-medium mb-2">Trennungskontrolle</p>
                  <p className="leading-relaxed text-zinc-400">
                    Strikte Mandantentrennung &uuml;ber User-IDs auf Datenbankebene.
                    Konversationsdaten, Workflows und Konfigurationen sind pro Nutzer
                    isoliert. Cross-Tenant-Zugriffe sind technisch ausgeschlossen.
                    API-Endpunkte validieren die Nutzer-Zugeh&ouml;rigkeit bei jedem Zugriff.
                  </p>
                </div>
              </div>
            </div>

            {/* ── Schlusshinweis ───────────────────────────────────────── */}
            <div className="mt-20 pt-8 border-t border-white/5">
              <p className="leading-relaxed text-zinc-500 text-sm">
                Dieser Auftragsverarbeitungsvertrag wird durch Akzeptanz der{' '}
                <Link href="/agb" className="text-purple-400 link-glow">
                  Allgemeinen Gesch&auml;ftsbedingungen
                </Link>{' '}
                bei der Registrierung auf der Flowent AI-Plattform rechtswirksam geschlossen.
                Er ist integraler Bestandteil der AGB (&sect;&nbsp;11).
              </p>
            </div>
          </div>
        </motion.div>
        </div>
      </article>
    </div>
  );
}
