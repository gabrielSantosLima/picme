import type { AgentPhase, PendingInteraction } from '../../entities/agent'

export interface InteractionPresenter {
  setPending: (interaction: PendingInteraction | null) => void
  setPhase: (phase: AgentPhase) => void
}

export class InteractionBroker {
  private resolveFn: ((result: unknown) => void) | null = null
  private rejectFn: ((error: unknown) => void) | null = null

  constructor(private readonly presenter: InteractionPresenter) {}

  request(interaction: PendingInteraction): Promise<unknown> {
    this.presenter.setPending(interaction)
    this.presenter.setPhase('awaiting_input')
    return new Promise((resolve, reject) => {
      this.resolveFn = resolve
      this.rejectFn = reject
    })
  }

  resolve(result: unknown): void {
    const resolve = this.resolveFn
    this.clear()
    resolve?.(result)
  }

  reject(error: Error): void {
    const reject = this.rejectFn
    this.clear()
    reject?.(error)
  }

  cancelAll(error: Error): void {
    this.reject(error)
  }

  private clear(): void {
    this.resolveFn = null
    this.rejectFn = null
    this.presenter.setPending(null)
  }
}
