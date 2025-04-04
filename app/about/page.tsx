import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function About() {
  return (
    <div className="min-h-screen bg-black p-4 flex flex-col items-center">
      <h1 className="text-4xl font-bold text-green-500 mb-6">About Space Invaders</h1>

      <Card className="w-full max-w-3xl bg-gray-900 border-green-500">
        <CardHeader>
          <CardTitle className="text-green-500">Game Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-green-400 mb-2">How to Play</h2>
            <p>
              Use the left and right arrow keys to move your ship. Press the space bar to shoot. Destroy all the
              invaders before they reach the bottom of the screen!
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-green-400 mb-2">Blockchain Integration</h2>
            <p className="mb-2">
              This game uses the Tea Sepolia blockchain in a unique way - every shot you fire creates a blockchain
              transaction!
            </p>
            <p>
              Each time you press the space bar to shoot, a small transaction is sent to the Tea Sepolia network,
              permanently recording your action on the blockchain.
            </p>

            <div className="mt-4 p-3 bg-gray-800 rounded border border-green-500 text-sm">
              <h3 className="font-semibold text-green-400 mb-1">How the Game Wallet Works</h3>
              <p>To avoid having to confirm each transaction when you shoot:</p>
              <ol className="list-decimal pl-5 mt-2 space-y-1">
                <li>You connect your main wallet and fund a temporary "game wallet" with 0.01 TEA</li>
                <li>This game wallet automatically sends transactions when you shoot</li>
                <li>No confirmation popups for each shot!</li>
                <li>Each shot costs 0.0001 TEA, so you can fire ~100 shots with the initial funding</li>
              </ol>
            </div>

            <div className="mt-4 space-y-2">
              <p className="font-semibold">Tea Sepolia Network Details:</p>
              <ul className="list-disc pl-5">
                <li>Network Name: Tea Sepolia</li>
                <li>RPC URL: https://tea-sepolia.g.alchemy.com/public</li>
                <li>Chain ID: 10218</li>
                <li>Currency Symbol: TEA</li>
                <li>Block Explorer: https://sepolia.tea.xyz</li>
              </ul>
            </div>

            <div className="mt-4 p-3 bg-gray-800 rounded border border-yellow-500 text-yellow-300 text-sm">
              <p className="font-semibold">Note:</p>
              <p>You'll need some TEA tokens in your wallet to play, as funding the game wallet requires 0.01 TEA.</p>
              <p className="mt-1">
                You can get free TEA tokens from the faucet:{" "}
                <a
                  href="https://faucet-sepolia.tea.xyz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  https://faucet-sepolia.tea.xyz
                </a>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6">
        <Link href="/">
          <Button className="bg-green-600 hover:bg-green-700">Back to Game</Button>
        </Link>
      </div>
    </div>
  )
}

