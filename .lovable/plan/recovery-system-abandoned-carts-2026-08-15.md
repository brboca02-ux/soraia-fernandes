# Recovery System: Abandoned Carts

Implementation of automated cart recovery via WhatsApp and Email for J&S Store.

## Proposed Strategy

1.  **Tracking & Capture**:
    *   Monitor the `checkout` flow.
    *   As soon as a user provides an email or phone number in the checkout form, capture it as a "lead" (if not already captured).
    *   Track the cart contents (items, variants, total) in a new `abandoned_carts` table.

2.  **Abandonment Logic**:
    *   A cart is considered "abandoned" if it hasn't been converted into a paid order within 30 minutes of the last update.
    *   Use a server function or a scheduled process (or simple admin-side monitoring) to identify these carts.

3.  **Recovery Actions**:
    *   **WhatsApp**: Add a dedicated section in the "Marketing" tab of the Admin panel to list abandoned carts with a one-click "Recover via WhatsApp" button. This button will open a pre-filled WhatsApp message with the list of items and a link to return to checkout.
    *   **Email**: Integrate with a basic email notification (triggered by the admin or automated).

4.  **Database Schema**:
    *   New table `abandoned_carts`: `id`, `customer_email`, `customer_phone`, `cart_data` (JSON), `last_updated_at`, `recovered_at`, `order_id` (null if not converted).

## Technical Details

- **Files to modify**: 
    - `src/routes/checkout.tsx`: Add logic to upsert to `abandoned_carts` as the user types.
    - `src/routes/marketing.index.tsx`: Add "Abandoned Carts" tab.
    - `src/lib/api/abandoned.ts`: New API for managing abandoned carts.
- **Database**:
    - `CREATE TABLE public.abandoned_carts (...)`
    - RLS policies to allow public insertion (for the checkout) and admin-only selection.
