# WearYourStyle

WearYourStyle is a full-stack fashion storefront with product discovery, secure customer accounts, order management, a virtual wardrobe, and an AI-assisted virtual try-on experience.

The interface uses a responsive, modern design system with standard solid surfaces—no glassmorphism—and supports complete customer and administrator workflows.

## Highlights

### Shopping experience

- Responsive home page, catalog, product details, cart, checkout, and informational pages
- Product search, sorting, category filters, size filters, price filters, and stock-aware controls
- Persistent cart with quantity and inventory validation
- Guest wishlist saved on the device and automatically merged into the customer account after sign-in
- Coupon validation, delivery estimates, and order totals calculated on the server
- Customer reviews with average ratings and recently viewed products
- Fit recommendations informed by the customer's saved style profile

### Customer account

- Registration, sign-in, sign-out, JWT authentication, and protected routes
- Profile and style-preference management
- Multiple saved delivery addresses
- Order history, detailed status tracking, cancellation, return requests, and printable invoices
- Persistent wishlist, wardrobe, lookbooks, and recent virtual try-on results
- Loyalty-point feedback after a completed checkout

### Virtual try-on and wardrobe

- Live webcam try-on through Socket.IO
- Static-photo try-on through the ML service REST API
- MediaPipe pose detection, garment placement, accessory overlays, image segmentation, and optional high-quality processing
- Downloadable results and device-local recent try-on history
- Wardrobe image uploads, outfit building, lookbook saving, and styling suggestions

### Administration

- Separate administrator sign-in and role-protected dashboard
- Revenue, order, customer, product, low-stock, and return analytics
- Product create, update, delete, image upload, and bulk import workflows
- Optional background removal and Cloudinary image upload
- Order-status management and order deletion
- Customer overview and coupon management

> Online card, PayPal, and UPI choices are currently test-mode simulations. Cash on delivery creates a normal order, but no live payment gateway is connected.

## Architecture

```mermaid
flowchart LR
    Browser[React + Vite client] -->|REST / JSON + JWT| API[Express API]
    Browser <-->|Socket.IO + REST| ML[Flask ML service]
    API --> Neon[(Neon Postgres)]
    API --> Cloudinary[Cloudinary]
    ML --> MediaPipe[MediaPipe + OpenCV]
```

| Service | Default URL | Purpose |
| --- | --- | --- |
| Client | `http://localhost:5174` | React storefront and admin interface |
| API | `http://localhost:3000` | Authentication, products, users, orders, reviews, coupons, and administration |
| ML service | `http://localhost:7860` | Image classification and live/photo virtual try-on |

## Technology stack

| Layer | Main technologies |
| --- | --- |
| Client | React 18, Vite 5, React Router, Redux Toolkit, Styled Components, Axios, Socket.IO Client |
| API | Node.js, Express, Neon Postgres, Drizzle ORM, node-postgres, JWT, bcryptjs, Multer, Cloudinary |
| ML | Python, Flask, Flask-SocketIO, MediaPipe, OpenCV, NumPy, SciPy, Pillow, rembg |

## Repository structure

```text
WearYourStyle/
├── Client/                 # React/Vite application
│   └── src/
│       ├── components/     # Shared UI and feature components
│       ├── context/        # Authentication, theme, and try-on state
│       ├── redux/          # Cart and sidebar state
│       ├── screens/        # Storefront, account, wardrobe, and admin pages
│       └── styles/         # Theme and shared styled components
├── Server/                 # Express API, Drizzle schema, and Postgres data layer
│   └── src/
│       ├── controller/
│       ├── middlewares/
│       ├── models/
│       └── routes/
├── MlServer/               # Flask/Socket.IO computer-vision service
├── scraper/                # Optional product-data collection utility
└── images/                 # Supporting product/image utilities
```

## Prerequisites

- Node.js 18 or newer
- npm
- Python 3.10 or 3.11
- Access to the Neon project used by the application
- Cloudinary credentials only when using administrator image uploads
- A webcam only when using live virtual try-on

