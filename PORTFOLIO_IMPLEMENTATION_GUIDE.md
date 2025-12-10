# Portfolio Feature Implementation Guide

## ✅ Completed Changes

### 1. Database Schema Created

All necessary database tables have been created for portfolio functionality:

#### **Tables Created:**

1. **`portfolios`** - User portfolio metadata
   - Stores cash balance, total value, P&L
   - One portfolio per user (user_id is unique)
   - Tracks last analysis timestamp

2. **`portfolio_positions`** - Individual asset holdings
   - Long/short positions with quantities
   - Cost basis tracking for P&L calculation
   - Current price and market value
   - Allocation percentages

3. **`investment_pies`** - Custom portfolio templates
   - User-created investment strategies
   - Can be made public for sharing
   - Tags for categorization

4. **`pie_assets`** - Assets within pies
   - Allocation percentages (must total 100%)
   - Sort order for display

5. **`ai_analysis_results`** - AI analysis storage
   - Stores decisions, sentiment, confidence
   - Agent signals from all 4 AI agents
   - Processing time and tokens used
   - Steps completed for progress tracking

6. **`portfolio_history`** - Performance tracking
   - Snapshots of portfolio value over time
   - Daily/weekly/monthly/hourly snapshots
   - Change tracking for charts

#### **Migration File:** `backend/migrations/0002_portfolio_tables.sql`

---

### 2. AI Loading Component Updated

**File:** `apps/web/src/components/portfolio/AIAnalysisLoading.tsx`

**Changes:**
- ✅ Now accepts `currentStep` and `completedSteps` props from backend
- ✅ Removed hardcoded duration-based progression
- ✅ Syncs with actual backend analysis progress
- ✅ Updated branding to "Powered by NebulaX AI"

**Props Interface:**
```typescript
interface AIAnalysisLoadingProps {
  isAnalyzing: boolean;
  currentStep?: string; // e.g., 'fetch-data', 'agent-synthesis'
  completedSteps?: string[]; // Array of completed step IDs
}
```

---

## 🚧 Next Steps Required

### Step 1: Run Database Migration

**Command:**
```bash
cd backend
# Using your database client (psql, drizzle-kit, etc.)
psql -U your_user -d your_database -f migrations/0002_portfolio_tables.sql

# OR if using Drizzle Kit:
npx drizzle-kit push:pg
```

**Verify Migration:**
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_name IN ('portfolios', 'portfolio_positions', 'investment_pies', 'pie_assets', 'ai_analysis_results', 'portfolio_history');
```

---

### Step 2: Update Database Index Files

Add portfolio schema to the database exports:

**File:** `backend/src/db/index.ts`

```typescript
export * from './schema/portfolio';
```

---

### Step 3: Create Backend Portfolio Routes

Create comprehensive CRUD routes for portfolio management:

**File:** `backend/src/routes/portfolio.routes.ts` (to be updated/created)

**Required Endpoints:**

#### Portfolio Management
```typescript
GET    /api/portfolio              // Get user's portfolio
POST   /api/portfolio              // Create portfolio
PUT    /api/portfolio              // Update portfolio
DELETE /api/portfolio              // Delete portfolio

GET    /api/portfolio/positions    // Get all positions
POST   /api/portfolio/positions    // Add position
PUT    /api/portfolio/positions/:id // Update position
DELETE /api/portfolio/positions/:id // Remove position

GET    /api/portfolio/history      // Get performance history
POST   /api/portfolio/history      // Create snapshot
```

#### Investment Pies
```typescript
GET    /api/portfolio/pies         // Get user's pies
POST   /api/portfolio/pies         // Create pie
PUT    /api/portfolio/pies/:id     // Update pie
DELETE /api/portfolio/pies/:id     // Delete pie

GET    /api/portfolio/pies/:id/assets    // Get pie assets
POST   /api/portfolio/pies/:id/assets    // Add asset to pie
DELETE /api/portfolio/pies/:id/assets/:assetId // Remove asset
```

#### AI Analysis
```typescript
POST   /api/portfolio/analyze      // Run AI analysis
GET    /api/portfolio/analysis     // Get latest analysis
GET    /api/portfolio/analysis/history // Get analysis history
```

---

### Step 4: Update Python AI Service

**File:** `backend/python-service/app/routers/analysis.py`

Add progress tracking to emit step updates:

```python
from fastapi import WebSocket

