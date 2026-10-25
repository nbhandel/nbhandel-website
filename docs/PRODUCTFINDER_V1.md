# NBHandel Produktfinder V1 – GitHub-Entwicklungsstand

## Ziel

Mit der bestehenden Website weiterarbeiten, nicht parallel eine zweite Shop-Infrastruktur errichten. Der integrierte Redesign-Stand umfasst **Startseite, Produktübersicht und Produktfinder als echte HTML-Seiten** im aktuellen GitHub-Quellzweig. Die 24 Produktnamen stammen aus dem bestehenden NBHandel-Startseitenkatalog. Es werden **keine alten Beispielpreise als aktuelle Angebote** übernommen.

Dateien:
- site/index.html: neu strukturierte Startseite mit echter GET-Suche zum Finder, statt dynamisch überlagerter Webflow-Sektionen.
- site/produkte.html: neu strukturierte Übersicht der sieben bereits vorhandenen Kategorie-Seiten.
- site/produktfinder.html: eigenständige Suchoberfläche (zunächst noindex).
- site/assets/productfinder/finder-core.mjs: reine Such-, GTIN-, Identitäts- und Freigabelogik.
- site/assets/productfinder/finder-app.mjs: Anzeige und Nutzerinteraktion, keine Analytics.
- site/assets/productfinder/finder.css: responsives Layout für den Finder samt gemeinsamer Navigation.
- site/assets/productfinder/commerce-pages.css: gemeinsames Design für Start- und Produktübersicht; kein Overlay und keine alten inline DOM-Konstruktoren.
- site/data/productfinder/sample-catalog.v1.json: 24 bereits bestehende Produktbeispiele, keine Händlerangebote, mit wiederverwendeten lokalen Bildern und ursprünglichen Bild-/Lizenznachweisen.
- tools/seed_productfinder_catalog.py: reproduzierbare Erstellung des Beispielkatalogs aus docs/productfinder-existing-image-manifest.json; der Originalstand mit Bildnachweisen wurde vor dem Redesign aus der früheren Git-Version erfasst.
- tests/productfinder/finder-core.test.mjs: automatische Regressionstests.

Die bisherige Startseitensuche wurde im Entwicklungszweig durch eine **echte, in die Seite eingebettete Suchmaske** ersetzt, die per GET zum bestehenden Produktfinder führt. Das neue Layout erzeugt keine weiteren DOM-Schichten über den Texten. **Live bleibt bis zur Freigabe die veröffentlichte Version unverändert.**

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

## Wiederhergestellte Medien und Nutzerführung

- Aus der vorherigen live gestalteten Website wurden **alle sechs unterschiedlichen Videoclips** wiederverwendet, statt sie ersatzlos zu streichen.
- Die Herkunft der Medien und die Zuordnung zu Käuferablauf, Scanner, Angebotsvergleich, Werkzeugen, Methodik und Partnerbereich stehen im JSON-Medienmanifest im docs-Ordner.
- Jedes Video liegt lokal in mehreren Formaten: optimiertes MP4, WebM-Fallback und JPEG-Standbild. Die bisherige Wiedergabe direkt von externen Video-CDNs entfällt auf diesen neu gestalteten Seiten.
- Die Videosequenzen sind **Symbolaufnahmen**, nicht unser eigenes Lager, Personal oder nachgewiesene Geschäftsvorgänge. Pexels-Quellen und Lizenzbedingungen sind dokumentiert.
- Wiedergabe startet bei Sichtbarkeit nur stumm und begrenzt die parallelen Videostreams. Manuelle Pausentasten, reduzierte Bewegung, Datensparmodus, Tab-Wechsel und sensible Ladepriorität sind berücksichtigt.
- Die Homepage enthält wieder eine aus den **24 alten Produktbeispielen** generierte, seitlich durchblätterbare Produktgalerie. Die Bilder bleiben lokal; die Original-Bildnachweise und Lizenz-URLs sind hinterlegt.
- Auf der Startseite, der Kategorieübersicht und dem Finder stehen alle Elemente in echten HTML-Sektionen bzw. zugelassenen Modulen, **nicht** über bestehenden alten Texten. Andere, nicht angepasste Unterseiten behalten ihren bisherigen Stand.
- Native Chrome-Testansichten auf 390px/820px/1440px wurden auf Darstellungsfehler und Überlauf geprüft; Videoplayback, Pause, Fallback-Codec sowie reduced-motion/save-data wurden zusätzlich getestet.
- **Das ist ein Entwurf auf dem Entwicklungszweig.** Eine Live-Freischaltung erfolgt erst nach finalem Website-Review.

## Grenzen

