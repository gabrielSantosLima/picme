import { EditorProvider } from './contexts/EditorProvider'
import { ProviderProvider } from './contexts/ProviderProvider'
import { EditorPage } from './pages/EditorPage'

function App() {
  return (
    <ProviderProvider>
      <EditorProvider>
        <EditorPage />
      </EditorProvider>
    </ProviderProvider>
  )
}

export default App
