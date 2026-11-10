// The guided run in progress (BadgeFit), outside any one screen: leaving the screen does not end
// it. Full screen, or minimised to a bar with play, pause and end, like music
// (components/RunHost.jsx, components/RunPlayer.jsx).
import { create } from 'zustand'

export const useRun = create(set => ({
  run: null,
  minimized: false,
  open: run => set(s => (s.run && s.run.id === run?.id ? { minimized: false } : { run, minimized: false })),
  minimize: () => set({ minimized: true }),
  restore: () => set({ minimized: false }),
  close: () => set({ run: null, minimized: false }),
}))
