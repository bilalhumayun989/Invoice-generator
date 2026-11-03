# Invoice Generator

The project is split into two apps:

- `Frontend/` contains the Vite and React client.
- `Backend/` contains the Express API and MongoDB connection.

## Run locally

Install dependencies in both folders:

```powershell
cd Backend
npm install
cd ../Frontend
npm install
npm run dev
```

The frontend dev command starts Vite and the Express API. Vite proxies `/api` requests to the API on port `3001`.

Set `MONGODB_URI` in `Backend/.env`. The backend also reads `Frontend/.env` as a compatibility fallback and supports the existing `MONODDB_URI` key. Keep database credentials in the backend environment for new setups.

To run only the API, use `npm run dev` or `npm start` from `Backend/`.
