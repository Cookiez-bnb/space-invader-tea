import SpaceInvaders from "@/components/space-invaders"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-black">
      <h1 className="text-4xl font-bold text-green-500 mb-2">Space Invaders</h1>
      <p className="text-green-300 mb-6">Every shot is a blockchain transaction - no waiting!</p>
      <SpaceInvaders />
    </main>
  )
}