- Die vorhandenen 24 Beispielnamen enthalten **keine verifizierten EAN/GTIN/MPN** und zeigen entsprechend keine Preise und keine Händlerlinks; die bereits veröffentlichten CC-Bilder enthalten sichtbare Quell-/Lizenznachweise.
- Die Oberfläche ist vor Freigabe **noindex** und nicht in der Sitemap. Keine Aktivierung von Partnerklicks oder Tracking.
- Die historischen Beispielpreise aus der früheren Startseite werden im neuen Layout bewusst nicht als aktuelle Händlerangebote angezeigt. Der vorherige Zustand bleibt im Git-Verlauf nachvollziehbar.
- Der Browser lädt derzeit eine kleine statische JSON-Datei. **Ein Millionen-Katalog gehört nicht als Gesamtdatei in den Browser.** Dafür nach dokumentierter Feedfreigabe ein serverseitiges Indexierungs-/Suchkonzept mit Pagination und regelmäßiger Datenaktualisierung erarbeiten. Diese V1 legt lediglich die Identitäts- und Darstellungsregeln fest.
- Rechte für Produktbilder, Markenmaterial, Datensätze und Ziel-URLs werden pro Händler/Feed separat kontrolliert. Keine fremden Bilddateien neu übernommen.
- Benutzeraktionen bleiben lokal in dieser UI; kein Analysepixel, keine unnötigen Cookies, keine Hintergrundklicks.

## Übernommene Videos und Seitenfunktionen

Die ursprüngliche NBHandel-Startseite enthielt sechs eigenständige, bereits öffentlich eingebundene Pexels-Videos, teils mehrfach. Der neue GitHub-Entwurf bewahrt **alle sechs Quellen** in verarbeiteter Form; siehe docs/restored-existing-videos.json mit exakten URLs, Prüfsummen und Herkunft.

- site/media/story/ enthält je Video eine optimierte 960×540-Variante als MP4 (H.264) und WebM (VP8) plus lokales JPG-Vorschaubild, insgesamt rund 3,1 MB. Keine UHD-Dateien auf Besucherseiten.
- Home: Szenen als eigenständige, sinnvoll platzierte Medienbausteine zu Kaufprozess, EAN-/Scanner-Werkzeug, Angebotsvergleich, Kaufrechnern, Methodik und Händler-/Versandprozessen. Kein Film liegt als Text-Overlay unter redaktionellen Absätzen.
- Kategorieübersicht: bestehende Scanner-Videoquelle im Kontext Produktidentität.
- Bildmaterial der sechs Videos wird als **Symbolaufnahme** bezeichnet, nicht als firmeneigene Lageraufnahme oder Partnerzusage.
- Pexels-Quelle: https://www.pexels.com/legal-pages/license/ (kommerzielle Websitenutzung erlaubt; erkennbare Personen und Marken stehen ausdrücklich nicht für eine Geschäftsbeziehung).
- site/assets/productfinder/story-motion.mjs lädt und spielt Videos erst im sichtbaren Bereich ab (max. zwei gleichzeitig am Desktop, eins mobil). Pausentaste, bei Save-Data und reduzierter Bewegung zunächst Standbild. Externe Pexels-Videohosts werden beim Besuch nicht aufgerufen.
- Die sieben bisherigen Preis-Karussell-Beispiele wurden *nicht als aktuelle Marktpreise kopiert*. Stattdessen eine transparente Galerie der 24 bereits vorhandenen Produktbeispiele mit Urheber-/Lizenznachweisen und direkten Links zum Produktfinder. Das ist eine bewusste Änderung der Darstellungslogik, keine Bestätigung neuer Händlerinformationen.
- Texte und Seiten werden als **semantisches HTML** gepflegt, nicht mit überlagerten Webflow-Layern oder nachträglich ersetztem DOM. Bestehende Tools und rechtliche Unterseiten bleiben erhalten.

Visuell geprüft: die Videokarten, die Produktgalerie, der Kaufablauf und der Partnerabschnitt wurden in Chromium als echte Screenshots in Desktop, Tablet und Mobil kontrolliert. Die Video-Abnahme verifiziert tatsächliche Playback-Zeit, Pause, Save-Data-/Reduced-Motion-Poster-Fallback, keinerlei horizontales Überlaufen und keine externen Videoaufrufe. Für Browser mit fehlendem H.264-Codec wird WebM genutzt. Die GitHub-Regressionstests kontrollieren für alle sechs Videos Dateiprüfsummen und erlaubte Quellen.

## Abnahme

- Node-Prüfung: node --test tests/productfinder/finder-core.test.mjs.
- Statische Website-Prüfung: python3 tools/verify_site.py site.
- HTTP-Preview auf isoliertem Testserver (GET der neuen HTML-, CSS-, Modul- und JSON-Dateien).
- Playwright Chromium: Startseite, Kategorien und Finder je in Desktop- und Mobilansicht; kein horizontaler Überlauf, kein Seitenfehler, Suchweiterleitung und Finder-Detailtest erfolgreich. Zusätzlich Kategorie- und Artikelbilder geprüft.
- Vor produktiver Sichtbarkeit die Browser-Darstellung, mobile Navigation, Barrierefreiheit und rechtlichen Voraussetzungen abschließend prüfen.
- Der bestehende Produktions-Deploy bleibt unabhängig. Kein Merge oder Live-Veröffentlichung ohne fachliche Freigabe.
