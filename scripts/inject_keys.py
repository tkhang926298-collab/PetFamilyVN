#!/usr/bin/env python3
"""
Script to parse ID key.txt and generate .env files for all modules
"""
import os
import re
import sys

# Paths
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE_FILE = os.path.join(ROOT_DIR, 'ID key.txt')

# Destination paths
DESTINATIONS = {
    'root': os.path.join(ROOT_DIR, '.env'),
    'admin_tool': os.path.join(ROOT_DIR, 'admin_tool', '.env'),
    'zalo_mini_app': os.path.join(ROOT_DIR, 'zalo_mini_app', '.env'),
    'web_user_assets': os.path.join(ROOT_DIR, 'web_user', 'assets', '.env'),
    'web_admin_assets': os.path.join(ROOT_DIR, 'web_admin', 'assets', '.env'),
}

def parse_id_key_file(content):
    """Parse ID key.txt and extract all keys"""
    env_map = {}

    # 1. Supabase URL
    url_match = re.search(r'URL:\s*(https://[a-zA-Z0-9]+\.supabase\.co)', content)
    if url_match:
        env_map['SUPABASE_URL'] = url_match.group(1)

    # 2. Supabase Anon Key
    anon_match = re.search(r'Anon key:\s*([a-zA-Z0-9\._\-]+)', content)
    if anon_match:
        env_map['SUPABASE_ANON_KEY'] = anon_match.group(1)
        env_map['SUPABASE_KEY'] = anon_match.group(1)  # Alias for admin tool

    # 3. Supabase Password
    pass_match = re.search(r'Pass:\s*(\S+)', content)
    if pass_match:
        env_map['SUPABASE_DB_PASSWORD'] = pass_match.group(1)

    # 4. Cloudinary
    cloud_name_match = re.search(r'name:\s*([a-zA-Z0-9]+)', content)
    if cloud_name_match:
        env_map['CLOUDINARY_CLOUD_NAME'] = cloud_name_match.group(1)

    api_key_match = re.search(r'API key:\s*(\d+)', content)
    if api_key_match:
        env_map['CLOUDINARY_API_KEY'] = api_key_match.group(1)

    api_secret_match = re.search(r'API Scret:\s*([a-zA-Z0-9_\-]+)', content)
    if api_secret_match:
        env_map['CLOUDINARY_API_SECRET'] = api_secret_match.group(1)

    preset_match = re.search(r'preset name:\s*([a-zA-Z0-9_\-]+)', content)
    if preset_match:
        env_map['CLOUDINARY_UPLOAD_PRESET'] = preset_match.group(1)

    folder_match = re.search(r'Asset folder:\s*([a-zA-Z0-9_\-]+)', content)
    if folder_match:
        env_map['CLOUDINARY_ASSET_FOLDER'] = folder_match.group(1)

    # 5. Zalo
    zalo_id_match = re.search(r'Zalo app ID:\s*(\d+)', content)
    if zalo_id_match:
        env_map['ZALO_APP_ID'] = zalo_id_match.group(1)

    zalo_secret_match = re.search(r'Zalo App Secret:\s*([a-zA-Z0-9]+)', content)
    if zalo_secret_match:
        env_map['ZALO_APP_SECRET'] = zalo_secret_match.group(1)

    # 6. Gemini API Key (Multiple)
    # Pattern: "API gemini <N>: <key>" or just "API gemini: <key>"
    gemini_keys = []
    # Try finding numbered keys first
    gemini_matches = re.findall(r'API gemini\s*\d*:\s*([a-zA-Z0-9_\-]+)', content, re.IGNORECASE)
    if gemini_matches:
        gemini_keys.extend(gemini_matches)
    
    if gemini_keys:
        # Deduplicate and CSV
        env_map['GEMINI_API_KEYS'] = ','.join(list(set(gemini_keys)))
        env_map['GEMINI_API_KEY'] = gemini_keys[0] # Fallback for single key legacy
    
    # 7. Groq API Key (Multiple)
    groq_keys = []
    groq_matches = re.findall(r'Groq API key\s*\d*:\s*(gsk_[a-zA-Z0-9]+)', content, re.IGNORECASE)
    if groq_matches:
        groq_keys.extend(groq_matches)

    if groq_keys:
        env_map['GROQ_API_KEYS'] = ','.join(list(set(groq_keys)))
        env_map['GROQ_API_KEY'] = groq_keys[0] # Fallback

    return env_map

