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

## Save a Product

1. Open the frontend URL.
2. Select **Create account** on the login screen.
3. Register with an email and a password containing at least 8 characters, one number, and one special character.
4. Sign in using the selected account role.
5. Open **Update record**.
6. Enter the product details and submit the form.

The frontend sends the product to `POST /api/inventory`. The backend validates the data and stores it in MongoDB.

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
```

For production, use a hosted MongoDB connection string and a strong secret. Do not commit the `.env` file.
