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
  canDoubleJump: boolean
}

type Difficulty = 'easy' | 'medium' | 'hard' | 'extreme' | 'nightmare'

interface DifficultySettings {
  scrollSpeed: number
  spawnInterval: number
  bananaChance: number
  maxBananaHits: number
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

const DIFFICULTY_SETTINGS: Record<Difficulty, DifficultySettings> = {
  easy: {
    scrollSpeed: 2,
    spawnInterval: 1500,
    bananaChance: 0.3,
    maxBananaHits: 5,
  },
  medium: {
    scrollSpeed: 3,
    spawnInterval: 1000,
    bananaChance: 0.4,
    maxBananaHits: 4,
  },
  hard: {
    scrollSpeed: 4,
    spawnInterval: 800,
    bananaChance: 0.5,
    maxBananaHits: 3,
  },
  extreme: {
    scrollSpeed: 5.5,
    spawnInterval: 600,
    bananaChance: 0.6,
    maxBananaHits: 2,
  },
  nightmare: {
    scrollSpeed: 7,
    spawnInterval: 400,
    bananaChance: 0.7,
    maxBananaHits: 1,
  },
}

function App() {
  const [gameState, setGameState] = useState<'start' | 'difficulty' | 'playing' | 'gameover'>('start')
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [score, setScore] = useState(0)
  const [bananaHits, setBananaHits] = useState(0)
  const [player, setPlayer] = useState<Player>({
    x: GAME_WIDTH / 2 - PLAYER_WIDTH / 2,
    y: GROUND_Y,
    velocityY: 0,
    isJumping: false,
    canDoubleJump: false,
  })
  const [objects, setObjects] = useState<GameObject[]>([])
  const [keys, setKeys] = useState({ left: false, right: false })
  const gameLoopRef = useRef<number | undefined>(undefined)
  const spawnTimerRef = useRef<number | undefined>(undefined)
  const playerRef = useRef<Player>(player)
  const objectIdCounter = useRef(0)

  const currentSettings = DIFFICULTY_SETTINGS[difficulty]

  const selectDifficulty = (diff: Difficulty) => {
    setDifficulty(diff)
    setGameState('playing')
    setScore(0)
    setBananaHits(0)
    setPlayer({
      x: GAME_WIDTH / 2 - PLAYER_WIDTH / 2,
      y: GROUND_Y,
      velocityY: 0,
      isJumping: false,
      canDoubleJump: false,
    })
    setObjects([])
    objectIdCounter.current = 0
  }

  const startGame = () => {
    setGameState('difficulty')
  }

  const spawnObject = useCallback(() => {
    const type = Math.random() > currentSettings.bananaChance ? 'candy' : 'banana'
    const x = Math.random() * (GAME_WIDTH - OBJECT_WIDTH)
    setObjects(prev => [...prev, {
      id: objectIdCounter.current++,
      x,
      y: GAME_HEIGHT,
      width: OBJECT_WIDTH,
      height: OBJECT_HEIGHT,
      type,
    }])
  }, [currentSettings.bananaChance])

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
      if (e.code === 'Space' && gameState === 'playing') {
        e.preventDefault()
        setPlayer(prev => {
          // First jump from ground
          if (!prev.isJumping) {
            return {
              ...prev,
              velocityY: -JUMP_FORCE,
              isJumping: true,
              canDoubleJump: true,
            }
          }
          // Double jump in air
          else if (prev.canDoubleJump) {
            return {
              ...prev,
              velocityY: -JUMP_FORCE,
              canDoubleJump: false,
            }
          }
          return prev
        })
      }
      if (e.code === 'ArrowLeft') setKeys(k => ({ ...k, left: true }))
      if (e.code === 'ArrowRight') setKeys(k => ({ ...k, right: true }))
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft') setKeys(k => ({ ...k, left: false }))
      if (e.code === 'ArrowRight') setKeys(k => ({ ...k, right: false }))
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [gameState])

  useEffect(() => {
    playerRef.current = player
  }, [player])

