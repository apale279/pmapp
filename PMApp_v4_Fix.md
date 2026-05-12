# PMApp v4 - Specifiche FIX e Ottimizzazioni

[cite_start]Questo documento riassume le modifiche tecniche e di interfaccia richieste per la versione 4 di PMApp, basate esclusivamente sulla sezione FIX v4 del documento di progetto[cite: 1].

## 🛠️ Correzioni Input e Campi Scheda
* [cite_start]**Data di Nascita**: Risolvere il bug di inserimento manuale dell'anno da tastiera[cite: 1]. [cite_start]Il sistema deve permettere la digitazione fluida di tutte e quattro le cifre dell'anno (es. 1993) senza blocchi o salti di focus[cite: 1].
* [cite_start]**Separazione Campi**: Dividere i campi **Email** e **Telefono** in due input distinti all'interno della scheda paziente[cite: 1].
* [cite_start]**SpO2 AA**: Impostare il valore predefinito (default) a **100**[cite: 1].
* [cite_start]**Gestione Farmaci**: Implementare un sistema di suggerimento dinamico[cite: 1]. [cite_start]L'utente scrive il nome del farmaco; se presente in `FARMACI_IMP`, viene suggerito, altrimenti il sistema deve permettere l'inserimento manuale immediato senza passaggi intermedi[cite: 1].

## 🩺 Cartella Clinica ed EO (Esame Obiettivo)
* [cite_start]**Opzioni Rapide EO**: Raggruppare le voci rapide in categorie cliniche[cite: 1]. [cite_start]La categoria **GENERALE** deve essere aggiunta come prima voce del menu[cite: 1].
* [cite_start]**Gerarchia Categorie**: L'ordine deve essere: GENERALE, NEUROLOGICO, CUTE, TORACE, ADDOME, CAPO/COLLO[cite: 1].

## 📊 Dashboard PMA (Posto Medico Avanzato)
* **Header Operativo**:
    * [cite_start]Spostare il comando **"NUOVO PAZIENTE"** in alto nella pagina[cite: 1].
    * [cite_start]Il form di creazione paziente deve essere **chiuso di default**[cite: 1].
* **Contatori e Liste**:
    * [cite_start]Implementare contatori rapidi per gli stati **IN ARRIVO**, **IN ATTESA** e **IN CARICO**, filtrati per codice colore[cite: 1].
    * [cite_start]Creare liste separate e compatte per i pazienti **IN ARRIVO** e **IN ATTESA**[cite: 1].
    * [cite_start]Visualizzare i pazienti **IN CARICO** in una lista prominente ordinata per codice colore; il clic sul paziente deve aprire direttamente la scheda[cite: 1].
* **Storico Dimessi**:
    * [cite_start]Aggiungere un pulsante **"Vedi dimessi"** per la ricerca e visualizzazione dello storico[cite: 1].
    * [cite_start]Mostrare in fondo alla dashboard un elenco degli **ultimi 10 pazienti dimessi**[cite: 1].

## 🏛️ Dashboard Centrale
* [cite_start]**Global View**: Ottimizzare la dashboard per fornire una visione d'insieme di tutti i PMA (carico di lavoro, numero pazienti, stati e colori)[cite: 1].
* [cite_start]**Ricerca Globale**: Implementare la funzione di ricerca paziente per visualizzare i dati dei dimessi in tutta la manifestazione[cite: 1].
* [cite_start]**Storico Multi-PMA**: Mostrare in fondo alla pagina l'elenco degli **ultimi 10 pazienti dimessi per ogni PMA** attivo[cite: 1].