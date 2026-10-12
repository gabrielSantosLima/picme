import { EditorProvider } from './contexts/EditorProvider'
import { EditorPage } from './pages/EditorPage'

function App() {
  return (
    <EditorProvider>
      <EditorPage />
    </EditorProvider>
  )
}

export default App