def generate_env_file(dest_path, env_map, module_name):
    """Generate .env file for specific module"""

    # Ensure directory exists
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)

    # Module-specific keys
    if module_name == 'zalo_mini_app':
        # Frontend - only safe keys with VITE_ prefix
        content = f"""# SUPABASE CONFIG (Frontend)
VITE_SUPABASE_URL={env_map.get('SUPABASE_URL', '')}
VITE_SUPABASE_ANON_KEY={env_map.get('SUPABASE_ANON_KEY', '')}

# CLOUDINARY CONFIG (Frontend - unsigned upload)
VITE_CLOUDINARY_CLOUD_NAME={env_map.get('CLOUDINARY_CLOUD_NAME', '')}
VITE_CLOUDINARY_UPLOAD_PRESET={env_map.get('CLOUDINARY_UPLOAD_PRESET', '')}
"""

    elif module_name in ['web_user_assets', 'web_admin_assets']:
        # Flutter - no prefix
        content = f"""SUPABASE_URL={env_map.get('SUPABASE_URL', '')}
SUPABASE_ANON_KEY={env_map.get('SUPABASE_ANON_KEY', '')}
CLOUDINARY_CLOUD_NAME={env_map.get('CLOUDINARY_CLOUD_NAME', '')}
CLOUDINARY_UPLOAD_PRESET={env_map.get('CLOUDINARY_UPLOAD_PRESET', '')}
GEMINI_API_KEY={env_map.get('GEMINI_API_KEY', '')}
"""

    elif module_name == 'admin_tool':
        # Backend - all keys including secrets
        content = f"""# SUPABASE CONFIG (Backend)
SUPABASE_URL={env_map.get('SUPABASE_URL', '')}
SUPABASE_KEY={env_map.get('SUPABASE_KEY', '')}
SUPABASE_DB_PASSWORD={env_map.get('SUPABASE_DB_PASSWORD', '')}

# CLOUDINARY CONFIG (Backend - with secrets)
CLOUDINARY_CLOUD_NAME={env_map.get('CLOUDINARY_CLOUD_NAME', '')}
CLOUDINARY_API_KEY={env_map.get('CLOUDINARY_API_KEY', '')}
CLOUDINARY_API_SECRET={env_map.get('CLOUDINARY_API_SECRET', '')}
CLOUDINARY_UPLOAD_PRESET={env_map.get('CLOUDINARY_UPLOAD_PRESET', '')}
CLOUDINARY_ASSET_FOLDER={env_map.get('CLOUDINARY_ASSET_FOLDER', '')}

# ZALO CONFIG (Backend only - DO NOT expose to frontend)
ZALO_APP_ID={env_map.get('ZALO_APP_ID', '')}
ZALO_APP_SECRET={env_map.get('ZALO_APP_SECRET', '')}

# AI API KEYS (Backend)
GEMINI_API_KEYS={env_map.get('GEMINI_API_KEYS', '')}
GEMINI_API_KEY={env_map.get('GEMINI_API_KEY', '')}
GROQ_API_KEYS={env_map.get('GROQ_API_KEYS', '')}
GROQ_API_KEY={env_map.get('GROQ_API_KEY', '')}
"""

    else:  # root
        # Root .env - all keys
        content = f"""# SUPABASE CONFIG (Backend & Frontend)
SUPABASE_URL={env_map.get('SUPABASE_URL', '')}
SUPABASE_ANON_KEY={env_map.get('SUPABASE_ANON_KEY', '')}
SUPABASE_DB_PASSWORD={env_map.get('SUPABASE_DB_PASSWORD', '')}

# CLOUDINARY CONFIG (Admin Tool & Zalo App)
CLOUDINARY_CLOUD_NAME={env_map.get('CLOUDINARY_CLOUD_NAME', '')}
CLOUDINARY_API_KEY={env_map.get('CLOUDINARY_API_KEY', '')}
CLOUDINARY_API_SECRET={env_map.get('CLOUDINARY_API_SECRET', '')}
CLOUDINARY_UPLOAD_PRESET={env_map.get('CLOUDINARY_UPLOAD_PRESET', '')}
CLOUDINARY_ASSET_FOLDER={env_map.get('CLOUDINARY_ASSET_FOLDER', '')}

# ZALO CONFIG (Backend only - DO NOT expose to frontend)
ZALO_APP_ID={env_map.get('ZALO_APP_ID', '')}
ZALO_APP_SECRET={env_map.get('ZALO_APP_SECRET', '')}

# AI API KEYS
GEMINI_API_KEYS={env_map.get('GEMINI_API_KEYS', '')}
GROQ_API_KEYS={env_map.get('GROQ_API_KEYS', '')}
"""

    # Write file
    with open(dest_path, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"[OK] Generated: {dest_path}")

def main():
    print("=" * 60)
    print("ID Key Injection Script")
    print("=" * 60)

    # Check source file
    if not os.path.exists(SOURCE_FILE):
        print(f"ERROR: Source file not found: {SOURCE_FILE}")
        sys.exit(1)

    # Read and parse
    print(f"\nReading keys from: {SOURCE_FILE}")
    with open(SOURCE_FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    env_map = parse_id_key_file(content)

    # Validate required keys
    required_keys = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'CLOUDINARY_CLOUD_NAME', 'GEMINI_API_KEY']
    missing_keys = [k for k in required_keys if k not in env_map or not env_map[k]]

    if missing_keys:
        print(f"\nCRITICAL ERROR: Missing required keys: {missing_keys}")
        sys.exit(1)

    print(f"\nParsed {len(env_map)} keys successfully")
    print(f"   Keys found: {', '.join(env_map.keys())}")

    # Generate .env files for all modules
    print(f"\nGenerating .env files...")
    for module_name, dest_path in DESTINATIONS.items():
        try:
            generate_env_file(dest_path, env_map, module_name)
        except Exception as e:
            print(f"Warning: Failed to generate {dest_path}: {e}")

    print("\n" + "=" * 60)
    print("SUCCESS: All .env files generated!")
    print("=" * 60)
    print("\nSECURITY REMINDER:")
    print("   - Never commit .env files to git")
    print("   - Keep ID key.txt secure")
    print("   - ZALO_APP_SECRET is only in backend .env files")
    print("\n")

if __name__ == '__main__':
    main()
