#!/usr/bin/env bun

// Simple test that works with Bun and the current Clarinet SDK
console.log("🚀 Starting Simple Bun Test...");

// Try to import from the SDK
try {
  const sdk = require("@hirosystems/clarinet-sdk");
  console.log("✅ Clarinet SDK loaded successfully");
  console.log("Available exports:", Object.keys(sdk));
  
  // Check if we can access the tx object
  if (sdk.tx) {
    console.log("✅ tx object available");
    console.log("tx methods:", Object.keys(sdk.tx));
  }
  
  // Check if we can access other methods
  if (sdk.initSimnet) {
    console.log("✅ initSimnet function available");
  }
  
  if (sdk.getSDK) {
    console.log("✅ getSDK function available");
    try {
      const sdkInstance = sdk.getSDK();
      console.log("SDK instance:", sdkInstance);
    } catch (error) {
      console.log("Error getting SDK instance:", error.message);
    }
  }
  
} catch (error) {
  console.log("❌ Error loading Clarinet SDK:", error.message);
}

console.log("\n🎉 Simple Bun test completed!");
