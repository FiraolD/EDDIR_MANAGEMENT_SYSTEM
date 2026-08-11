# Branding Update Plan: Navy & Blue-Black Theme

Update the Awash Iddir Connect UI to transition from the previous Green/Yellow branding to a professional Navy Blue, Blue-Black, and White color scheme.

## 1. Global Styles & Configuration
* **Update `src/brand.css`**: Redefine CSS variables for `--primary` (Navy Blue: #000080) and `--secondary` (Blue-Black: #020617).
* **Verify `src/index.css`**: Ensure the Tailwind 4 setup remains compatible with the new variables.

## 2. Image Assets
* Replace existing Green/Yellow logos and banners with new Navy/White themed images.
* **New Logo**: `https://storage.googleapis.com/dala-prod-public-storage/generated-images/349ea826-6fc4-4126-8d42-f3f485a7604e/brand-logo-new-db5d150c-1778755953630.webp`
* **New Banner**: `https://storage.googleapis.com/dala-prod-public-storage/generated-images/349ea826-6fc4-4126-8d42-f3f485a7604e/auth-banner-new-b9563fdf-1778755953451.webp`

## 3. Component & Page Updates
* **AppLayout**: Update logo source and ensure the side navigation active states (primary) reflect the new Navy Blue.
* **Dashboard**: 
    * Update Recharts colors (Navy Blue instead of Green).
    * Update stat card colors: Replace branding greens with Navy Blue.
* **Auth Page**: Update background gradients and banner images to match the Navy/White theme.
* **Members, Contributions, Claims, Transactions**: 
    * Update status badges: Replace branding-related greens with professional navy/blue variants.
    * Ensure interactive elements like "Advance" buttons use the new primary Navy Blue.
* **Settings**: Update profile card and interactive switches to the new color scheme.

## 4. Quality Assurance
* Run `validate_build` to ensure no syntax or type errors.
* Verify contrast ratios between Navy Blue and White text.
* Ensure Dark Mode still looks good with the new Blue-Black secondary accents.
