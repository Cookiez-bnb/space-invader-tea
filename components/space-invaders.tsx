"use client"

import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ethers } from "ethers"
import GameEngine from "@/lib/game-engine"
import { Loader2, Volume2, VolumeX, ExternalLink } from "lucide-react"

interface Transaction {
  id: number
  hash: string
  confirmed: boolean
}

export default function SpaceInvaders() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [gameState, setGameState] = useState<"connect" | "playing" | "gameOver">("connect")
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isFunding, setIsFunding] = useState(false)
  const [walletStatus, setWalletStatus] = useState<string | null>(null)
  const [mainWalletAddress, setMainWalletAddress] = useState("")
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null)
  const [mainSigner, setMainSigner] = useState<ethers.JsonRpcSigner | null>(null)
  const [burnerWallet, setBurnerWallet] = useState<ethers.Wallet | null>(null)
  const [gameEngine, setGameEngine] = useState<GameEngine | null>(null)
  const [shotsFired, setShotsFired] = useState(0)
  const [transactionsPending, setTransactionsPending] = useState(0)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isMuted, setIsMuted] = useState(false)

  // Tea Sepolia Chain ID
  const teaSepoliaChainId = 10218

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio("/space-invaders-theme.mp3")
    audioRef.current.loop = true

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ""
      }
    }
  }, [])

  // Toggle audio
  const toggleAudio = () => {
    if (!audioRef.current) return

    if (isMuted) {
      audioRef.current.play().catch((e) => console.log("Audio play failed:", e))
    } else {
      audioRef.current.pause()
    }

    setIsMuted(!isMuted)
  }

  // Connect wallet and switch to Tea Sepolia
  const connectWallet = async () => {
    if (!window.ethereum) {
      setWalletStatus("No Ethereum wallet found. Please install MetaMask.")
      return
    }

    setIsConnecting(true)
    setWalletStatus("Connecting to wallet...")

    try {
      // Connect to provider
      const provider = new ethers.BrowserProvider(window.ethereum)
      await provider.send("eth_requestAccounts", [])
      const signer = await provider.getSigner()
      const address = await signer.getAddress()

      setMainWalletAddress(address)
      setProvider(provider)
      setMainSigner(signer)

      // Check if on Tea Sepolia
      const network = await provider.getNetwork()
      const chainId = Number(network.chainId)

      if (chainId !== teaSepoliaChainId) {
        setWalletStatus("Switching to Tea Sepolia network...")

        try {
          // Try to switch to Tea Sepolia
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: `0x${teaSepoliaChainId.toString(16)}` }],
          })

          // Refresh provider after switch
          const updatedProvider = new ethers.BrowserProvider(window.ethereum)
          const updatedSigner = await updatedProvider.getSigner()
          setProvider(updatedProvider)
          setMainSigner(updatedSigner)
        } catch (switchError: any) {
          // If the chain hasn't been added to MetaMask
          if (switchError.code === 4902) {
            setWalletStatus("Adding Tea Sepolia network...")

            try {
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

              // Refresh provider after adding
              const updatedProvider = new ethers.BrowserProvider(window.ethereum)
              const updatedSigner = await updatedProvider.getSigner()
              setProvider(updatedProvider)
              setMainSigner(updatedSigner)
            } catch (addError) {
              throw new Error(
                `Error adding Tea Sepolia network: ${addError instanceof Error ? addError.message : String(addError)}`,
              )
            }
          } else {
            throw new Error(`Error switching network: ${switchError.message}`)
          }
        }
      }

      // Check balance
      const balance = await provider.getBalance(address)
      const balanceInTea = ethers.formatEther(balance)

      if (Number(balanceInTea) < 10) {
        setWalletStatus(
          `Warning: Low TEA balance (${balanceInTea} TEA). You need at least 10 TEA to fund the game wallet.`,
        )
      } else {
        setWalletStatus("Connected! Click 'Fund Game Wallet' to start playing.")
      }
    } catch (error) {
      console.error("Error connecting wallet:", error)
      setWalletStatus(`Error: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsConnecting(false)
    }
  }

  // Create and fund a burner wallet
  const createBurnerWallet = async () => {
    if (!provider || !mainSigner) {
      setWalletStatus("Please connect your wallet first")
      return
    }

    setIsFunding(true)
    setWalletStatus("Creating game wallet...")

    try {
      // Create a new random wallet
      const randomWallet = ethers.Wallet.createRandom()

      // Connect the wallet to the provider
      const burnerWallet = randomWallet.connect(provider)

      // Fund the burner wallet with 10 TEA (enough for ~1000 shots)
      setWalletStatus("Funding game wallet (confirm transaction)...")
      const fundingTx = await mainSigner.sendTransaction({
        to: burnerWallet.address,
        value: ethers.parseEther("10"), // 10 TEA
      })

      setWalletStatus("Waiting for funding transaction to confirm...")
      await fundingTx.wait()

      // Check if the burner wallet received the funds
      const burnerBalance = await provider.getBalance(burnerWallet.address)
      console.log("Burner wallet balance:", ethers.formatEther(burnerBalance))

      if (burnerBalance === 0n) {
        throw new Error("Funding transaction completed but burner wallet balance is still 0")
      }

      setBurnerWallet(burnerWallet)
      setWalletStatus(`Game wallet funded with 10 TEA! You can now play without transaction confirmations.`)
    } catch (error) {
      console.error("Error creating burner wallet:", error)
      setWalletStatus(`Error: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsFunding(false)
    }
  }

  // Start game
  const startGame = () => {
    if (!burnerWallet) {
      setWalletStatus("Please fund the game wallet first")
      return
    }

    // Start the theme music
    if (audioRef.current && !isMuted) {
      audioRef.current.currentTime = 0
      audioRef.current.play().catch((e) => console.log("Audio play failed:", e))
    }

    setScore(0)
    setLives(3)
    setShotsFired(0)
    setTransactionsPending(0)
    setTransactions([])
    setGameState("playing")
  }

  // Send transaction for player shot without confirmation
  // Now doesn't block the game - transactions are queued
  const sendShotTransaction = async () => {
    if (!burnerWallet || !provider) return false

    try {
      // Increment shots fired counter by 1 regardless of power-up type
      setShotsFired((prev) => prev + 1)
      setTransactionsPending((prev) => prev + 1)

      // Create a simple transaction with shot data
      const shotData = ethers.toUtf8Bytes(
        JSON.stringify({
          action: "shot",
          timestamp: Date.now(),
        }),
      )

      // Create transaction with proper gas settings
      const feeData = await provider.getFeeData()

      const tx = {
        to: "0x000000000000000000000000000000000000dEaD", // Burn address
        value: ethers.parseEther("0.0001"),
        data: shotData,
        chainId: teaSepoliaChainId,
        gasLimit: 100000,
        maxFeePerGas: feeData.maxFeePerGas,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
      }

      console.log("Sending transaction:", tx)

      // Send transaction using burner wallet (no confirmation needed)
      const sentTx = await burnerWallet.sendTransaction(tx)
      console.log("Transaction sent:", sentTx.hash)

      // Add to transactions list
      setTransactions((prev) => [
        ...prev,
        {
          id: shotsFired,
          hash: sentTx.hash,
          confirmed: false,
        },
      ])

      // Wait for transaction to be mined in the background
      sentTx
        .wait()
        .then(() => {
          setTransactionsPending((prev) => prev - 1)
          // Update transaction status
          setTransactions((prev) => prev.map((tx) => (tx.hash === sentTx.hash ? { ...tx, confirmed: true } : tx)))
        })
        .catch((error) => {
          console.error("Error confirming shot transaction:", error)
          setTransactionsPending((prev) => prev - 1)
        })

      // Return immediately to allow more shots
      return true
    } catch (error) {
      console.error("Error initiating shot transaction:", error)
      setTransactionsPending((prev) => prev - 1)
      return false
    }
  }

  // Initialize game engine
  useEffect(() => {
    if (canvasRef.current && gameState === "playing" && burnerWallet) {
      const canvas = canvasRef.current
      const engine = new GameEngine(
        canvas,
        (newScore: number) => setScore(newScore),
        (newLives: number) => setLives(newLives),
        () => {
          setGameState("gameOver")
          // Stop music on game over
          if (audioRef.current) {
            audioRef.current.pause()
          }
        },
        sendShotTransaction,
      )
      setGameEngine(engine)

      return () => {
        engine.cleanup()
      }
    }
  }, [gameState, burnerWallet])

  // Listen for network changes
  useEffect(() => {
    if (window.ethereum) {
      const handleChainChanged = () => {
        window.location.reload()
      }

      window.ethereum.on("chainChanged", handleChainChanged)

      return () => {
        window.ethereum.removeListener("chainChanged", handleChainChanged)
      }
    }
  }, [])

  return (
    <div className="flex flex-col items-center w-full max-w-3xl">
      <div className="self-end mb-2">
        <Button variant="ghost" size="icon" onClick={toggleAudio} className="text-green-500 hover:text-green-400">
          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </Button>
      </div>

      {gameState === "connect" && (
        <Card className="w-full bg-gray-900 border-green-500">
          <CardContent className="p-6">
            <h2 className="text-2xl font-bold text-green-500 mb-4">Space Invaders on Tea Sepolia</h2>
            <p className="mb-6 text-gray-300">
              Connect your wallet and fund the game wallet to play. Each shot you fire will be recorded as a transaction
              on the Tea Sepolia blockchain without requiring confirmation.
            </p>

            {!mainWalletAddress ? (
              <Button
                onClick={connectWallet}
                disabled={isConnecting}
                className="w-full bg-green-600 hover:bg-green-700 text-white mb-4"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  "Connect Wallet"
                )}
              </Button>
            ) : !burnerWallet ? (
              <Button
                onClick={createBurnerWallet}
                disabled={isFunding}
                className="w-full bg-green-600 hover:bg-green-700 text-white mb-4"
              >
                {isFunding ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Funding Game Wallet...
                  </>
                ) : (
                  "Fund Game Wallet (10 TEA)"
                )}
              </Button>
            ) : (
              <Button onClick={startGame} className="w-full bg-green-600 hover:bg-green-700 text-white mb-4">
                Start Game
              </Button>
            )}

            {walletStatus && (
              <div className="p-3 bg-gray-800 rounded border border-green-500 text-sm">{walletStatus}</div>
            )}

            {burnerWallet && (
              <div className="mt-4 p-3 bg-gray-800 rounded border border-yellow-500 text-sm">
                <p className="font-semibold text-yellow-300">Game Wallet Ready!</p>
                <p className="text-xs mt-1 break-all">Address: {burnerWallet.address}</p>
                <p className="text-xs mt-1">This wallet will automatically send transactions for each shot.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {gameState === "playing" && (
        <div className="w-full">
          <div className="flex justify-between mb-2 text-green-500">
            <div>Score: {score}</div>
            <div className="flex items-center">
              Lives:{" "}
              {Array(lives)
                .fill(0)
                .map((_, i) => (
                  <span key={i} className="text-red-500 ml-1">
                    ❤️
                  </span>
                ))}
            </div>
          </div>
          <canvas ref={canvasRef} width={800} height={600} className="border border-green-500 bg-black w-full h-auto" />
          <div className="flex justify-between mt-2 text-xs text-gray-400">
            <div>Shots Fired: {shotsFired}</div>
            <div>Pending Transactions: {transactionsPending}</div>
          </div>

          {/* Always visible transaction box */}
          <div className="mt-2 p-2 bg-gray-900 border border-green-500 rounded max-h-32 overflow-y-auto">
            <h3 className="text-xs font-bold text-green-500 mb-1">Recent Transactions</h3>
            {transactions.length === 0 ? (
              <p className="text-xs text-gray-400">No transactions yet</p>
            ) : (
              <ul className="text-xs">
                {transactions
                  .slice(-5)
                  .reverse()
                  .map((tx) => (
                    <li key={tx.id} className="flex justify-between items-center py-1">
                      <span>A transaction has been made!</span>
                      <a
                        href={`https://sepolia.tea.xyz/tx/${tx.hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-400 hover:underline flex items-center"
                      >
                        View on Explorer
                        <ExternalLink size={10} className="ml-1" />
                      </a>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {gameState === "gameOver" && (
        <Card className="w-full bg-gray-900 border-green-500">
          <CardContent className="p-6">
            <h2 className="text-2xl font-bold text-green-500 mb-4">Game Over</h2>
            <p className="text-xl mb-6">Your score: {score}</p>
            <p className="mb-6">You fired {shotsFired} shots on the blockchain!</p>

            <div className="flex flex-col gap-4">
              <Button onClick={startGame} className="w-full bg-green-600 hover:bg-green-700 text-white">
                Play Again
              </Button>

              <Button
                onClick={() => setGameState("connect")}
                variant="outline"
                className="w-full border-green-500 text-green-500"
              >
                Change Wallet
              </Button>
            </div>

            {transactions.length > 0 && (
              <div className="mt-4 p-3 bg-gray-800 rounded border border-green-500">
                <p className="text-sm font-semibold text-green-400 mb-2">Your Blockchain Shots</p>
                <div className="max-h-40 overflow-y-auto">
                  <ul className="text-xs space-y-1">
                    {transactions
                      .slice(-10)
                      .reverse()
                      .map((tx) => (
                        <li key={tx.id} className="flex justify-between">
                          <span>A transaction has been made!</span>
                          <a
                            href={`https://sepolia.tea.xyz/tx/${tx.hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-400 hover:underline"
                          >
                            View on Explorer
                          </a>
                        </li>
                      ))}
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="mt-6 text-xs text-gray-400 flex flex-col items-center">
        <p>Controls: Arrow keys to move, Space to shoot (sends blockchain transaction)</p>
        <p>Network: Tea Sepolia (Chain ID: 10218)</p>
        <a
          href="https://x.com/c_0okiez"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 text-green-500 hover:text-green-400 cursor-pointer"
        >
          made by @c_0okiez
        </a>
      </div>
    </div>
  )
}

