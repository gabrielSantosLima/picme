import { useProvider } from '../../contexts/ProviderContext'
import { useAgent } from '../../hooks/useAgent'
import { useAgentStore } from '../../store/agentStore'
import { AgentInput } from './AgentInput'
import { AgentSettingsBar } from './AgentSettingsBar'
import { ChatTranscript } from './ChatTranscript'
import { QuestionForm } from './QuestionForm'
import { WordCloudPicker } from './WordCloudPicker'

export function AgentPanel() {
  const { configured } = useProvider()
  const { submit } = useAgent()
  const pendingInteraction = useAgentStore((state) => state.pendingInteraction)

  if (!configured) {
    return (
      <div className="flex flex-1 items-center justify-center p-4 text-center text-xs text-neutral-500">
        Configure a provider to use the agent.
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ChatTranscript />

      {pendingInteraction && (
        <div className="border-t border-neutral-800 p-3">
          {pendingInteraction.kind === 'questions' ? (
            <QuestionForm questions={pendingInteraction.questions} onSubmit={submit} />
          ) : (
            <WordCloudPicker
              question={pendingInteraction.question}
              clouds={pendingInteraction.clouds}
              multiple={pendingInteraction.multiple}
              onSubmit={submit}
            />
          )}
        </div>
      )}

      <AgentSettingsBar />
      <AgentInput />
    </div>
  )
}
