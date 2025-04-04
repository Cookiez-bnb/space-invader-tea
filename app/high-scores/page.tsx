"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface HighScore {
  player: string
  score: number
  difficulty: string
  timestamp: number
  txHash: string
}

export default function HighScores() {
  const [scores, setScores] = useState<HighScore[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // This is a mock function since we can't actually query the blockchain for all scores
  // In a real implementation, you would need an indexer or backend service
  const fetchHighScores = async () => {
    try {
      setLoading(true)

      // In a real implementation, you would fetch this data from a backend or indexer
      // For demo purposes, we'll just use mock data
      const mockScores: HighScore[] = [
        {
          player: "CryptoChamp",
          score: 12500,
          difficulty: "2881",
          timestamp: Date.now() - 1000000,
          txHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        },
        {
          player: "BlockchainGamer",
          score: 9800,
          difficulty: "2000",
          timestamp: Date.now() - 2000000,
          txHash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        },
        {
          player: "SatoshiPlayer",
          score: 7500,
          difficulty: "1200",
          timestamp: Date.now() - 3000000,
          txHash: "0x7890abcdef1234567890abcdef1234567890abcdef1234567890abcdef123456",
        },
        {
          player: "Web3Gamer",
          score: 5200,
          difficulty: "500",
          timestamp: Date.now() - 4000000,
          txHash: "0xdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abc",
        },
        {
          player: "CryptoNoob",
          score: 2100,
          difficulty: "100",
          timestamp: Date.now() - 5000000,
          txHash: "0x567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234",
        },
      ]

      setScores(mockScores)
    } catch (error) {
      console.error("Error fetching high scores:", error)
      setError("Failed to load high scores")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHighScores()
  }, [])

  const getDifficultyName = (elo: string) => {
    switch (elo) {
      case "100":
        return "Beginner"
      case "500":
        return "Easy"
      case "1200":
        return "Medium"
      case "2000":
        return "Hard"
      case "2881":
        return "Magnus Carlsen"
      default:
        return elo
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  return (
    <div className="min-h-screen bg-black p-4 flex flex-col items-center">
      <h1 className="text-4xl font-bold text-green-500 mb-6">High Scores</h1>

      <Card className="w-full max-w-3xl bg-gray-900 border-green-500">
        <CardHeader>
          <CardTitle className="text-green-500">Blockchain Verified Scores</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-4">Loading high scores...</p>
          ) : error ? (
            <p className="text-center text-red-500 py-4">{error}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-green-500/30">
                    <th className="text-left py-2 px-4">Rank</th>
                    <th className="text-left py-2 px-4">Player</th>
                    <th className="text-left py-2 px-4">Score</th>
                    <th className="text-left py-2 px-4">Difficulty</th>
                    <th className="text-left py-2 px-4">Date</th>
                    <th className="text-left py-2 px-4">Tx Hash</th>
                  </tr>
                </thead>
                <tbody>
                  {scores.map((score, index) => (
                    <tr key={index} className="border-b border-green-500/10">
                      <td className="py-2 px-4">{index + 1}</td>
                      <td className="py-2 px-4">{score.player}</td>
                      <td className="py-2 px-4">{score.score}</td>
                      <td className="py-2 px-4">{getDifficultyName(score.difficulty)}</td>
                      <td className="py-2 px-4">{formatDate(score.timestamp)}</td>
                      <td className="py-2 px-4">
                        <a
                          href={`https://sepolia.tea.xyz/tx/${score.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-500 hover:underline truncate block max-w-[100px]"
                        >
                          {score.txHash.substring(0, 10)}...
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-6 flex justify-center">
            <Link href="/">
              <Button variant="outline" className="border-green-500 text-green-500">
                Back to Game
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

