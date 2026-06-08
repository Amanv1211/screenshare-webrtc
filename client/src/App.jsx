import Home from './pages/Home'
import Room from './pages/Room'

export default function App() {
  return window.location.pathname === '/room' ? <Room /> : <Home />
}
