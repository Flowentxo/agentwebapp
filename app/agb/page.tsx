'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { FlowentLogo } from '@/components/ui/FlowentLogo';
import { PublicNavbar } from '@/components/layout/PublicNavbar';

export default function AGBPage() {
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
              <a href="#geltungsbereich" className="text-sm text-zinc-400 hover:text-purple-400 transition-colors">&sect; 1 Geltungsbereich</a>
              <a href="#vertragsschluss" className="text-sm text-zinc-400 hover:text-purple-400 transition-colors">&sect; 2 Vertragsschluss</a>
              <a href="#leistungen" className="text-sm text-zinc-400 hover:text-purple-400 transition-colors">&sect; 3 Leistungen</a>
              <a href="#ki-dienste" className="text-sm text-zinc-400 hover:text-purple-400 transition-colors">&sect; 4 KI-Dienste &amp; Haftung</a>
              <a href="#ki-outputs" className="text-sm text-zinc-400 hover:text-purple-400 transition-colors">&sect; 5 KI-Outputs</a>
              <a href="#verfuegbarkeit" className="text-sm text-zinc-400 hover:text-purple-400 transition-colors">&sect; 6 Verf&uuml;gbarkeit</a>
              <a href="#verguetung" className="text-sm text-zinc-400 hover:text-purple-400 transition-colors">&sect; 7 Verg&uuml;tung</a>
              <a href="#laufzeit" className="text-sm text-zinc-400 hover:text-purple-400 transition-colors">&sect; 8 Laufzeit</a>
              <a href="#pflichten" className="text-sm text-zinc-400 hover:text-purple-400 transition-colors">&sect; 9 Nutzerpflichten</a>
              <a href="#haftung" className="text-sm text-zinc-400 hover:text-purple-400 transition-colors">&sect; 10 Haftung</a>
              <a href="#datenschutz" className="text-sm text-zinc-400 hover:text-purple-400 transition-colors">&sect; 11 Datenschutz</a>
              <a href="#schluss" className="text-sm text-zinc-400 hover:text-purple-400 transition-colors">&sect; 12 Schlussbestimmungen</a>
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
              Allgemeine Gesch&auml;ftsbedingungen
            </h1>
            <p className="text-zinc-500 mb-12">G&uuml;ltig ab: 20. Februar 2026</p>

            {/* ── § 1 Geltungsbereich ──────────────────────────────────── */}
            <div>
              <h2 id="geltungsbereich" className="text-sm font-bold text-purple-400 uppercase tracking-widest mt-0 mb-6 scroll-mt-32">
                &sect; 1 Geltungsbereich
              </h2>
              <p className="leading-relaxed mb-6">
                Diese Allgemeinen Gesch&auml;ftsbedingungen (nachfolgend &ldquo;AGB&rdquo;) gelten f&uuml;r alle
                Vertr&auml;ge zwischen Luis Ens &ndash; Flowent, Am Neugraben 9, 79112 Freiburg
                (nachfolgend &ldquo;Flowent AI&rdquo; oder &ldquo;Anbieter&rdquo;) und dem Kunden (nachfolgend &ldquo;Nutzer&rdquo;)
                &uuml;ber die Nutzung der Flowent AI-Plattform und der darauf angebotenen KI-Agenten-Services.
              </p>
              <p className="leading-relaxed mb-6">
                <span className="text-white font-medium">Das Angebot von Flowent AI richtet sich
                ausschlie&szlig;lich an Unternehmer im Sinne des &sect; 14 BGB.</span> Mit der Registrierung
                best&auml;tigt der Nutzer, dass er in Aus&uuml;bung seiner gewerblichen oder selbst&auml;ndigen
                beruflichen T&auml;tigkeit handelt. Verbraucher im Sinne des &sect; 13 BGB sind von der
                Nutzung ausgeschlossen.
              </p>
              <p className="leading-relaxed">
                Abweichende, entgegenstehende oder erg&auml;nzende Gesch&auml;ftsbedingungen des Nutzers
                werden nur dann Vertragsbestandteil, wenn Flowent AI ihrer Geltung ausdr&uuml;cklich
                schriftlich zugestimmt hat.
              </p>
            </div>

            {/* ── § 2 Vertragsschluss ──────────────────────────────────── */}
            <div>
              <h2 id="vertragsschluss" className="text-sm font-bold text-purple-400 uppercase tracking-widest mt-20 mb-6 scroll-mt-32">
                &sect; 2 Vertragsschluss
              </h2>
              <p className="leading-relaxed mb-6">
                Der Vertrag zwischen Flowent AI und dem Nutzer kommt durch die Registrierung auf
                der Plattform und die Best&auml;tigung der E-Mail-Adresse zustande. Mit der
                Registrierung akzeptiert der Nutzer diese AGB.
              </p>
              <p className="leading-relaxed">
                F&uuml;r die Registrierung ist die Angabe einer g&uuml;ltigen E-Mail-Adresse sowie die
                Erstellung eines sicheren Passworts erforderlich. Alternativ kann die Registrierung
                &uuml;ber einen Drittanbieter-Login (OAuth) erfolgen. Der Nutzer ist verpflichtet,
                seine Zugangsdaten vertraulich zu behandeln und vor dem Zugriff Dritter zu sch&uuml;tzen.
              </p>
            </div>

            {/* ── § 3 Leistungen ───────────────────────────────────────── */}
            <div>
              <h2 id="leistungen" className="text-sm font-bold text-purple-400 uppercase tracking-widest mt-20 mb-6 scroll-mt-32">
                &sect; 3 Leistungen von Flowent AI
              </h2>
              <p className="leading-relaxed mb-6">
                Flowent AI stellt dem Nutzer eine webbasierte Plattform zur Verf&uuml;gung, die
                folgende Leistungen umfasst:
              </p>
              <ul className="list-disc list-inside mb-6 space-y-2">
                <li>Zugang zu spezialisierten KI-Agenten f&uuml;r verschiedene Gesch&auml;ftsbereiche</li>
                <li>Erstellung und Verwaltung von automatisierten Workflows (Pipelines)</li>
                <li>Konversationsbasierte Interaktion mit KI-Agenten inkl. Tool-Aufrufe</li>
                <li>Dashboard und Analyse-Tools zur &Uuml;berwachung der Nutzung und Kosten</li>
                <li>Integration mit Drittanbieter-Services (Google Workspace, Slack u.&nbsp;a.)</li>
              </ul>
              <p className="leading-relaxed">
                Flowent AI beh&auml;lt sich das Recht vor, die angebotenen Leistungen weiterzuentwickeln
                und zu verbessern, sofern die wesentlichen Funktionalit&auml;ten erhalten bleiben.
                Wesentliche Einschr&auml;nkungen werden mit einer Frist von mindestens 4 Wochen
                angek&uuml;ndigt.
              </p>
            </div>

            {/* ── § 4 KI-gestützte Dienste ─────────────────────────────── */}
            <div>
              <h2 id="ki-dienste" className="text-sm font-bold text-purple-400 uppercase tracking-widest mt-20 mb-6 scroll-mt-32">
                &sect; 4 KI-gest&uuml;tzte Dienste und Haftungsausschluss
              </h2>
              <p className="leading-relaxed mb-6">
                Flowent AI stellt KI-gest&uuml;tzte Werkzeuge (&ldquo;KI-Agenten&rdquo;) zur Verf&uuml;gung, die auf
                Sprachmodellen Dritter (insbesondere OpenAI) basieren. Die KI-Agenten dienen
                ausschlie&szlig;lich als Hilfsmittel und ersetzen keine professionelle Beratung.
              </p>
              <p className="leading-relaxed mb-6">
                <span className="text-white font-medium">Human-in-the-Loop-Pflicht:</span> Der Nutzer
                ist verpflichtet, s&auml;mtliche von KI-Agenten erzeugten Ergebnisse vor deren
                Verwendung eigenverantwortlich auf Richtigkeit, Vollst&auml;ndigkeit und Eignung zu
                pr&uuml;fen. Dies gilt insbesondere f&uuml;r Texte, Analysen, Code, Vertragsentw&uuml;rfe
                und strategische Empfehlungen.
              </p>
              <p className="leading-relaxed mb-6">
                <span className="text-white font-medium">Keine Beratungsleistung:</span> Die von
                KI-Agenten generierten Inhalte stellen ausdr&uuml;cklich keine Rechtsberatung,
                Steuerberatung, Finanzberatung, medizinische Beratung oder sonstige fachliche
                Beratung dar.
              </p>
              <p className="leading-relaxed mb-6">
                <span className="text-white font-medium">Transparenzhinweis gem&auml;&szlig; EU
                KI-Verordnung (AI Act):</span> Die auf der Plattform eingesetzten KI-Agenten
                sind KI-Systeme im Sinne der Verordnung (EU) 2024/1689. S&auml;mtliche von
                KI-Agenten erzeugten Inhalte werden auf der Plattform als KI-generiert
                gekennzeichnet. Nutzerdaten werden nicht zum Training der zugrunde liegenden
                KI-Modelle verwendet; die Datenverarbeitung erfolgt ausschlie&szlig;lich zur
                Erbringung der vertraglich vereinbarten Leistung (Inference).
              </p>
              <p className="leading-relaxed mb-6">
                Flowent AI &uuml;bernimmt keine Haftung f&uuml;r:
              </p>
              <ul className="list-disc list-inside mb-6 space-y-2">
                <li>Sachliche Fehler, Ungenauigkeiten oder Halluzinationen in KI-generierten Inhalten</li>
                <li>Veraltete oder unvollst&auml;ndige Informationen in den Antworten der KI-Agenten</li>
                <li>Sch&auml;den, die durch die unkontrollierte Ausf&uuml;hrung automatisierter Workflows (Pipelines) entstehen</li>
                <li>Entscheidungen, die der Nutzer auf Grundlage von KI-generierten Inhalten trifft</li>
              </ul>
              <p className="leading-relaxed">
                Der Nutzer tr&auml;gt die alleinige Verantwortung f&uuml;r die Genehmigung, &Uuml;berwachung
                und Kontrolle automatisierter Prozesse auf der Plattform. Flowent AI empfiehlt
                dringend die Nutzung der integrierten Genehmigungsmechanismen (Human-in-the-Loop,
                Approval-Nodes) bei gesch&auml;ftskritischen Workflows.
              </p>
            </div>

            {/* ── § 5 Nutzungsrechte an KI-Outputs ────────────────────── */}
            <div>
              <h2 id="ki-outputs" className="text-sm font-bold text-purple-400 uppercase tracking-widest mt-20 mb-6 scroll-mt-32">
                &sect; 5 Nutzungsrechte an KI-Outputs
              </h2>
              <p className="leading-relaxed mb-6">
                Die durch KI-Agenten generierten Inhalte (&ldquo;Outputs&rdquo;) stehen dem Nutzer zur
                freien Verwendung im Rahmen seiner gesch&auml;ftlichen T&auml;tigkeit zu. Flowent AI
                erhebt keine eigenst&auml;ndigen Nutzungs- oder Verwertungsanspr&uuml;che an den Outputs.
              </p>
              <p className="leading-relaxed mb-6">
                Ein Anspruch auf Exklusivit&auml;t der Outputs besteht nicht. Da die zugrunde
                liegenden KI-Modelle auf Wahrscheinlichkeiten basieren, k&ouml;nnen &auml;hnliche oder
                identische Ergebnisse auch f&uuml;r andere Nutzer generiert werden.
              </p>
              <p className="leading-relaxed">
                Flowent AI &uuml;bernimmt keine Gew&auml;hr daf&uuml;r, dass generierte Inhalte frei von
                Rechten Dritter (insbesondere Urheberrechte, Markenrechte) sind. Der Nutzer
                ist f&uuml;r die Pr&uuml;fung und Einhaltung etwaiger Schutzrechte bei der
                Weiterverwendung der Outputs selbst verantwortlich.
              </p>
            </div>

            {/* ── § 6 Verfügbarkeit und SLA ────────────────────────────── */}
            <div>
              <h2 id="verfuegbarkeit" className="text-sm font-bold text-purple-400 uppercase tracking-widest mt-20 mb-6 scroll-mt-32">
                &sect; 6 Verf&uuml;gbarkeit und Service Level
              </h2>
              <p className="leading-relaxed mb-6">
                Flowent AI strebt eine Plattform-Verf&uuml;gbarkeit von 99,5&nbsp;% im Jahresmittel an.
                Eine Garantie f&uuml;r 100&nbsp;% Erreichbarkeit kann nicht &uuml;bernommen werden.
              </p>
              <p className="leading-relaxed mb-6">
                Die Verf&uuml;gbarkeit wird monatlich gemessen als Verh&auml;ltnis der tats&auml;chlichen
                Betriebszeit zur Gesamtzeit des jeweiligen Kalendermonats abz&uuml;glich
                angek&uuml;ndigter Wartungsfenster. Messpunkt ist die Erreichbarkeit der
                Plattform-API (HTTP-Statuscode 200) von einem externen Monitoring-Dienst.
              </p>
              <p className="leading-relaxed mb-6">
                Geplante Wartungsarbeiten werden mindestens 48 Stunden im Voraus per E-Mail oder
                In-App-Benachrichtigung angek&uuml;ndigt und z&auml;hlen nicht als Ausfallzeit. Wartungsfenster
                werden bevorzugt au&szlig;erhalb der regul&auml;ren Gesch&auml;ftszeiten (CET) gelegt.
              </p>
              <p className="leading-relaxed mb-6">
                Die Plattform ist von der Verf&uuml;gbarkeit externer Dienstleister abh&auml;ngig,
                insbesondere OpenAI (KI-Modelle), Vercel (Hosting), Supabase (Datenbank) und
                Redis (Cache). F&uuml;r Ausf&auml;lle dieser Drittanbieter &uuml;bernimmt Flowent AI keine
                Verantwortung.
              </p>
              <p className="leading-relaxed">
                Bei Unterschreitung der angestrebten Verf&uuml;gbarkeit hat der Nutzer Anspruch auf
                eine anteilige Gutschrift der monatlichen Geb&uuml;hren f&uuml;r den betroffenen Zeitraum.
                Weitergehende Schadensersatzanspr&uuml;che wegen Nicht-Verf&uuml;gbarkeit sind &ndash;
                soweit gesetzlich zul&auml;ssig &ndash; ausgeschlossen.
              </p>
            </div>

            {/* ── § 7 Vergütung ────────────────────────────────────────── */}
            <div>
              <h2 id="verguetung" className="text-sm font-bold text-purple-400 uppercase tracking-widest mt-20 mb-6 scroll-mt-32">
                &sect; 7 Verg&uuml;tung und Zahlungsbedingungen
              </h2>
              <p className="leading-relaxed mb-6">
                Die Nutzung der Plattform kann kostenpflichtige Bestandteile umfassen. Die
                jeweils aktuellen Preise sind auf der Website einsehbar. Alle Preise verstehen
                sich zuz&uuml;glich der gesetzlichen Umsatzsteuer. Sofern nicht anders
                vereinbart, gelten folgende Regelungen:
              </p>
              <ul className="list-disc list-inside mb-6 space-y-2">
                <li>Die Abrechnung erfolgt monatlich oder j&auml;hrlich, je nach gew&auml;hltem Tarif</li>
                <li>Zahlungen sind im Voraus f&auml;llig</li>
                <li>Die Zahlung erfolgt per Kreditkarte, SEPA-Lastschrift oder Bank&uuml;berweisung &uuml;ber den Zahlungsdienstleister Stripe</li>
                <li>Bei Zahlungsverzug beh&auml;lt sich Flowent AI das Recht vor, den Zugang zur Plattform nach Mahnung einzuschr&auml;nken</li>
              </ul>
              <p className="leading-relaxed">
                Es steht Flowent AI frei, kostenlose Testphasen oder Free-Tier-Angebote
                anzubieten. Der Umfang und die Dauer solcher Angebote werden separat kommuniziert.
                Ein Anspruch auf dauerhafte Gew&auml;hrung kostenloser Leistungen besteht nicht.
              </p>
              <p className="leading-relaxed">
                Flowent AI ist berechtigt, die Preise mit einer Ank&uuml;ndigungsfrist von
                mindestens 4 Wochen zum n&auml;chsten Abrechnungszeitraum anzupassen,
                insbesondere bei gestiegenen Kosten f&uuml;r KI-Modell-API-Nutzung,
                Infrastruktur oder gesetzlichen Auflagen. Preiserh&ouml;hungen von mehr als
                10&nbsp;% berechtigen den Nutzer zur Sonderk&uuml;ndigung zum Zeitpunkt des
                Inkrafttretens der Erh&ouml;hung.
              </p>
            </div>

            {/* ── § 8 Laufzeit ─────────────────────────────────────────── */}
            <div>
              <h2 id="laufzeit" className="text-sm font-bold text-purple-400 uppercase tracking-widest mt-20 mb-6 scroll-mt-32">
                &sect; 8 Laufzeit und K&uuml;ndigung
              </h2>
              <p className="leading-relaxed mb-6">
                Der Vertrag wird auf unbestimmte Zeit geschlossen und kann von beiden Seiten mit
                einer Frist von 30 Tagen zum Monatsende gek&uuml;ndigt werden. Die K&uuml;ndigung bedarf
                der Textform (E-Mail gen&uuml;gt).
              </p>
              <p className="leading-relaxed mb-6">
                Das Recht zur au&szlig;erordentlichen K&uuml;ndigung aus wichtigem Grund bleibt unber&uuml;hrt.
                Ein wichtiger Grund liegt insbesondere vor, wenn der Nutzer gegen diese AGB
                verst&ouml;&szlig;t, die Plattform missbr&auml;uchlich nutzt oder mit der Zahlung von mehr
                als zwei Monatsbetr&auml;gen in Verzug ger&auml;t.
              </p>
              <p className="leading-relaxed">
                Nach K&uuml;ndigung werden die Daten des Nutzers gem&auml;&szlig; den gesetzlichen
                Aufbewahrungsfristen aufbewahrt und anschlie&szlig;end innerhalb von 30 Tagen gel&ouml;scht.
                Der Nutzer kann vor Ablauf der K&uuml;ndigungsfrist einen Export seiner Daten anfordern.
              </p>
            </div>

            {/* ── § 9 Pflichten des Nutzers ────────────────────────────── */}
            <div>
              <h2 id="pflichten" className="text-sm font-bold text-purple-400 uppercase tracking-widest mt-20 mb-6 scroll-mt-32">
                &sect; 9 Pflichten des Nutzers
              </h2>
              <p className="leading-relaxed mb-6">
                Der Nutzer verpflichtet sich, die Plattform ausschlie&szlig;lich im Rahmen der
                geltenden Gesetze und dieser AGB zu nutzen. Insbesondere ist es untersagt:
              </p>
              <ul className="list-disc list-inside mb-6 space-y-2">
                <li>Die KI-Agenten zur Erzeugung rechtswidriger, diskriminierender, diffamierender oder anderweitig sch&auml;dlicher Inhalte zu verwenden</li>
                <li>Automatisierte Massenanfragen zu stellen, die &uuml;ber die vereinbarten Fair-Use-Grenzen (Token-Limits) hinausgehen</li>
                <li>Sicherheitsmechanismen der Plattform zu umgehen oder zu manipulieren</li>
                <li>Zugangsdaten an unbefugte Dritte weiterzugeben oder mehrere Accounts zu betreiben</li>
              </ul>
              <p className="leading-relaxed mb-6">
                Der Nutzer ist f&uuml;r die Sicherheit seines Accounts verantwortlich, einschlie&szlig;lich
                der Verwendung sicherer Passw&ouml;rter und &ndash; soweit angeboten &ndash; der
                Aktivierung der Zwei-Faktor-Authentifizierung.
              </p>
              <p className="leading-relaxed">
                Bei Verst&ouml;&szlig;en gegen diese Pflichten ist Flowent AI berechtigt, den Zugang des
                Nutzers vor&uuml;bergehend oder dauerhaft zu sperren. Weitergehende Anspr&uuml;che
                (insbesondere Schadensersatz) bleiben vorbehalten.
              </p>
            </div>

            {/* ── § 10 Haftung ─────────────────────────────────────────── */}
            <div>
              <h2 id="haftung" className="text-sm font-bold text-purple-400 uppercase tracking-widest mt-20 mb-6 scroll-mt-32">
                &sect; 10 Haftung
              </h2>
              <p className="leading-relaxed mb-6">
                Flowent AI haftet unbeschr&auml;nkt f&uuml;r Vorsatz und grobe Fahrl&auml;ssigkeit sowie f&uuml;r
                Sch&auml;den aus der Verletzung des Lebens, des K&ouml;rpers oder der Gesundheit.
                F&uuml;r leichte Fahrl&auml;ssigkeit haftet Flowent AI nur bei Verletzung wesentlicher
                Vertragspflichten (Kardinalpflichten), und zwar beschr&auml;nkt auf den vorhersehbaren,
                vertragstypischen Schaden.
              </p>
              <p className="leading-relaxed mb-6">
                Die Gesamthaftung von Flowent AI &ndash; gleich aus welchem Rechtsgrund &ndash; ist
                pro Kalenderjahr auf die Summe der vom Nutzer in den letzten 12 Monaten
                vor dem haftungsausl&ouml;senden Ereignis gezahlten Verg&uuml;tung beschr&auml;nkt, es
                sei denn, es handelt sich um Vorsatz, grobe Fahrl&auml;ssigkeit oder Sch&auml;den
                an Leben, K&ouml;rper oder Gesundheit.
              </p>
              <p className="leading-relaxed mb-6">
                Die Haftungsbeschr&auml;nkungen f&uuml;r KI-generierte Inhalte gem&auml;&szlig; &sect; 4 dieser AGB
                bleiben unber&uuml;hrt. Insbesondere haftet Flowent AI nicht f&uuml;r mittelbare Sch&auml;den,
                entgangenen Gewinn oder Datenverlust, soweit diese nicht auf Vorsatz oder grober
                Fahrl&auml;ssigkeit beruhen.
              </p>
              <p className="leading-relaxed">
                Die Haftung f&uuml;r die Verf&uuml;gbarkeit der Plattform richtet sich nach &sect; 6
                dieser AGB. Die Haftung nach dem Produkthaftungsgesetz bleibt unber&uuml;hrt.
              </p>
            </div>

            {/* ── § 11 Datenschutz ─────────────────────────────────────── */}
            <div>
              <h2 id="datenschutz" className="text-sm font-bold text-purple-400 uppercase tracking-widest mt-20 mb-6 scroll-mt-32">
                &sect; 11 Datenschutz
              </h2>
              <p className="leading-relaxed mb-6">
                Die Verarbeitung personenbezogener Daten erfolgt gem&auml;&szlig; unserer{' '}
                <Link
                  href="/datenschutz"
                  className="text-purple-400 link-glow"
                >
                  Datenschutzerkl&auml;rung
                </Link>. Flowent AI verarbeitet
                personenbezogene Daten des Nutzers nur im Rahmen der gesetzlichen Bestimmungen,
                insbesondere der DSGVO und des BDSG.
              </p>
              <p className="leading-relaxed">
                Konversationsdaten, die im Rahmen der Nutzung der KI-Agenten entstehen, werden
                verschl&uuml;sselt in unserer Datenbank gespeichert und nicht an Dritte weitergegeben,
                sofern dies nicht zur Erbringung der Dienstleistung erforderlich ist (z.&nbsp;B.
                &Uuml;bermittlung an den KI-Modell-Provider gem&auml;&szlig; der Datenschutzerkl&auml;rung).
              </p>
              <p className="leading-relaxed">
                Soweit Flowent AI im Rahmen der Leistungserbringung personenbezogene Daten
                im Auftrag des Nutzers verarbeitet, schlie&szlig;en die Parteien einen
                Auftragsverarbeitungsvertrag gem&auml;&szlig; Art.&nbsp;28 DSGVO ab. Der
                Auftragsverarbeitungsvertrag wird als separater Annex zu diesen AGB
                bereitgestellt und ist unter{' '}
                <Link href="/avv" className="text-purple-400 link-glow">
                  flowent.ai/avv
                </Link>{' '}
                einsehbar.
              </p>
            </div>

            {/* ── § 12 Schlussbestimmungen ──────────────────────────────── */}
            <div>
              <h2 id="schluss" className="text-sm font-bold text-purple-400 uppercase tracking-widest mt-20 mb-6 scroll-mt-32">
                &sect; 12 Schlussbestimmungen
              </h2>
              <p className="leading-relaxed mb-6">
                Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des
                UN-Kaufrechts (CISG). Gerichtsstand f&uuml;r alle Streitigkeiten aus oder im Zusammenhang
                mit diesem Vertrag ist Freiburg im Breisgau.
              </p>
              <p className="leading-relaxed mb-6">
                Sollten einzelne Bestimmungen dieser AGB ganz oder teilweise unwirksam sein
                oder werden, so ber&uuml;hrt dies die Wirksamkeit der &uuml;brigen Bestimmungen nicht
                (salvatorische Klausel). Anstelle der unwirksamen Bestimmung gilt diejenige
                wirksame Bestimmung als vereinbart, die dem wirtschaftlichen Zweck der
                unwirksamen Bestimmung am n&auml;chsten kommt.
              </p>
              <p className="leading-relaxed">
                &Auml;nderungen und Erg&auml;nzungen dieser AGB bed&uuml;rfen der Textform. Flowent AI
                beh&auml;lt sich das Recht vor, diese AGB mit einer Ank&uuml;ndigungsfrist von
                mindestens 6 Wochen zu &auml;ndern. Der Nutzer wird &uuml;ber &Auml;nderungen per E-Mail
                informiert; die &Auml;nderungsmitteilung enth&auml;lt einen ausdr&uuml;cklichen Hinweis
                auf das Widerspruchsrecht und die Folgen des Schweigens. Widerspricht der
                Nutzer nicht innerhalb der Frist, gelten die ge&auml;nderten AGB als angenommen.
                Im Falle des Widerspruchs steht beiden Seiten ein Sonderk&uuml;ndigungsrecht
                zum Zeitpunkt des Inkrafttretens der &Auml;nderung zu.
              </p>
            </div>
          </div>
        </motion.div>
        </div>
      </article>
    </div>
  );
}
