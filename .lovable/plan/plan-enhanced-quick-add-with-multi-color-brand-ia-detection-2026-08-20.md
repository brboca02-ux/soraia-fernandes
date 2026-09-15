# Plan: Enhanced Quick Add with Multi-Color/Brand IA Detection

The objective is to port the advanced multi-color, brand detection, and grouped variant management from `ProductForm.tsx` to the "Cadastro Rápido com IA" flow (`produtos.rapido.tsx`). This will allow users to upload multiple photos (up to 8) and have the IA automatically create organized color blocks with detected brands.

## Proposed Changes

### 1. Data Contract Update
- Update `AnalyzedProduct` in `src/lib/api/analyzeProduct.functions.ts` to include `brands` and detailed `colors` structure if missing or inconsistent. (Already largely done in previous turn, will verify).

### 2. UI Enhancements in `src/routes/produtos.rapido.tsx`
- **Multi-Photo Upload**: Allow selecting/capturing up to 8 images instead of just one.
- **Brand Detection**: Add a brand field populated by IA, with a "Detected Brands" selection chip if multiple are found.
- **Grouped Variant Preview**: Replace the simple `ModeCard` logic with a preview of the grouped variants (by color) that the IA detected.
- **Size Mode Toggle**: Add "Tamanho Único" vs "Vários Tamanhos" selection to the quick add flow.
- **Improved AI Analysis**: Pass all uploaded images to the `analyzeProductImage` server function.

### 3. Logic Refactoring
- Implement the `groupedVariants` logic within `QuickAddPage` to match the sophisticated handling in `ProductForm.tsx`.
- Update `handleSave` to process multiple images and map them to their respective color variants in Supabase.

## Technical Details
- **State Management**: Introduce `images` (array of objects with preview and file) instead of a single `file` state.
- **Component Reuse**: Port UI patterns for color hex pickers and variant chips from `ProductForm.tsx`.
- **Supabase Integration**: Ensure `uploadProductImage` is called for every file, and `createProduct` receives the full variant array with mapped image associations.

## Verification Plan
- **Manual Test**: Upload 3 photos of the same shirt in different colors.
- **Check**: Verify IA detects all 3 colors and suggests the correct brand.
- **Check**: Verify the preview shows 3 color blocks.
- **Check**: Save and verify in the main product list that colors and images are correctly linked.