  useEffect(() => {
    if (gameState !== 'playing') {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current)
      if (spawnTimerRef.current) clearInterval(spawnTimerRef.current)
      return
    }

    spawnTimerRef.current = window.setInterval(spawnObject, currentSettings.spawnInterval)

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

        // Gravity
        newPlayer.velocityY += GRAVITY
        newPlayer.y += newPlayer.velocityY

        // Ground collision
        if (newPlayer.y >= GROUND_Y) {
          newPlayer.y = GROUND_Y
          newPlayer.velocityY = 0
          newPlayer.isJumping = false
          newPlayer.canDoubleJump = false
        }

        return newPlayer
      })

      setObjects(prevObjects => {
        // Check collisions and filter out collided objects
        const objectsToKeep: GameObject[] = []
        
        prevObjects.forEach(obj => {
          const movedObj = { ...obj, y: obj.y - currentSettings.scrollSpeed }
          
          // Skip objects that are off screen
          if (movedObj.y <= -OBJECT_HEIGHT) {
            return
          }
          
          // Check collision with current player position
          if (checkCollision(movedObj, playerRef.current)) {
            if (movedObj.type === 'banana') {
              setBananaHits(prev => {
                const newHits = prev + 1
                if (newHits >= currentSettings.maxBananaHits) {
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
  }, [gameState, keys, checkCollision, spawnObject, currentSettings])

  const getDifficultyLabel = (diff: Difficulty): string => {
    const labels = {
      easy: 'Lätt',
      medium: 'Medel',
      hard: 'Svår',
      extreme: 'Extrem',
      nightmare: 'Mardröm'
    }
    return labels[diff]
  }

  const getDifficultyColor = (diff: Difficulty): string => {
    const colors = {
      easy: '#4CAF50',
      medium: '#2196F3',
      hard: '#FF9800',
      extreme: '#F44336',
      nightmare: '#9C27B0'
    }
    return colors[diff]
  }

  return (
    <div className="app">
      <h1>Bananhopparen 3000</h1>
      
      {gameState === 'start' && (
        <div className="menu">
          <p>Hoppa över bananer och samla godis!</p>
          <p>Använd vänster/höger pil för att röra dig</p>
          <p>Använd mellanslag för att hoppa (dubbelhoppa i luften!)</p>
          <p>Undvik för många bananer!</p>
          <button onClick={startGame}>Starta Spel</button>
        </div>
      )}

      {gameState === 'difficulty' && (
        <div className="menu">
          <h2>Välj Svårighetsgrad</h2>
          <div className="difficulty-buttons">
            <button 
              className="difficulty-btn"
              style={{ backgroundColor: getDifficultyColor('easy') }}
              onClick={() => selectDifficulty('easy')}
            >
              {getDifficultyLabel('easy')}
              <span className="difficulty-info">5 bananer tillåtna</span>
            </button>
            <button 
              className="difficulty-btn"
              style={{ backgroundColor: getDifficultyColor('medium') }}
              onClick={() => selectDifficulty('medium')}
            >
              {getDifficultyLabel('medium')}
              <span className="difficulty-info">4 bananer tillåtna</span>
            </button>
            <button 
              className="difficulty-btn"
              style={{ backgroundColor: getDifficultyColor('hard') }}
              onClick={() => selectDifficulty('hard')}
            >
              {getDifficultyLabel('hard')}
              <span className="difficulty-info">3 bananer tillåtna</span>
            </button>
            <button 
              className="difficulty-btn"
              style={{ backgroundColor: getDifficultyColor('extreme') }}
              onClick={() => selectDifficulty('extreme')}
            >
              {getDifficultyLabel('extreme')}
              <span className="difficulty-info">2 bananer tillåtna</span>
            </button>
            <button 
              className="difficulty-btn"
              style={{ backgroundColor: getDifficultyColor('nightmare') }}
              onClick={() => selectDifficulty('nightmare')}
            >
              {getDifficultyLabel('nightmare')}
              <span className="difficulty-info">1 banan tillåten</span>
            </button>
          </div>
          <button className="back-btn" onClick={() => setGameState('start')}>Tillbaka</button>
        </div>
      )}

      {gameState === 'playing' && (
        <>
          <div className="stats">
            <div>Poäng: {score}</div>
            <div>Svårighetsgrad: {getDifficultyLabel(difficulty)}</div>
            <div>Bananer: {bananaHits}/{currentSettings.maxBananaHits}</div>
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
          <p>Svårighetsgrad: {getDifficultyLabel(difficulty)}</p>
          <p>Din poäng: {score}</p>
          <button onClick={startGame}>Spela Igen</button>
        </div>
      )}
    </div>
  )
}

export default App
