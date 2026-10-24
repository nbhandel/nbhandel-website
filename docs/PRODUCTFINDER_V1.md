# NBHandel Produktfinder V1 – GitHub-Entwicklungsstand

## Ziel

Mit der bestehenden Website weiterarbeiten, nicht parallel eine zweite Shop-Infrastruktur errichten. Die neue statische Produktfinder-Seite ist **ein isolierter, noch nicht öffentlich beworbener Entwicklungsstand**. Die 24 Produktnamen stammen aus dem bestehenden NBHandel-Startseitenkatalog. Es werden **keine alten Beispielpreise als aktuelle Angebote** übernommen.

Dateien:
- site/produktfinder.html: eigenständige Suchoberfläche (zunächst noindex).
- site/assets/productfinder/finder-core.mjs: reine Such-, GTIN-, Identitäts- und Freigabelogik.
- site/assets/productfinder/finder-app.mjs: Anzeige und Nutzerinteraktion, keine Analytics.
- site/assets/productfinder/finder.css: responsives Layout ohne externe Font- oder Code-Bibliothek.
- site/data/productfinder/sample-catalog.v1.json: 24 bereits bestehende Produktbeispiele, keine Händlerangebote.
- tools/seed_productfinder_catalog.py: einmalige, nachvollziehbare Extraktion der 24 Namen aus der vorhandenen Startseite.
- tests/productfinder/finder-core.test.mjs: automatische Regressionstests.

Die produktive Startseitensuche wird vorerst **nicht ersetzt**. Eine Integration erfolgt erst nach Review und der ersten freigegebenen Datenquelle.

## Datenmodell V1

Der Datensatz enthält:
- schema = nbh.productfinder.v1.
- mode = sample oder live; mode=sample blockiert sämtliche Händlerangebote.
- activation.offersEnabled: expliziter, vom Betreiber freigegebener Schalter. In der Entwicklungsfassung false.
- products: id, title, brand, category, model, variant, gtin, mpn und identityStatus.
- offers: id, productId, merchantId, brand, variant, gtin, mpn, priceCents, shippingCents, currency, condition, availability, checkedAt, url und provenance.
- approvedMerchants: pro merchantId name, programApproved, feedAccessApproved und exakt genehmigte allowedHosts.

**Preisangaben** werden als ganzzahlige Euro-Cent getrennt nach Artikelpreis und Versand geführt. Fehlende Versandkosten dürfen nicht stillschweigend als null interpretiert werden.

## Zulässigkeit und Identität

Ein automatisch ausspielbares Händlerangebot benötigt *alle* folgenden Bedingungen:

1. Gesamtdatensatz mode=live und activation.offersEnabled=true.
2. Programmaufnahme und Zugriffsrechte auf den Produktfeed dieses Händlers nachgewiesen.
3. Provenienz: official_partner_feed und rightsApproved=true; keinerlei Scraping der Tradedoubler-Oberfläche.
4. Eindeutige Produktidentität: identische prüfziffergültige GTIN (8/12/13/14, auf 14 Stellen vereinheitlicht) ohne offenkundige Varianten- oder Markenkollision; **ohne GTIN** zwingend übereinstimmende Marke + MPN + Variante.
5. Euro-Artikelpreis als positiver ganzzahliger Centwert; Versand als explizit vorliegender nichtnegativer Centwert.
6. Nachgewiesener Bestand in_stock, Artikelzustand new.
7. Quellzeitpunkt nicht in der Zukunft und maximal 48 Stunden alt (erstes vorsichtiges V1-Limit; tatsächliche Partner-Feedfrequenz gesondert bewerten).
8. Händler-URL mit HTTPS, ohne eingebettete Zugangsdaten, und exakt genehmigtem Zielhost; keine Weiterleitung in Skript oder automatisch ausgelöste Klicks.

Werden Bedingungen nicht erfüllt, zeigt der Finder **kein Angebot**. Ein einzelner Anbieter heißt "Ein Angebot", nicht "günstigster Preis". Für den Vergleich werden Gesamtpreise nur unter **identischen und geprüften Produkten** sortiert. Auch die Marken-/Variantenkompatibilität für Fahrzeugteile erfordert später zusätzliche Regeln; eine GTIN identifiziert nicht automatisch die Eignung für ein konkretes Fahrzeug.

## Grenzen

- Die vorhandenen 24 Beispielnamen enthalten **keine verifizierten EAN/GTIN/MPN** und zeigen entsprechend keine Preise und keine Links.
- Die Oberfläche ist vor Freigabe **noindex** und nicht in der Sitemap. Keine Aktivierung von Partnerklicks oder Tracking.
- Die aktuell vorhandenen historischen Beispielpreise auf der alten Startseite wurden nicht verändert oder importiert.
- Der Browser lädt derzeit eine kleine statische JSON-Datei. **Ein Millionen-Katalog gehört nicht als Gesamtdatei in den Browser.** Dafür nach dokumentierter Feedfreigabe ein serverseitiges Indexierungs-/Suchkonzept mit Pagination und regelmäßiger Datenaktualisierung erarbeiten. Diese V1 legt lediglich die Identitäts- und Darstellungsregeln fest.
- Rechte für Produktbilder, Markenmaterial, Datensätze und Ziel-URLs werden pro Händler/Feed separat kontrolliert. Keine fremden Bilddateien neu übernommen.
- Benutzeraktionen bleiben lokal in dieser UI; kein Analysepixel, keine unnötigen Cookies, keine Hintergrundklicks.

## Abnahme

- Node-Prüfung: node --test tests/productfinder/finder-core.test.mjs.
- Statische Website-Prüfung: python3 tools/verify_site.py site.
- HTTP-Preview auf isoliertem Testserver (GET der vier neuen Assets und JSON).
- Vor produktiver Sichtbarkeit die Browser-Darstellung, mobile Navigation, Barrierefreiheit und rechtlichen Voraussetzungen abschließend prüfen.
- Der bestehende Produktions-Deploy bleibt unabhängig. Kein Merge oder Live-Veröffentlichung ohne fachliche Freigabe.
