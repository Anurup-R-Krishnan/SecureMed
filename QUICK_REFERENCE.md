# SecureMed Integration - Quick Reference Guide

## For Frontend Developers

### Using React Query Hooks (RECOMMENDED)

```typescript
// ✅ GOOD: Using React Query hook in a React component
import { usePatients } from '@/hooks/useApi';

function PatientsList() {
  const { data, isLoading, error } = usePatients({ page_size: 20 });
  
  if (isLoading) return <Spinner />;
  if (error) return <ErrorAlert error={error} />;
  
  return (
    <div>
      {data?.results?.map(patient => (
        <PatientCard key={patient.id} patient={patient} />
      ))}
    </div>
  );
}
```

### Using API Client Directly

```typescript
// ✅ GOOD: Direct API client usage (with retry!)
import { apiClient } from '@/lib/unified-api-client';

async function fetchPatients() {
  try {
    const response = await apiClient.get('/patients/');
    return response;
  } catch (error) {
    console.error('Failed after 3 retries:', error);
  }
}
```

### Mutations (Create/Update)

```typescript
// ✅ GOOD: Using mutation hook
import { useCreatePatient } from '@/hooks/useApi';

function CreatePatientForm() {
  const createPatient = useCreatePatient();
  
  const handleSubmit = async (data) => {
    try {
      await createPatient.mutateAsync(data);
      toast.success('Patient created!');
      // Cache automatically invalidated
    } catch (error) {
      toast.error(error.message);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      <button disabled={createPatient.isPending}>Save</button>
    </form>
  );
}
```

### Error Handling

```typescript
// ✅ GOOD: Handle rich error object
try {
  await apiClient.post('/patients/', data);
} catch (error) {
  console.log(error.status);      // 400
  console.log(error.message);     // "Invalid email"
  console.log(error.details);     // { email: ['Invalid format'] }
  console.log(error.url);         // "/api/patients/"
  console.log(error.timestamp);   // "2024-03-11T10:30:00Z"
}
```

### Search and Pagination

```typescript
// ✅ GOOD: Search and pagination
import { usePatients } from '@/hooks/useApi';

function SearchPatients() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  
  const { data, isLoading } = usePatients({
    search,
    page,
    page_size: 20,
  });
  
  return (
    <div>
      <input 
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);  // Reset to first page
        }}
        placeholder="Search patients..."
      />
      
      {data?.results?.map(patient => (
        <PatientRow key={patient.id} patient={patient} />
      ))}
      
      <Pagination 
        current={page}
        total={Math.ceil(data?.count / 20)}
        onChange={setPage}
      />
    </div>
  );
}
```

---

## For Backend Developers

### Using ViewSets with Pagination

```python
# Your ViewSet automatically gets these features:
from rest_framework import viewsets
from apps.accounts.patients.views import PatientViewSet

# GET /api/patients/
# Returns: { count, next, previous, results: [...] }

# GET /api/patients/?page=2&page_size=50
# Returns: Second page with 50 items

# GET /api/patients/?search=john
# Returns: Patients matching "john" in name/email

# GET /api/patients/?ordering=-updated_at
# Returns: Sorted by updated_at descending
```

### Adding Pagination to Other ViewSets

```python
from rest_framework import viewsets
from apps.platform.core.pagination import StandardResultsSetPagination

class YourViewSet(viewsets.ModelViewSet):
    queryset = YourModel.objects.all()
    serializer_class = YourSerializer
    pagination_class = StandardResultsSetPagination  # Enable pagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'email']  # What to search
    ordering_fields = ['created_at', 'name']  # What to sort by
    ordering = ['-created_at']  # Default sort
```

### Returning Standard Response Format

```python
from rest_framework.response import Response
from apps.platform.core.pagination import StandardResultsSetPagination

# All ViewSets automatically return this format:
{
  "count": 100,
  "next": "http://api.example.com/patients/?page=2",
  "previous": null,
  "results": [
    { "id": 1, "name": "John Doe", ... },
    { "id": 2, "name": "Jane Smith", ... },
  ]
}
```

---

