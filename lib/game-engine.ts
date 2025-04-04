export default class GameEngine {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private updateScore: (score: number) => void
  private updateLives: (lives: number) => void
  private onGameOver: () => void
  private onPlayerShoot: () => Promise<boolean>

  // Game state
  private score = 0
  private lives = 3
  private player: Player
  private enemies: Enemy[] = []
  private playerBullets: Bullet[] = []
  private enemyBullets: Bullet[] = []
  private powerUps: PowerUp[] = []
  private lastEnemyShot = 0
  private enemyDirection = 1
  private enemySpeed = 0.8 // Slowed down by 1.5x (was 1.2)
  private enemyShootingFrequency = 2250 // Slowed down by 1.5x (was 1500)
  private enemyRows = 4
  private enemiesPerRow = 10
  private animationFrameId: number | null = null
  private lastTime = 0
  private keysPressed: { [key: string]: boolean } = {}
  private canShoot = true
  private lastShot = 0
  private shootCooldown = 750 // Slowed down by 1.5x (was 500)
  private powerUpDuration = 10000 // 10 seconds
  private activePowerUp: PowerUpType | null = null
  private powerUpEndTime = 0

  constructor(
    canvas: HTMLCanvasElement,
    updateScore: (score: number) => void,
    updateLives: (lives: number) => void,
    onGameOver: () => void,
    onPlayerShoot: () => Promise<boolean>,
  ) {
    this.canvas = canvas
    this.ctx = canvas.getContext("2d")!
    this.updateScore = updateScore
    this.updateLives = updateLives
    this.onGameOver = onGameOver
    this.onPlayerShoot = onPlayerShoot

    // Initialize game
    this.player = new Player(this.canvas.width / 2 - 25, this.canvas.height - 60, 50, 30, 2.7) // Slowed down by 1.5x (was 4)

    this.initializeEnemies()
    this.setupEventListeners()
    this.gameLoop(0)
  }

  private initializeEnemies() {
    const enemyWidth = 40
    const enemyHeight = 30
    const padding = 20
    const startX = (this.canvas.width - this.enemiesPerRow * (enemyWidth + padding)) / 2

    for (let row = 0; row < this.enemyRows; row++) {
      for (let col = 0; col < this.enemiesPerRow; col++) {
        this.enemies.push(
          new Enemy(
            startX + col * (enemyWidth + padding),
            50 + row * (enemyHeight + padding),
            enemyWidth,
            enemyHeight,
            10 * (this.enemyRows - row), // Points value decreases as rows go down
          ),
        )
      }
    }
  }

  private setupEventListeners() {
    window.addEventListener("keydown", (e) => {
      this.keysPressed[e.code] = true

      // Space to shoot
      if (e.code === "Space") {
        this.playerShoot()
      }
    })

    window.addEventListener("keyup", (e) => {
      this.keysPressed[e.code] = false
    })
  }

  private async playerShoot() {
    const now = Date.now()
    if (this.canShoot && now - this.lastShot > this.getCurrentShootCooldown()) {
      // Create bullet(s) based on active power-up
      if (this.activePowerUp === "spread") {
        // Spread shot - 3 bullets in a spread pattern
        const centerX = this.player.x + this.player.width / 2 - 2
        const bulletY = this.player.y
        this.playerBullets.push(new Bullet(centerX, bulletY, 4, 10, -6.7)) // Center bullet
        this.playerBullets.push(new Bullet(centerX - 8, bulletY, 4, 10, -6.7, -0.5)) // Left bullet with angle
        this.playerBullets.push(new Bullet(centerX + 8, bulletY, 4, 10, -6.7, 0.5)) // Right bullet with angle
      } else if (this.activePowerUp === "double") {
        // Double shot - 2 bullets side by side
        const bulletY = this.player.y
        this.playerBullets.push(new Bullet(this.player.x + 10, bulletY, 4, 10, -6.7))
        this.playerBullets.push(new Bullet(this.player.x + this.player.width - 10, bulletY, 4, 10, -6.7))
      } else {
        // Normal shot - single bullet
        const bulletX = this.player.x + this.player.width / 2 - 2
        const bulletY = this.player.y
        this.playerBullets.push(new Bullet(bulletX, bulletY, 4, 10, -6.7)) // Slowed down by 1.5x (was -10)
      }

      this.lastShot = now

      // Send blockchain transaction for the shot - ONE transaction per shot regardless of bullet count
      this.onPlayerShoot().catch((error) => {
        console.error("Error processing shot transaction:", error)
      })
    }
  }

  private getCurrentShootCooldown(): number {
    // If rapid fire power-up is active, reduce cooldown
    if (this.activePowerUp === "rapid") {
      return this.shootCooldown / 3 // 3x faster shooting
    }
    return this.shootCooldown
  }

  private enemyShoot() {
    const now = Date.now()
    if (now - this.lastEnemyShot > this.enemyShootingFrequency && this.enemies.length > 0) {
      // Select a random enemy from the bottom row of each column
      const bottomEnemies: Enemy[] = []
      const columns = new Map<number, Enemy>()

      // Find the bottom enemy in each column
      this.enemies.forEach((enemy) => {
        const col = Math.round(enemy.x / (enemy.width + 20))
        if (!columns.has(col) || enemy.y > columns.get(col)!.y) {
          columns.set(col, enemy)
        }
      })

      // Add all bottom enemies to the array
      columns.forEach((enemy) => bottomEnemies.push(enemy))

      if (bottomEnemies.length > 0) {
        // Select a random enemy to shoot
        const shootingEnemy = bottomEnemies[Math.floor(Math.random() * bottomEnemies.length)]
        const bulletX = shootingEnemy.x + shootingEnemy.width / 2 - 2
        const bulletY = shootingEnemy.y + shootingEnemy.height

        // Higher difficulty = faster bullets
        const bulletSpeed = 4.7 // Slowed down by 1.5x (was 7)
        this.enemyBullets.push(new Bullet(bulletX, bulletY, 4, 10, bulletSpeed))

        this.lastEnemyShot = now
      }
    }
  }

  private spawnPowerUp(x: number, y: number) {
    // 25% chance to spawn a power-up when an enemy is destroyed
    if (Math.random() < 0.25) {
      // Randomly select a power-up type
      const powerUpTypes: PowerUpType[] = ["rapid", "double", "spread"]
      const type = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)]

      this.powerUps.push(new PowerUp(x, y, 20, 20, type))
    }
  }

  private activatePowerUp(type: PowerUpType) {
    this.activePowerUp = type
    this.powerUpEndTime = Date.now() + this.powerUpDuration

    // Visual feedback could be added here
    console.log(`Power-up activated: ${type}`)
  }

  private updatePowerUps() {
    // Check if active power-up has expired
    if (this.activePowerUp && Date.now() > this.powerUpEndTime) {
      this.activePowerUp = null
    }

    // Update falling power-ups
    this.powerUps = this.powerUps.filter((powerUp) => {
      // Move power-up down
      powerUp.y += 2

      // Check if power-up is collected by player
      if (
        powerUp.x < this.player.x + this.player.width &&
        powerUp.x + powerUp.width > this.player.x &&
        powerUp.y < this.player.y + this.player.height &&
        powerUp.y + powerUp.height > this.player.y
      ) {
        // Activate the power-up
        this.activatePowerUp(powerUp.type)
        return false // Remove power-up
      }

      // Remove if it goes off screen
      return powerUp.y < this.canvas.height
    })
  }

  private gameLoop(timestamp: number) {
    // Calculate delta time
    const deltaTime = timestamp - this.lastTime
    this.lastTime = timestamp

    // Clear canvas
    this.ctx.fillStyle = "black"
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    // Update player
    if (this.keysPressed["ArrowLeft"]) {
      this.player.moveLeft(this.canvas.width)
    }
    if (this.keysPressed["ArrowRight"]) {
      this.player.moveRight(this.canvas.width)
    }

    // Update enemies
    let shouldChangeDirection = false
    this.enemies.forEach((enemy) => {
      enemy.x += this.enemyDirection * this.enemySpeed

      // Check if any enemy hits the edge
      if (
        (this.enemyDirection > 0 && enemy.x + enemy.width > this.canvas.width) ||
        (this.enemyDirection < 0 && enemy.x < 0)
      ) {
        shouldChangeDirection = true
      }
    })

    // Change direction and move enemies down if needed
    if (shouldChangeDirection) {
      this.enemyDirection *= -1
      this.enemies.forEach((enemy) => {
        enemy.y += 17 // Slowed down by 1.5x (was 25)
      })
    }

    // Enemy shooting
    this.enemyShoot()

    // Update bullets
    this.playerBullets = this.playerBullets.filter((bullet) => {
      bullet.y += bullet.speed

      // Update horizontal position if bullet has horizontal speed
      if (bullet.horizontalSpeed) {
        bullet.x += bullet.horizontalSpeed
      }

      return bullet.y > 0 && bullet.x > 0 && bullet.x < this.canvas.width
    })

    this.enemyBullets = this.enemyBullets.filter((bullet) => {
      bullet.y += bullet.speed
      return bullet.y < this.canvas.height
    })

    // Update power-ups
    this.updatePowerUps()

    // Check collisions
    this.checkCollisions()

    // Check if enemies reached the bottom
    const enemyReachedBottom = this.enemies.some((enemy) => enemy.y + enemy.height >= this.player.y)
    if (enemyReachedBottom) {
      this.lives = 0
      this.updateLives(this.lives)
      this.gameOver()
      return
    }

    // Draw everything
    this.draw()

    // Continue game loop
    this.animationFrameId = requestAnimationFrame(this.gameLoop.bind(this))
  }

  private checkCollisions() {
    // Player bullets vs enemies
    this.playerBullets = this.playerBullets.filter((bullet) => {
      let bulletHit = false

      this.enemies = this.enemies.filter((enemy) => {
        if (
          bullet.x < enemy.x + enemy.width &&
          bullet.x + bullet.width > enemy.x &&
          bullet.y < enemy.y + enemy.height &&
          bullet.y + bullet.height > enemy.y
        ) {
          // Bullet hit enemy
          this.score += enemy.points
          this.updateScore(this.score)
          bulletHit = true

          // Chance to spawn power-up
          this.spawnPowerUp(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2)

          return false // Remove enemy
        }
        return true // Keep enemy
      })

      return !bulletHit // Keep bullet if it didn't hit anything
    })

    // Enemy bullets vs player
    this.enemyBullets = this.enemyBullets.filter((bullet) => {
      if (
        bullet.x < this.player.x + this.player.width &&
        bullet.x + bullet.width > this.player.x &&
        bullet.y < this.player.y + this.player.height &&
        bullet.y + bullet.height > this.player.y
      ) {
        // Bullet hit player
        this.lives--
        this.updateLives(this.lives)

        if (this.lives <= 0) {
          this.gameOver()
        }

        return false // Remove bullet
      }
      return true // Keep bullet
    })

    // Check if all enemies are destroyed
    if (this.enemies.length === 0) {
      // Level complete, spawn new enemies with increased difficulty
      this.enemySpeed += 0.2 // Kept the same increment
      this.enemyShootingFrequency = Math.max(500, this.enemyShootingFrequency - 200) // Kept the same decrement
      this.initializeEnemies()
    }
  }

  private draw() {
    // Draw player
    this.ctx.fillStyle = "lime"
    this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height)

    // Draw player bullets
    this.ctx.fillStyle = "white"
    this.playerBullets.forEach((bullet) => {
      this.ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height)
    })

    // Draw enemy bullets
    this.ctx.fillStyle = "red"
    this.enemyBullets.forEach((bullet) => {
      this.ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height)
    })

    // Draw enemies
    this.enemies.forEach((enemy) => {
      this.ctx.fillStyle = "rgb(255, 50, 50)"
      this.ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height)

      // Draw "antenna" on enemies
      this.ctx.fillRect(enemy.x + enemy.width / 2 - 2, enemy.y - 5, 4, 5)
      this.ctx.fillRect(enemy.x + enemy.width / 4 - 2, enemy.y - 3, 4, 3)
      this.ctx.fillRect(enemy.x + (enemy.width * 3) / 4 - 2, enemy.y - 3, 4, 3)
    })

    // Draw power-ups
    this.powerUps.forEach((powerUp) => {
      // Different colors for different power-up types
      switch (powerUp.type) {
        case "rapid":
          this.ctx.fillStyle = "yellow"
          break
        case "double":
          this.ctx.fillStyle = "cyan"
          break
        case "spread":
          this.ctx.fillStyle = "magenta"
          break
      }

      // Draw power-up
      this.ctx.fillRect(powerUp.x, powerUp.y, powerUp.width, powerUp.height)

      // Draw power-up icon
      this.ctx.fillStyle = "black"
      this.ctx.font = "bold 14px Arial"
      this.ctx.textAlign = "center"
      this.ctx.textBaseline = "middle"

      let symbol = "?"
      switch (powerUp.type) {
        case "rapid":
          symbol = "R"
          break
        case "double":
          symbol = "D"
          break
        case "spread":
          symbol = "S"
          break
      }

      this.ctx.fillText(symbol, powerUp.x + powerUp.width / 2, powerUp.y + powerUp.height / 2)
    })

    // Draw active power-up indicator
    if (this.activePowerUp) {
      this.ctx.fillStyle = "rgba(255, 255, 255, 0.7)"
      this.ctx.fillRect(10, 10, 100, 30)

      this.ctx.fillStyle = "black"
      this.ctx.font = "12px Arial"
      this.ctx.textAlign = "left"
      this.ctx.textBaseline = "middle"

      let powerUpName = ""
      switch (this.activePowerUp) {
        case "rapid":
          powerUpName = "RAPID FIRE"
          break
        case "double":
          powerUpName = "DOUBLE SHOT"
          break
        case "spread":
          powerUpName = "SPREAD SHOT"
          break
      }

      this.ctx.fillText(powerUpName, 15, 25)

      // Draw remaining time bar
      const remainingTime = Math.max(0, this.powerUpEndTime - Date.now())
      const barWidth = (remainingTime / this.powerUpDuration) * 90

      this.ctx.fillStyle = "green"
      this.ctx.fillRect(15, 35, barWidth, 5)
    }
  }

  private gameOver() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
    this.onGameOver()
  }

  public cleanup() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }

    window.removeEventListener("keydown", () => {})
    window.removeEventListener("keyup", () => {})
  }
}

type PowerUpType = "rapid" | "double" | "spread"

class Player {
  constructor(
    public x: number,
    public y: number,
    public width: number,
    public height: number,
    public speed: number,
  ) {}

  moveLeft(canvasWidth: number) {
    this.x = Math.max(0, this.x - this.speed)
  }

  moveRight(canvasWidth: number) {
    this.x = Math.min(canvasWidth - this.width, this.x + this.speed)
  }
}

class Enemy {
  constructor(
    public x: number,
    public y: number,
    public width: number,
    public height: number,
    public points: number,
  ) {}
}

class Bullet {
  constructor(
    public x: number,
    public y: number,
    public width: number,
    public height: number,
    public speed: number,
    public horizontalSpeed = 0,
  ) {}
}

class PowerUp {
  constructor(
    public x: number,
    public y: number,
    public width: number,
    public height: number,
    public type: PowerUpType,
  ) {}
}