# Add step tracking
async def analyze_portfolio_with_progress(request, websocket: WebSocket = None):
    steps = [
        'fetch-data',
        'fetch-news',
        'market-context',
        'technical-analysis',
        'risk-assessment',
        'agent-synthesis',
        'complete'
    ]

    completed_steps = []

    for step in steps:
        # Emit progress if websocket connected
        if websocket:
            await websocket.send_json({
                'type': 'progress',
                'currentStep': step,
                'completedSteps': completed_steps
            })

        # Perform step logic here
        if step == 'fetch-data':
            # Fetch market data
            pass
        elif step == 'agent-synthesis':
            # Run AI agents
            pass

        completed_steps.append(step)

    return analysis_result
```

---

### Step 5: Add WebSocket Support for Real-time Progress

**File:** `backend/src/server.ts`

Add WebSocket events for AI analysis progress:

```typescript
socket.on('portfolio:analyze', async (data) => {
  const { userId, portfolio, tickers } = data;

  try {
    // Call Python service with WebSocket callback
    const response = await fetch('http://localhost:8000/api/analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ portfolio, tickers })
    });

    // Handle streaming response for progress updates
    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const progress = JSON.parse(new TextDecoder().decode(value));
      socket.emit('portfolio:analysis:progress', progress);
    }
  } catch (error) {
    socket.emit('portfolio:analysis:error', error);
  }
});
```

---

### Step 6: Update Frontend to Use Real Data

**Files to Update:**

#### 1. `apps/web/src/pages/PortfolioPage.tsx`

Replace mock data with API calls:

```typescript
import { usePortfolio } from '@/hooks/portfolio/usePortfolio';
import { useWebSocket } from '@/hooks/useWebSocket';

// Remove MOCK_PORTFOLIO constant
// const MOCK_PORTFOLIO = { ... };  // DELETE THIS

export function PortfolioPage() {
  // Fetch real portfolio data
  const { data: portfolio, isLoading } = usePortfolio();

  // WebSocket for real-time analysis progress
  const { socket } = useWebSocket();
  const [analysisProgress, setAnalysisProgress] = useState({
    currentStep: undefined,
    completedSteps: []
  });

  useEffect(() => {
    if (!socket) return;

    socket.on('portfolio:analysis:progress', (progress) => {
      setAnalysisProgress(progress);
    });

    return () => {
      socket.off('portfolio:analysis:progress');
    };
  }, [socket]);

  // Pass progress to AI loading component
  return (
    <>
      <AIAnalysisLoading
        isAnalyzing={analysisMutation.isPending}
        currentStep={analysisProgress.currentStep}
        completedSteps={analysisProgress.completedSteps}
      />
      {/* Rest of component */}
    </>
  );
}
```

#### 2. Create Portfolio Hooks

**File:** `apps/web/src/hooks/portfolio/usePortfolio.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function usePortfolio() {
  return useQuery({
    queryKey: ['portfolio'],
    queryFn: async () => {
      const response = await api.get('/portfolio');
      return response.data;
    }
  });
}

export function useCreatePosition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (position) => {
      const response = await api.post('/portfolio/positions', position);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    }
  });
}

