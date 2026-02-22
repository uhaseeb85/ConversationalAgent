# OpenRouter Model Auto-Discovery Feature

## Overview

Added automatic model fetching from OpenRouter API to the AI Configuration settings page. Users can now click "Load Models" to see available models from OpenRouter without manually typing model IDs.

## Changes Made

### 1. Enhanced `src/lib/ai-client.ts`

**Added Interface**:
```typescript
export interface AIModel {
  id: string
  name: string
  description?: string
  pricing?: {
    prompt: number
    completion: number
  }
}
```

**Added Function**:
```typescript
export async function fetchOpenRouterModels(apiKey: string): Promise<AIModel[]>
```

Features:
- Fetches available models from `https://openrouter.ai/api/v1/models`
- Parses model information including name, description, and pricing
- Returns empty array if request fails (graceful fallback)
- Includes proper error logging

### 2. Updated `src/pages/SettingsPage.tsx`

**Added State Variables**:
- `aiModels` - Array of available models
- `loadingModels` - Loading state while fetching
- `modelsError` - Error message if fetch fails

**Added Function**:
```typescript
const handleLoadModels = async () => {
  // Validates API key is provided
  // Checks if OpenRouter endpoint is configured
  // Fetches models and updates UI
}
```

**Updated Model Selection UI**:
- "Load Models" button appears when OpenRouter is detected
- Shows dropdown with available models when loaded
- Falls back to text input for LM Studio
- Displays error/success messages
- Shows count of available models

## User Experience

### For OpenRouter Users:
1. Set Base URL to `https://openrouter.ai/api/v1`
2. Enter OpenRouter API key
3. Click "Load Models" button
4. Select model from dropdown
5. Click "Test Connection" to verify

### For LM Studio Users:
- No changes - still manually enter model names
- UI gracefully shows text input when not using OpenRouter

## Technical Details

### API Integration
- OpenRouter endpoint: `https://openrouter.ai/api/v1/models`
- Requires Bearer token authentication
- Includes required headers for OpenRouter compatibility

### Error Handling
- Missing API key: Shows validation message
- Non-OpenRouter endpoint: Shows helpful message
- API failure: Shows error message
- Network error: Gracefully caught and reported

### UI/UX Features
- Loading spinner while fetching
- Model count display when successful
- Status messages for all states
- Disabled button when prerequisites missing
- Remains backward compatible with LM Studio

## Files Modified

1. **`src/lib/ai-client.ts`**
   - Added `AIModel` interface
   - Added `fetchOpenRouterModels()` function
   - Added model fetching logic with error handling

2. **`src/pages/SettingsPage.tsx`**
   - Added model loading state management
   - Added `handleLoadModels()` function
   - Updated model selection UI with dropdown
   - Added load models button and status messages
   - Updated imports to include `RefreshCw` icon and new functions

## Testing

To test the feature:

1. Go to Settings page
2. Set Base URL to `https://openrouter.ai/api/v1`
3. Enter your OpenRouter API key
4. Click "Load Models" button
5. Verify dropdown populates with models
6. Select a model
7. Click "Test Connection"

## Backward Compatibility

- LM Studio users unaffected (text input still available)
- No breaking changes to existing API
- Configuration storage unchanged
- All existing functionality preserved

## Future Enhancements

Potential improvements:
- Cache model list to avoid repeated API calls
- Show model pricing per token in dropdown
- Filter/search models by name
- Store last selected model preference
- Support for other AI providers (Anthropic, Replicate, etc.)
