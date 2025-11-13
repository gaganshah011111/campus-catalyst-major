
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { supabase, ensureEventApprovalColumn } from './lib/supabase.ts';

// Check if event approval column exists before rendering
const init = async () => {
  try {
    await ensureEventApprovalColumn();
  } catch (error) {
    console.error("Error ensuring event approval column:", error);
  }
  
  // Render app regardless of column check result
  createRoot(document.getElementById("root")!).render(<App />);
};

init();