export function useUpdatePosition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const response = await api.put(`/portfolio/positions/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    }
  });
}
```

#### 3. Create Investment Pie Hooks

**File:** `apps/web/src/hooks/portfolio/usePies.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function usePies() {
  return useQuery({
    queryKey: ['pies'],
    queryFn: async () => {
      const response = await api.get('/portfolio/pies');
      return response.data;
    }
  });
}

export function useCreatePie() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pie) => {
      const response = await api.post('/portfolio/pies', pie);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pies'] });
    }
  });
}
```

---

### Step 7: Update Create Pie Component

**File:** `apps/web/src/components/portfolio/CreatePie.tsx`

Replace local state with database operations:

```typescript
import { usePies, useCreatePie, useUpdatePie, useDeletePie } from '@/hooks/portfolio/usePies';

export function CreatePie() {
  const { data: savedPies = [], isLoading } = usePies();
  const createPie = useCreatePie();
  const updatePie = useUpdatePie();
  const deletePie = useDeletePie();

  const handleSavePie = async () => {
    if (!pieName.trim() || selectedAssets.length === 0 || !isValidAllocation) return;

    const pieData = {
      name: pieName,
      description: pieDescription,
      assets: selectedAssets.map(asset => ({
        symbol: asset.coin.symbol,
        name: asset.coin.name,
        allocationPercent: asset.allocation
      }))
    };

    if (editingPieId) {
      await updatePie.mutateAsync({ id: editingPieId, ...pieData });
    } else {
      await createPie.mutateAsync(pieData);
    }

    // Reset form
    setPieName('');
    setPieDescription('');
    setSelectedAssets([]);
  };

  // ... rest of component
}
```

---

## 📊 Data Flow Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (React)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐ │
│  │ PortfolioPage│  │  CreatePie   │  │AILoadingModal │ │
│  └──────┬───────┘  └──────┬───────┘  └───────┬───────┘ │
│         │                 │                   │          │
│    ┌────▼─────────────────▼───────────────────▼────┐    │
│    │         React Query + WebSocket           │    │
│    └────┬─────────────────┬───────────────────┬────┘    │
└─────────┼─────────────────┼───────────────────┼─────────┘
          │                 │                   │
     ┌────▼────┐       ┌────▼────┐        ┌────▼────┐
     │Portfolio│       │  Pies   │        │Analysis │
     │  API    │       │   API   │        │   WS    │
     └────┬────┘       └────┬────┘        └────┬────┘
          │                 │                   │
┌─────────▼─────────────────▼───────────────────▼─────────┐
│              Node.js Backend (Express)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │Portfolio     │  │  Pies        │  │  WebSocket   │ │
│  │Routes        │  │  Routes      │  │  Server      │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
│         │                 │                   │          │
│    ┌────▼─────────────────▼───────────────────▼────┐    │
│    │         Drizzle ORM (PostgreSQL)          │    │
│    └────────────────────┬──────────────────────────┘    │
└─────────────────────────┼───────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│                  PostgreSQL Database                     │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────┐   │
│  │portfolios│  │positions │  │investment_pies      │   │
│  │          │  │          │  │                     │   │
│  └──────────┘  └──────────┘  └────────────────────┘   │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────┐   │
│  │pie_assets│  │ai_results│  │portfolio_history    │   │
│  │          │  │          │  │                     │   │
│  └──────────┘  └──────────┘  └────────────────────┘   │
└───────────────────────────────────────────────────────┘
          │
          │ (AI Analysis Requests)
          │
┌─────────▼───────────────────────────────────────────────┐
│         Python AI Service (FastAPI)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Analysis   │  │  Crypto Data │  │AI Agents     │ │
│  │   Router     │  │   Adapter    │  │Service       │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
│         │                 │                   │          │
│    ┌────▼─────────────────▼───────────────────▼────┐    │
│    │   Groq/Llama AI + CoinGecko API          │    │
│    └───────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────┘
```

---

## 🔧 Testing Checklist

After implementing the above steps, test the following:

### Database
- [ ] Migration runs successfully
- [ ] All tables created with proper indexes
- [ ] Foreign keys work correctly
- [ ] Can insert/update/delete records

### Backend API
- [ ] Portfolio CRUD operations work
- [ ] Position management works
- [ ] Pie creation/editing/deletion works
- [ ] AI analysis endpoint returns data
- [ ] WebSocket events fire correctly

### Frontend
- [ ] Portfolio page loads real data
- [ ] Positions display correctly
- [ ] P&L calculations are accurate
- [ ] Create Pie saves to database
- [ ] AI analysis shows progress steps
- [ ] AI loading modal updates in real-time

### Integration
- [ ] Running AI analysis triggers progress updates
- [ ] Progress bar reflects actual backend progress
- [ ] Analysis results are saved to database
- [ ] Portfolio history tracks changes
- [ ] Performance charts display real data

---

## 🎯 Summary

**✅ Completed:**
- Database schema design and migration
- AI loading component updated for backend sync
- Branding updated to NebulaX AI

**🚧 To Complete:**
1. Run database migration
2. Create backend portfolio routes
3. Update Python service for progress tracking
4. Add WebSocket support
5. Connect frontend to real APIs
6. Replace all mock data

**Estimated Time:** 4-6 hours of development work

---

## 📝 Notes

- The schema supports both long and short positions
- All P&L calculations should be done on the backend
- Portfolio history snapshots can be scheduled via cron job
- AI analysis results have an expiry timestamp for cache invalidation
- Investment pies can be made public for community sharing (future feature)
- NebulaX AI branding is now consistent across the platform

---

## 🆘 Need Help?

If you encounter issues:
1. Check migration logs for database errors
2. Verify environment variables for Python service
3. Test API endpoints with Postman/curl
4. Check browser console for WebSocket errors
5. Review backend logs for route errors

Good luck with the implementation! 🚀
