"use client"

import { useState } from "react"
import { ethers } from "ethers"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function BlockchainConnector() {
  const [isConnected, setIsConnected] = useState(false)
  const [address, setAddress] = useState("")
  const [chainId, setChainId] = useState<number | null>(null)
  const [balance, setBalance] = useState<string>("")
  const [error, setError] = useState<string | null>(null)

  // Make sure the Tea Sepolia chain ID is correct
  const teaSepoliaChainId = 10218

  const connectWallet = async () => {
    try {
      setError(null)

      if (!window.ethereum) {
        throw new Error("No Ethereum wallet found. Please install MetaMask or another wallet.")
      }

      // Request account access
      const provider = new ethers.BrowserProvider(window.ethereum)
      await provider.send("eth_requestAccounts", [])
      const signer = await provider.getSigner()
      const address = await signer.getAddress()
      setAddress(address)

      // Get chain ID
      const network = await provider.getNetwork()
      const chainId = Number(network.chainId)
      setChainId(chainId)

      // Get balance
      const balance = await provider.getBalance(address)
      setBalance(ethers.formatEther(balance))

      setIsConnected(true)

      // Check if on Tea Sepolia network
      if (chainId !== teaSepoliaChainId) {
        setError(`Please switch to Tea Sepolia network (Chain ID: ${teaSepoliaChainId})`)
      }
    } catch (error) {
      console.error("Error connecting wallet:", error)
      setError(error instanceof Error ? error.message : String(error))
      setIsConnected(false)
    }
  }

  const switchToTeaSepolia = async () => {
    try {
      setError(null)

      if (!window.ethereum) {
        throw new Error("No Ethereum wallet found")
      }

      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${teaSepoliaChainId.toString(16)}` }],
      })

      // Refresh connection after switch
      connectWallet()
    } catch (error: any) {
      // If the chain hasn't been added to MetaMask
      if (error.code === 4902) {
        try {
          // Update the network parameters to ensure they're correct
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: `0x${teaSepoliaChainId.toString(16)}`,
                chainName: "Tea Sepolia",
                nativeCurrency: {
                  name: "TEA",
                  symbol: "TEA",
                  decimals: 18,
                },
                rpcUrls: ["https://tea-sepolia.g.alchemy.com/public"],
                blockExplorerUrls: ["https://sepolia.tea.xyz"],
              },
            ],
          })
          // Refresh connection after adding
          connectWallet()
        } catch (addError) {
          setError(
            `Error adding Tea Sepolia network: ${addError instanceof Error ? addError.message : String(addError)}`,
          )
        }
      } else {
        setError(`Error switching network: ${error.message}`)
      }
    }
  }

  return (
    <Card className="w-full max-w-md bg-gray-900 border-green-500">
      <CardHeader>
        <CardTitle className="text-green-500">Blockchain Connection</CardTitle>
      </CardHeader>
      <CardContent>
        {!isConnected ? (
          <Button onClick={connectWallet} className="w-full bg-green-600 hover:bg-green-700">
            Connect Wallet
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-1">
              <p className="text-sm text-gray-400">Connected Address</p>
              <p className="text-sm font-mono break-all">{address}</p>
            </div>

            <div className="grid gap-1">
              <p className="text-sm text-gray-400">Network</p>
              <p className="text-sm">
                {chainId === teaSepoliaChainId ? "Tea Sepolia ✓" : `Wrong Network (ID: ${chainId})`}
              </p>
            </div>

            {balance && (
              <div className="grid gap-1">
                <p className="text-sm text-gray-400">Balance</p>
                <p className="text-sm">{balance} TEA</p>
              </div>
            )}

            {chainId !== teaSepoliaChainId && (
              <Button onClick={switchToTeaSepolia} variant="outline" className="w-full border-green-500 text-green-500">
                Switch to Tea Sepolia
              </Button>
            )}
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-900/20 border border-red-500 rounded text-red-400 text-sm">{error}</div>
        )}
      </CardContent>
    </Card>
  )
}

