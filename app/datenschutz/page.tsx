'use client';

import { motion } from 'framer-motion';
import { FlowentLogo } from '@/components/ui/FlowentLogo';
import { PublicNavbar } from '@/components/layout/PublicNavbar';

export default function DatenschutzPage() {
  return (
    <div className="min-h-screen bg-[#09090b] noise-overlay page-dot-grid">
      <div className="aura-glow" aria-hidden="true" />
      <div className="bg-mesh" aria-hidden="true" />

      {/* Navigation */}
      <PublicNavbar />

      {/* Content */}
      <article className="relative z-10 max-w-6xl mx-auto px-6 py-32 flex flex-col lg:flex-row gap-12">
        {/* Sticky sidebar — desktop only */}
        <aside className="hidden lg:block w-64 shrink-0">
          <div className="sticky top-32 h-fit">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-6">Inhalt</p>
            <nav className="flex flex-col gap-3">
              <a href="#ueberblick" className="text-sm text-zinc-400 hover:text-purple-400 transition-colors">1. Auf einen Blick</a>
              <a href="#allgemein" className="text-sm text-zinc-400 hover:text-purple-400 transition-colors">2. Allgemeine Hinweise</a>
              <a href="#datenerfassung" className="text-sm text-zinc-400 hover:text-purple-400 transition-colors">3. Datenerfassung</a>
              <a href="#oauth" className="text-sm text-zinc-400 hover:text-purple-400 transition-colors">4. OAuth-Anmeldung</a>
              <a href="#externe-dienste" className="text-sm text-zinc-400 hover:text-purple-400 transition-colors">5. Externe Dienste</a>
              <a href="#ki-dienste" className="text-sm text-zinc-400 hover:text-purple-400 transition-colors">6. KI-Dienste</a>
              <a href="#integrationen" className="text-sm text-zinc-400 hover:text-purple-400 transition-colors">7. Integrationen</a>
              <a href="#analyse" className="text-sm text-zinc-400 hover:text-purple-400 transition-colors">8. Analyse-Tools</a>
              <a href="#drittland" className="text-sm text-zinc-400 hover:text-purple-400 transition-colors">9. Drittlandtransfer</a>
            </nav>
          </div>
        </aside>

        {/* Content column */}
        <div className="w-full lg:flex-1 min-w-0">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 pb-20 md:p-12 md:pb-32 shadow-2xl text-zinc-300 max-w-3xl">
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
                <FlowentLogo className="w-5 h-5 text-violet-400" />
              </div>
            </div>

            <h1 className="text-4xl font-bold tracking-tight mb-2 bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-500">
              Datenschutzerkl&auml;rung
            </h1>
            <p className="text-zinc-500 mb-12">Zuletzt aktualisiert: 20. Februar 2026</p>

            {/* ── 1. Datenschutz auf einen Blick ─────────────────────────── */}
            <div>
              <h2 id="ueberblick" className="text-2xl font-bold text-purple-400 mt-0 mb-6 scroll-mt-24">
                1. Datenschutz auf einen Blick
              </h2>

              <h3 className="text-lg font-semibold text-white mt-0 mb-3">Allgemeine Hinweise</h3>
              <p className="leading-loose mb-6">
                Die folgenden Hinweise geben einen einfachen &Uuml;berblick dar&uuml;ber, was mit Ihren
                personenbezogenen Daten passiert, wenn Sie diese Website besuchen. Personenbezogene
                Daten sind alle Daten, mit denen Sie pers&ouml;nlich identifiziert werden k&ouml;nnen.
              </p>

              <h3 className="text-lg font-semibold text-white mt-8 mb-3">
                Wer ist verantwortlich f&uuml;r die Datenerfassung?
              </h3>
              <p className="leading-loose mb-6">
                Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber. Dessen
                Kontaktdaten k&ouml;nnen Sie dem Abschnitt &ldquo;Hinweis zur verantwortlichen Stelle&rdquo; in
                dieser Datenschutzerkl&auml;rung entnehmen.
              </p>

              <h3 className="text-lg font-semibold text-white mt-8 mb-3">Wie erfassen wir Ihre Daten?</h3>
              <p className="leading-loose mb-6">
                Ihre Daten werden zum einen dadurch erhoben, dass Sie uns diese mitteilen.
                Hierbei kann es sich z.&nbsp;B. um Daten handeln, die Sie in ein Kontaktformular
                eingeben oder bei der Registrierung angeben.
              </p>
              <p className="leading-loose mb-6">
                Andere Daten werden automatisch oder nach Ihrer Einwilligung beim Besuch der
                Website durch unsere IT-Systeme erfasst. Das sind vor allem technische Daten
                (z.&nbsp;B. Internetbrowser, Betriebssystem oder Uhrzeit des Seitenaufrufs).
              </p>

              <h3 className="text-lg font-semibold text-white mt-8 mb-3">Wof&uuml;r nutzen wir Ihre Daten?</h3>
              <p className="leading-loose mb-6">
                Ein Teil der Daten wird erhoben, um eine fehlerfreie Bereitstellung der Website zu
                gew&auml;hrleisten. Andere Daten k&ouml;nnen zur Analyse Ihres Nutzerverhaltens verwendet werden.
                Dar&uuml;ber hinaus werden Daten zur Bereitstellung unserer KI-gest&uuml;tzten Services
                (Agenten-Konversationen, Pipeline-Ausf&uuml;hrungen) verarbeitet.
              </p>

              <h3 className="text-lg font-semibold text-white mt-8 mb-3">
                Welche Rechte haben Sie bez&uuml;glich Ihrer Daten?
              </h3>
              <p className="leading-loose">
                Sie haben jederzeit das Recht, unentgeltlich Auskunft &uuml;ber Herkunft, Empf&auml;nger
                und Zweck Ihrer gespeicherten personenbezogenen Daten zu erhalten. Sie haben
                au&szlig;erdem ein Recht, die Berichtigung oder L&ouml;schung dieser Daten zu verlangen.
                Wenn Sie eine Einwilligung zur Datenverarbeitung erteilt haben, k&ouml;nnen Sie diese
                Einwilligung jederzeit f&uuml;r die Zukunft widerrufen. Au&szlig;erdem haben Sie das Recht,
                unter bestimmten Umst&auml;nden die Einschr&auml;nkung der Verarbeitung Ihrer
                personenbezogenen Daten zu verlangen.
              </p>
            </div>

            {/* ── 2. Allgemeine Hinweise und Pflichtinformationen ──────── */}
            <div>
              <h2 id="allgemein" className="text-2xl font-bold text-purple-400 mt-24 mb-6 scroll-mt-24">
                2. Allgemeine Hinweise und Pflichtinformationen
              </h2>

              <h3 className="text-lg font-semibold text-white mt-0 mb-3">Datenschutz</h3>
              <p className="leading-loose mb-6">
                Die Betreiber dieser Seiten nehmen den Schutz Ihrer pers&ouml;nlichen Daten sehr
                ernst. Wir behandeln Ihre personenbezogenen Daten vertraulich und entsprechend
                den gesetzlichen Datenschutzvorschriften sowie dieser Datenschutzerkl&auml;rung.
              </p>
              <p className="leading-loose mb-6">
                Wir weisen darauf hin, dass die Daten&uuml;bertragung im Internet (z.&nbsp;B. bei der
                Kommunikation per E-Mail) Sicherheitsl&uuml;cken aufweisen kann. Ein l&uuml;ckenloser
                Schutz der Daten vor dem Zugriff durch Dritte ist nicht m&ouml;glich.
              </p>

              <h3 className="text-lg font-semibold text-white mt-8 mb-3">
                Hinweis zur verantwortlichen Stelle
              </h3>
              <p className="leading-loose mb-6">
                Die verantwortliche Stelle f&uuml;r die Datenverarbeitung auf dieser Website ist:
              </p>
              <p className="leading-loose mb-6">
                <span className="text-white font-medium">Luis Ens &ndash; Flowent</span><br />
                Am Neugraben 9<br />
                79112 Freiburg<br />
                E-Mail:{' '}
                <a
                  href="mailto:anfrage@flowent.de"
                  className="text-purple-400 link-glow"
                >
                  anfrage@flowent.de
                </a>
              </p>

              <h3 className="text-lg font-semibold text-white mt-8 mb-3">
                Widerruf Ihrer Einwilligung
              </h3>
              <p className="leading-loose mb-6">
                Viele Datenverarbeitungsvorg&auml;nge sind nur mit Ihrer ausdr&uuml;cklichen Einwilligung
                m&ouml;glich. Sie k&ouml;nnen eine bereits erteilte Einwilligung jederzeit widerrufen.
                Die Rechtm&auml;&szlig;igkeit der bis zum Widerruf erfolgten Datenverarbeitung bleibt
                vom Widerruf unber&uuml;hrt.
              </p>

              <h3 className="text-lg font-semibold text-white mt-8 mb-3">
                Beschwerderecht bei der zust&auml;ndigen Aufsichtsbeh&ouml;rde
              </h3>
              <p className="leading-loose mb-6">
                Im Falle von Verst&ouml;&szlig;en gegen die DSGVO steht den Betroffenen ein Beschwerderecht
                bei einer Aufsichtsbeh&ouml;rde zu, insbesondere in dem Mitgliedstaat ihres
                gew&ouml;hnlichen Aufenthalts, ihres Arbeitsplatzes oder des Orts des mutma&szlig;lichen
                Versto&szlig;es. Die f&uuml;r uns zust&auml;ndige Aufsichtsbeh&ouml;rde ist der Landesbeauftragte
                f&uuml;r den Datenschutz und die Informationsfreiheit Baden-W&uuml;rttemberg.
              </p>

              <h3 className="text-lg font-semibold text-white mt-8 mb-3">
                Recht auf Daten&uuml;bertragbarkeit
              </h3>
              <p className="leading-loose mb-6">
                Sie haben das Recht, Daten, die wir auf Grundlage Ihrer Einwilligung oder in
                Erf&uuml;llung eines Vertrags automatisiert verarbeiten, an sich oder an einen Dritten
                in einem g&auml;ngigen, maschinenlesbaren Format aush&auml;ndigen zu lassen.
              </p>

              <h3 className="text-lg font-semibold text-white mt-8 mb-3">
                Recht auf Einschr&auml;nkung der Verarbeitung
              </h3>
              <p className="leading-loose mb-6">
                Sie haben das Recht, die Einschr&auml;nkung der Verarbeitung Ihrer personenbezogenen
                Daten zu verlangen. Hierzu k&ouml;nnen Sie sich jederzeit an uns wenden. Das Recht
                auf Einschr&auml;nkung der Verarbeitung besteht insbesondere, wenn die Richtigkeit
                der Daten bestritten wird, die Verarbeitung unrechtm&auml;&szlig;ig ist oder der
                Verarbeitungszweck entfallen ist.
              </p>

              <h3 className="text-lg font-semibold text-white mt-8 mb-3">
                Auskunft, L&ouml;schung und Berichtigung
              </h3>
              <p className="leading-loose mb-6">
                Sie haben im Rahmen der geltenden gesetzlichen Bestimmungen jederzeit das Recht
                auf unentgeltliche Auskunft &uuml;ber Ihre gespeicherten personenbezogenen Daten,
                deren Herkunft und Empf&auml;nger und den Zweck der Datenverarbeitung und ggf. ein
                Recht auf Berichtigung oder L&ouml;schung dieser Daten.
              </p>

              <h3 className="text-lg font-semibold text-white mt-8 mb-3">
                Aufbewahrungsfristen
              </h3>
              <p className="leading-loose">
                Soweit innerhalb dieser Datenschutzerkl&auml;rung keine speziellere Speicherfrist
                genannt wurde, verbleiben Ihre personenbezogenen Daten bei uns, bis der Zweck
                f&uuml;r die Datenverarbeitung entf&auml;llt. Konversationsdaten mit KI-Agenten werden
                f&uuml;r die Dauer Ihres Nutzungsvertrags gespeichert. Nach K&uuml;ndigung werden Ihre
                Daten innerhalb von 30 Tagen gel&ouml;scht, sofern keine gesetzlichen
                Aufbewahrungspflichten (z.&nbsp;B. steuer- oder handelsrechtliche) entgegenstehen.
                Audit-Logs werden f&uuml;r 12 Monate aufbewahrt.
              </p>
            </div>

            {/* ── 3. Datenerfassung auf dieser Website ─────────────────── */}
            <div>
              <h2 id="datenerfassung" className="text-2xl font-bold text-purple-400 mt-24 mb-6 scroll-mt-24">
                3. Datenerfassung auf dieser Website
              </h2>

              <h3 className="text-lg font-semibold text-white mt-0 mb-3">Cookies</h3>
              <p className="leading-loose mb-6">
                Unsere Internetseiten verwenden so genannte &ldquo;Cookies&rdquo;. Cookies sind kleine
                Datenpakete und richten auf Ihrem Endger&auml;t keinen Schaden an. Sie werden entweder
                vor&uuml;bergehend f&uuml;r die Dauer einer Sitzung (Session-Cookies) oder dauerhaft
                (permanente Cookies) auf Ihrem Endger&auml;t gespeichert.
              </p>
              <p className="leading-loose mb-6">Wir verwenden folgende Cookies:</p>
              <ul className="list-disc list-inside mb-6 space-y-2">
                <li><span className="text-white font-medium">sintra.sid</span> (httpOnly) &ndash; Enth&auml;lt Ihr verschl&uuml;sseltes Session-Token (JWT). Lebensdauer: 7&ndash;14 Tage.</li>
                <li><span className="text-white font-medium">sintra.csrf</span> &ndash; CSRF-Schutztoken zur Absicherung von Formular&uuml;bermittlungen. Lebensdauer: 24 Stunden.</li>
                <li><span className="text-white font-medium">sintra_email_verified</span> &ndash; Zeigt den E-Mail-Verifizierungsstatus an. Lebensdauer: 7 Tage.</li>
              </ul>
              <p className="leading-loose mb-6">
                Rechtsgrundlage f&uuml;r die Verwendung technisch notwendiger Cookies ist
                Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der sicheren
                Bereitstellung der Website).
              </p>

              <h3 className="text-lg font-semibold text-white mt-8 mb-3">Local Storage (Browser-Speicher)</h3>
              <p className="leading-loose mb-6">
                Zus&auml;tzlich zu Cookies speichern wir bestimmte Daten im Local Storage Ihres
                Browsers. Dabei handelt es sich um:
              </p>
              <ul className="list-disc list-inside mb-6 space-y-2">
                <li><span className="text-white font-medium">Sitzungsdaten:</span> Ihre Benutzer-ID, Anzeigename, E-Mail und Rolle (zur Vermeidung unn&ouml;tiger Server-Anfragen)</li>
                <li><span className="text-white font-medium">Einstellungen:</span> Gew&auml;hltes Farbschema (Theme), Spracheinstellungen</li>
              </ul>
              <p className="leading-loose mb-6">
                Diese Daten werden ausschlie&szlig;lich lokal in Ihrem Browser gespeichert und
                nicht an Dritte &uuml;bermittelt. Sie k&ouml;nnen den Local Storage jederzeit &uuml;ber die
                Entwicklertools Ihres Browsers l&ouml;schen.
              </p>

              <h3 className="text-lg font-semibold text-white mt-8 mb-3">Server-Log-Dateien</h3>
              <p className="leading-loose mb-6">
                Der Provider der Seiten erhebt und speichert automatisch Informationen in so
                genannten Server-Log-Dateien, die Ihr Browser automatisch an uns &uuml;bermittelt.
                Dies sind:
              </p>
              <ul className="list-disc list-inside mb-6 space-y-2">
                <li>Browsertyp und Browserversion</li>
                <li>Verwendetes Betriebssystem</li>
                <li>Referrer URL</li>
                <li>Hostname des zugreifenden Rechners</li>
                <li>Uhrzeit der Serveranfrage</li>
                <li>IP-Adresse</li>
              </ul>
              <p className="leading-loose mb-6">
                Eine Zusammenf&uuml;hrung dieser Daten mit anderen Datenquellen wird nicht vorgenommen.
                Grundlage f&uuml;r die Datenverarbeitung ist Art. 6 Abs. 1 lit. f DSGVO.
              </p>

              <h3 className="text-lg font-semibold text-white mt-8 mb-3">Registrierung auf dieser Website</h3>
              <p className="leading-loose mb-6">
                Sie k&ouml;nnen sich auf dieser Website registrieren, um zus&auml;tzliche Funktionen auf der
                Seite zu nutzen. Bei der Registrierung erfassen wir:
              </p>
              <ul className="list-disc list-inside mb-6 space-y-2">
                <li>Name und E-Mail-Adresse</li>
                <li>Verschl&uuml;sseltes Passwort (Bcrypt-Hash mit dynamischem Kostenfaktor)</li>
                <li>Zeitpunkt der Registrierung</li>
              </ul>
              <p className="leading-loose mb-6">
                Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Vertragserf&uuml;llung).
                Optional k&ouml;nnen Sie weitere Profildaten angeben (Anzeigename, Profilbild,
                Biographie, Standort, Pronomen, Berufsbezeichnung). Diese Angaben sind freiwillig.
              </p>

              <h3 className="text-lg font-semibold text-white mt-8 mb-3">Ger&auml;teerkennung und Sicherheitsma&szlig;nahmen</h3>
              <p className="leading-loose mb-6">
                Zum Schutz Ihres Kontos erfassen und speichern wir bei jeder Anmeldung folgende
                ger&auml;tebezogene Daten:
              </p>
              <ul className="list-disc list-inside mb-6 space-y-2">
                <li>IP-Adresse und User-Agent (Browserkennung)</li>
                <li>Ger&auml;te-Hash (pseudonymisierter Fingerprint aus User-Agent und partieller IP)</li>
                <li>Ger&auml;teinformationen (Browsername, Betriebssystem, Ger&auml;tetyp)</li>
                <li>Zeitpunkt der letzten Anmeldung</li>
              </ul>
              <p className="leading-loose mb-6">
                Bei Erkennung eines unbekannten Ger&auml;ts erhalten Sie eine Sicherheitsbenachrichtigung
                per E-Mail. Sie k&ouml;nnen vertrauensw&uuml;rdige Ger&auml;te in Ihren Kontoeinstellungen verwalten.
                Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse am Schutz
                vor unbefugtem Zugriff).
              </p>

              <h3 className="text-lg font-semibold text-white mt-8 mb-3">Zwei-Faktor-Authentifizierung (2FA)</h3>
              <p className="leading-loose mb-6">
                Wenn Sie die Zwei-Faktor-Authentifizierung aktivieren, speichern wir ein
                verschl&uuml;sseltes TOTP-Geheimnis (Time-based One-Time Password gem&auml;&szlig; RFC 6238)
                sowie einmalig generierte Wiederherstellungscodes in unserer Datenbank.
                Diese Daten dienen ausschlie&szlig;lich der Absicherung Ihres Kontos.
              </p>

              <h3 className="text-lg font-semibold text-white mt-8 mb-3">KI-Konversationsdaten</h3>
              <p className="leading-loose">
                Bei der Nutzung unserer KI-Agenten werden Ihre Nachrichten und die Antworten der
                Agenten in unserer Datenbank gespeichert, um Ihnen Ihre Konversationshistorie
                bereitzustellen. Zus&auml;tzlich speichern wir Token-Verbrauch, verwendetes Modell
                und Antwortzeiten zur Qualit&auml;tssicherung. Diese Daten werden ausschlie&szlig;lich
                f&uuml;r die Erbringung unserer Dienstleistung verwendet.
              </p>
            </div>

            {/* ── 4. Anmeldung über Drittanbieter (OAuth) ────────────── */}
            <div>
              <h2 id="oauth" className="text-2xl font-bold text-purple-400 mt-24 mb-6 scroll-mt-24">
                4. Anmeldung &uuml;ber Drittanbieter (OAuth)
              </h2>

              <h3 className="text-lg font-semibold text-white mt-0 mb-3">Anmeldung mit Google</h3>
              <p className="leading-loose mb-6">
                Sie k&ouml;nnen sich mit Ihrem Google-Konto auf unserer Plattform anmelden.
                Bei der Anmeldung erhalten wir von Google folgende Daten:
              </p>
              <ul className="list-disc list-inside mb-6 space-y-2">
                <li>Google-Benutzer-ID (Sub-Claim)</li>
                <li>E-Mail-Adresse und Verifizierungsstatus</li>
                <li>Vor- und Nachname</li>
                <li>Profilbild-URL</li>
              </ul>
              <p className="leading-loose mb-6">
                Die Authentifizierung erfolgt &uuml;ber das OAuth 2.0-Protokoll mit PKCE
                (Proof Key for Code Exchange) f&uuml;r maximale Sicherheit. Anbieter ist
                Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland.
                Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Vertragserf&uuml;llung).
              </p>

              <h3 className="text-lg font-semibold text-white mt-8 mb-3">Anmeldung mit GitHub</h3>
              <p className="leading-loose mb-6">
                Bei der Anmeldung mit GitHub erhalten wir Ihren Benutzernamen, Ihre
                E-Mail-Adresse und Ihr Profilbild. Anbieter ist GitHub, Inc., 88 Colin P
                Kelly Jr Street, San Francisco, CA 94107, USA. Die Daten&uuml;bermittlung in die
                USA erfolgt auf Grundlage des EU-US Data Privacy Frameworks.
              </p>

              <h3 className="text-lg font-semibold text-white mt-8 mb-3">Passkeys (WebAuthn / FIDO2)</h3>
              <p className="leading-loose">
                Sie k&ouml;nnen sich passwortlos mit Passkeys anmelden (z.&nbsp;B. Face ID,
                Touch ID, YubiKey). Dabei speichern wir ausschlie&szlig;lich den &ouml;ffentlichen
                Schl&uuml;ssel Ihrer Zugangsdaten (Credential Public Key), die Credential-ID
                und den Ger&auml;tetyp. Ihr privater Schl&uuml;ssel verl&auml;sst niemals Ihr Ger&auml;t.
                Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.
              </p>
            </div>

            {/* ── 5. Externe Dienste und Auftragsverarbeitung ────────── */}
            <div>
              <h2 id="externe-dienste" className="text-2xl font-bold text-purple-400 mt-24 mb-6 scroll-mt-24">
                5. Externe Dienste und Auftragsverarbeitung
              </h2>

              <p className="leading-loose mb-6">
                Wir setzen zur Erbringung unserer Dienste externe Dienstleister ein, mit denen
                wir &ndash; soweit erforderlich &ndash; Auftragsverarbeitungsvertr&auml;ge (AVV) gem.
                Art. 28 DSGVO geschlossen haben.
              </p>

              <h3 className="text-lg font-semibold text-white mt-8 mb-3">Hosting: Vercel Inc.</h3>
              <p className="leading-loose mb-6">
                Diese Website wird auf der Plattform von Vercel Inc., 340 S Lemon Ave #4133,
                Walnut, CA 91789, USA gehostet. Beim Besuch unserer Website werden automatisch
                Ihre IP-Adresse, Browsertyp und Zugriffszeit an Vercel-Server &uuml;bermittelt.
                Vercel ist unter dem EU-US Data Privacy Framework zertifiziert.
                Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO.
              </p>

              <h3 className="text-lg font-semibold text-white mt-8 mb-3">Datenbank: Supabase</h3>
              <p className="leading-loose mb-6">
                S&auml;mtliche Nutzerdaten werden in einer PostgreSQL-Datenbank gespeichert, die
                von Supabase, Inc. in der AWS-Region <span className="text-white font-medium">eu-west-1
                (Irland)</span> betrieben wird. Alle Daten verbleiben somit innerhalb der
                Europ&auml;ischen Union. Die Verbindung ist SSL-verschl&uuml;sselt.
                Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.
              </p>

              <h3 className="text-lg font-semibold text-white mt-8 mb-3">Cache und Warteschlangen: Redis</h3>
              <p className="leading-loose mb-6">
                F&uuml;r tempor&auml;re Datenspeicherung (Session-Cache, Rate-Limiting,
                Hintergrund-Aufgaben) nutzen wir Redis Labs. Zwischengespeicherte Daten
                sind fl&uuml;chtig und werden automatisch nach Ablauf der konfigurierten
                Lebensdauer gel&ouml;scht.
              </p>

              <h3 className="text-lg font-semibold text-white mt-8 mb-3">E-Mail-Versand: Resend</h3>
              <p className="leading-loose mb-6">
                F&uuml;r den Versand transaktionaler E-Mails (E-Mail-Verifizierung, Passwort-Reset,
                Sicherheitsbenachrichtigungen bei neuem Ger&auml;t) nutzen wir den Dienst Resend
                (Resend, Inc., USA). Dabei werden Ihre E-Mail-Adresse und der
                Nachrichteninhalt an Resend &uuml;bermittelt.
                Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.
              </p>

              <h3 className="text-lg font-semibold text-white mt-8 mb-3">Zahlungsabwicklung: Stripe</h3>
              <p className="leading-loose mb-6">
                F&uuml;r die Abwicklung von Zahlungen nutzen wir den Dienst von Stripe, Inc.,
                510 Townsend Street, San Francisco, CA 94103, USA. Bei einem Kauf werden Ihre
                E-Mail-Adresse, der gew&auml;hlte Tarif und die Zahlungsinformationen direkt an
                Stripe &uuml;bermittelt. Flowent AI speichert keine Kreditkartendaten.
                Stripe ist unter dem EU-US Data Privacy Framework zertifiziert.
                Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.
                Weitere Informationen finden Sie in der{' '}
                <a
                  href="https://stripe.com/de/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-400 link-glow"
                >
                  Datenschutzerkl&auml;rung von Stripe
                </a>.
              </p>

              <h3 className="text-lg font-semibold text-white mt-8 mb-3">Fehler&uuml;berwachung: Sentry</h3>
              <p className="leading-loose">
                Zur Erkennung und Behebung technischer Fehler nutzen wir Sentry
                (Functional Software, Inc., San Francisco, USA). Im Fehlerfall werden
                technische Daten (Stack-Traces, Browser-Informationen, anonyme Session-Daten)
                an Sentry &uuml;bermittelt. Sentry erh&auml;lt keine personenbezogenen Daten wie
                Namen oder E-Mail-Adressen. Cookies und sensible Header werden vor der
                &Uuml;bermittlung entfernt. Sentry ist nur in der Produktionsumgebung aktiv.
                Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO.
              </p>
            </div>

            {/* ── 6. KI-Dienste und Datenverarbeitung ────────────────── */}
            <div>
              <h2 id="ki-dienste" className="text-2xl font-bold text-purple-400 mt-24 mb-6 scroll-mt-24">
                6. KI-Dienste und Datenverarbeitung
              </h2>

              <h3 className="text-lg font-semibold text-white mt-0 mb-3">OpenAI API</h3>
              <p className="leading-loose mb-6">
                F&uuml;r die Bereitstellung unserer KI-Agenten nutzen wir die API von OpenAI, Inc.,
                3180 18th Street, San Francisco, CA 94110, USA. Dabei werden folgende Daten
                an die OpenAI-Server &uuml;bermittelt:
              </p>
              <ul className="list-disc list-inside mb-6 space-y-2">
                <li>Ihre Eingaben (Prompts) und Konversationskontexte (letzten 10 Nachrichten)</li>
                <li>Agent-spezifische System-Prompts (enthalten keine personenbezogenen Daten)</li>
                <li>Modellparameter (Temperatur, Token-Limit)</li>
              </ul>
              <p className="leading-loose mb-6">
                <span className="text-white font-medium">Wichtig:</span> API-Daten werden von
                OpenAI gem&auml;&szlig; ihrer{' '}
                <a
                  href="https://openai.com/policies/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-400 link-glow"
                >
                  Datenschutzrichtlinie
                </a>{' '}
                verarbeitet und <span className="text-white font-medium">nicht f&uuml;r das
                Training ihrer Modelle verwendet</span> (API Data Usage Policy).
              </p>
              <p className="leading-loose mb-6">
                <span className="text-white font-medium">Hinweis zur Nutzung:</span> Geben Sie
                keine sensiblen personenbezogenen Daten (Gesundheitsdaten, Finanzinformationen,
                Sozialversicherungsnummern) in die Agenten-Konversationen ein. Die generierten
                Inhalte stellen keine Rechts-, Finanz- oder Medizinberatung dar.
              </p>
              <p className="leading-loose">
                Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Vertragserf&uuml;llung).
                Die Daten&uuml;bermittlung in die USA erfolgt auf Grundlage des EU-US Data
                Privacy Frameworks sowie Standardvertragsklauseln (SCCs).
              </p>
            </div>

            {/* ── 7. Drittanbieter-Integrationen ─────────────────────── */}
            <div>
              <h2 id="integrationen" className="text-2xl font-bold text-purple-400 mt-24 mb-6 scroll-mt-24">
                7. Drittanbieter-Integrationen
              </h2>

              <h3 className="text-lg font-semibold text-white mt-0 mb-3">Google Workspace</h3>
              <p className="leading-loose mb-6">
                Sie k&ouml;nnen optional Ihr Google-Konto mit unserer Plattform verbinden, um
                folgende Dienste zu nutzen: Google Tasks, Google Sheets, Google Drive,
                Google Calendar, Google Contacts und Gmail. Dabei werden OAuth 2.0-Tokens
                verwendet, die in unserer Datenbank mit AES-256-GCM verschl&uuml;sselt
                gespeichert werden.
              </p>
              <p className="leading-loose mb-6">
                Die Verbindung ist freiwillig und kann jederzeit in den Kontoeinstellungen
                getrennt werden. Bei Trennung werden die gespeicherten Tokens unwiderruflich
                gel&ouml;scht. Anbieter ist Google Ireland Limited.
                Rechtsgrundlage ist Art. 6 Abs. 1 lit. a DSGVO (Einwilligung).
              </p>

              <h3 className="text-lg font-semibold text-white mt-8 mb-3">Slack</h3>
              <p className="leading-loose mb-6">
                Bei optionaler Verbindung mit Slack werden Nachrichten, Kanalinformationen
                und Team-Mitgliederdaten zwischen unserer Plattform und Slack ausgetauscht.
                Anbieter ist Salesforce, Inc. (Slack Technologies), San Francisco, USA.
                Die Verbindung kann jederzeit getrennt werden.
                Rechtsgrundlage ist Art. 6 Abs. 1 lit. a DSGVO (Einwilligung).
              </p>

              <h3 className="text-lg font-semibold text-white mt-8 mb-3">Sicherheit der Zugangsdaten</h3>
              <p className="leading-loose">
                S&auml;mtliche OAuth-Tokens und API-Schl&uuml;ssel, die durch Integrationen entstehen,
                werden mit AES-256-GCM (Advanced Encryption Standard, 256-Bit-Schl&uuml;ssell&auml;nge)
                in unserer Datenbank verschl&uuml;sselt gespeichert. Der Verschl&uuml;sselungsschl&uuml;ssel
                wird getrennt von der Datenbank aufbewahrt.
              </p>
            </div>

            {/* ── 8. Analyse-Tools ───────────────────────────────────── */}
            <div>
              <h2 id="analyse" className="text-2xl font-bold text-purple-400 mt-24 mb-6 scroll-mt-24">
                8. Analyse-Tools
              </h2>

              <h3 className="text-lg font-semibold text-white mt-0 mb-3">Vercel Analytics</h3>
              <p className="leading-loose mb-6">
                Diese Website nutzt Vercel Analytics, einen Webanalysedienst der Vercel Inc.
                Vercel Analytics verwendet keine Cookies und erfasst keine personenbezogenen
                Daten. Es werden lediglich anonymisierte Zugriffsdaten zur Performance-Analyse
                erhoben (Core Web Vitals, Seitenaufrufe). Weitere Informationen finden Sie in der{' '}
                <a
                  href="https://vercel.com/legal/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-400 link-glow"
                >
                  Datenschutzerkl&auml;rung von Vercel
                </a>.
              </p>

              <h3 className="text-lg font-semibold text-white mt-8 mb-3">Vercel Speed Insights</h3>
              <p className="leading-loose">
                Zus&auml;tzlich nutzen wir Vercel Speed Insights zur Messung der
                Ladegeschwindigkeit unserer Website. Dabei werden anonymisierte
                Performance-Metriken erhoben. Es werden keine personenbezogenen
                Daten erfasst. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO.
              </p>
            </div>

            {/* ── 9. Internationale Datenübermittlung ────────────────── */}
            <div>
              <h2 id="drittland" className="text-2xl font-bold text-purple-400 mt-24 mb-6 scroll-mt-24">
                9. Internationale Daten&uuml;bermittlung (Drittlandtransfer)
              </h2>

              <h3 className="text-lg font-semibold text-white mt-0 mb-3">&Uuml;bermittlung in die USA</h3>
              <p className="leading-loose mb-6">
                Einige unserer Dienstleister haben ihren Sitz in den Vereinigten Staaten
                von Amerika (USA), einem Land au&szlig;erhalb des Europ&auml;ischen Wirtschaftsraums
                (EWR). Die &Uuml;bermittlung personenbezogener Daten an diese Dienstleister
                erfolgt auf folgenden Rechtsgrundlagen:
              </p>
              <ul className="list-disc list-inside mb-6 space-y-2">
                <li><span className="text-white font-medium">EU-US Data Privacy Framework (DPF):</span> OpenAI, Vercel, Stripe und Sentry sind unter dem DPF zertifiziert, das am 10. Juli 2023 von der EU-Kommission als angemessenes Schutzniveau anerkannt wurde.</li>
                <li><span className="text-white font-medium">Standardvertragsklauseln (SCCs):</span> Wo keine DPF-Zertifizierung vorliegt, verwenden wir die von der EU-Kommission genehmigten Standardvertragsklauseln gem. Art. 46 Abs. 2 lit. c DSGVO.</li>
              </ul>

              <h3 className="text-lg font-semibold text-white mt-8 mb-3">Betroffene Dienste</h3>
              <ul className="list-disc list-inside mb-6 space-y-2">
                <li><span className="text-white font-medium">OpenAI, Inc.</span> (San Francisco) &ndash; KI-Modell-API</li>
                <li><span className="text-white font-medium">Vercel, Inc.</span> (San Francisco) &ndash; Hosting &amp; Analytics</li>
                <li><span className="text-white font-medium">Stripe, Inc.</span> (San Francisco) &ndash; Zahlungsabwicklung</li>
                <li><span className="text-white font-medium">Sentry / Functional Software, Inc.</span> (San Francisco) &ndash; Fehler&uuml;berwachung</li>
                <li><span className="text-white font-medium">Resend, Inc.</span> (USA) &ndash; E-Mail-Versand</li>
                <li><span className="text-white font-medium">Redis Labs</span> (USA) &ndash; Cache und Warteschlangen</li>
                <li><span className="text-white font-medium">GitHub, Inc.</span> (San Francisco) &ndash; OAuth-Anmeldung</li>
              </ul>
              <p className="leading-loose">
                Die Datenbank (Supabase/PostgreSQL) wird in der EU-Region
                <span className="text-white font-medium"> eu-west-1 (Irland)</span> betrieben.
                S&auml;mtliche Nutzerdaten verbleiben somit innerhalb der EU. Nur f&uuml;r die in
                dieser Erkl&auml;rung genannten Zwecke werden Daten an US-Dienste &uuml;bermittelt.
              </p>
            </div>
          </div>
        </motion.div>
        </div>
      </article>
    </div>
  );
}
