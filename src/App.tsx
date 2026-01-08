import { useState, useEffect, useCallback, useRef } from 'react'
import './App.css'

interface GameObject {
  id: number
  x: number
  y: number
  width: number
  height: number
  type: 'banana' | 'candy'
}

interface Player {
  x: number
  y: number
  velocityY: number
  isJumping: boolean
}

const GAME_WIDTH = 400
const GAME_HEIGHT = 600
const PLAYER_WIDTH = 40
const PLAYER_HEIGHT = 40
const PLAYER_SPEED = 5
const JUMP_FORCE = 15
const GRAVITY = 0.8
const GROUND_Y = GAME_HEIGHT - 100
const OBJECT_WIDTH = 30
const OBJECT_HEIGHT = 30
const SCROLL_SPEED = 3
const SPAWN_INTERVAL = 1000

function App() {
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start')
  const [score, setScore] = useState(0)
  const [bananaHits, setBananaHits] = useState(0)
  const [player, setPlayer] = useState<Player>({
    x: GAME_WIDTH / 2 - PLAYER_WIDTH / 2,
    y: GROUND_Y,
    velocityY: 0,
    isJumping: false,
  })
  const [objects, setObjects] = useState<GameObject[]>([])
  const [keys, setKeys] = useState({ left: false, right: false, space: false })
  const gameLoopRef = useRef<number | undefined>(undefined)
  const spawnTimerRef = useRef<number | undefined>(undefined)
  const playerRef = useRef<Player>(player)
  const objectIdCounter = useRef(0)

  const startGame = () => {
    setGameState('playing')
    setScore(0)
    setBananaHits(0)
    setPlayer({
      x: GAME_WIDTH / 2 - PLAYER_WIDTH / 2,
      y: GROUND_Y,
      velocityY: 0,
      isJumping: false,
    })
    setObjects([])
    objectIdCounter.current = 0
  }

  const spawnObject = useCallback(() => {
    const type = Math.random() > 0.5 ? 'banana' : 'candy'
    const x = Math.random() * (GAME_WIDTH - OBJECT_WIDTH)
    setObjects(prev => [...prev, {
      id: objectIdCounter.current++,
      x,
      y: GAME_HEIGHT,
      width: OBJECT_WIDTH,
      height: OBJECT_HEIGHT,
      type,
    }])
  }, [])

  const checkCollision = useCallback((obj: GameObject, p: Player) => {
    return (
      p.x < obj.x + obj.width &&
      p.x + PLAYER_WIDTH > obj.x &&
      p.y < obj.y + obj.height &&
      p.y + PLAYER_HEIGHT > obj.y
    )
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        setKeys(k => ({ ...k, space: true }))
      }
      if (e.code === 'ArrowLeft') setKeys(k => ({ ...k, left: true }))
      if (e.code === 'ArrowRight') setKeys(k => ({ ...k, right: true }))
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setKeys(k => ({ ...k, space: false }))
      if (e.code === 'ArrowLeft') setKeys(k => ({ ...k, left: false }))
      if (e.code === 'ArrowRight') setKeys(k => ({ ...k, right: false }))
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  useEffect(() => {
    playerRef.current = player
  }, [player])

  useEffect(() => {
    if (gameState !== 'playing') {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current)
      if (spawnTimerRef.current) clearInterval(spawnTimerRef.current)
      return
    }

    spawnTimerRef.current = window.setInterval(spawnObject, SPAWN_INTERVAL)

    const gameLoop = () => {
      setPlayer(prevPlayer => {
        const newPlayer = { ...prevPlayer }

        // Horizontal movement
        if (keys.left && newPlayer.x > 0) {
          newPlayer.x -= PLAYER_SPEED
        }
        if (keys.right && newPlayer.x < GAME_WIDTH - PLAYER_WIDTH) {
          newPlayer.x += PLAYER_SPEED
        }

        // Jump
        if (keys.space && !newPlayer.isJumping) {
          newPlayer.velocityY = -JUMP_FORCE
          newPlayer.isJumping = true
        }

        // Gravity
        newPlayer.velocityY += GRAVITY
        newPlayer.y += newPlayer.velocityY

        // Ground collision
        if (newPlayer.y >= GROUND_Y) {
          newPlayer.y = GROUND_Y
          newPlayer.velocityY = 0
          newPlayer.isJumping = false
        }

        return newPlayer
      })

      setObjects(prevObjects => {
        // Check collisions and filter out collided objects
        const objectsToKeep: GameObject[] = []
        
        prevObjects.forEach(obj => {
          const movedObj = { ...obj, y: obj.y - SCROLL_SPEED }
          
          // Skip objects that are off screen
          if (movedObj.y <= -OBJECT_HEIGHT) {
            return
          }
          
          // Check collision with current player position
          if (checkCollision(movedObj, playerRef.current)) {
            if (movedObj.type === 'banana') {
              setBananaHits(prev => {
                const newHits = prev + 1
                if (newHits >= 3) {
                  setGameState('gameover')
                }
                return newHits
              })
            } else if (movedObj.type === 'candy') {
              setScore(prev => prev + 10)
            }
            // Don't add collided object to the list
          } else {
            objectsToKeep.push(movedObj)
          }
        })

        return objectsToKeep
      })

      gameLoopRef.current = requestAnimationFrame(gameLoop)
    }

    gameLoopRef.current = requestAnimationFrame(gameLoop)

    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current)
      if (spawnTimerRef.current) clearInterval(spawnTimerRef.current)
    }
  }, [gameState, keys, checkCollision, spawnObject])

  return (
    <div className="app">
      <h1>Bananhopparen 3000</h1>
      
      {gameState === 'start' && (
        <div className="menu">
          <p>Hoppa över bananer och samla godis!</p>
          <p>Använd vänster/höger pil för att röra dig</p>
          <p>Använd mellanslag för att hoppa</p>
          <p>Undvik 3 bananer för att förlora!</p>
          <button onClick={startGame}>Starta Spel</button>
        </div>
      )}

      {gameState === 'playing' && (
        <>
          <div className="stats">
            <div>Poäng: {score}</div>
            <div>Bananer träffade: {bananaHits}/3</div>
          </div>
          <div className="game-container">
            <div className="game-area">
              <div
                className="player"
                style={{
                  left: `${player.x}px`,
                  top: `${player.y}px`,
                }}
              >
                🏃
              </div>
              {objects.map(obj => (
                <div
                  key={obj.id}
                  className={`object ${obj.type}`}
                  style={{
                    left: `${obj.x}px`,
                    top: `${obj.y}px`,
                  }}
                >
                  {obj.type === 'banana' ? '🍌' : '🍬'}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {gameState === 'gameover' && (
        <div className="menu">
          <h2>Game Over!</h2>
          <p>Din poäng: {score}</p>
          <button onClick={startGame}>Spela Igen</button>
        </div>
      )}
    </div>
  )
}

export default App
