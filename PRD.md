# Product Requirements Document: PMApp

## Descrizione Generale
[cite_start]L'app si chiama "PMApp" e serve per gestire i pazienti all'interno dei PMA durante i grandi eventi[cite: 2]. [cite_start]Deve essere veloce, leggera e semplice da usare[cite: 2]. [cite_start]È fondamentale che l'app e il database siano scritti per permettere a più utenti, su più dispositivi, di avere aperto lo stesso paziente senza sovrascrivere dati che non è necessario toccare[cite: 3].

## Architettura Dati e Concorrenza (CRITICO)
- **Database:** Firebase Firestore.
- **Logica Real-time (`onSnapshot`):** Obbligatoria per la gestione dei pazienti e per le dashboard operative.
- **Prevenzione Conflitti:** Utilizzare aggiornamenti parziali (field-level updates). Non sovrascrivere mai l'intero documento di un paziente se non è strettamente necessario.

## Struttura Dati

### [cite_start]1. Entità: MANIFESTAZIONE [cite: 6]
- [cite_start]È il singolo grande evento, totalmente indipendente (un "mini mondo" a sé stante)[cite: 7].
- [cite_start]Può contenere più di un PMA[cite: 8].
- [cite_start]Il Nome funge da ID univoco nel database e non deve contenere spazi[cite: 9, 10].
- [cite_start]Ha uno Stato che può essere APERTA o CHIUSA (se chiusa, i dati in essa contenuti sono in sola lettura)[cite: 12].
- [cite_start]Ha un campo Data [cite: 11] [cite_start]e un campo Impostazioni[cite: 13].

### [cite_start]2. Entità: PMA [cite: 14]
- [cite_start]Dipende dalla Manifestazione[cite: 15, 17]. [cite_start]Nella maggior parte dei casi è solamente uno[cite: 16].
- [cite_start]Ha un proprio personale e propri pazienti[cite: 15].
- [cite_start]Il Nome del PMA è un ID univoco all'interno della stessa manifestazione[cite: 18].
- [cite_start]Contiene i campi Luogo e Impostazioni_PMA (che includono il numero di posti letto)[cite: 19, 20, 21].

## [cite_start]Utenti e Ruoli (RBAC) [cite: 22]
- [cite_start]**Superadmin:** Vede e modifica tutto[cite: 23].
- [cite_start]**Centrale:** Utente admin di una singola manifestazione, creato in automatico con user `admin_nomemanifestazione` e password `password_nomemanifestazione`[cite: 23]. [cite_start]Crea, modifica e cancella utenti e PMA per la sua manifestazione[cite: 23].
- [cite_start]**Medico, Infermiere, Soccorritore, Triage:** Ruoli operativi legati a uno specifico PMA[cite: 23].

## [cite_start]VISTE (Pagine dell'App) [cite: 24]
- [cite_start]**Homepage:** Elenco manifestazioni APERTE (e CHIUSE, visibili solo al superadmin) con pulsante per crearne di nuove (solo superadmin)[cite: 25].
- [cite_start]**Dashboard centrale e Impostazioni:** Vista principale e configurazione della singola manifestazione[cite: 25].
- [cite_start]**Dashboard PMA e Impostazioni_PMA:** Vista principale e configurazione del singolo PMA[cite: 25].
