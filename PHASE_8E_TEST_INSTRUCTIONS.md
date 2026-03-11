# Phase 8e: Custom Background Image Application - Test Instructions

## Summary of Changes

### Problem Statement
Users reported that custom background images weren't being applied to the application background after uploading and validating them in Settings.

### Root Causes Identified & Fixed

1. **Missing useEffect Dependency** (App.tsx)
   - The useEffect that applies themes only watched `app_background_theme` 
   - When custom background image changed, the effect didn't trigger
   - **Fix:** Added `activeProfile?.custom_background_image` to dependency array

2. **applyTheme() Element Targeting** (App.tsx)
   - Function tried to apply styles to `#sidebar-content` which doesn't exist
   - Sidebar is a React component, not a DOM element with that ID
   - **Fix:** Removed non-existent sidebar styling, kept only `#main-content` and `#header-content`

3. **Server Response Enhancement** (server.ts)
   - PUT endpoint returned only `{ success: true }` without profile data
   - **Fix:** Updated to return the full updated profile for consistency

4. **State Management** (SettingsView.tsx + App.tsx)
   - Already correctly implemented:
     - handleValidateTheme() calls onProfileUpdate() with new profile data
     - onProfileUpdate() triggers setActiveProfile() in App
     - useEffect now properly triggers on image change
     - applyTheme() has correct conditional logic for custom images

## How It Works

### Data Flow

```
1. User selects image file in Settings
   ↓
2. handleImageUpload() processes:
   - Validates MIME type (any image format)
   - Uses Canvas to resize (max 1920x1080 auto-scale)
   - Converts to JPEG (0.8 quality) for optimization
   - Creates base64 data URL
   ↓
3. Image stored in component state: customBackgroundImage
   ↓
4. User clicks "Valider le Thème"
   ↓
5. handleValidateTheme():
   - Sends PUT request to /api/profiles/:id
   - Includes custom_background_image in request body
   ↓
6. Server saves to database
   ↓
7. handleValidateTheme() calls onProfileUpdate() immediately
   - Updates activeProfile with new custom_background_image
   ↓
8. setActiveProfile() updates App state
   ↓
9. useEffect dependency triggers:
   - Detects change in activeProfile.custom_background_image
   ↓
10. applyTheme() executes:
    - Checks if themeId === 'theme-custom' && customImage exists
    - Applies CSS: background-image: url(${customImage})
    - Applies to #main-content and #header-content
    ↓
11. CSS renders background image on page
```

### Code Changes

**File: src/App.tsx**
- Line 140-144: Updated useEffect dependency to include `activeProfile?.custom_background_image`
- Line 154-189: Improved applyTheme() function:
  - Removed non-existent #sidebar-content styling
  - Kept #main-content and #header-content
  - Added conditional logic for custom image vs gradients

**File: server.ts**
- Line 327: Updated PUT endpoint to return full updated profile instead of just success flag

## Testing Checklist

### Step 1: Start Development Server
```bash
cd "c:\Users\Marin Rémy\Downloads\zip"
npm run dev
```
- Frontend: http://localhost:5173
- Backend: http://localhost:3000

### Step 2: Navigate to Settings → Theme
1. Click settings icon (bottom left)
2. Scroll to "Theme Management" section
3. Verify all 10 themes display (9 gradients + 1 custom background)
4. Custom Background should be rightmost option

### Step 3: Test Image Upload
1. Hover over "Fond Personnalisé" (Custom Background) theme
2. Click upload button
3. Select an image file (test with different formats/sizes):
   - **Small image:** landscape.jpg (1024x768)
   - **Large image:** highres.jpg (2560x1600) - should auto-compress
   - **Different formats:** PNG, WebP, BMP
4. **Expected:** Preview shows compressed preview of image
5. Help text shows: "Tous les formats acceptés • Compression automatique • Max dimensions: 1920x1080"

