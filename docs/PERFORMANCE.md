# Performance Optimization Guide

## Bundle Size Optimization

### Current Configuration
- **Target bundle size**: <500KB (gzipped)
- **Code splitting**: Enabled with manual chunks
- **Tree shaking**: Enabled via Vite
- **Minification**: Terser with console removal

### Vendor Chunks
```javascript
'react-vendor': ['react', 'react-dom', 'recoil']
'zmp-vendor': ['zmp-ui', 'zmp-sdk']
'supabase-vendor': ['@supabase/supabase-js']
'map-vendor': ['leaflet', 'react-leaflet']
```

## Lazy Loading

### Components
Heavy components are lazy loaded:
- DangerZone page (includes Leaflet map)
- Community page (includes image uploads)
- Profile page
- Recharge page

Usage:
```javascript
import { LazyDangerZone } from './utils/lazyLoad';
<Suspense fallback={<LoadingFallback />}>
  <LazyDangerZone />
</Suspense>
```

### Images
Use LazyImage component for automatic lazy loading:
```javascript
import { LazyImage } from './components/LazyImage';
<LazyImage src="image.jpg" alt="Pet" className="w-full" />
```

## Caching Strategy

### API Response Caching
```javascript
import { withCache } from './utils/cache';

const data = await withCache(
  'cache_key',
  async () => fetchData(),
  5 * 60 * 1000 // 5 minutes TTL
);
```

### Cache Configuration
- Community posts: 2 minutes
- Disease data: 5 minutes
- User profile: 5 minutes
- Danger zones: 3 minutes

## Service Worker

### Offline Support
- Static assets cached on install
- Dynamic caching for API responses
- Offline fallback page
- Background sync for pending actions

### Registration
Service worker is automatically registered in production builds.

## Performance Utilities

### Debounce
Limit function calls for search inputs:
```javascript
import { debounce } from './utils/performance';
const debouncedSearch = debounce(handleSearch, 300);
```

### Throttle
Limit scroll/resize handlers:
```javascript
import { throttle } from './utils/performance';
const throttledScroll = throttle(handleScroll, 100);
```

### Image Compression
Compress images before upload:
```javascript
import { compressImage } from './utils/performance';
const compressed = await compressImage(file, 1200, 0.8);
```

## Database Query Optimization

### Indexes
Ensure these indexes exist in Supabase:
- `community_posts(created_at DESC)`
- `danger_zones(lat, lon)`
- `diseases(disease_id)`
- `profiles(zalo_id)`

### Query Limits
- Community posts: 20 per page
- Danger zones: 100 per fetch
- Diseases: 50 per page

### RPC Functions
Use RPC for complex queries:
- `get_nearby_dangers`: Optimized geospatial query
- `use_credits`: Atomic transaction
- `search_diseases`: Full-text search

## Network Optimization

### Retry Logic
Automatic retry with exponential backoff:
```javascript
import { retryWithBackoff } from './utils/performance';
const data = await retryWithBackoff(() => fetchData(), 3, 1000);
```

### Request Batching
Batch multiple requests when possible:
```javascript
const [posts, zones, profile] = await Promise.all([
  fetchPosts(),
  fetchDangerZones(),
  fetchProfile()
]);
```

## Monitoring

### Performance Metrics
Monitor these metrics:
- First Contentful Paint (FCP): <1.8s
- Largest Contentful Paint (LCP): <2.5s
- Time to Interactive (TTI): <3.8s
- Total Blocking Time (TBT): <200ms
- Cumulative Layout Shift (CLS): <0.1

### Tools
- Lighthouse CI for automated testing
- Chrome DevTools Performance tab
- Network tab for bundle analysis
- Coverage tab for unused code

## Best Practices

1. **Always use lazy loading** for heavy components
2. **Cache API responses** with appropriate TTL
3. **Compress images** before upload (max 1200px, 80% quality)
4. **Debounce search inputs** (300ms)
5. **Throttle scroll handlers** (100ms)
6. **Use service worker** for offline support
7. **Monitor bundle size** (<500KB target)
8. **Optimize database queries** with indexes
9. **Use RPC functions** for complex operations
10. **Test on slow 3G** network conditions

## Deployment Checklist

- [ ] Run `npm run build` and check bundle size
- [ ] Test service worker registration
- [ ] Verify lazy loading works
- [ ] Check cache TTL values
- [ ] Test offline functionality
- [ ] Run Lighthouse audit (score >90)
- [ ] Test on slow network (3G)
- [ ] Verify image compression
- [ ] Check database indexes
- [ ] Monitor error rates

## Future Optimizations

- Implement React Query for advanced caching
- Add virtual scrolling for long lists
- Use Web Workers for heavy computations
- Implement progressive image loading
- Add prefetching for predicted routes
- Use HTTP/2 server push
- Implement resource hints (preload, prefetch)
