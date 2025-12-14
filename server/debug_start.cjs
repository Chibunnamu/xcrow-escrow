
console.log("DEBUG: Starting...");
try {
  console.log("DEBUG: Importing dotenv...");
  require('dotenv').config();
  console.log("DEBUG: Importing express...");
  const express = require('express');
  console.log("DEBUG: Importing auth...");
  const { setupAuth } = require('./auth'); // Relative path might need adjust if executed from root
  console.log("DEBUG: Importing routes...");
  const { registerRoutes } = require('./routes');
  console.log("DEBUG: All imports successful.");
} catch (e) {
  console.error("DEBUG: Import failed:", e);
}