### Step 4: Validate Theme
1. Image preview shows in theme grid
2. Click "Valider le Thème" button
3. **CRITICAL VERIFICATION:**
   - ✅ Main content area background changes to uploaded image
   - ✅ Image appears behind all content (tasks, forms, etc.)
   - ✅ Image is NOT pixelated/distorted
   - ✅ Header section has semi-transparent dark overlay for readability
   - ✅ Success message appears briefly
   - ✅ Button becomes disabled after validation

### Step 5: Persist Check
1. Refresh page (F5)
2. Navigate back to Settings → Theme
3. **Expected:**
   - ✅ Custom theme still selected
   - ✅ Image preview still shows in grid
   - ✅ Main page background still shows image
   - ✅ customBackgroundImage still populated in component state

### Step 6: Theme Switching
1. Select a different gradient theme (e.g., "Bleu Ciel")
2. **Expected:** Main background changes to gradient, image is removed
3. Click "Valider" to save
4. Select custom background again
5. **Expected:** Image returns to background

### Step 7: Multiple Images
1. Upload Image A, validate
2. Upload Image B, validate
3. **Expected:** Image B appears, replaces Image A
4. Refresh page
5. **Expected:** Image B persists correctly

## Expected Behavior

### Success Indicators
- ✅ Image appears as background after validation
- ✅ Image persists after page refresh
- ✅ Switching themes preserves image (returns when custom selected again)
- ✅ Multiple image uploads work correctly
- ✅ All image formats supported
- ✅ High-resolution images auto-compress without distortion
- ✅ Header text readable (dark overlay visible)
- ✅ Console has no JavaScript errors

### CSS Applied
When theme-custom with image is selected:
```css
#main-content {
  background-image: url(data:image/jpeg;base64,...)
  background-attachment: fixed
  background-size: cover
  background-position: center
  background-repeat: no-repeat
  !important
}

#header-content {
  background: linear-gradient(135deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.8) 100%)
  background-attachment: fixed
  color: white
  !important
}
```

## Debugging (If Issues Occur)

### Image Not Appearing After Validation

1. **Check Browser DevTools:**
   - Open DevTools (F12)
   - Go to Elements/Inspector
   - Click #main-content element
   - Check Computed Styles
   - Should see: `background-image: url(data:...)`
   - Should see: `background-size: cover` and other CSS

2. **Check Console for Errors:**
   - Open Console tab (F12)
   - Should see no errors related to applyTheme
   - If errors, note the message

3. **Verify Data URL Format:**
   - In SettingsView, logged customBackgroundImage should start with:
   - `data:image/jpeg;base64,...`
   - If missing "data:" prefix, compression failed

4. **Check Database:**
   - Verify custom_background_image column exists:
   ```sql
   PRAGMA table_info(profiles);
   -- Should show custom_background_image as LONGTEXT column
   ```
   - Verify data is saved:
   ```sql
   SELECT id, custom_background_image FROM profiles LIMIT 1;
   -- Should show long base64 string if image was saved
   ```

### Image Pixelated or Distorted

- Check that Canvas compression worked in handleImageUpload
- Verify max 1920x1080 resize is applied
- Try with different image sizes

### Validation Button Stays Enabled

- Check that disabled condition includes both comparisons:
  ```typescript
  selectedTheme === profile?.app_background_theme && 
  customBackgroundImage === profile?.custom_background_image
  ```

## Related Files Modified

1. **src/App.tsx** (lines 140-144, 154-189)
   - useEffect dependency array
   - applyTheme() function

2. **server.ts** (lines 320-327)  
   - PUT /api/profiles/:id response format

3. **Previous phases (already implemented):**
   - src/components/SettingsView.tsx: Image upload handler, validation logic
   - src/types.ts: Profile interface with custom_background_image
   - server.ts: Database migration for custom_background_image column

## Build Verification
- ✅ Latest build: 10.10s
- ✅ No TypeScript errors
- ✅ No compilation warnings
- ✅ All changes merged successfully

## Next Steps if Working
- Test concurrent sessions (multiple logged-in profiles should see their own images)
- Test image storage in backups
- Test calendar/task display overlays with image backgrounds
- Verify performance with large images (should be auto-compressed to <500KB)
