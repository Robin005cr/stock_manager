# Stock Manager

## Local Setup

The application uses React with Vite for the frontend, Express for the backend, and MongoDB for data storage.

### Prerequisites

- Node.js and npm installed
- MongoDB installed and running as a Windows service

Check the MongoDB service with PowerShell:

```powershell
Get-Service MongoDB
```

If the service is stopped, start it with:

```powershell
Start-Service MongoDB
```

The backend uses this local MongoDB database by default:

```text
mongodb://127.0.0.1:27017/stock_manager
```

## Start the Backend

Open a terminal in the backend folder:

```powershell
cd "C:\Users\ASUS\Desktop\Professional_repo\stock_manager\backend"
npm install
npm run dev
```

The backend should report:

```text
Connected to MongoDB
API listening on http://localhost:8000
```

The API health check is available at:

```text
http://localhost:8000/api/health
```

## Start the Frontend

Open a second terminal:

```powershell
cd "C:\Users\ASUS\Desktop\Professional_repo\stock_manager\frontend"
npm install
npm run dev
```

Open the Vite URL shown in the terminal, usually:

```text
http://localhost:5173
```

During local development, Vite proxies `/api` requests to the backend at port `8000`.

## Sign In and Roles

The backend creates these demo accounts on startup when the email addresses are not already registered:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@gmail.com` | `Password1@` |
| Viewer | `viewer@gmail.com` | `Password2@` |

Admins can add metadata, update records, and edit or delete inventory. Viewers can search inventory and manage pinned products, but cannot modify inventory or metadata. New accounts created from the sign-in page are viewers.

Admins can open **Stock booking** to reserve quantities of multiple products for one customer for up to 60 days. If a requested quantity exceeds available stock, the booking records the full request, reserves the stock currently available, and shows the shortfall as the deficient quantity to be booked. Each product's reserved stock can be released separately when the customer purchases it; releasing deducts the reserved quantity from inventory. Unpurchased reservations stop reserving stock when their hold period expires.

Google sign-in requires an OAuth 2.0 Web client ID from Google Cloud. Add your frontend origin (for local development, `http://localhost:5173`) to its authorized JavaScript origins. Set the client ID as `VITE_GOOGLE_CLIENT_ID` in `frontend/.env` and as `GOOGLE_CLIENT_ID` in `backend/.env`, then restart Vite and the backend. Google-created accounts are viewers; an existing account with a matching verified Google email is linked and keeps its existing role.

To add a product, sign in as admin, open **Update record**, enter the product details, and submit. The backend validates the data and stores it in MongoDB.

## Verify the Data

Open MongoDB Compass and connect to:

```text
mongodb://127.0.0.1:27017
```

Open the following database and collections:

```text
Database: stock_manager
Collections:
- inventoryitems
- stockbookings
- users
```

The `inventoryitems` collection contains saved products. The `users` collection contains registered accounts.

When the inventory collection is empty, the backend inserts sample inventory records during startup.

## Production Configuration

Create a `.env` file in the `backend` folder for deployment or a non-local database:

```env
PORT=8000
MONGODB_URI=mongodb://127.0.0.1:27017/stock_manager
JWT_SECRET=replace-with-a-long-random-secret
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

For production, use a hosted MongoDB connection string and a strong secret. Do not commit the `.env` file.
