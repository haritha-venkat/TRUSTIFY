// SPDX-License-Identifier: MIT
// backend/server.js

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { ethers } from "ethers";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ---------------------------
// Configuration
// ---------------------------
const RPC = process.env.RPC_URL || "http://127.0.0.1:7545"; // Ganache RPC URL
const OWNER_KEY = process.env.OWNER_PRIVATE_KEY; // Ganache owner private key
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS; // Deployed contract address

if (!OWNER_KEY || !CONTRACT_ADDRESS) {
  console.error("❌ Please set OWNER_PRIVATE_KEY and CONTRACT_ADDRESS in .env file!");
  process.exit(1);
}

// ---------------------------
// Provider & Wallet
// ---------------------------
const provider = new ethers.providers.JsonRpcProvider(RPC);
const wallet = new ethers.Wallet(OWNER_KEY, provider);

// ABI for Trustify smart contract
const ABI = [
  "function mint(address to, string calldata metadata) external returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenMetadata(uint256 tokenId) view returns (string memory)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
];

const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

// ---------------------------
// POST /mint → Create token for a purchase
// ---------------------------
app.post("/mint", async (req, res) => {
  try {
    const { buyer, orderId } = req.body;
    if (!buyer || !orderId)
      return res.status(400).json({ error: "❗ buyer and orderId are required" });

    console.log(`🪙 Minting token for buyer: ${buyer}, Order ID: ${orderId}`);

    const tx = await contract.mint(buyer, orderId);
    console.log(`⏳ Transaction sent: ${tx.hash}`);

    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed!");

    // ---------------------------
    // Decode tokenId from Transfer event
    // ---------------------------
    let tokenId = null;
    try {
      const transferTopic = ethers.utils.id("Transfer(address,address,uint256)");
      const transferEvent = receipt.logs.find(
        log => log.topics[0] === transferTopic
      );

      if (transferEvent) {
        tokenId = ethers.BigNumber.from(transferEvent.topics[3]).toString();
        console.log(`🎯 Extracted tokenId: ${tokenId}`);
      } else {
        console.log("⚠️ Transfer event not found in logs!");
      }
    } catch (e) {
      console.log("⚠️ TokenId extraction failed:", e.message);
    }

    res.json({
      status: "minted",
      txHash: receipt.transactionHash,
      tokenId: tokenId || "unknown"
    });
  } catch (err) {
    console.error("❌ Error in /mint:", err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// ---------------------------
// GET /verify/:tokenId → Verify token ownership
// ---------------------------
app.get("/verify/:tokenId", async (req, res) => {
  try {
    const { tokenId } = req.params;
    const owner = await contract.ownerOf(tokenId);
    res.json({ tokenId, owner });
  } catch (err) {
    res.status(500).json({ error: "Verification failed", details: err.message });
  }
});

// ---------------------------
// GET /token/:tokenId → Fetch token metadata (optional)
// ---------------------------
app.get("/token/:tokenId", async (req, res) => {
  try {
    const { tokenId } = req.params;
    const metadata = await contract.tokenMetadata(tokenId);
    res.json({ tokenId, metadata });
  } catch (err) {
    res.status(500).json({ error: "Metadata fetch failed", details: err.message });
  }
});

// ---------------------------
// Start backend
// ---------------------------
const PORT = process.env.PORT || 4000;
app.listen(PORT, () =>
  console.log(`🚀 Trustify backend running at: http://localhost:${PORT}`)
);
