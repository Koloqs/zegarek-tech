# zegarek.tech

Prosty zegarek online przygotowany jako pierwsza wersja strony pod domenę
`zegarek.tech`.

## Funkcje

- aktualny czas dla Polski,
- data w formacie polskim,
- analogowy zegar z sekundnikiem,
- zegary światowe dla kilku miast,
- jasny i ciemny motyw zapisywany w `localStorage`,
- responsywny układ dla telefonu i komputera,
- statyczny frontend bez backendu i płatnych usług.

## Technologie

- React
- TypeScript
- Vite

## Lokalnie

```bash
npm install
npm run dev
```

## Build produkcyjny

```bash
npm run build
```

Gotowe pliki do hostingu znajdują się po buildzie w katalogu `dist`.

## Azure Static Web Apps

Rekomendowana konfiguracja:

- App location: `/`
- API location: puste
- Output location: `dist`

Po podpięciu repozytorium GitHub do Azure Static Web Apps każdy push na `main`
może automatycznie publikować nową wersję strony.