## Local setup

### 1. Clone the repository

```bash
git clone https://github.com/bharath-ganga/WearYourStyle-new.git
cd WearYourStyle-new
```

### 2. Configure and start the API

```bash
cd Server
npm install
```

Create `Server/.env`:

```env
PORT=3000

NEON_BRANCH=production
DATABASE_URL=postgresql://USER:PASSWORD@HOST-pooler/DB?sslmode=require
DATABASE_URL_UNPOOLED=postgresql://USER:PASSWORD@HOST/DB?sslmode=require
DATABASE_POOL_MAX=10

ACCESS_TOKEN_SECRET=replace-with-a-long-random-secret
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_SECRET=replace-with-another-long-random-secret
REFRESH_TOKEN_EXPIRY=10d

CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Optional: Python executable used by the admin background-removal workflow
REMBG_PYTHON=python
```

The easiest way to write the Neon variables without copying credentials manually is:

```bash
npx neon@latest auth
npx neon@latest link
npx neon@latest env pull --file Server/.env
```

The application uses the pooled `DATABASE_URL` for normal API traffic. Drizzle migrations and data-import scripts use `DATABASE_URL_UNPOOLED`, as required for session-aware administration work. Both environment files and the local `.neon` project link are ignored by Git.

Create the schema before starting a fresh installation:

```bash
cd Server
npm run db:migrate
npm run db:verify
```

Start the API:

```bash
npm run dev
```

The API connects to Neon Postgres before listening on port `3000`. It also creates the development administrator defined in `Server/src/seedAdmin.js` if that account does not already exist. Replace those seeded credentials before any public deployment.

### 3. Configure and start the ML service

Open a second terminal:

```bash
cd MlServer
python -m venv .venv
```

Activate the virtual environment:

```powershell
# Windows PowerShell
.\.venv\Scripts\Activate.ps1
```

```bash
# macOS or Linux
source .venv/bin/activate
```

Install and start the service:

```bash
pip install -r requirements.txt
python main.py
```

The required MediaPipe model files are expected in `MlServer/`. The supplied Dockerfile downloads them automatically during a container build.

### 4. Configure and start the client

Open a third terminal:

```bash
cd Client
npm install
```

The client automatically uses the local API and ML URLs on localhost. To override them, create `Client/.env.local`:

```env
VITE_API_URL=http://localhost:3000
VITE_ML_URL=http://localhost:7860
```

Start the client:

```bash
npm run dev
```

Open `http://localhost:5174`.

## Available commands

Run commands from the relevant service directory.

| Directory | Command | Description |
| --- | --- | --- |
| `Client` | `npm run dev` | Start the Vite development server |
| `Client` | `npm run build` | Create a production build |
| `Client` | `npm run preview` | Preview the production build |
| `Client` | `npm run lint` | Run ESLint |
| `Server` | `npm run dev` | Start the API with Nodemon |
| `Server` | `npm start` | Start the API with Node.js |
| `Server` | `npm run db:generate` | Generate a versioned Drizzle migration from the schema |
| `Server` | `npm run db:migrate` | Apply migrations using the direct Neon connection |
| `Server` | `npm run db:check` | Validate Drizzle migration history |
| `Server` | `npm run db:verify` | Check row counts and cross-table integrity |
| `Server` | `npm run migrate:firebase:dry` | Inventory Firestore without writing to Neon |
| `Server` | `npm run migrate:firebase` | Idempotently import all Firestore collections into Neon |
| `MlServer` | `python main.py` | Start the Flask/Socket.IO service |

## Firestore-to-Neon migration

The running application no longer imports Firebase or queries Firestore. Firebase Admin is retained only for the explicit one-time migration command.

Test migrations on an isolated Neon branch before production:

```bash
npx neon@latest branches create --name migration-firestore --parent production
npx neon@latest checkout migration-firestore
npx neon@latest env pull --file Server/.env

cd Server
npm run db:migrate
npm run migrate:firebase:dry
npm run migrate:firebase
npm run db:verify
```

After verification, check out the production branch, pull its environment, and run the same three write/verification commands:

```bash
cd ..
npx neon@latest checkout production
npx neon@latest env pull --file Server/.env

cd Server
npm run db:migrate
npm run migrate:firebase
npm run db:verify
```

The importer preserves Firestore document IDs and nested data, converts Firestore timestamps, and upserts rows in a single transaction. Legacy duplicate-email accounts are safely consolidated while every original user ID is recorded in `migration_user_aliases`. Missing historical user/order references receive clearly marked placeholder records so no order or payment is discarded. Each completed import is recorded in `migration_runs`.

Once production is verified and rollback is no longer required, remove the `FIREBASE_*` variables or `Server/serviceAccountKey.json`. Do not delete the Firestore project until its retention window and business rollback requirements have been satisfied.

## Main application routes

| Area | Routes |
| --- | --- |
| Store | `/`, `/product`, `/product/details/:id`, `/cart`, `/wishlist` |
| Authentication | `/sign_in`, `/sign_up`, `/reset`, `/change_password` |
| Customer | `/checkout`, `/account`, `/account/add`, `/style-profile`, `/order`, `/order_detail/:id` |
| Experiences | `/virtual_try_on`, `/wardrobe` |
| Administration | `/admin`, `/admin/dashboard` |

Checkout, customer account, orders, style profile, and wardrobe routes require authentication. The admin dashboard additionally requires the `admin` role.

## API overview

| Prefix | Capabilities |
| --- | --- |
| `/api/products` | Public product list and product details |
| `/api/register`, `/api/login`, `/api/logout` | Customer authentication |
| `/api/profile`, `/api/address`, `/api/wishlist` | Protected customer data |
| `/api/orders` | Protected order placement, history, details, cancellation, and returns |
| `/api/reviews` | Public review reading and authenticated review submission |
| `/api/coupons/validate` | Coupon validation |
| `/api/admin` | Role-protected products, orders, analytics, customers, and coupons |

The ML service exposes `GET /`, `POST /classify`, and `POST /tryon/photo`, plus Socket.IO events for live and high-quality frame processing.

## Verification checklist

Before opening a pull request or deploying a change:

```bash
cd Client
npm run build
npm run lint
```

Then start all three services and verify the primary flow:

1. Register, sign in, and update the customer profile.
2. Search/filter products, open a product, add a review, and add it to the wishlist.
3. Add products to the cart, apply a valid coupon, complete checkout, and inspect the order.
4. Cancel an eligible order or request a return on a delivered order.
5. Add and remove addresses, save a style profile, and use the wardrobe.
6. Test live and photo virtual try-on, including result download/history.
7. Sign in as an administrator and verify analytics, orders, products, customers, and coupons.
8. Check responsive layouts at mobile, tablet, and desktop widths.

## Deployment notes

- The client falls back to its current origin for the API in production unless `VITE_API_URL` is set.
- The ML client defaults to the configured hosted Hugging Face Space outside localhost unless `VITE_ML_URL` is set.
- The API CORS policy currently accepts localhost origins and `*.vercel.app` origins. Update it when deploying to another domain.
- Use strong, unique JWT secrets and remove or replace the development administrator credentials.
- Serve every service over HTTPS before enabling webcam access in production.
- Connect a payment provider and add webhook verification before treating online payments as real transactions.

## Contributing

1. Fork the repository and create a focused feature branch.
2. Keep credentials and generated assets out of Git.
3. Run the build, lint, and end-to-end verification checklist.
4. Submit a pull request describing the behavior and test coverage.

## License

This project is distributed under the ISC License. See [LICENSE](LICENSE).

## Contact

Bharath Ganga — [bharathganga7@gmail.com](mailto:bharathganga7@gmail.com)
