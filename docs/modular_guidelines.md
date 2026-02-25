# Modular Design Guidelines

## Principles

### 1. Single Responsibility Principle (SRP)
Each file/module should have ONE clear responsibility.

**Bad:**
```javascript
// UserDashboard.jsx (500 LOC)
// - Fetches user data
// - Handles authentication
// - Renders UI
// - Manages xu transactions
// - Handles notifications
```

**Good:**
```javascript
// UserDashboard.jsx (80 LOC) - UI only
// useAuth.js (50 LOC) - Authentication logic
// useXu.js (60 LOC) - Xu management
// useNotifications.js (40 LOC) - Notification logic
```

### 2. File Size Limit
- **Target**: < 250 LOC per file
- **Maximum**: 300 LOC (exceptional cases only)
- **If exceeding**: Split into smaller modules

### 3. Folder Structure

#### React/Zalo Mini App
```
src/
├── components/       # Reusable UI components (< 100 LOC each)
│   ├── Header.jsx
│   ├── FoodCheckerCard.jsx
│   └── VacxinReminder.jsx
├── pages/            # Route pages (orchestrate components)
│   ├── Home.jsx
│   ├── Diagnose.jsx
│   └── Community.jsx
├── services/         # Business logic (custom hooks)
│   ├── useAuth.js
│   ├── useXu.js
│   └── useAi.js
├── models/           # Data interfaces
│   ├── User.js
│   ├── Disease.js
│   └── Transaction.js
└── utils/            # Pure helper functions
    ├── constants.js
    ├── validators.js
    └── formatters.js
```

#### Python/Admin Tool
```
admin_tool/
├── crawler/          # Web scraping logic
│   └── extract_data.py
├── ai_processor/     # AI integration
│   ├── gemini_handler.py
│   └── groq_handler.py
├── supabase_updater/ # Database operations
│   ├── db_insert.py
│   └── upload_csv.py
└── utils/            # Helpers
    ├── image_handler.py
    ├── validator.py
    └── config.py
```

## Best Practices

### Components (React)
```javascript
// ✅ Good: Pure, focused component
const FoodCheckerCard = ({ onSearch }) => {
  const [query, setQuery] = useState('');

  return (
    <Card>
      <Input value={query} onChange={setQuery} />
      <Button onClick={() => onSearch(query)}>Search</Button>
    </Card>
  );
};

// ❌ Bad: Too many responsibilities
const FoodCheckerCard = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClient(...);

  const search = async () => {
    setLoading(true);
    const { data } = await supabase.from('foods').select('*');
    // ... complex logic
    setResults(data);
    setLoading(false);
  };

  return (
    // ... 100+ lines of JSX
  );
};
```

### Services (Custom Hooks)
```javascript
// ✅ Good: Focused hook
export const useXu = () => {
  const [balance, setBalance] = useState(0);

  const deductXu = async (cost) => {
    const { data, error } = await supabase.rpc('use_credits', {
      u_id: userId,
      cost
    });
    if (data) setBalance(prev => prev - cost);
    return !error;
  };

  return { balance, deductXu };
};
```

### Python Modules
```python
# ✅ Good: Single responsibility
# image_handler.py
def process_images(image_urls, disease_id):
    """Downloads, resizes, and uploads images to Cloudinary."""
    uploaded = []
    for url in image_urls:
        img = download_image(url)
        resized = resize_image(img)
        result = upload_to_cloudinary(resized, disease_id)
        uploaded.append(result)
    return uploaded

# ❌ Bad: Multiple responsibilities
def process_everything(urls, disease_id):
    # Downloads images
    # Resizes images
    # Uploads to Cloudinary
    # Calls Gemini API
    # Updates Supabase
    # Sends notifications
    # ... 500 lines
```

## Naming Conventions

### Files
- **Components**: PascalCase (`FoodCheckerCard.jsx`)
- **Hooks**: camelCase with `use` prefix (`useAuth.js`)
- **Utils**: camelCase (`validators.js`)
- **Python**: snake_case (`image_handler.py`)

### Functions
- **JavaScript**: camelCase (`getUserData`)
- **Python**: snake_case (`get_user_data`)
- **React Components**: PascalCase (`UserProfile`)

### Variables
- **Constants**: UPPER_SNAKE_CASE (`API_BASE_URL`)
- **Regular**: camelCase/snake_case (`userName`, `user_name`)

## Code Review Checklist

Before committing, check:
- [ ] File is < 250 LOC
- [ ] Single responsibility
- [ ] No duplicate code
- [ ] Proper error handling
- [ ] Comments for complex logic
- [ ] Tests written (if applicable)
- [ ] No console.log/print statements
- [ ] Proper imports (no unused)

## Refactoring Example

### Before (Bad)
```javascript
// DiagnosePage.jsx (600 LOC)
const DiagnosePage = () => {
  // State management (50 lines)
  // API calls (100 lines)
  // Image upload logic (80 lines)
  // AI processing (120 lines)
  // Form validation (60 lines)
  // UI rendering (190 lines)
};
```

### After (Good)
```javascript
// DiagnosePage.jsx (120 LOC)
const DiagnosePage = () => {
  const { uploadImage } = useCloudinary();
  const { analyzeImage } = useAi();
  const { deductXu } = useXu();
  const { register, handleSubmit } = useForm();

  const onSubmit = async (data) => {
    const imageUrl = await uploadImage(data.image);
    const result = await analyzeImage(imageUrl, data.description);
    await deductXu(1);
    // Navigate to results
  };

  return <DiagnoseForm onSubmit={handleSubmit(onSubmit)} />;
};

// useCloudinary.js (60 LOC)
// useAi.js (80 LOC)
// useXu.js (50 LOC)
// DiagnoseForm.jsx (90 LOC)
```

## Benefits

1. **Easier to understand**: Small files are easier to read
2. **Easier to test**: Isolated logic is easier to unit test
3. **Easier to maintain**: Changes are localized
4. **Easier to reuse**: Modular code can be reused
5. **Easier to collaborate**: Less merge conflicts

## Anti-Patterns to Avoid

### God Object
```javascript
// ❌ Bad: One file does everything
class AppManager {
  handleAuth() { /* ... */ }
  handleDatabase() { /* ... */ }
  handleUI() { /* ... */ }
  handleNotifications() { /* ... */ }
  // ... 1000+ lines
}
```

### Spaghetti Code
```javascript
// ❌ Bad: Complex interdependencies
import { funcA } from './moduleB';
// moduleB imports from moduleC
// moduleC imports from moduleA
// Circular dependency hell
```

### Copy-Paste Programming
```javascript
// ❌ Bad: Duplicate code
const fetchUsers = async () => {
  try {
    const { data, error } = await supabase.from('users').select('*');
    if (error) throw error;
    return data;
  } catch (e) {
    console.error(e);
  }
};

const fetchPosts = async () => {
  try {
    const { data, error } = await supabase.from('posts').select('*');
    if (error) throw error;
    return data;
  } catch (e) {
    console.error(e);
  }
};

// ✅ Good: Reusable function
const fetchFromSupabase = async (table) => {
  try {
    const { data, error } = await supabase.from(table).select('*');
    if (error) throw error;
    return data;
  } catch (e) {
    console.error(e);
  }
};
```

## Summary

**Remember**: Small, focused modules are the key to maintainable code. When in doubt, split it out!
