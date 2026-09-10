// Build withUs features page (marketing).
const Check = () => (
  <span className="check"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg></span>
);

export default function FeaturesPage() {
  return (
    <main>
      {/* HERO */}
      <section className="features-hero">
        <div className="container">
          <div className="eyebrow">Fonctionnalités</div>
          <h1>Tout pour créer, <em>sans jamais</em> rogner sur la qualité.</h1>
          <p className="lead">Des emails qui envoient, des factures conformes, des contrats solides. Un seul outil, pensé pour les pros qui n&apos;ont pas de temps à perdre.</p>

          <nav className="features-nav">
            <a href="#emails">Emails</a>
            <a href="#factures">Factures</a>
            <a href="#contrats">Contrats</a>
            <a href="#ia">IA &amp; Images</a>
            <a href="#integrations">Intégrations</a>
          </nav>
        </div>
      </section>

      {/* EMAIL BUILDER */}
      <section className="feature-deep" id="emails">
        <div className="container">
          <div className="feature-content">
            <div className="eyebrow">Email Builder</div>
            <h2>Un builder qui pense <em>comme vous</em>.</h2>
            <p className="feature-lead">20+ templates premium, un éditeur modulaire par blocs, et l&apos;export code HTML quand vous avez besoin de peaufiner. Aucun lock-in.</p>

            <ul className="feature-list">
              <li><Check /><span><strong>20+ templates premium</strong> — newsletters, transactionnels, promotions, réengagement. Tous responsive et testés sur 30+ clients mail.</span></li>
              <li><Check /><span><strong>Builder modulaire par sections</strong> — hero, colonnes, CTA, produits, témoignages. Glissez-déposez, réordonnez, dupliquez.</span></li>
              <li><Check /><span><strong>Variables dynamiques</strong> — <code>{'{{client_nom}}'}</code>, <code>{'{{commande_total}}'}</code>, conditions, boucles. Votre CRM branche, on adapte.</span></li>
              <li><Check /><span><strong>Export HTML propre</strong> — MJML ou HTML inline, à vous de voir. Compatible avec tout client mail sérieux.</span></li>
            </ul>

            <a href="/pricing" className="btn btn-primary" data-magnet>Voir les tarifs
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
            </a>
          </div>

          <div className="feature-visual">
            <svg viewBox="0 0 600 450" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="emailHero" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366F1" />
                  <stop offset="100%" stopColor="#4338CA" />
                </linearGradient>
              </defs>
              <rect x="40" y="30" width="520" height="390" rx="12" fill="#FFFFFF" stroke="#E8ECF4" />
              <rect x="40" y="30" width="520" height="32" rx="12" fill="#F4F6FB" />
              <circle cx="58" cy="46" r="4" fill="#F43F5E" />
              <circle cx="74" cy="46" r="4" fill="#FBBF24" />
              <circle cx="90" cy="46" r="4" fill="#10B981" />
              <rect x="40" y="62" width="120" height="358" fill="#FAFBFE" />
              <rect x="56" y="82" width="88" height="8" rx="2" fill="#6366F1" />
              <rect x="56" y="102" width="60" height="6" rx="2" fill="#D8DEED" />
              <rect x="56" y="118" width="70" height="6" rx="2" fill="#D8DEED" />
              <rect x="56" y="134" width="50" height="6" rx="2" fill="#D8DEED" />
              <rect x="56" y="160" width="88" height="60" rx="6" fill="#FFFFFF" stroke="#E8ECF4" />
              <rect x="64" y="168" width="40" height="5" rx="2" fill="#8590A8" />
              <rect x="64" y="180" width="72" height="24" rx="4" fill="#EEF1FA" />
              <rect x="180" y="82" width="360" height="120" rx="8" fill="url(#emailHero)" />
              <rect x="210" y="110" width="140" height="10" rx="2" fill="#FFFFFF" opacity="0.9" />
              <rect x="210" y="130" width="180" height="6" rx="2" fill="#FFFFFF" opacity="0.6" />
              <rect x="210" y="144" width="120" height="6" rx="2" fill="#FFFFFF" opacity="0.6" />
              <rect x="210" y="166" width="90" height="24" rx="12" fill="#C6F24E" />
              <rect x="180" y="216" width="170" height="100" rx="6" fill="#F4F6FB" />
              <rect x="370" y="216" width="170" height="100" rx="6" fill="#F4F6FB" />
              <rect x="196" y="232" width="100" height="8" rx="2" fill="#0A0E1A" />
              <rect x="196" y="248" width="130" height="6" rx="2" fill="#8590A8" />
              <rect x="196" y="260" width="110" height="6" rx="2" fill="#8590A8" />
              <rect x="386" y="232" width="100" height="8" rx="2" fill="#0A0E1A" />
              <rect x="386" y="248" width="130" height="6" rx="2" fill="#8590A8" />
              <rect x="386" y="260" width="110" height="6" rx="2" fill="#8590A8" />
              <rect x="180" y="330" width="360" height="70" rx="6" fill="#0A0E1A" />
              <rect x="210" y="350" width="90" height="8" rx="2" fill="#FFFFFF" opacity="0.9" />
              <rect x="210" y="368" width="140" height="6" rx="2" fill="#FFFFFF" opacity="0.5" />
              <rect x="210" y="380" width="120" height="6" rx="2" fill="#FFFFFF" opacity="0.5" />
              <g transform="translate(340, 190)">
                <path d="M 0 0 L 0 16 L 4 12 L 8 20 L 10 19 L 6 11 L 12 11 Z" fill="#0A0E1A" />
              </g>
            </svg>
          </div>
        </div>
      </section>

      {/* FACTURES */}
      <section className="feature-deep dark reversed" id="factures">
        <div className="container">
          <div className="feature-content">
            <div className="eyebrow">Factures</div>
            <h2>Conformes, <em>point final</em>.</h2>
            <p className="feature-lead">6 types de factures, HT/TVA/TTC calculés automatiquement, mentions légales FR à jour, Chorus Pro et Factur-X. Vous émettez, on s&apos;occupe du reste.</p>

            <ul className="feature-list">
              <li><Check /><span><strong>Numérotation continue</strong> — conforme à l&apos;article 242 nonies A CGI. Aucun trou, aucune fraude possible.</span></li>
              <li><Check /><span><strong>Factur-X intégré</strong> — PDF avec XML UBL embarqué, lisible par humain comme par logiciel compta.</span></li>
              <li><Check /><span><strong>Chorus Pro</strong> — dépôt direct pour vos clients publics. Fini le copier-coller administratif.</span></li>
              <li><Check /><span><strong>Profils entreprise</strong> — SIRET, adresse, TVA pré-remplis. Multi-entités si vous en gérez plusieurs.</span></li>
            </ul>

            <div className="types-grid">
              <div className="type-card">
                <div className="type-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2" /><line x1="8" y1="10" x2="16" y2="10" /><line x1="8" y1="14" x2="14" y2="14" /></svg></div>
                <h4>Standard</h4>
                <p>Facture classique HT/TVA/TTC</p>
              </div>
              <div className="type-card">
                <div className="type-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 4v16" /><path d="M4 12h16" /></svg></div>
                <h4>Pro-forma</h4>
                <p>Devis engageant pré-factu</p>
              </div>
              <div className="type-card">
                <div className="type-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 3" /></svg></div>
                <h4>Acompte</h4>
                <p>Versement partiel</p>
              </div>
              <div className="type-card">
                <div className="type-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg></div>
                <h4>Solde</h4>
                <p>Solde final après acompte</p>
              </div>
              <div className="type-card">
                <div className="type-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12h16" /><polyline points="8 8 4 12 8 16" /></svg></div>
                <h4>Avoir</h4>
                <p>Remboursement / correction</p>
              </div>
              <div className="type-card">
                <div className="type-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></svg></div>
                <h4>Récurrente</h4>
                <p>Abonnements auto</p>
              </div>
            </div>
          </div>

          <div className="feature-visual">
            <svg viewBox="0 0 600 450" xmlns="http://www.w3.org/2000/svg">
              <rect x="100" y="50" width="400" height="360" rx="8" fill="#FFFFFF" />
              <rect x="130" y="80" width="110" height="12" rx="2" fill="#0A0E1A" />
              <rect x="130" y="100" width="70" height="6" rx="2" fill="#8590A8" />
              <rect x="400" y="80" width="70" height="32" rx="4" fill="#C6F24E" />
              <text x="435" y="101" textAnchor="middle" fontFamily="system-ui" fontSize="12" fontWeight="700" fill="#0A0E1A">FAC-2026-042</text>
              <line x1="130" y1="130" x2="470" y2="130" stroke="#E8ECF4" strokeWidth="1" />
              <rect x="130" y="150" width="40" height="6" rx="2" fill="#8590A8" />
              <rect x="130" y="164" width="100" height="6" rx="2" fill="#0A0E1A" />
              <rect x="130" y="176" width="120" height="5" rx="2" fill="#0A0E1A" />
              <rect x="130" y="186" width="90" height="5" rx="2" fill="#0A0E1A" />
              <rect x="320" y="150" width="40" height="6" rx="2" fill="#8590A8" />
              <rect x="320" y="164" width="100" height="6" rx="2" fill="#0A0E1A" />
              <rect x="320" y="176" width="120" height="5" rx="2" fill="#0A0E1A" />
              <rect x="320" y="186" width="90" height="5" rx="2" fill="#0A0E1A" />
              <rect x="130" y="220" width="340" height="28" fill="#F4F6FB" />
              <rect x="140" y="232" width="60" height="5" rx="2" fill="#8590A8" />
              <rect x="280" y="232" width="30" height="5" rx="2" fill="#8590A8" />
              <rect x="340" y="232" width="40" height="5" rx="2" fill="#8590A8" />
              <rect x="420" y="232" width="40" height="5" rx="2" fill="#8590A8" />
              <line x1="130" y1="260" x2="470" y2="260" stroke="#E8ECF4" />
              <rect x="140" y="270" width="120" height="6" rx="2" fill="#0A0E1A" />
              <rect x="280" y="270" width="20" height="6" rx="2" fill="#0A0E1A" />
              <rect x="340" y="270" width="40" height="6" rx="2" fill="#0A0E1A" />
              <rect x="420" y="270" width="40" height="6" rx="2" fill="#0A0E1A" />
              <line x1="130" y1="290" x2="470" y2="290" stroke="#E8ECF4" />
              <rect x="140" y="300" width="100" height="6" rx="2" fill="#0A0E1A" />
              <rect x="280" y="300" width="20" height="6" rx="2" fill="#0A0E1A" />
              <rect x="340" y="300" width="40" height="6" rx="2" fill="#0A0E1A" />
              <rect x="420" y="300" width="40" height="6" rx="2" fill="#0A0E1A" />
              <rect x="320" y="340" width="150" height="50" rx="4" fill="#0A0E1A" />
              <rect x="340" y="354" width="40" height="5" rx="2" fill="#8590A8" />
              <rect x="400" y="354" width="50" height="6" rx="2" fill="#FFFFFF" />
              <rect x="340" y="370" width="40" height="5" rx="2" fill="#C6F24E" />
              <rect x="400" y="370" width="50" height="6" rx="2" fill="#C6F24E" />
              <rect x="130" y="340" width="86" height="22" rx="11" fill="rgba(198,242,78,0.15)" />
              <circle cx="146" cy="351" r="3" fill="#C6F24E" />
              <text x="155" y="355" fontFamily="system-ui" fontSize="10" fontWeight="600" fill="#C6F24E">CHORUS PRO</text>
            </svg>
          </div>
        </div>
      </section>

      {/* CONTRATS */}
      <section className="feature-deep" id="contrats">
        <div className="container">
          <div className="feature-content">
            <div className="eyebrow">Contrats</div>
            <h2>Juridiquement <em>solides</em>, humainement lisibles.</h2>
            <p className="feature-lead">4 familles de contrats couvrant B2C, B2B, web/e-commerce et appels d&apos;offres publics. Modèles validés par des juristes, à adapter avec nos variables dynamiques.</p>

            <ul className="feature-list">
              <li><Check /><span><strong>B2C</strong> — mentions légales, droit de rétractation 14 jours, garantie légale de conformité.</span></li>
              <li><Check /><span><strong>B2B</strong> — NDA, clauses de pénalités, limitation de responsabilité, propriété intellectuelle.</span></li>
              <li><Check /><span><strong>Web &amp; e-commerce</strong> — CGV conformes, traitement RGPD, mentions cookies, lutte contre la fraude.</span></li>
              <li><Check /><span><strong>Appels d&apos;offres publics</strong> — DC1, DC2, CCTP pré-remplis avec vos données entreprise.</span></li>
            </ul>

            <div className="types-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', maxWidth: '480px' }}>
              <div className="type-card">
                <div className="type-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg></div>
                <h4>B2C</h4>
                <p>Particuliers — rétractation 14j</p>
              </div>
              <div className="type-card">
                <div className="type-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg></div>
                <h4>B2B</h4>
                <p>Pro — NDA, pénalités</p>
              </div>
              <div className="type-card">
                <div className="type-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3a15 15 0 0 1 0 18" /></svg></div>
                <h4>Web / E-commerce</h4>
                <p>CGV, RGPD, cookies</p>
              </div>
              <div className="type-card">
                <div className="type-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18" /><path d="M5 21V7l7-4 7 4v14" /><path d="M9 9h1M9 13h1M9 17h1M14 9h1M14 13h1M14 17h1" /></svg></div>
                <h4>Public</h4>
                <p>DC1, DC2, CCTP</p>
              </div>
            </div>
          </div>

          <div className="feature-visual">
            <svg viewBox="0 0 600 450" xmlns="http://www.w3.org/2000/svg">
              <rect x="140" y="90" width="320" height="320" rx="8" fill="#FFFFFF" stroke="#E8ECF4" transform="rotate(-3 300 250)" />
              <rect x="160" y="70" width="320" height="320" rx="8" fill="#FFFFFF" stroke="#E8ECF4" transform="rotate(2 320 230)" />
              <rect x="130" y="60" width="340" height="340" rx="10" fill="#FFFFFF" stroke="#D8DEED" />
              <rect x="160" y="90" width="150" height="14" rx="2" fill="#0A0E1A" />
              <rect x="160" y="112" width="80" height="6" rx="2" fill="#6366F1" />
              <rect x="160" y="140" width="280" height="5" rx="2" fill="#8590A8" />
              <rect x="160" y="152" width="260" height="5" rx="2" fill="#8590A8" />
              <rect x="160" y="164" width="270" height="5" rx="2" fill="#8590A8" />
              <rect x="160" y="176" width="180" height="5" rx="2" fill="#8590A8" />
              <rect x="160" y="196" width="120" height="8" rx="2" fill="#0A0E1A" />
              <rect x="160" y="216" width="280" height="5" rx="2" fill="#8590A8" />
              <rect x="160" y="228" width="260" height="5" rx="2" fill="#8590A8" />
              <rect x="160" y="240" width="240" height="5" rx="2" fill="#8590A8" />
              <rect x="160" y="260" width="100" height="8" rx="2" fill="#0A0E1A" />
              <rect x="160" y="280" width="280" height="5" rx="2" fill="#8590A8" />
              <rect x="160" y="292" width="250" height="5" rx="2" fill="#8590A8" />
              <rect x="160" y="330" width="120" height="50" rx="4" fill="#F4F6FB" />
              <rect x="170" y="340" width="50" height="5" rx="2" fill="#8590A8" />
              <path d="M170 360 Q 185 350 200 360 T 230 360" stroke="#6366F1" strokeWidth="2" fill="none" />
              <rect x="320" y="330" width="120" height="50" rx="4" fill="#0A0E1A" />
              <rect x="330" y="340" width="50" height="5" rx="2" fill="#8590A8" />
              <rect x="330" y="355" width="80" height="14" rx="7" fill="#F59E0B" />
              <text x="370" y="365" textAnchor="middle" fontFamily="system-ui" fontSize="9" fontWeight="700" fill="#0A0E1A">SIGNÉ</text>
            </svg>
          </div>
        </div>
      </section>

      {/* IA & IMAGES */}
      <section className="feature-deep dark reversed" id="ia">
        <div className="container">
          <div className="feature-content">
            <div className="eyebrow">IA &amp; Images</div>
            <h2>L&apos;IA au service du <em>fond</em>, pas de la forme.</h2>
            <p className="feature-lead">Un assistant qui rédige, corrige, traduit et adapte le ton. Des milliers d&apos;images libres de droit directement dans l&apos;éditeur. Vous gardez le volant.</p>

            <ul className="feature-list">
              <li><Check /><span><strong>Rédaction contextuelle</strong> — l&apos;IA connaît votre marque, votre ton, vos produits. Pas de texte générique.</span></li>
              <li><Check /><span><strong>Traduction multilingue</strong> — vos emails et contrats en FR, EN, DE, ES, IT, PT, NL et plus.</span></li>
              <li><Check /><span><strong>Banque d&apos;images</strong> — photos et illustrations libres de droit, cherchables par mot-clé, insérées en un clic.</span></li>
              <li><Check /><span><strong>Suggestions d&apos;objet d&apos;email</strong> — plusieurs variations par email, taux d&apos;ouverture estimé, A/B testing intégré.</span></li>
            </ul>
          </div>

          <div className="feature-visual">
            <svg viewBox="0 0 600 450" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="aiCard" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366F1" />
                  <stop offset="100%" stopColor="#312E81" />
                </linearGradient>
              </defs>
              <rect x="80" y="80" width="440" height="110" rx="16" fill="url(#aiCard)" />
              <circle cx="120" cy="135" r="22" fill="#F59E0B" />
              <path d="M112 135 L 118 141 L 130 127" stroke="#0A0E1A" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="160" y="110" width="100" height="8" rx="2" fill="#FFFFFF" />
              <rect x="160" y="126" width="320" height="6" rx="2" fill="#FFFFFF" opacity="0.7" />
              <rect x="160" y="140" width="280" height="6" rx="2" fill="#FFFFFF" opacity="0.7" />
              <rect x="160" y="154" width="260" height="6" rx="2" fill="#FFFFFF" opacity="0.7" />
              <rect x="80" y="210" width="210" height="80" rx="10" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.1)" />
              <rect x="100" y="228" width="60" height="6" rx="2" fill="#F59E0B" />
              <rect x="100" y="244" width="170" height="5" rx="2" fill="#FFFFFF" opacity="0.8" />
              <rect x="100" y="256" width="150" height="5" rx="2" fill="#FFFFFF" opacity="0.8" />
              <rect x="100" y="268" width="120" height="5" rx="2" fill="#FFFFFF" opacity="0.8" />
              <rect x="310" y="210" width="210" height="80" rx="10" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.1)" />
              <rect x="330" y="228" width="60" height="6" rx="2" fill="#F59E0B" />
              <rect x="330" y="244" width="170" height="5" rx="2" fill="#FFFFFF" opacity="0.8" />
              <rect x="330" y="256" width="150" height="5" rx="2" fill="#FFFFFF" opacity="0.8" />
              <rect x="330" y="268" width="120" height="5" rx="2" fill="#FFFFFF" opacity="0.8" />
              <rect x="80" y="310" width="440" height="100" rx="10" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" />
              <rect x="100" y="326" width="80" height="6" rx="2" fill="#FFFFFF" />
              <rect x="100" y="342" width="70" height="52" rx="6" fill="#F43F5E" />
              <rect x="180" y="342" width="70" height="52" rx="6" fill="#10B981" />
              <rect x="260" y="342" width="70" height="52" rx="6" fill="#FBBF24" />
              <rect x="340" y="342" width="70" height="52" rx="6" fill="#6366F1" />
              <rect x="420" y="342" width="70" height="52" rx="6" fill="#F59E0B" />
            </svg>
          </div>
        </div>
      </section>

      {/* INTEGRATIONS */}
      <section className="integrations-section" id="integrations">
        <div className="container">
          <h2>Branchez <em>votre stack</em>, ça marche.</h2>
          <p className="lead">Build withUs se connecte à vos outils mailing et CRM préférés. Ou fonctionne en standalone, vous choisissez.</p>

          <div className="integrations-grid">
            <div className="integration-card"><span>Brevo</span></div>
            <div className="integration-card"><span>Mailchimp</span></div>
            <div className="integration-card"><span>HubSpot</span></div>
            <div className="integration-card"><span>Salesforce</span></div>
            <div className="integration-card"><span>Pipedrive</span></div>
            <div className="integration-card"><span>Sellsy</span></div>
            <div className="integration-card"><span>Axonaut</span></div>
            <div className="integration-card"><span>Chorus Pro</span></div>
            <div className="integration-card"><span>Sendinblue</span></div>
            <div className="integration-card"><span>Odoo</span></div>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="features-cta">
        <div className="container">
          <h2>Prêt à <em>passer à l&apos;acte</em> ?</h2>
          <p>Plan gratuit, sans carte bancaire. Vous créez, vous testez, vous décidez.</p>
          <div className="cta-row">
            <a href="/register" className="btn btn-accent btn-lg" data-magnet>Démarrer gratuitement
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
            </a>
            <a href="/demo" className="btn btn-ghost btn-lg" style={{ color: 'white', borderColor: 'rgba(255,255,255,0.2)' }}>Demander une démo</a>
          </div>
        </div>
      </section>
    </main>
  );
}