## Common API Client Patterns

### Automatic Retry (Happens Automatically)

```typescript
// No need to handle retries manually!
const data = await apiClient.get('/endpoint');
// Internally:
// Attempt 1: FAIL (503)
// Wait 500ms
// Attempt 2: FAIL (502)
// Wait 1000ms  
// Attempt 3: SUCCESS ✓
// Returns data
```

### Request Deduplication (Automatic)

```typescript
// All three requests hit the backend ONCE (within 100ms window)
await Promise.all([
  apiClient.get('/patients/'),
  apiClient.get('/patients/'),
  apiClient.get('/patients/'),
]);

// Only 1 actual HTTP request!
// Others get cached result
```

### Automatic Token Refresh

```typescript
// If token expires:
const data = await apiClient.get('/patients/');
// Internally:
// - GET returns 401 Unauthorized
// - Automatically calls POST /auth/token/refresh/
// - Saves new token to localStorage
// - Retries original request
// - Returns data
```

### Cache Management

```typescript
import { queryClient } from '@/components/QueryClientProvider';

// Invalidate all patient queries
queryClient.invalidateQueries({ queryKey: ['api', 'patients'] });

// Invalidate specific patient
queryClient.invalidateQueries({ queryKey: ['api', 'patients', 123] });

// Invalidate everything
queryClient.clear();

// Get cache info for debugging
const apiClient = require('@/lib/unified-api-client').apiClient;
console.log(apiClient.getCacheStats());
```

---

## Query Patterns

### List with Filters

```typescript
const { data } = usePatients({
  page: 1,
  page_size: 20,
  search: 'john',
  ordering: '-updated_at',
});
```

### Single Item

```typescript
const { data: patient, isLoading, error } = usePatient(123);
```

### Dependent Queries

```typescript
// Only fetch appointments if we have a patient ID
const { data: appointments } = useAppointments(
  patientId ? { patient_id: patientId } : undefined,
  { enabled: !!patientId }  // Only run if patientId exists
);
```

### Manual Refetch

```typescript
const { refetch } = usePatients();

// Later...
<button onClick={() => refetch()}>Refresh</button>
```

### Keep Previous Data During Refetch

```typescript
const { data, isPreviousData } = usePatients({ page }, {
  keepPreviousData: true,
});

// isPreviousData is true while new data is loading
// Old data stays visible until new data arrives
```

---

## Migration Checklist

### Updating a Component to Use React Query

- [ ] Remove useState for data, loading, error
- [ ] Import appropriate hook from '@/hooks/useApi'
- [ ] Replace API call with hook
- [ ] Remove useEffect
- [ ] Update JSX to use `data?.results` instead of state
- [ ] Update loading/error UI to use hook values
- [ ] Test in browser

### Updating a Service File

- [ ] Change import: `import { apiClient } from '@/lib/unified-api-client'`
- [ ] Replace all `api.get` with `apiClient.get`
- [ ] Replace all `api.post` with `apiClient.post`
- [ ] Replace all `api.put` with `apiClient.put`
- [ ] Replace all `api.patch` with `apiClient.patch`
- [ ] Replace all `api.delete` with `apiClient.delete`
- [ ] Test in browser

---

## Debugging Tips

### Check Request Deduplication

```typescript
const apiClient = require('@/lib/unified-api-client').apiClient;
console.log(apiClient.getCacheStats());

// Output:
// {
//   size: 5,
//   entries: [
//     { key: 'GET:/patients/?page=1', expiresIn: 8500 },
//     { key: 'GET:/appointments/?page=1', expiresIn: 4200 },
//   ]
// }
```

### Enable Debug Logging

```typescript
// Automatically enabled in development mode
// In browser console, you'll see:
// [API Debug] [GET] /api/patients/?page=1
// [API Debug] [Cache Hit] GET:/patients/?page=1
// [API Info] [GET] /api/patients/?page=1 - Success on attempt 1
```

### Check React Query Cache

