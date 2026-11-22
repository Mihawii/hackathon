// Relative asset paths let the built book open from any folder or sub-path.
export default {
    base: './',
    build: { outDir: 'dist', emptyOutDir: true, assetsInlineLimit: 0, chunkSizeWarningLimit: 1200 }
};
