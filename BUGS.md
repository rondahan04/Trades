# Known bugs

## Profile pictures not fixed yet

- **Status:** Open  
- **Summary:** Profile picture upload/display still has issues (e.g. upload may fail or images may not show correctly).  
- **Context:** Firebase Storage uploads were migrated from Blob to Base64 via `expo-file-system/legacy` and `uploadString` to fix the React Native "Creating blobs from 'ArrayBuffer' and 'ArrayBufferView' are not supported" error. Item photo uploads use the same path; profile picture flow may need additional fixes (e.g. URI handling, caching, or UI refresh after upload).
