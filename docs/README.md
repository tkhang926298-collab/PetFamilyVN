# Pet Is My Family - Documentation

## Project Overview
Pet Is My Family là ứng dụng chẩn đoán bệnh thú cưng dựa trên AI, hỗ trợ chủ thú cưng tại Việt Nam.

## Architecture

### Tech Stack
- **Frontend (Zalo Mini App)**: React 18 + ZMP UI + Vite
- **Frontend (Web Admin)**: Flutter Web
- **Frontend (Web User)**: Flutter Web
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **AI**: Google Gemini + Groq
- **Storage**: Cloudinary
- **Maps**: OpenStreetMap + Leaflet
- **Notifications**: Firebase Cloud Messaging

### Project Structure
```
pet_is_my_family/
├── admin_tool/          # Python GUI for data management
├── web_admin/           # Flutter web admin panel
├── web_user/            # Flutter web user app
├── zalo_mini_app/       # React Zalo Mini App (main user app)
├── supabase/            # Database migrations & edge functions
├── config/              # Configuration files (JSON)
├── docs/                # Documentation
└── scripts/             # Utility scripts
```

## Getting Started

### Prerequisites
- Python 3.10+
- Node.js 20+
- Flutter 3.24+
- Supabase CLI (optional)

### Setup

1. **Generate Environment Variables**
   ```bash
   python scripts/inject_keys.py
   ```
   This will parse `ID key.txt` and generate `.env` files for all modules.

2. **Install Dependencies**
   ```bash
   # Admin Tool
   cd admin_tool
   pip install -r requirements.txt

   # Zalo Mini App
   cd zalo_mini_app
   yarn install

   # Web Admin
   cd web_admin
   flutter pub get

   # Web User
   cd web_user
   flutter pub get
   ```

3. **Database Setup**
   - Go to Supabase Dashboard
   - Run migrations in `supabase/migrations/` in order:
     - `001_initial_schema.sql`
     - `002_rpc_functions.sql`
     - `003_rls_policies.sql`

4. **Run Applications**
   ```bash
   # Admin Tool
   cd admin_tool
   python main_gui.py

   # Zalo Mini App
   cd zalo_mini_app
   yarn start

   # Web Admin
   cd web_admin
   flutter run -d chrome

   # Web User
   cd web_user
   flutter run -d chrome
   ```

## Configuration Files

### food_checker.json
Contains 25+ food items with risk levels (high/medium/low) for dogs and cats.

### vacxin_schedule.json
Vietnamese vaccination schedule for dogs and cats based on Ministry of Agriculture guidelines.

### osm_config.json
OpenStreetMap configuration for danger zone mapping.

### cloudinary_config.json
Cloudinary upload presets and transformations.

## Database Schema

See `supabase/migrations/001_initial_schema.sql` for complete schema.

### Key Tables
- **profiles**: User accounts with xu balance
- **transactions**: Xu transaction history
- **diseases**: Disease database
- **diagnoses**: User diagnosis history
- **danger_zones**: Community danger map
- **community_posts**: Forum posts
- **pet_profiles**: Pet information (premium)
- **vaccination_reminders**: Vaccine reminders

### RPC Functions
- `use_credits(user_id, cost)`: Safely deduct xu
- `add_credits(user_id, amount, reason)`: Add xu (admin)
- `get_nearby_dangers(lat, lon, radius)`: Find nearby danger zones
- `search_diseases(term)`: Full-text disease search

## Security

### Environment Variables
- **Backend keys** (ZALO_APP_SECRET, API secrets): Only in `admin_tool/.env` and root `.env`
- **Frontend keys**: Use `VITE_` prefix in `zalo_mini_app/.env`
- **Never commit** `.env` files to git

### Row Level Security (RLS)
All tables have RLS enabled. Users can only access their own data.

## Development Guidelines

### Modular Design
- Each file should be < 250 LOC
- Follow Single Responsibility Principle (SRP)
- Separate concerns: UI / Services / Models / Utils

### Code Style
- **Python**: PEP 8
- **JavaScript/React**: ESLint + Prettier
- **Dart/Flutter**: flutter_lints

### Testing
```bash
# Python
cd admin_tool
pytest

# React
cd zalo_mini_app
yarn test

# Flutter
cd web_admin
flutter test
```

## Deployment

### Zalo Mini App
1. Build: `yarn build`
2. Upload to Zalo Mini App Console
3. Submit for review

### Supabase
1. Link project: `supabase link --project-ref <ref>`
2. Push migrations: `supabase db push`
3. Deploy edge functions: `supabase functions deploy`

## Support
For issues, contact: admin@petismyfamily.vn
