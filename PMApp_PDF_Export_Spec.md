# Specifica Tecnica: Generazione Report PDF ed Esportazione Dati

Questa specifica descrive l'implementazione del sistema di generazione PDF per le schede paziente, la funzione di invio tramite email e l'esportazione massiva in formato ZIP.

## 1. Modello PDF (Space-Optimized)
Il report deve essere generato in formato A4, utilizzando un layout compatto ma professionale. 

### Struttura del PDF:
- **Intestazione**: Nome Manifestazione, Nome PMA, ID Paziente (P_contatore), Codice Colore e Stato.
- **Dati Anagrafici**: Disposti su 2 colonne (Nome, Cognome, Età, Data di Nascita, Contatti).
- **Cartella Clinica**:
    - **APR/Allergie/APP/EO**: Sezioni testuali compatte.
    - **Tabella Parametri Vitali**: Lista cronologica di tutte le rilevazioni in una tabella densa.
    - **Farmaci e Prestazioni**: Elenco puntato con timestamp e dosaggi.
    - **Rivalutazioni**: Elenco cronologico delle note mediche.
    - **Lesioni**: Immagine dell'omino stilizzato con i marker numerati e legenda descrittiva.
- **Dimissione**: Esito, Note di dimissione, Firma del Paziente (Base64) e Firma del Medico (Timbro/Firma Base64).

## 2. Funzionalità "Invia via Email"
- **Pulsante**: "Invia via Email" visibile solo se `user.rank === 'MEDICO'`.
- **Logica**:
    1. Genera il PDF della scheda.
    2. Controlla la presenza dell'email nel campo `paziente.email`. Se assente, mostra un prompt di inserimento.
    3. **Nota Tecnica**: Poiché `mailto` non supporta allegati automatici per motivi di sicurezza, il sistema deve scaricare il PDF e aprire il client mail con Oggetto e Corpo precompilati (es: "Scheda Visita PMA - [ID_Paziente]"). 
    *Alternativa consigliata per Cursor*: Se si desidera l'allegato automatico, utilizzare un servizio come EmailJS o una Cloud Function di Firebase.

## 3. Funzionalità "Scarica Tutti" (Mass Export)
- **Pulsante**: "Scarica Tutti (.zip)" posizionato nella Dashboard Centrale o Dashboard PMA, visibile solo se `user.rank === 'CENTRALE'`.
- **Logica**:
    1. Recupera tutti i pazienti con `stato === 'DIMESSO'` o `aperto === false` per il PMA corrente.
    2. Itera sui pazienti e genera un PDF per ognuno.
    3. Utilizza la libreria `JSZip` per raggruppare i PDF in un unico file nominato `Report_PMA_[NomePMA]_[Data].zip`.
    4. Avvia il download dello ZIP.

## 4. Implementazione Tecnica Suggerita per Cursor
- **Librerie Consigliate**:
    - `jspdf` + `html2canvas` (o `jspdf-autotable`) per la generazione del report.
    - `jszip` per la creazione dell'archivio.
    - `file-saver` per il download dei file.
- **Filtri**: Assicurarsi che la query per "Scarica Tutti" utilizzi l'indice composito `id_manifestazione + stato` per evitare errori di performance.

---
**Nota per lo Sviluppatore**: Il layout del PDF deve utilizzare font di dimensioni ridotte (es. 9pt o 10pt) per massimizzare le informazioni per pagina e minimizzare lo spreco di carta.