```typescript
import { queryClient } from '@/components/QueryClientProvider';

// Get all cache entries
console.log(queryClient.getQueryData(['api', 'patients']));

// Get all queries
queryClient.getQueriesData({});

// Check if query is fetching
const isPatientsFetching = queryClient.isFetching({ queryKey: ['api', 'patients'] });
```

### Check API Response Format

```typescript
// Open browser DevTools
// Network tab
// Click on API request
// Preview tab shows response structure
// Should show: { count, next, previous, results }
```

---

## Performance Tips

### 1. Use Pagination

```typescript
// ❌ BAD: Loads all records at once
const { data } = usePatients();

// ✅ GOOD: Load paginated
const { data } = usePatients({ page_size: 20 });
```

### 2. Use Field Filtering (when available)

```typescript
// ❌ BAD: Gets all fields
const { data } = usePatients();

// ✅ GOOD: Only get needed fields
const { data } = usePatients({ fields: 'id,name,email' });
```

### 3. Avoid Unnecessary Refetches

```typescript
// ❌ BAD: Refetch on every state change
useEffect(() => {
  refetch();
}, [filter, sort, page, search, ...otherDeps]);

// ✅ GOOD: Let React Query manage cache
const { data } = usePatients({ filter, sort, page, search });
```

### 4. Use Dependent Queries

```typescript
// ❌ BAD: Always fetching
const { data: patient } = usePatient(null);

// ✅ GOOD: Only fetch when ID exists
const { data: patient } = usePatient(id, { enabled: !!id });
```

---

## Troubleshooting

### Problem: Getting 401 on every request
**Solution**: Check if tokens are stored correctly
```typescript
console.log('Access:', localStorage.getItem('access_token'));
console.log('Auth tokens:', localStorage.getItem('auth_tokens'));
```

### Problem: Requests still failing after retries
**Solution**: Check server logs and network tab
```typescript
// Network tab shows status codes and response
// Check server logs for actual error
```

### Problem: Cache is stale
**Solution**: Invalidate cache manually
```typescript
import { queryClient } from '@/components/QueryClientProvider';
queryClient.invalidateQueries({ queryKey: ['api', 'patients'] });
```

### Problem: Build failing
**Solution**: Clear cache and reinstall
```bash
rm -rf .next node_modules
npm install
npm run build
```

---

## Code Examples Repository

### Simple List
```typescript
import { usePatients } from '@/hooks/useApi';

export function PatientsList() {
  const { data, isLoading, error } = usePatients();
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <ul>
      {data?.results?.map(p => (
        <li key={p.id}>{p.user.first_name} {p.user.last_name}</li>
      ))}
    </ul>
  );
}
```

### Form with Create
```typescript
import { useCreatePatient } from '@/hooks/useApi';

export function CreatePatientForm() {
  const [formData, setFormData] = useState({});
  const create = useCreatePatient();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await create.mutateAsync(formData);
      setFormData({});
    } catch (err) {
      console.error(err);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      <button disabled={create.isPending}>
        {create.isPending ? 'Saving...' : 'Save'}
      </button>
    </form>
  );
}
```

### Search with Pagination
```typescript
import { usePatients } from '@/hooks/useApi';

export function SearchPatients() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  
  const { data, isLoading } = usePatients({
    search,
    page,
    page_size: 10,
  });
  
  return (
    <div>
      <input 
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        placeholder="Search..."
      />
      
      <ul>
        {data?.results?.map(p => (
          <li key={p.id}>{p.user.first_name}</li>
        ))}
      </ul>
      
      <div>
        <button 
          disabled={page === 1}
          onClick={() => setPage(p => p - 1)}
        >
          Previous
        </button>
        Page {page} of {Math.ceil((data?.count || 0) / 10)}
        <button 
          disabled={!data?.next}
          onClick={() => setPage(p => p + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
```

---

## Reference Links

- React Query Docs: https://tanstack.com/query/latest
- TypeScript Generics: https://www.typescriptlang.org/docs/handbook/2/generics.html
- Django REST Framework: https://www.django-rest-framework.org/
- HTTP Status Codes: https://httpwg.org/specs/rfc7231.html#status.codes

---

**Last Updated**: 2024
**Version**: 1.0.0
