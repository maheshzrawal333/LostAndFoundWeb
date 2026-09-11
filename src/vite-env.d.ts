// src/vite-env.d.ts

// 1. Tells TypeScript to load Vite's default client types
/// <reference types="vite/client" />

// 2. Defines your specific environment variables for IDE autocomplete
interface ImportMetaEnv {
    readonly VITE_API_BASE_URL: string;
    // Add future environment variables here (e.g., VITE_CLOUDINARY_UPLOAD_PRESET: string;)
}

// 3. Attaches your custom variables to Vite's ImportMeta interface
interface ImportMeta {
    readonly env: ImportMetaEnv;
}